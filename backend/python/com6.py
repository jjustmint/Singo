import uvicorn
import numpy as np
import librosa
from fastdtw import fastdtw
import concurrent.futures
import logging
import noisereduce as nr
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
app = FastAPI()

# ===== Simplified and Robust Parameters =====
SR = 22050
N_FFT = 2048
HOP = 512
USE_NOISE_REDUCE = True
TRIM_TOP_DB = 30

# DTW configuration
ALPHA = 0.40
K_DECAY = 0.20

# Component weights - balanced
W_ACC  = 0.35
W_NAS  = 0.45
W_BASE = 0.20

# Mistake detection - MORE AGGRESSIVE
MISTAKE_SLOPE   = 1.0  # was 0.65 - steeper penalty for mistakes
MIN_GAP         = 0.2  # was 0.35 - detect shorter mistakes
ENERGY_THRESH   = 0.12  # was 0.12 - lower threshold to catch more mistakes
SEMITONE_THRESH = 2.0  # was 2.0 - stricter pitch detection

# Penalties - STRONGER
TIMING_PENALTY_FACTOR = 8  # was 8
TIMING_MAX_PENALTY = 10    # was 10
KEY_SHIFT_PENALTY_PER_STEP = 0.04  # was 0.04 - doubled

# Score calibration - BIGGER SPREAD
SCORE_SPREAD_FACTOR = 1.3  # was 1.3 - more spread between good/bad
POOR_PENALTY_MULTIPLIER = 3.0  # was 1.5 - harsher on poor performance

# NEW: Mistake severity penalties
MISTAKE_PENALTY_WEIGHT = 0.8 

# Voiced gating thresholds
VOICED_PCT_USER = 25
VOICED_PCT_ORIG = 25

MIN_VOCAL_RMS = 0.0035  # tune if needed
PEAK_CHROMA_MIN = 1e-7  # prevents NaN-ish edge cases

# ----------------- Pydantic -----------------
class CompareRequest(BaseModel):
    originalSongPath: str
    userSongPath: str

# ----------------- Helpers -----------------
def _normalize_chroma_cols(C: np.ndarray) -> np.ndarray:
    C = np.asarray(C, dtype=np.float32)
    norms = np.linalg.norm(C, axis=0, keepdims=True) + 1e-8
    return C / norms

def _fast_hybrid_distance_factory(alpha: float):
    def dist(x, y):
        dot = float(np.dot(x, y))
        cos_d = 1.0 - dot
        eu_d  = np.sqrt(max(0.0, 2.0 - 2.0 * dot))
        return alpha * cos_d + (1.0 - alpha) * eu_d
    return dist

def extract_chroma_from_song(path):
    y, sr = librosa.load(path, sr=SR, mono=True, dtype=np.float32)
    y, _ = librosa.effects.trim(y, top_db=TRIM_TOP_DB)
    if USE_NOISE_REDUCE:
        y = nr.reduce_noise(y=y, sr=sr, prop_decrease=2.0)
    y_harm, _ = librosa.effects.hpss(y)
    chroma_raw = librosa.feature.chroma_stft(y=y_harm, sr=sr, n_fft=N_FFT, hop_length=HOP).astype(np.float32)
    energy_vec = np.sum(chroma_raw, axis=0).astype(np.float32)
    chroma_norm = _normalize_chroma_cols(chroma_raw)
    
    # Calculate signal quality metrics
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    spectral_flatness = librosa.feature.spectral_flatness(y=y, hop_length=HOP)[0]
    
    return y, sr, chroma_raw, chroma_norm, energy_vec, rms, spectral_flatness

def dtw_normalized_distance(A_unit, B_unit, alpha):
    fast_dist = _fast_hybrid_distance_factory(alpha)
    dist, path = fastdtw(A_unit.T, B_unit.T, dist=fast_dist)
    nd = dist / max(1, len(path))
    return float(nd), path

def dtw_calibrated_accuracy(A_unit, B_unit, alpha=ALPHA, k=K_DECAY):
    nd_self, _  = dtw_normalized_distance(A_unit, A_unit, alpha)
    nd_pair, path = dtw_normalized_distance(A_unit, B_unit, alpha)
    eff_nd = max(0.0, nd_pair - nd_self)
    acc = 100.0 * np.exp(-k * eff_nd)
    return float(np.clip(acc, 0.0, 100.0)), path, eff_nd, nd_self, nd_pair

def is_harmonic(n1, n2):
    interval = abs(n1 - n2) % 12
    # return the interval itself (not True/False)
    return interval

def classify_pitch_error(expected_midi, actual_midi):
    """
    Classify the type of pitch error with detailed feedback
    Returns: (reason, severity, description)
    """
    semitone_diff = actual_midi - expected_midi
    abs_diff = abs(semitone_diff)
    
    # Check if it's harmonically related (acceptable)
    interval = is_harmonic(expected_midi, actual_midi)
    if interval in [0, 3, 4, 5]:  # allow unison or small 3rd harmonics
        return None, 0, f"harmonic interval ({interval} semitones)"
    
    # Check if difference is too small to matter
    if abs_diff < SEMITONE_THRESH:
        return None, 0, "acceptable"
    
    # Classify based on direction and magnitude
    if semitone_diff > 0:
        if abs_diff >= 7:
            return "too-high-major", 3, f"Way too high (+{abs_diff} semitones)"
        elif abs_diff >= 4:
            return "too-high", 2, f"Too high (+{abs_diff} semitones)"
        else:
            return "slightly-high", 1, f"Slightly high (+{abs_diff} semitones)"
    else:
        if abs_diff >= 7:
            return "too-low-major", 3, f"Way too low (-{abs_diff} semitones)"
        elif abs_diff >= 4:
            return "too-low", 2, f"Too low (-{abs_diff} semitones)"
        else:
            return "slightly-low", 1, f"Slightly low (-{abs_diff} semitones)"

def compute_timing_penalty(path, sr, hop_length=HOP):
    if not path or len(path) < 2:
        return 0.0
    delays = [(u - o) * hop_length / sr for o, u in path]
    std = float(np.std(delays))
    penalty = min(std * TIMING_PENALTY_FACTOR, TIMING_MAX_PENALTY)
    return float(penalty)

def detect_mistake_points(orig_unit, user_unit, path, sr,
                          hop_length=HOP, min_gap=MIN_GAP,
                          energy_threshold=ENERGY_THRESH):
    """
    Enhanced mistake detection with missing + extra + pitch classification
    """
    mistakes = []
    cur = None
    e_user = np.sum(user_unit, axis=0)
    e_orig = np.sum(orig_unit, axis=0)
    thr_user = float(np.median(e_user)) * energy_threshold * 1.5 if len(e_user) > 0 else 0.01
    thr_orig = float(np.median(e_orig)) * energy_threshold * 1.5 if len(e_orig) > 0 else 0.01

    for oi, ui in path:
        if oi >= orig_unit.shape[1] or ui >= user_unit.shape[1]:
            continue

        eu = float(e_user[ui])
        eo = float(e_orig[oi])
        t = ui * hop_length / sr

        exp_idx = int(np.argmax(orig_unit[:, oi]))
        act_idx = int(np.argmax(user_unit[:, ui]))
        exp_midi = 60 + exp_idx
        act_midi = 60 + act_idx

        reason = None
        severity = 0
        description = ""

        # --- CASE 1: Original has sound but user quiet (MISSING) ---
        if eo > thr_orig and eu < thr_user * 0.5:  # เข้มขึ้น ตรวจช่วงเงียบจริง
            reason = "missing"
            severity = 3
            description = "User missed a note when original had sound"

        # --- CASE 2: User sings when original silent (EXTRA) ---
        elif eo < thr_orig * 0.5 and eu > thr_user:
            reason = "extra"
            severity = 1
            description = "User sang when no note expected"

        # --- CASE 3: Both singing -> check pitch ---
        elif eo > thr_orig and eu > thr_user:
            reason, severity, description = classify_pitch_error(exp_midi, act_midi)

        # --- Merge logic as before ---
        if reason:
            if cur and cur["reason"] == reason and (t - cur["end_time"]) < min_gap:
                cur["end_time"] = t
                cur["frames"] += 1
                cur["severity"] = max(cur["severity"], severity)
            else:
                if cur:
                    dur = cur["end_time"] - cur["start_time"]
                    if dur >= min_gap:
                        mistakes.append({**cur, "duration": round(dur, 2)})

                cur = {
                    "start_time": t,
                    "end_time": t,
                    "expected_midi": exp_midi,
                    "actual_midi": act_midi,
                    "reason": reason,
                    "severity": severity,
                    "description": description,
                    "frames": 1,
                }
        else:
            if cur:
                dur = cur["end_time"] - cur["start_time"]
                if dur >= min_gap:
                    mistakes.append({**cur, "duration": round(dur, 2)})
                cur = None

    if cur:
        dur = cur["end_time"] - cur["start_time"]
        if dur >= min_gap:
            mistakes.append({**cur, "duration": round(dur, 2)})

    return mistakes

def note_agreement_score(orig_raw, user_raw, path, e_orig, e_user, thr_orig, thr_user):
    """
    Calculate how well user hits the correct notes
    """
    correct_notes = 0
    total_notes = 0
    note_scores = []
    pitch_errors = []
    
    for oi, ui in path:
        if (0 <= oi < orig_raw.shape[1] and 0 <= ui < user_raw.shape[1]
            and e_orig[oi] > thr_orig and e_user[ui] > thr_user):
            
            exp_idx = int(np.argmax(orig_raw[:, oi]))
            act_idx = int(np.argmax(user_raw[:, ui]))
            peak_u = float(np.max(user_raw[:, ui])) + 1e-8
            
            correct_energy = float(user_raw[exp_idx, ui]) / peak_u
            note_scores.append(correct_energy)
            
            pitch_error = abs(exp_idx - act_idx)
            pitch_errors.append(pitch_error)
            
            if act_idx == exp_idx or (correct_energy > 0.6):
                correct_notes += 1
            
            total_notes += 1
    
    if not note_scores:
        return 0.0, 0, 0.0, 0.0
    
    nas_mean = float(np.mean(note_scores))
    avg_pitch_error = float(np.mean(pitch_errors))
    correct_pct = correct_notes / total_notes if total_notes > 0 else 0.0
    
    return nas_mean, total_notes, avg_pitch_error, correct_pct

def freq_from_midi(m):
    return 440.0 * (2 ** ((m - 69) / 12))

def energy_correlation_along_path(eo, eu, path):
    xs, ys = [], []
    for oi, ui in path:
        if 0 <= oi < len(eo) and 0 <= ui < len(eu):
            xs.append(float(eo[oi]))
            ys.append(float(eu[ui]))
    if len(xs) < 3:
        return 0.0
    xs = np.asarray(xs, np.float32)
    ys = np.asarray(ys, np.float32)
    xs -= xs.mean()
    ys -= ys.mean()
    denom = (np.linalg.norm(xs) * np.linalg.norm(ys)) + 1e-8
    r = float(np.dot(xs, ys) / denom) if denom > 0 else 0.0
    return max(-1.0, min(1.0, r))

def detect_vocal_quality(rms, spectral_flatness, chroma_raw):
    """
    Detect if the audio contains actual singing or just noise/silence
    """
    avg_rms = float(np.mean(rms))

    if np.mean(np.abs(chroma_raw)) < 1e-5:
        return False, 0.0, "No chroma content detected (silence)."

    if avg_rms < 0.002 or np.max(rms) < 0.004:
        return False, 0.0, "Audio is too quiet or silent"
    
    avg_flatness = float(np.mean(spectral_flatness))
    if avg_flatness > 0.9:
        return False, 0.0, "Audio is mostly noise, no clear vocals detected"
    
    chroma_max_per_frame = np.max(chroma_raw, axis=0)
    chroma_concentration = float(np.mean(chroma_max_per_frame / (np.sum(chroma_raw, axis=0) + 1e-8)))
    
    if chroma_concentration < 0.10:
        return False, 0.0, "No clear pitch detected, possibly just noise"
    
    active_frames = np.sum(chroma_max_per_frame > (np.max(chroma_max_per_frame) * 0.2))
    voicing_ratio = active_frames / len(chroma_max_per_frame)
    
    if voicing_ratio < 0.15:
        return False, 0.0, "Too little vocal activity detected"
    
    quality_score = (
        0.3 * min(1.0, avg_rms / 0.1) +
        0.3 * (1.0 - avg_flatness) +
        0.2 * chroma_concentration +
        0.2 * min(1.0, voicing_ratio / 0.5)
    )
    
    if quality_score < 0.25:
        return False, float(quality_score), "Low vocal presence detected"

    quality_score = min(1.0, quality_score * 1.25)
    return True, float(quality_score), "Valid vocal detected"

def extract_chroma_with_wave(path):
    """
    Load waveform + extract chroma features (so we can check silence before scoring)
    """
    y, sr = librosa.load(path, sr=SR, mono=True, dtype=np.float32)
    y, sr2, chroma_raw, chroma_norm, energy_vec, rms, flat = extract_chroma_from_song(path)
    return y, sr2, chroma_raw, chroma_norm, energy_vec, rms, flat

def voiced_fraction_yin(y, sr):
    fmin = librosa.note_to_hz("C2")
    fmax = librosa.note_to_hz("C7")
    f0 = librosa.yin(y, fmin=fmin, fmax=fmax, sr=sr,
                     frame_length=N_FFT, hop_length=HOP)
    voiced_mask = np.isfinite(f0)
    voiced_frac = float(np.mean(voiced_mask)) if f0.size else 0.0
    median_f0 = float(np.nanmedian(f0)) if np.any(voiced_mask) else 0.0

    # --- NEW: reject steady hums or constant tones ---
    if np.std(f0[np.isfinite(f0)]) < 3.0:   # <3 Hz variation ⇒ constant tone
        voiced_frac = 0.0                    # treat as unvoiced/silent
        median_f0 = 0.0

    return voiced_frac, median_f0

# ----------------- FastAPI route -----------------
@app.post("/compare")
async def compare(request: CompareRequest):
    try:
        # 1) Load raw user waveform FIRST (no NR/HPSS yet)
        y_user, sr_user = librosa.load(
            request.userSongPath, sr=SR, mono=True, dtype=np.float32
        )

        # 2) Hard gate on voiced pitch presence (YIN)
        vf, f0_med = voiced_fraction_yin(y_user, sr_user)
        logging.info(f"[YIN gate] voiced_frac={vf:.3f}  median_f0={f0_med:.1f} Hz")

        if vf < 0.10 or f0_med < 80:  # low voiced % OR low constant hum pitch
            return JSONResponse({
                "success": True,
                "data": {
                    "mistakes": [],
                    "finalScore": 0.0,
                    "qualityTier": "No Singing Detected",
                    "message": "No valid singing detected (likely background hum or silence)."
                }
            })

        # Reject if almost no voiced frames (noise/hiss/silence)
        if vf < 0.10:
            return JSONResponse({
                "success": True,
                "data": {
                    "mistakes": [],
                    "finalScore": 0.0,
                    "qualityTier": "No Singing Detected",
                    "message": "No voiced singing detected in your recording."
                }
            })

        # 3) Parallel feature extraction
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
            f1 = ex.submit(extract_chroma_from_song, request.originalSongPath)
            f2 = ex.submit(extract_chroma_from_song, request.userSongPath)
            _, sr1, C_orig_raw, C_orig_unit, e_orig, rms_orig, flat_orig = f1.result()
            _, sr2, C_user_raw, C_user_unit, e_user, rms_user, flat_user = f2.result()

        # 4) Check vocal validity
        is_valid, vocal_quality, quality_reason = detect_vocal_quality(rms_user, flat_user, C_user_raw)

        total_energy = float(np.sum(rms_user))
        avg_rms = float(np.mean(rms_user))
        peak_chroma = float(np.max(C_user_raw))
        logging.info(f"Silence check | total_energy={total_energy:.6f} | avg_rms={avg_rms:.6f} | peak_chroma={peak_chroma:.6e}")

        if total_energy < 0.5 or avg_rms < 0.0015 or peak_chroma < 1e-6:
            return JSONResponse({
                "success": True,
                "data": {
                    "mistakes": [],
                    "finalScore": 0.0,
                    "qualityTier": "No Singing Detected",
                    "message": "Your recording contains no audible singing or voice energy."
                }
            })

        if not is_valid:
            return JSONResponse({
                "success": True,
                "data": {
                    "mistakes": [],
                    "finalScore": 0.0,
                    "qualityTier": "Invalid Recording",
                    "message": quality_reason,
                    "debug": {
                        "is_valid_vocal": False,
                        "vocal_quality_score": round(vocal_quality, 3),
                        "rejection_reason": quality_reason,
                        "avg_rms": round(avg_rms, 4),
                        "avg_spectral_flatness": round(float(np.mean(flat_user)), 3)
                    }
                }
            })

        # 5) Key-shift compensation
        key_o = int(np.argmax(np.sum(C_orig_unit, axis=1)))
        key_u = int(np.argmax(np.sum(C_user_unit, axis=1)))
        shift = key_u - key_o
        C_user_unit = np.roll(C_user_unit, -shift, axis=0)
        C_user_raw  = np.roll(C_user_raw,  -shift, axis=0)

        # 6) DTW accuracy
        accuracy, path, eff_nd, nd_self, nd_pair = dtw_calibrated_accuracy(
            C_orig_unit, C_user_unit, alpha=ALPHA, k=K_DECAY
        )

        # 7) Mistake detection
        mistakes = []
        for m in detect_mistake_points(C_orig_unit, C_user_unit, path, sr1):
            reason = m["reason"]
            duration = m["duration"]
            st = m.get("start_time", 0.0)
            et = st + duration
            severity = m.get("severity", 1)
            description = m.get("description", "")

            if reason == 'missing':
                pitch_diff = 0.0
            else:
                exp_midi = m.get('expected_midi', 60)
                act_midi = m.get('actual_midi', 60)
                pitch_diff = abs(freq_from_midi(exp_midi) - freq_from_midi(act_midi))

            mistakes.append({
                "reason": reason,
                "description": description,
                "severity": severity,
                "start_time": round(st, 2),
                "end_time": round(et, 2),
                "duration": duration,
                "semitone_difference": m.get("semitone_diff", 0),
                "pitch_diff": round(pitch_diff, 2),
                "frames": m.get("frames", 0)
            })

        mistake_frames = int(sum(m['frames'] for m in mistakes))
        total_mistakes = len(mistakes)

        # 8) Voiced gating
        thr_user = float(np.percentile(e_user, VOICED_PCT_USER)) if len(e_user) > 0 else 0.01
        thr_orig = float(np.percentile(e_orig, VOICED_PCT_ORIG)) if len(e_orig) > 0 else 0.01
        voiced_frames = sum(
            1 for oi, ui in path
            if (oi < len(e_orig) and ui < len(e_user) and 
                e_orig[oi] > thr_orig and e_user[ui] > thr_user)
        )

        if voiced_frames > 0:
            ratio = min(1.0, mistake_frames / max(1, voiced_frames))
            base_accuracy = 100.0 * (1.0 - MISTAKE_SLOPE * ratio)
        else:
            base_accuracy = 0.0

        # 9) NAS + other metrics
        nas, nas_count, avg_pitch_error, correct_pct = note_agreement_score(
            C_orig_raw, C_user_raw, path, e_orig, e_user, thr_orig, thr_user
        )
        nas_score = 100.0 * nas
        timing_penalty = compute_timing_penalty(path, sr1, hop_length=HOP)
        key_penalty = abs(shift) * KEY_SHIFT_PENALTY_PER_STEP
        r = energy_correlation_along_path(e_orig, e_user, path)
        energy_corr_penalty = (1.0 - max(0.0, r)) * 3.5

        # 10) Adaptive mistake penalty
        MAJOR_REASONS = {"too-high-major", "too-low-major"}
        NORMAL_REASONS = {"too-high", "too-low", "slightly-high", "slightly-low", "extra", "missing"}

        major_count = sum(1 for m in mistakes if m["reason"] in MAJOR_REASONS)
        normal_count = total_mistakes - major_count

        major_weight = 1.3
        normal_weight = 0.8

        weighted_total = (major_count * major_weight) + (normal_count * normal_weight)
        mistake_penalty = (weighted_total ** 1.05) * MISTAKE_PENALTY_WEIGHT * 1.3 

        # Extra penalty for missing notes
        missing_mistakes = sum(1 for m in mistakes if m['reason'] == 'missing')
        mistake_penalty += missing_mistakes * 2.0

        # Clamp range
        mistake_penalty = float(np.clip(mistake_penalty, 0.0, 35.0))

        # 11) Singing coverage
        sung_frames = np.sum(e_user > thr_user)
        total_frames_user = len(e_user)
        user_sing_ratio = sung_frames / max(1, total_frames_user)

        if user_sing_ratio > 0.6:
            mistake_penalty *= 0.75  # more forgiving for longer singing

        # 12) Final scoring
        base_score = (W_ACC * accuracy + W_NAS * nas_score + W_BASE * base_accuracy)
        penalized_score = base_score - timing_penalty - key_penalty - energy_corr_penalty - mistake_penalty

        mistake_ratio = mistake_frames / max(1, voiced_frames) if voiced_frames > 0 else 0.0
        is_self_match = (eff_nd < 0.08 and mistake_ratio < 0.02 and accuracy > 98 and total_mistakes == 0)

        if is_self_match:
            final = 99.0 + min(1.0, (100.0 - penalized_score) / 10.0)
            quality_tier = "Perfect Match"
        else:
            pitch_quality = max(0.0, 1.0 - (avg_pitch_error / 5.0))
            note_quality = correct_pct
            overall_quality = (0.5 * pitch_quality + 0.5 * note_quality)
            overall_quality *= vocal_quality

            centered = penalized_score - 50.0
            spread_score = 50.0 + (centered * SCORE_SPREAD_FACTOR)

            if overall_quality > 0.75 and mistake_ratio < 0.20 and total_mistakes < 15:
                final = spread_score + 10.0
                quality_tier = "Good"
            elif overall_quality > 0.55 and mistake_ratio < 0.35 and total_mistakes < 26:
                final = spread_score + 5.0
                quality_tier = "Average"
            else:
                extra_penalty = mistake_ratio * 15.0 * POOR_PENALTY_MULTIPLIER
                final = spread_score - extra_penalty - 5.0
                quality_tier = "Needs Practice"

        # Coverage penalty (short recordings)
        if user_sing_ratio < 0.3:
            final *= 0.4
            quality_tier = "Too Little Singing"
        elif user_sing_ratio < 0.5:
            final *= 0.7
            quality_tier = "Low Singing Activity"
        elif user_sing_ratio < 0.7:
            final *= 0.9

        user_duration_sec = len(e_user) * HOP / SR
        if user_duration_sec < 30:
            return JSONResponse({
                "success": True,
                "data": {
                    "mistakes": [],
                    "finalScore": 0.0,
                    "qualityTier": "Recording Too Short",
                    "message": "Recording too short — need at least 45 seconds."
                }
            })

        if vocal_quality < 0.3 or user_sing_ratio < 0.2:
            return JSONResponse({
                "success": True,
                "data": {
                    "mistakes": [],
                    "finalScore": 0.0,
                    "qualityTier": "No Singing Detected",
                    "message": "No clear singing detected in your recording."
                }
            })

        # --- Duration credibility adjustment ---
        expected_duration_sec = len(e_orig) * HOP / SR
        user_duration_sec = len(e_user) * HOP / SR
        coverage_ratio = min(1.0, user_duration_sec / expected_duration_sec)

        # Strong penalty for very short recordings
        if user_duration_sec < 20:
            final *= 0.1
            quality_tier = "Recording Too Short"
        elif user_duration_sec < 35:
            final *= 0.4
            quality_tier = "Too Short to Evaluate"
        elif user_duration_sec < expected_duration_sec * 0.4:
            final *= 0.7
            quality_tier = "Partial Recording"

        # --- Consistency check: penalize random energy bursts (non-singing speech) ---
        rms_std = float(np.std(rms_user))
        energy_var = float(np.var(e_user))
        if rms_std > 0.1 and energy_var > 0.02:
            logging.warning("Detected inconsistent energy pattern (possible speech or noise).")
            final *= 0.8
            quality_tier = "Unstable Recording"

        # --- Reward credible full recordings ---
        if coverage_ratio > 0.9 and user_duration_sec > 60:
            final *= 1.05  # small bonus for full credible song
            final = min(final, 100.0)

        # 13) Clamp score and log
        final = float(np.clip(final, 0.0, 100.0))

        mistake_summary = {}
        for m in mistakes:
            reason = m['reason']
            if reason not in mistake_summary:
                mistake_summary[reason] = {
                    "count": 0,
                    "total_duration": 0.0,
                    "description": m.get('description', '')
                }
            mistake_summary[reason]["count"] += 1
            mistake_summary[reason]["total_duration"] += m['duration']

        logging.info(f"=== SCORING DEBUG ===")
        logging.info(f"Vocal Quality: {vocal_quality:.3f}")
        logging.info(f"Total Mistakes: {total_mistakes}")
        logging.info(f"Mistake Penalty: {mistake_penalty:.2f}")
        logging.info(f"Penalties | Timing={timing_penalty:.2f}, Key={key_penalty:.2f}, Energy={energy_corr_penalty:.2f}")
        logging.info(f"DTW Acc: {accuracy:.2f}, NAS: {nas_score:.2f}, BaseAcc: {base_accuracy:.2f}")
        logging.info(f"Final Score: {final:.2f} | Quality: {quality_tier}")
        logging.info(f"User duration: {user_duration_sec:.2f}s | Singing coverage: {user_sing_ratio:.2f}")
        logging.info(f"=====================")

        return JSONResponse({
            "success": True,
            "data": {
                "mistakes": mistakes,
                "mistakeSummary": mistake_summary,
                "finalScore": round(final, 2),
                "qualityTier": quality_tier,
                "message": "Comparison completed successfully",
            }
        })

    except Exception as e:
        logging.error(f"Error in compare: {str(e)}", exc_info=True)
        return JSONResponse(status_code=400, content={
            "success": False,
            "message": str(e)
        })

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
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
W_ACC  = 0.50   # favor DTW alignment more
W_NAS  = 0.30
W_BASE = 0.20

# Mistake detection - MORE AGGRESSIVE
MISTAKE_SLOPE   = 0.65  # was 0.65 - steeper penalty for mistakes
MIN_GAP         = 0.2  # was 0.35 - detect shorter mistakes
ENERGY_THRESH   = 0.06  # was 0.12 - lower threshold to catch more mistakes
SEMITONE_THRESH = 2.0  # was 2.0 - stricter pitch detection

# Penalties - STRONGER
TIMING_PENALTY_FACTOR = 8  # was 8
TIMING_MAX_PENALTY = 10    # was 10
KEY_SHIFT_PENALTY_PER_STEP = 0.04  # was 0.04 - doubled

# Score calibration - BIGGER SPREAD
SCORE_SPREAD_FACTOR = 1.3  # was 1.3 - more spread between good/bad
POOR_PENALTY_MULTIPLIER = 2.0  # was 1.5 - harsher on poor performance

# NEW: Mistake severity penalties
MISTAKE_PENALTY_WEIGHT = 0.5 

# Voiced gating thresholds
VOICED_PCT_USER = 25
VOICED_PCT_ORIG = 25

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
    return interval in [0, 7, 5, 4, 3]

def classify_pitch_error(expected_midi, actual_midi):
    """
    Classify the type of pitch error with detailed feedback
    Returns: (reason, severity, description)
    """
    semitone_diff = actual_midi - expected_midi
    abs_diff = abs(semitone_diff)
    
    # Check if it's harmonically related (acceptable)
    if is_harmonic(expected_midi, actual_midi):
        return None, 0, "harmonic"
    
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
    Enhanced mistake detection with detailed pitch classification
    """
    mistakes = []
    cur = None
    e_user = np.sum(user_unit, axis=0)
    e_orig = np.sum(orig_unit, axis=0)
    thr_user = float(np.max(e_user)) * energy_threshold if len(e_user) > 0 else 0.01
    thr_orig = float(np.max(e_orig)) * energy_threshold if len(e_orig) > 0 else 0.01

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
        
        # Check for missing notes (user not singing when they should)
        if eo > thr_orig and eu < thr_user:
            reason = "missing"
            severity = 2
            description = "Note not sung"
        elif eo > thr_orig and eu > thr_user:
            # Both singing - check for pitch errors
            reason, severity, description = classify_pitch_error(exp_midi, act_midi)
        
        if reason:
            # Merge consecutive mistakes of the same type
            if cur and cur['reason'] == reason and (t - cur['end_time']) < min_gap:
                cur['end_time'] = t
                cur['frames'] += 1
                cur['severity'] = max(cur['severity'], severity)
            else:
                # Save previous mistake if it exists and is long enough
                if cur:
                    dur = cur['end_time'] - cur['start_time']
                    if dur >= min_gap:
                        mistakes.append({**cur, "duration": round(dur, 2)})
                
                # Start new mistake
                cur = {
                    "start_time": t,
                    "end_time": t,
                    "expected_note": exp_idx,
                    "actual_note": act_idx,
                    "expected_midi": exp_midi,
                    "actual_midi": act_midi,
                    "semitone_diff": act_midi - exp_midi,
                    "reason": reason,
                    "severity": severity,
                    "description": description,
                    "frames": 1
                }
        else:
            # No mistake - save previous if it exists
            if cur:
                dur = cur['end_time'] - cur['start_time']
                if dur >= min_gap:
                    mistakes.append({**cur, "duration": round(dur, 2)})
                cur = None

    # Don't forget the last mistake
    if cur:
        dur = cur['end_time'] - cur['start_time']
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
    if avg_rms < 0.002:
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
    
    quality_score = min(1.0, quality_score * 1.25)
    return True, float(quality_score), "Valid vocal detected"

# ----------------- FastAPI route -----------------
@app.post("/compare")
async def compare(request: CompareRequest):
    try:
        # Parallel extraction
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
            f1 = ex.submit(extract_chroma_from_song, request.originalSongPath)
            f2 = ex.submit(extract_chroma_from_song, request.userSongPath)
            _, sr1, C_orig_raw, C_orig_unit, e_orig, rms_orig, flat_orig = f1.result()
            _, sr2, C_user_raw, C_user_unit, e_user, rms_user, flat_user = f2.result()

        # Check if user audio contains actual vocals
        is_valid, vocal_quality, quality_reason = detect_vocal_quality(rms_user, flat_user, C_user_raw)
        
        if not is_valid:
            logging.warning(f"Invalid vocal detected: {quality_reason}")
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
                        "avg_rms": round(float(np.mean(rms_user)), 4),
                        "avg_spectral_flatness": round(float(np.mean(flat_user)), 3)
                    }
                }
            })

        # Key-shift compensation
        key_o = int(np.argmax(np.sum(C_orig_unit, axis=1)))
        key_u = int(np.argmax(np.sum(C_user_unit, axis=1)))
        shift = key_u - key_o
        C_user_unit = np.roll(C_user_unit, -shift, axis=0)
        C_user_raw  = np.roll(C_user_raw,  -shift, axis=0)

        # Calibrated DTW accuracy
        accuracy, path, eff_nd, nd_self, nd_pair = dtw_calibrated_accuracy(
            C_orig_unit, C_user_unit, alpha=ALPHA, k=K_DECAY
        )

        # Enhanced mistakes detection
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
                "pitch_diff_hz": round(pitch_diff, 2),
                "frames": m.get("frames", 0)
            })

        mistake_frames = int(sum(m['frames'] for m in mistakes))
        total_mistakes = len(mistakes)

        # Voiced gating
        thr_user = float(np.percentile(e_user, VOICED_PCT_USER)) if len(e_user) > 0 else 0.01
        thr_orig = float(np.percentile(e_orig, VOICED_PCT_ORIG)) if len(e_orig) > 0 else 0.01
        voiced_frames = sum(
            1 for oi, ui in path
            if (oi < len(e_orig) and ui < len(e_user) and 
                e_orig[oi] > thr_orig and e_user[ui] > thr_user)
        )

        # Base accuracy with stronger mistake penalty
        if voiced_frames > 0:
            ratio = min(1.0, mistake_frames / max(1, voiced_frames))
            base_accuracy = 100.0 * (1.0 - MISTAKE_SLOPE * ratio)
        else:
            base_accuracy = 50.0
        base_accuracy = float(np.clip(base_accuracy, 0.0, 100.0))

        # NAS with detailed metrics
        nas, nas_count, avg_pitch_error, correct_pct = note_agreement_score(
            C_orig_raw, C_user_raw, path, e_orig, e_user, thr_orig, thr_user
        )
        nas_score = 100.0 * nas

        # Penalties - INCREASED
        timing_penalty = compute_timing_penalty(path, sr1, hop_length=HOP)
        key_penalty = abs(shift) * KEY_SHIFT_PENALTY_PER_STEP
        r = energy_correlation_along_path(e_orig, e_user, path)
        energy_corr_penalty = (1.0 - max(0.0, r)) * 3.5

        # NEW: Direct mistake penalty (per mistake, not per frame)
        mistake_penalty = total_mistakes * MISTAKE_PENALTY_WEIGHT
        if total_mistakes > 15:
            mistake_penalty *= 1.1  # Extra penalty for many mistakes
        if total_mistakes > 24:
            mistake_penalty *= 1.2
        if total_mistakes > 30:
            mistake_penalty *= 1.5

        mistake_ratio = mistake_frames / max(1, voiced_frames) if voiced_frames > 0 else 0.0

        # Scoring system with better separation
        base_score = (W_ACC * accuracy + W_NAS * nas_score + W_BASE * base_accuracy)
        penalized_score = base_score - timing_penalty - key_penalty - energy_corr_penalty - mistake_penalty
        
        is_self_match = (eff_nd < 0.08 and mistake_ratio < 0.02 and accuracy > 98 and total_mistakes == 0)
        
        if is_self_match:
            final = 99.0 + min(1.0, (100.0 - penalized_score) / 10.0)
            quality_tier = "Perfect Match"
        else:
            pitch_quality = max(0.0, 1.0 - (avg_pitch_error / 5.0))  # stricter
            note_quality = correct_pct
            overall_quality = (0.5 * pitch_quality + 0.5 * note_quality)
            overall_quality *= vocal_quality
            
            centered = penalized_score - 50.0
            spread_score = 50.0 + (centered * SCORE_SPREAD_FACTOR)
            logging.debug(f"Spread Score: {spread_score}, Centered: {centered}")
            
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
            
        # clamp to 0-100
        final = float(np.clip(final, 0.0, 100.0))
        
        # Generate mistake summary by type
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
        logging.info(f"Mistake Summary: {mistake_summary}")
        logging.info(f"DTW Acc: {accuracy:.2f}, NAS: {nas_score:.2f}, Base: {base_accuracy:.2f}")
        logging.info(f"Mistake Penalty: {mistake_penalty:.2f}")
        logging.info(f"Final Score: {final:.2f} | Quality: {quality_tier}")
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
import uvicorn
import numpy as np
import librosa
from fastdtw import fastdtw
from scipy.spatial.distance import cosine, euclidean
import concurrent.futures
import logging
import noisereduce as nr
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)

app = FastAPI()

# ----------------- Pydantic schema -----------------
class CompareRequest(BaseModel):
    originalSongPath: str
    userSongPath: str

# ----------------- Utility functions -----------------
def extract_chroma_from_song(song_path):
    y, sr = librosa.load(song_path, sr=None)
    y_denoised = nr.reduce_noise(y=y, sr=sr, prop_decrease=0.95)
    y_harmonic, _ = librosa.effects.hpss(y_denoised)
    chroma = librosa.feature.chroma_stft(y=y_harmonic, sr=sr, n_fft=4096, hop_length=512)
    return y, sr, chroma

def hybrid_distance(x, y, alpha=0.5):
    if np.isnan(x).any() or np.isnan(y).any():
        return 1e6
    if np.linalg.norm(x) == 0 or np.linalg.norm(y) == 0:
        return 1e6
    return alpha * cosine(x, y) + (1 - alpha) * euclidean(x, y)

def compare_chroma_fastdtw(original_chroma, user_chroma):
    distance, path = fastdtw(original_chroma.T, user_chroma.T, dist=hybrid_distance)
    normalized_distance = distance / len(path)
    accuracy = 100 * np.exp(-normalized_distance)
    accuracy = np.clip(accuracy, 0, 100)
    return accuracy, path

def is_harmonic(note1, note2):
    interval = abs(note1 - note2) % 12
    return interval in [0, 7, 5, 4, 3]

def compute_timing_penalty(path, sr, hop_length=512, max_allowed_delay=0.8, penalty_factor=25, max_penalty=35, large_delay_cap=3):
    delays = [(user_idx - orig_idx) * hop_length / sr for orig_idx, user_idx in path]
    if not delays:
        return 0
    median_delay = np.nanmedian(delays)
    delay_abs = abs(median_delay)
    delay_std = np.nanstd(delays)

    if delay_abs > large_delay_cap:
        median_penalty = 5
    else:
        excess_delay = max(0, delay_abs - max_allowed_delay)
        median_penalty = penalty_factor * np.log1p(excess_delay)
        median_penalty = min(median_penalty, max_penalty)

    variability_penalty = min(delay_std * penalty_factor, max_penalty - median_penalty)
    total_penalty = min(median_penalty + variability_penalty, max_penalty)
    return total_penalty

def detect_mistake_points(original_chroma, user_chroma, path, sr, hop_length=512, min_gap=0.25, energy_threshold=0.15, semitone_threshold=1):
    mistakes = []
    current_mistake = None
    max_energy = np.max(np.sum(user_chroma, axis=0))
    dynamic_threshold = max_energy * energy_threshold

    for orig_idx, user_idx in path:
        if orig_idx >= original_chroma.shape[1] or user_idx >= user_chroma.shape[1]:
            continue

        energy = np.sum(user_chroma[:, user_idx])
        time = user_idx * hop_length / sr

        orig_note_idx = np.argmax(original_chroma[:, orig_idx])
        user_note_idx = np.argmax(user_chroma[:, user_idx])

        orig_midi = 60 + orig_note_idx
        user_midi = 60 + user_note_idx
        semitone_diff = abs(orig_midi - user_midi)

        if energy < dynamic_threshold:
            reason = "missing"
        elif semitone_diff >= semitone_threshold and not is_harmonic(orig_midi, user_midi):
            reason = "off-key"
        else:
            reason = None

        if reason:
            if current_mistake and current_mistake['reason'] == reason:
                current_mistake['end_time'] = time
                current_mistake['frames'] += 1
            else:
                if current_mistake:
                    duration = current_mistake['end_time'] - current_mistake['start_time']
                    if duration > min_gap:
                        mistakes.append({**current_mistake, "duration": round(duration, 2)})
                current_mistake = {
                    "start_time": time,
                    "end_time": time,
                    "expected_note": orig_note_idx,
                    "actual_note": user_note_idx,
                    "reason": reason,
                    "frames": 1
                }
        else:
            if current_mistake:
                duration = current_mistake['end_time'] - current_mistake['start_time']
                if duration > min_gap:
                    mistakes.append({**current_mistake, "duration": round(duration, 2)})
                current_mistake = None

    if current_mistake:
        duration = current_mistake['end_time'] - current_mistake['start_time']
        if duration > min_gap:
            mistakes.append({**current_mistake, "duration": round(duration, 2)})

    return mistakes

def freq_from_midi(midi_num):
    return 440.0 * (2 ** ((midi_num - 69) / 12))

# ----------------- FastAPI route -----------------
@app.post("/compare")
async def compare(request: CompareRequest):
    try:
        y1, sr1, original_chroma = extract_chroma_from_song(request.originalSongPath)
        y2, sr2, user_chroma = extract_chroma_from_song(request.userSongPath)

        if sr1 != sr2:
            y2 = librosa.resample(y2, orig_sr=sr2, target_sr=sr1)
            sr2 = sr1

        # Pitch shift compensation
        original_key = np.argmax(np.sum(original_chroma, axis=1))
        user_key = np.argmax(np.sum(user_chroma, axis=1))
        shift = user_key - original_key
        user_chroma = np.roll(user_chroma, -shift, axis=0)

        # DTW alignment
        accuracy, path = compare_chroma_fastdtw(original_chroma, user_chroma)

        # Mistake detection
        mistakes = []
        for mistake in detect_mistake_points(original_chroma, user_chroma, path, sr1):
            duration = mistake['duration']
            reason = mistake['reason']

            if reason == 'missing':
                pitch_diff = 0.0
                penalty = duration * 10
            else:
                expected_midi = 60 + mistake['expected_note']
                actual_midi = 60 + mistake['actual_note']
                expected_freq = freq_from_midi(expected_midi)
                actual_freq = freq_from_midi(actual_midi)
                pitch_diff = abs(expected_freq - actual_freq)
                penalty = duration * min(pitch_diff / 1000, 1) * 10

            mistakes.append({
                "reason": reason,
                "duration": duration,
                "pitch_diff": round(pitch_diff, 2),
                "penalty": round(penalty, 2)
            })

        # Score calculation
        mistake_frames = sum(m['frames'] for m in detect_mistake_points(original_chroma, user_chroma, path, sr1))
        voiced_frames = sum(1 for _, user_idx in path if np.sum(user_chroma[:, user_idx]) > 0.1)
        base_accuracy = 100 * (1 - mistake_frames / voiced_frames) if voiced_frames > 0 else 0
        timing_penalty = compute_timing_penalty(path, sr1)
        pitch_shift_penalty = abs(shift) * 2

        final_score = max(0.0, base_accuracy - timing_penalty - pitch_shift_penalty)

        return JSONResponse({
            "success": True,
            "data": {
                "mistakes": mistakes,
                "finalScore": round(final_score, 2)
            }
        })

    except Exception as e:
        return JSONResponse(status_code=400, content={
            "success": False,
            "message": str(e)
        })

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)

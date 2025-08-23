import sys
import numpy as np
import librosa
from fastdtw import fastdtw
from scipy.spatial.distance import cosine, euclidean
import concurrent.futures
import logging
import noisereduce as nr

logging.basicConfig(level=logging.INFO)

def extract_chroma_from_song(song_path):
    try:
        y, sr = librosa.load(song_path, sr=None)  # Preserve original sampling rate
        # Apply noise reduction aggressively for clearer harmonic extraction
        y_denoised = nr.reduce_noise(y=y, sr=sr, prop_decrease=0.95)
        y_harmonic, _ = librosa.effects.hpss(y_denoised) #separate harmonic components
        chroma = librosa.feature.chroma_stft(y=y_harmonic, sr=sr, n_fft=4096, hop_length=512)
        return y, sr, chroma
    except Exception as e:
        logging.error(f"Error extracting chroma from {song_path}: {e}")
        return None, None, None

def hybrid_distance(x, y, alpha=0.5):
    # Weighted blend of cosine and euclidean distances for better nuance
    if np.isnan(x).any() or np.isnan(y).any():
        return 1e6
    if np.linalg.norm(x) == 0 or np.linalg.norm(y) == 0:
        return 1e6
    return alpha * cosine(x, y) + (1 - alpha) * euclidean(x, y)

def is_silent(y, sr, start_frame, end_frame, rms_threshold=0.015, frame_length=2048, hop_length=512):
    if y is None:
        return True
    start_sample = start_frame * hop_length
    end_sample = end_frame * hop_length
    segment = y[start_sample:end_sample]
    if len(segment) == 0:
        return True
    rms = librosa.feature.rms(y=segment, frame_length=frame_length, hop_length=hop_length)
    avg_rms = np.mean(rms)
    return avg_rms < rms_threshold

def compare_chroma_fastdtw(original_chroma, user_chroma):
    if original_chroma.shape[1] < 2 or user_chroma.shape[1] < 2:
        logging.error(f"Segment too small for comparison ({original_chroma.shape[1]} vs {user_chroma.shape[1]}).")
        return 0, []

    # Ensure both chroma arrays are the same length
    min_length = min(original_chroma.shape[1], user_chroma.shape[1])
    original_chroma = original_chroma[:, :min_length]
    user_chroma = user_chroma[:, :min_length]

    if np.any(np.isnan(original_chroma)) or np.any(np.isnan(user_chroma)):
        logging.error("Chroma data contains NaNs.")
        return 0, []

    try:
        distance, path = fastdtw(original_chroma.T, user_chroma.T, dist=hybrid_distance)
        normalized_distance = distance / len(path)
        accuracy = 100 * np.exp(-normalized_distance)
        accuracy = np.clip(accuracy, 0, 100)
        return accuracy, path
    except Exception as e:
        logging.error(f"DTW comparison failed: {e}")
        return 0, []

def process_segment(original_chroma, user_chroma, start_idx, segment_size, y1=None, y2=None, sr=None):
    end_idx = start_idx + segment_size

    # Skip silent segments in both recordings
    if y1 is not None and y2 is not None and sr is not None:
        if is_silent(y1, sr, start_idx, end_idx) and is_silent(y2, sr, start_idx, end_idx):
            return 0

    original_segment = original_chroma[:, start_idx:end_idx]
    user_segment = user_chroma[:, start_idx:end_idx]

    # Skip too short segments
    if original_segment.shape[1] < 30 or user_segment.shape[1] < 30:
        return 0

    accuracy, _ = compare_chroma_fastdtw(original_segment, user_segment)
    return accuracy

def compare_chroma_with_parallel_dtw(original_chroma, user_chroma, y1=None, y2=None, sr=None, num_threads=6, segment_size=600):
    total_segments = original_chroma.shape[1] // segment_size
    accuracy_list = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [
            executor.submit(process_segment, original_chroma, user_chroma, i, segment_size, y1, y2, sr)
            for i in range(0, total_segments * segment_size, segment_size)
        ]
        for f in futures:
            result = f.result()
            if result > 0:
                accuracy_list.append(result)

    if accuracy_list:
        overall_accuracy = np.mean(accuracy_list)
        logging.info(f"Overall accuracy: {overall_accuracy:.2f}%")
        return overall_accuracy
    else:
        logging.error("No valid segments processed.")
        return 0

def is_harmonic(note1, note2):
    interval = abs(note1 - note2) % 12
    harmonics = [0, 7, 5, 4, 3]
    return interval in harmonics

def compute_timing_penalty(path, sr, hop_length, max_allowed_delay=0.8, penalty_factor=25, max_penalty=35, large_delay_cap=3):
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
    total_penalty = median_penalty + variability_penalty
    total_penalty = min(total_penalty, max_penalty)

    logging.info(f"Median timing delay: {median_delay:.2f}s, Timing std dev: {delay_std:.2f}s, Penalty: {total_penalty:.2f}")

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
            if current_mistake and current_mistake['reason'] == reason and current_mistake['expected_note'] == orig_note_idx:
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

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def note_name_from_midi(midi_num):
    octave = (midi_num // 12) - 1
    note = NOTE_NAMES[midi_num % 12]
    return f"{note}{octave}"

def freq_from_midi(midi_num):
    return 440.0 * (2 ** ((midi_num - 69) / 12))

def main():
    if len(sys.argv) < 3:
        print("Error: Missing audio paths", file=sys.stderr)
        return

    original_song_path = sys.argv[1]
    user_song_path = sys.argv[2]
    timing_penalty = 0.0
    pitch_shift_penalty = 0.0
    final_score = 100.0

    y1, sr1, original_chroma = extract_chroma_from_song(original_song_path)
    y2, sr2, user_chroma = extract_chroma_from_song(user_song_path)
    

    if original_chroma is None or user_chroma is None:
        logging.error("Could not extract chroma features from one or both songs.")
        return

    if original_chroma.shape[1] == 0 or user_chroma.shape[1] == 0:
        logging.error("One of the chroma arrays is empty.")
        return

    if sr1 != sr2:
        y2 = librosa.resample(y2, orig_sr=sr2, target_sr=sr1)
        sr2 = sr1

    try:
        original_key = np.argmax(np.sum(original_chroma, axis=1))
        user_key = np.argmax(np.sum(user_chroma, axis=1))
        shift = user_key - original_key
        logging.info(f"Pitch class shift: {shift}")
        user_chroma = np.roll(user_chroma, -shift, axis=0)
    except Exception as e:
        logging.error(f"Failed to compute pitch shift: {e}")
        return

    overall_accuracy = compare_chroma_with_parallel_dtw(original_chroma, user_chroma, y1, y2, sr1)

    accuracy, path = compare_chroma_fastdtw(original_chroma, user_chroma)

    mistakes = detect_mistake_points(original_chroma, user_chroma, path, sr=sr1, semitone_threshold=1)

    mistake_penalty = 0
    print("\n[DETAILS] 🎯 Mistake Segments:")

    for mistake in mistakes:
        duration = mistake['duration']
        reason = mistake['reason']

        if reason == 'missing':
            weight = 1.0
            pitch_diff = 0.0
            penalty = duration * weight * 10
        else:
            weight = 0.7 if reason == 'off-key' else 0.5
            expected_midi = 60 + mistake['expected_note']
            actual_midi = 60 + mistake['actual_note']

            expected_freq = freq_from_midi(expected_midi)
            actual_freq = freq_from_midi(actual_midi)

            pitch_diff = abs(expected_freq - actual_freq)
            pitch_penalty = min(pitch_diff / 1000, 1)
            penalty = duration * weight * pitch_penalty * 10

        mistake_penalty += penalty
        print(f"- Reason: {reason:<10} | Duration: {duration:.2f}s | Pitch diff: {pitch_diff:.2f} Hz | Penalty: {penalty:.2f}")

    total_frames = len(path)
    mistake_frames = sum(m['frames'] for m in mistakes)
    voiced_frames = sum(1 for _, user_idx in path if np.sum(user_chroma[:, user_idx]) > 0.1)

    base_accuracy = 100 * (1 - mistake_frames / voiced_frames) if voiced_frames > 0 else 0
    pitch_shift_penalty = abs(shift) * 2
    timing_penalty = compute_timing_penalty(path, sr1, hop_length=512, max_allowed_delay=0.8, penalty_factor=25) # avoid negative scores

    final_score = base_accuracy
    final_score -= timing_penalty + pitch_shift_penalty
    final_score = max(0.0, final_score)

    logging.info(f"Base accuracy: {base_accuracy:.2f}%")
    logging.info(f"Timing penalty: {timing_penalty:.2f}")
    # logging.info(f"Pitch shift penalty: {pitch_shift_penalty:.2f}")
    logging.info(f"Final score: {final_score:.2f}%")

if __name__ == "__main__":
    main()
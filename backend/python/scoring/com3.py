import numpy as np
import librosa
from fastdtw import fastdtw
from scipy.spatial.distance import cosine, euclidean
import concurrent.futures
import logging

logging.basicConfig(level=logging.INFO)

def extract_chroma_from_song(song_path):
    """Extract waveform and chroma features from an audio file."""
    try:
        y, sr = librosa.load(song_path)
        chroma = librosa.feature.chroma_cens(y=y, sr=sr)
        return y, sr, chroma
    except Exception as e:
        logging.error(f"Error extracting chroma from {song_path}: {e}")
        return None, None, None

def hybrid_distance(x, y, alpha=0.3):
    """Hybrid distance combining cosine and Euclidean."""
    return alpha * cosine(x, y) + (1 - alpha) * euclidean(x, y)

def compute_energy(chroma):
    """Sum of all chroma values - a proxy for energy."""
    return np.sum(chroma)

def compare_chroma_fastdtw(original_chroma, user_chroma):
    """Compare chroma features using Dynamic Time Warping (DTW)."""
    if original_chroma.shape[1] < 2 or user_chroma.shape[1] < 2:
        print(f"[ERROR] Segment too small, skipping. ({original_chroma.shape[1]} vs {user_chroma.shape[1]})")
        return 0, []

    min_length = min(original_chroma.shape[1], user_chroma.shape[1])
    original_chroma = original_chroma[:, :min_length]
    user_chroma = user_chroma[:, :min_length]

    if np.any(np.isnan(original_chroma)) or np.any(np.isnan(user_chroma)):
        print("[ERROR] Chroma data contains NaNs.")
        return 0, []

    try:
        distance, path = fastdtw(original_chroma.T, user_chroma.T, dist=hybrid_distance)
        normalized_distance = distance / len(path)

        # Exponential accuracy scaling (more realistic)
        accuracy = 100 * np.exp(-normalized_distance)
        accuracy = max(0, min(100, accuracy))

        return accuracy, path
    except Exception as e:
        print(f"[ERROR] DTW comparison failed: {e}")
        return 0, []

def process_segment(original_chroma, user_chroma, start_idx, segment_size):
    """Process and compare segments of original and user chroma."""
    original_segment = original_chroma[:, start_idx:start_idx+segment_size]
    user_segment = user_chroma[:, start_idx:start_idx+segment_size]

    # Skip low-energy or short segments
    if original_segment.shape[1] < 20 or user_segment.shape[1] < 20:
        return 0
    if compute_energy(original_segment) < 1e-3 or compute_energy(user_segment) < 1e-3:
        return 0

    accuracy, _ = compare_chroma_fastdtw(original_segment, user_segment)
    return accuracy

def compare_chroma_with_parallel_dtw(original_chroma, user_chroma, num_threads=4, segment_size=500):
    """Compare chroma features using parallel DTW."""
    total_segments = original_chroma.shape[1] // segment_size
    accuracy_list = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [
            executor.submit(process_segment, original_chroma, user_chroma, i, segment_size)
            for i in range(0, total_segments * segment_size, segment_size)
        ]
        results = [f.result() for f in futures]
        accuracy_list.extend(results)

    if accuracy_list:
        overall_accuracy = np.mean(accuracy_list)
        print(f"[INFO] Overall accuracy: {overall_accuracy:.2f}%")
        return overall_accuracy
    else:
        print("[ERROR] No valid segments processed.")
        return 0
    
NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F',
              'F#', 'G', 'G#', 'A', 'A#', 'B']

def note_name(index, default_octave=4):
    """Convert chroma index to note name with octave."""
    name = NOTE_NAMES[index % 12]
    return f"{name}{default_octave}"

    
def detect_mistake_points(original_chroma, user_chroma, path, sr, hop_length=512, min_gap=0.3, energy_threshold=0.1, semitone_threshold=1):
    """Detect mistake segments with timestamps, duration, and reasons."""
    mistakes = []
    current_mistake = None

    for i, (orig_idx, user_idx) in enumerate(path):
        orig_note_idx = np.argmax(original_chroma[:, orig_idx])
        user_note_idx = np.argmax(user_chroma[:, user_idx])
        energy = np.sum(user_chroma[:, user_idx])
        time = user_idx * hop_length / sr

        # Convert chroma note indexes to MIDI numbers (around C4 = MIDI 60)
        orig_midi = 60 + orig_note_idx
        user_midi = 60 + user_note_idx

        semitone_diff = abs(orig_midi - user_midi)

        # Relative energy threshold (10% of max energy)
        max_energy = np.max(np.sum(user_chroma, axis=0))
        dynamic_threshold = max_energy * 0.1  # adjust 0.1 → more or less strict

        if energy < dynamic_threshold:
            reason = "missing"

        elif semitone_diff >= semitone_threshold:
            reason = "off-key"
        else:
            reason = None  # Close enough

        if reason:
            if current_mistake and current_mistake['reason'] == reason and current_mistake['expected_note'] == orig_note_idx:
                current_mistake['end_time'] = time
                current_mistake['frames'] += 1
            else:
                if current_mistake:
                    duration = current_mistake['end_time'] - current_mistake['start_time']
                    if duration > min_gap:
                        mistakes.append({
                            **current_mistake,
                            "duration": round(duration, 2)
                        })
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
                    mistakes.append({
                        **current_mistake,
                        "duration": round(duration, 2)
                    })
                current_mistake = None

    if current_mistake:
        duration = current_mistake['end_time'] - current_mistake['start_time']
        if duration > min_gap:
            mistakes.append({
                **current_mistake,
                "duration": round(duration, 2)
            })

    return mistakes

def main():
    # original_song_path = 'output_directory/O-let-it-go/vocals.wav'
    # user_song_path = 'output_directory/C-let-it-go/vocals.wav'

    # original_song_path = 'output_directory/Ori_if_i_aint/vocals.wav'
    # user_song_path = 'output_directory/2covIf_Igot_u/vocals.wav'

    original_song_path = 'output_directory/Ori_if_i_aint/vocals.wav'
    user_song_path = 'output_directory/test/vocals.wav' 

    

    y1, sr1, original_chroma = extract_chroma_from_song(original_song_path)
    y2, sr2, user_chroma = extract_chroma_from_song(user_song_path)

    accuracy, path = compare_chroma_fastdtw(original_chroma, user_chroma)
    mistakes = detect_mistake_points(original_chroma, user_chroma, path, sr=sr1, semitone_threshold=1)


    print("\n[DETAILS] 🎯 Mistake Segments:")
    for m in mistakes:
        start = round(m['start_time'], 2)
        duration = m['duration']
        reason = m['reason']
        expected_note = librosa.note_to_hz(librosa.midi_to_note(60 + m['expected_note']))
        actual_note = librosa.note_to_hz(librosa.midi_to_note(60 + m['actual_note']))
        
        print(f"- At {start}s for {duration}s → Expected: {expected_note:.2f} Hz, "
              f"Got: {actual_note:.2f} Hz ({reason})")

    if original_chroma is None or user_chroma is None:
        print("[ERROR] Could not extract chroma features.")
        return

    if sr1 != sr2:
        print("[WARNING] Sample rates differ. This may affect alignment.")

    # --- Key shift alignment ---
    original_key = np.argmax(np.sum(original_chroma, axis=1))
    user_key = np.argmax(np.sum(user_chroma, axis=1))
    shift = user_key - original_key
    print(f"[INFO] Pitch class shift: {shift}")
    user_chroma = np.roll(user_chroma, -shift, axis=0)
    
    total_frames = len(path)

    # Count total mistake frames
    mistake_frames = sum(m['frames'] for m in mistakes)

    # Recalculate accuracy
    accuracy = 100 * (1 - mistake_frames / total_frames)

    # Final score with optional pitch shift penalty
    penalty = abs(shift) * 2
    final_score = max(0, accuracy - penalty)

    print(f"[INFO] Overall accuracy: {accuracy:.2f}%")
    print(f"[INFO] Final score after key shift penalty: {final_score:.2f}%")

    # Threshold decision
    if final_score >= 75:
        print("[RESULT] 🎵 Perfect cover!!")
    elif final_score >= 65:
        print("[RESULT] 🎤 Good cover!")
    else:
        print("[RESULT] 😬 Needs improvement.")

if __name__ == "__main__":
    main()
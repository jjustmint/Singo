import numpy as np
import librosa
from fastdtw import fastdtw
from scipy.spatial.distance import cosine, euclidean
import concurrent.futures
import os
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

def compare_chroma_fastdtw(original_chroma, user_chroma):
    def hybrid_distance(x, y, alpha=0.3):
        return alpha * cosine(x, y) + (1 - alpha) * euclidean(x, y)
    
    """Compare chroma features using Dynamic Time Warping (DTW)."""
    print(f"[DEBUG] Original Segment Shape: {original_chroma.shape}")
    print(f"[DEBUG] User Segment Shape: {user_chroma.shape}")

    # Ensure both segments have a minimum size
    if original_chroma.shape[1] < 2 or user_chroma.shape[1] < 2:
        print(f"[ERROR] Segment too small, skipping. ({original_chroma.shape[1]} vs {user_chroma.shape[1]})")
        return 0, []

    # Ensure both segments have matching lengths
    min_length = min(original_chroma.shape[1], user_chroma.shape[1])
    original_chroma = original_chroma[:, :min_length]
    user_chroma = user_chroma[:, :min_length]

    # Check for NaNs in chroma data
    if np.any(np.isnan(original_chroma)) or np.any(np.isnan(user_chroma)):
        print("[ERROR] Chroma data contains NaNs.")
        return 0, []

    # Perform DTW comparison
    try:
        print("[INFO] Running fastdtw comparison...")
        distance, path = fastdtw(original_chroma.T, user_chroma.T, dist=hybrid_distance)

        # Print debug info
        print(f"[DEBUG] Raw DTW Distance: {distance}")
        print(f"[DEBUG] DTW Path Length: {len(path)}")

        # Normalize the distance by the path length
        normalized_distance = distance / len(path)
        print(f"[DEBUG] Normalized Distance: {normalized_distance}")

        # Convert distance to accuracy
        accuracy = max(0, min(100, (1 - normalized_distance) * 100))
        return accuracy, path
    except Exception as e:
        print(f"[ERROR] DTW comparison failed: {e}")
        return 0, []

def process_segment(original_chroma, user_chroma, start_idx, segment_size):
    """Process and compare segments of original and user chroma."""
    original_segment = original_chroma[:, start_idx:start_idx+segment_size]
    user_segment = user_chroma[:, start_idx:start_idx+segment_size]
    accuracy, _ = compare_chroma_fastdtw(original_segment, user_segment)
    return accuracy

def compare_chroma_with_parallel_dtw(original_chroma, user_chroma, num_threads=4, segment_size=500):
    """Compare chroma features using parallel DTW."""
    total_segments = original_chroma.shape[1] // segment_size
    accuracy_list = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = []
        for i in range(0, total_segments * segment_size, segment_size):
            futures.append(executor.submit(process_segment, original_chroma, user_chroma, i, segment_size))

        # Collect the results from each future
        results = [f.result() for f in futures]
        for accuracy in results:
            accuracy_list.append(accuracy)

    # Calculate the overall accuracy (average of individual segment accuracies)
    if accuracy_list:
        overall_accuracy = np.mean(accuracy_list)
        print(f"[INFO] Overall accuracy: {overall_accuracy}%")
        return overall_accuracy
    else:
        print("[ERROR] No valid segments processed.")
        return 0

def main():
    original_song_path = 'output_directory/Ed Sheeran - Photograph (Official Lyric Video)/vocals.wav'
    user_song_path = 'output_directory/if_I_aint_cover/vocals.wav'

    # Load and extract chroma
    y1, sr1, original_chroma = extract_chroma_from_song(original_song_path)
    y2, sr2, user_chroma = extract_chroma_from_song(user_song_path)

    if original_chroma is None or user_chroma is None:
        print("[ERROR] Could not extract chroma features.")
        return

    # Optional: force same sample rate (librosa.load already handles this)
    if sr1 != sr2:
        print("[WARNING] Sample rates differ. This may affect alignment.")

    # --- KEY SHIFT ALIGNMENT HERE ---
    # Estimate dominant pitch class (like C, D, E...) of each
    original_key = np.argmax(np.sum(original_chroma, axis=1))
    user_key = np.argmax(np.sum(user_chroma, axis=1))

    # Compute shift and roll the user chroma to match original
    shift = user_key - original_key
    print(f"[INFO] Pitch class shift: {shift}")
    user_chroma = np.roll(user_chroma, -shift, axis=0)
    # --- END ALIGNMENT ---

    # Continue with debug and comparison
    print(f"[DEBUG] Original Chroma shape: {original_chroma.shape}")
    print(f"[DEBUG] User Chroma shape: {user_chroma.shape}")

    accuracy = compare_chroma_with_parallel_dtw(original_chroma, user_chroma)

    print(f"[INFO] Final accuracy: {accuracy}%")

if __name__ == "__main__":
    main()
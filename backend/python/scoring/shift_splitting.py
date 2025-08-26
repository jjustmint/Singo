import numpy as np
import librosa
import soundfile as sf
from spleeter.separator import Separator
import os
import glob

# === CONFIGURATION ===
input_directory = "input_directory"  # Folder with input songs
output_modified = "output_modified"  # Stores pitch-shifted versions
output_directory = "output_directory"  # Stores separated files (vocals, accompaniment)

# === PITCH SHIFT FUNCTION ===
def change_pitch_librosa(input_file, output_file, pitch_steps):
    """Loads an audio file, applies pitch shifting without changing speed, and saves it."""
    try:
        y, sr = librosa.load(input_file, sr=None)
        y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=pitch_steps)
        sf.write(output_file, y_shifted, sr)
        print(f"✅ Pitch-shifted {input_file} -> {output_file}")
    except Exception as e:
        print(f"❌ Error processing {input_file}: {e}")

# === CREATE PITCH-SHIFTED VERSIONS ===
def create_versions(input_audio, vocal_range_shifts, song_name):
    """Creates versions of the input audio with different pitch shifts."""
    song_output_folder = os.path.join(output_modified, song_name)
    os.makedirs(song_output_folder, exist_ok=True)

    output_files = []
    for pitch_steps, range_name in vocal_range_shifts:
        output_audio = os.path.join(song_output_folder, f"{song_name}_modified_{range_name}.mp3")
        change_pitch_librosa(input_audio, output_audio, pitch_steps)
        output_files.append(output_audio)
    
    return output_files

# === SEPARATE VOCALS & ACCOMPANIMENT ===
def separate_audio_files(audio_files, song_name):
    """Separates vocals/accompaniment and stores them correctly in output_directory/song_name/version/"""
    separator = Separator('spleeter:2stems', MWF=True)
    song_output_folder = os.path.join(output_directory, song_name)
    os.makedirs(song_output_folder, exist_ok=True)

    for file in audio_files:
        if os.path.exists(file):
            file_name = os.path.basename(file).split(".")[0]
            output_dir = os.path.join(song_output_folder, file_name)
            os.makedirs(output_dir, exist_ok=True)

            print(f"🔄 Running spleeter on: {file}, saving to: {output_dir}")
            try:
                separator.separate_to_file(file, output_dir)
                print(f"✅ Separated {file} -> {output_dir}")
            except Exception as e:
                print(f"❌ Error processing {file}: {e}")
        else:
            print(f"⚠️ File {file} not found, skipping.")

# === FIND LATEST AUDIO FILE ===
def get_audio_files(directory):
    """Returns all .mp3 files from the specified directory."""
    audio_files = glob.glob(os.path.join(directory, "*.mp3"))
    if audio_files:
        return audio_files
    else:
        print("⚠️ No audio files found in the directory.")
        return []

# === MAIN SCRIPT ===
if __name__ == "__main__":
    input_audio_files = get_audio_files(input_directory)

    if not input_audio_files:
        print("⚠️ No valid audio files found. Exiting.")
        exit(1)

    vocal_range_shifts = [
        (+1, "pitch_up_1"), (+2, "pitch_up_2"), (+3, "pitch_up_3"),
        (-1, "pitch_down_1"), (-2, "pitch_down_2"), (-3, "pitch_down_3")
    ]

    for input_audio in input_audio_files:
        song_name = os.path.basename(input_audio).split('.')[0]
        
        print(f"\n🎵 Processing: {song_name}")

        # Step 1: Create pitch-shifted versions
        created_files = create_versions(input_audio, vocal_range_shifts, song_name)
        
        # Step 2: Separate vocals/accompaniment
        separate_audio_files(created_files, song_name)

    print("\n✅ All processing complete!")

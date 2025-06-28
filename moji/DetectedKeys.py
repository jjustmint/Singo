import tkinter as tk
import numpy as np
import librosa
import sounddevice as sd
from collections import Counter
import threading

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
SAMPLE_RATE = 44100
DURATION = 5  # seconds

def freq_to_note_name(freq):
    if freq == 0 or freq is None:
        return None
    midi_num = int(round(69 + 12 * np.log2(freq / 440.0)))
    if midi_num < 0 or midi_num >= 128:
        return None
    note_name = NOTE_NAMES[midi_num % 12]
    return note_name

def detect_key(note_list):
    note_counter = Counter(note_list)
    most_common_notes = [note for note, count in note_counter.most_common(7)]
    return most_common_notes[0] if most_common_notes else "Unknown"

def detect_key_from_audio(audio_data, sample_rate):
    print("Running pitch tracking...")
    pitches, magnitudes = librosa.core.piptrack(y=audio_data, sr=sample_rate)
    print(f"Pitches shape: {pitches.shape}, Magnitudes shape: {magnitudes.shape}")
    detected_notes = []

    threshold = 0.1 * np.max(magnitudes)  # ignore low magnitude pitches

    for t in range(pitches.shape[1]):
        pitch = pitches[:, t]
        index = np.argmax(magnitudes[:, t])
        if magnitudes[index, t] < threshold:
            continue
        freq = pitch[index]
        if freq > 0:
            note = freq_to_note_name(freq)
            if note:
                detected_notes.append(note)

    print(f"Detected notes count: {len(detected_notes)}")
    detected_key = detect_key(detected_notes)
    print(f"Most common note (key): {detected_key}")
    return detected_key

def record_audio(duration, sample_rate):
    print("Recording...")
    audio_data = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1)
    sd.wait()
    print("Recording complete.")
    return audio_data.flatten()

class KeyDetectionApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Key Detection from Singing")
        self.root.geometry("400x300")
        self.root.config(bg="white")

        self.label = tk.Label(root, text="Sing for 5 seconds to Detect Key 🎤", font=("Arial", 14), bg="white")
        self.label.pack(pady=20)

        self.record_button = tk.Button(root, text="Start Recording", font=("Arial", 12), command=self.start_recording)
        self.record_button.pack(pady=10)

        self.result_label = tk.Label(root, text="", font=("Arial", 16), fg="blue", bg="white")
        self.result_label.pack(pady=20)

    def start_recording(self):
        self.record_button.config(state=tk.DISABLED)
        self.result_label.config(text="Recording... Please sing now.")
        threading.Thread(target=self.process_audio, daemon=True).start()

    def process_audio(self):
        try:
            audio_data = record_audio(DURATION, SAMPLE_RATE)
            print(f"Audio data length: {len(audio_data)}")
            if len(audio_data) == 0:
                self.update_result("No audio captured. Try again.")
                self.record_button.config(state=tk.NORMAL)
                return

            self.update_result("Analyzing... Please wait.")
            self.root.update()  # force GUI redraw so user sees this immediately

            print("Starting key detection...")
            key = detect_key_from_audio(audio_data, SAMPLE_RATE)
            print(f"Detected key: {key}")
            self.update_result(f"Detected Key: {key}")

        except Exception as e:
            self.update_result(f"Error: {str(e)}")
            print(f"Exception: {e}")
        finally:
            self.record_button.config(state=tk.NORMAL)

    def update_result(self, text):
        self.root.after(0, lambda: self.result_label.config(text=text))

if __name__ == "__main__":
    root = tk.Tk()
    app = KeyDetectionApp(root)
    root.mainloop()

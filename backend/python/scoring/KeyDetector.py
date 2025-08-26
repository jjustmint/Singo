from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import librosa
import sounddevice as sd
from collections import Counter
import logging
from fastapi.responses import JSONResponse
import uvicorn   # 👈 added

# -------------------- Setup --------------------
logging.basicConfig(level=logging.INFO)

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G',
              'G#', 'A', 'A#', 'B']
SAMPLE_RATE = 44100
DURATION = 5  # seconds

app = FastAPI(title="Key Detection API")

# -------------------- Helpers --------------------
def freq_to_note_name(freq: float):
    if freq == 0 or freq is None:
        return None
    midi_num = int(round(69 + 12 * np.log2(freq / 440.0)))
    if midi_num < 0 or midi_num >= 128:
        return None
    return NOTE_NAMES[midi_num % 12]

def detect_key(note_list):
    note_counter = Counter(note_list)
    most_common_notes = [note for note, _ in note_counter.most_common(7)]
    return most_common_notes[0] if most_common_notes else "Unknown"

def detect_key_from_audio(audio_data: np.ndarray, sample_rate: int):
    logging.info("Running pitch tracking...")
    pitches, magnitudes = librosa.core.piptrack(y=audio_data, sr=sample_rate)
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

    logging.info(f"Detected notes count: {len(detected_notes)}")
    return detect_key(detected_notes)

def record_audio(duration: int, sample_rate: int):
    logging.info("Recording...")
    audio_data = sd.rec(int(duration * sample_rate),
                        samplerate=sample_rate,
                        channels=1)
    sd.wait()
    logging.info("Recording complete.")
    return audio_data.flatten()

# -------------------- Schemas --------------------
class DetectResponse(BaseModel):
    success: bool
    detectedKey: Optional[str] = None
    message: Optional[str] = None

# -------------------- API Routes --------------------
@app.get("/keydetect", response_model=DetectResponse)
def record_and_detect():
    try:
        audio_data = record_audio(DURATION, SAMPLE_RATE)
        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="No audio captured.")
        
        detected_key = detect_key_from_audio(audio_data, SAMPLE_RATE)
        return DetectResponse(
            success=True,
            detectedKey=detected_key,
            message="Key detection successful."
        )
    except Exception as e:
        logging.error(f"Error: {str(e)}")
        return DetectResponse(success=False, message=str(e))

# -------------------- Entry Point --------------------
if __name__ == "__main__":
    uvicorn.run("KeyDetector:app", host="0.0.0.0", port=8081)
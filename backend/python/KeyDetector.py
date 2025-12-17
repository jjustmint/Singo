from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
import numpy as np
import librosa
import logging
from tempfile import NamedTemporaryFile
import shutil
import uvicorn

logging.basicConfig(level=logging.INFO)

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G',
              'G#', 'A', 'A#', 'B']
SAMPLE_RATE = 44100

app = FastAPI(title="Key Detection API")

def detect_key_librosa(audio_data: np.ndarray, sr: int):
    chroma = librosa.feature.chroma_cqt(y=audio_data, sr=sr)
    chroma_sum = np.sum(chroma, axis=1)
    tonic_index = np.argmax(chroma_sum)
    tonic_note = NOTE_NAMES[tonic_index]
    major_intervals = [0, 4, 7]
    minor_intervals = [0, 3, 7]
    major_score = sum(chroma_sum[(tonic_index + i) % 12] for i in major_intervals)
    minor_score = sum(chroma_sum[(tonic_index + i) % 12] for i in minor_intervals)
    mode = "major" if major_score >= minor_score else "minor"
    return f"{tonic_note} {mode}"

class DetectResponse(BaseModel):
    success: bool
    detectedKey: Optional[str] = None
    message: Optional[str] = None

@app.post("/keydetect", response_model=DetectResponse)
async def upload_and_detect(file: UploadFile = File(...)):
    try:
        with NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        audio_data, sr = librosa.load(tmp_path, sr=SAMPLE_RATE, mono=True)
        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="No audio data found.")
        detected_key = detect_key_librosa(audio_data, sr)
        return DetectResponse(
            success=True,
            detectedKey=detected_key,
            message="Key detection successful."
        )
    except Exception as e:
        logging.error(f"Error: {str(e)}")
        return DetectResponse(success=False, message=str(e))

if __name__ == "__main__":
    uvicorn.run("KeyDetector:app", host="0.0.0.0", port=8083)
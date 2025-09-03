from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
import numpy as np
import librosa
import logging
from tempfile import NamedTemporaryFile
import shutil
import uvicorn

# -------------------- Setup --------------------
logging.basicConfig(level=logging.INFO)

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G',
              'G#', 'A', 'A#', 'B']
SAMPLE_RATE = 44100

app = FastAPI(title="Key Detection API")

# -------------------- Helpers --------------------
def detect_key_librosa(audio_data: np.ndarray, sr: int):
    """
    Detect the key of a piece using a chromagram.
    Returns the most likely tonic note (C, C#, D, etc.)
    """
    # Compute chromagram using Constant-Q transform
    chroma = librosa.feature.chroma_cqt(y=audio_data, sr=sr)
    
    # Sum energy for each pitch class across all frames
    chroma_sum = np.sum(chroma, axis=1)
    
    # Find the most prominent pitch class
    tonic_index = np.argmax(chroma_sum)
    tonic_note = NOTE_NAMES[tonic_index]
    
    # Optional: estimate major/minor using simple heuristic
    # Compare sum of typical major vs minor triad positions
    major_intervals = [0, 4, 7]  # tonic, major third, perfect fifth
    minor_intervals = [0, 3, 7]  # tonic, minor third, perfect fifth
    
    major_score = sum(chroma_sum[(tonic_index + i) % 12] for i in major_intervals)
    minor_score = sum(chroma_sum[(tonic_index + i) % 12] for i in minor_intervals)
    
    mode = "major" if major_score >= minor_score else "minor"
    
    return f"{tonic_note} {mode}"

# -------------------- Schemas --------------------
class DetectResponse(BaseModel):
    success: bool
    detectedKey: Optional[str] = None
    message: Optional[str] = None

# -------------------- API Routes --------------------
@app.post("/keydetect", response_model=DetectResponse)
async def upload_and_detect(file: UploadFile = File(...)):
    try:
        # Save uploaded file temporarily
        with NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        # Load audio
        audio_data, sr = librosa.load(tmp_path, sr=SAMPLE_RATE, mono=True)
        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="No audio data found.")

        # Detect key
        detected_key = detect_key_librosa(audio_data, sr)

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
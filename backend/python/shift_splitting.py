import uvicorn
import os
import shutil
import librosa
import soundfile as sf
from fastapi import FastAPI, UploadFile, Form
from fastapi.responses import JSONResponse
from spleeter.separator import Separator
import requests

app = FastAPI()

BASE_DIR = "song"

# === CONFIGURATION ===
VOCAL_RANGE_SHIFTS = [
    (+1, "pitch_up_1"), (+2, "pitch_up_2"), (+3, "pitch_up_3"),
    (-1, "pitch_down_1"), (-2, "pitch_down_2"), (-3, "pitch_down_3")
]


# === Pitch Shift Function ===
def change_pitch_librosa(input_file: str, output_file: str, pitch_steps: int):
    """Loads audio, applies pitch shifting, and saves it."""
    y, sr = librosa.load(input_file, sr=None)
    y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=pitch_steps)
    sf.write(output_file, y_shifted, sr)


# === Create Pitch-Shifted Versions ===
def create_versions(input_audio: str, song_name: str):
    version_files = []
    for steps, key in VOCAL_RANGE_SHIFTS:
        out_file = os.path.join(BASE_DIR, song_name, f"{song_name}_{key}.mp3")
        os.makedirs(os.path.dirname(out_file), exist_ok=True)
        change_pitch_librosa(input_audio, out_file, steps)
        version_files.append((key, out_file))
    return version_files


# === Separate Vocals & Instrumental ===
def separate_audio(file_path: str, vocal_out: str, instru_out: str):
    separator = Separator("spleeter:2stems", MWF=True)
    temp_dir = os.path.dirname(vocal_out)

    os.makedirs(temp_dir, exist_ok=True)
    separator.separate_to_file(file_path, temp_dir)

    # Spleeter saves inside temp_dir/{filename}/ (vocals.wav, accompaniment.wav)
    sep_dir = os.path.join(temp_dir, os.path.splitext(os.path.basename(file_path))[0])

    vocal_src = os.path.join(sep_dir, "vocals.wav")
    instru_src = os.path.join(sep_dir, "accompaniment.wav")

    if os.path.exists(vocal_src):
        shutil.move(vocal_src, vocal_out)
    if os.path.exists(instru_src):
        shutil.move(instru_src, instru_out)

    shutil.rmtree(sep_dir, ignore_errors=True)


@app.post("/upload-song")
async def upload_song(song: UploadFile, song_name: str = Form(...)):
    print(song)  # Check if it is None
    print(song_name)
    try:
        # === Save input song ===
        song_dir = os.path.join(BASE_DIR, song_name)
        os.makedirs(song_dir, exist_ok=True)

        input_path = os.path.join(song_dir, f"{song_name}.mp3")
        with open(input_path, "wb") as f:
            f.write(await song.read())

        # === Step 1: Call external FastAPI to detect original key ===
        key_api = "http://localhost:8083/keydetect"
        with open(input_path, "rb") as f:
            resp = requests.post(key_api, files={"file": (f"{song_name}.mp3", f, "audio/mpeg")})
        if resp.status_code != 200:
            return JSONResponse(status_code=400, content={"status": "error", "message": "Key detection failed"})
        key_result = resp.json()
        original_key = key_result.get("detectedKey", "unknown")

        # === Step 2: Create pitch-shifted versions ===
        versions = create_versions(input_path, song_name)

        separated_meta = []
        for key, version_path in versions:
            vocal_path = os.path.join(BASE_DIR, song_name, "vocal", f"{key}.mp3")
            instru_path = os.path.join(BASE_DIR, song_name, "instru", f"{key}.mp3")

            os.makedirs(os.path.dirname(vocal_path), exist_ok=True)
            os.makedirs(os.path.dirname(instru_path), exist_ok=True)

            separate_audio(version_path, vocal_path, instru_path)

            separated_meta.append({
                "key": key,
                "status": "done",
                "vocal_path": vocal_path,
                "instru_path": instru_path
            })

        return JSONResponse(content={
            "status": "success",
            "original_key": original_key,
            "separated": separated_meta
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8085)
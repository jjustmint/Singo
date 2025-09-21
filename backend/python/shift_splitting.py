import uvicorn
import os
import shutil
import re
import librosa
import soundfile as sf
from fastapi import FastAPI, UploadFile, Form
from fastapi.responses import JSONResponse
from spleeter.separator import Separator
import requests

app = FastAPI()

BASE_DIR = "song"

# === CONFIGURATION ===
SHIFTS = list(range(-3, 4))  # -3, -2, -1, 0, +1, +2, +3

# === Note Mapping ===
NOTES = ["C", "C#", "D", "D#", "E", "F",
         "F#", "G", "G#", "A", "A#", "B"]

# Flats -> equivalent sharps (so we always canonicalize to NOTES list)
FLAT_TO_SHARP = {
    "Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#",
    "Cb": "B", "Fb": "E"
}
# Rare specials
SPECIAL_EQ = {"E#": "F", "B#": "C"}


def parse_detected_key(raw: str) -> str:
    """
    Parse returned key strings from your key-detection API into canonical names in NOTES.
    Accepts forms like:
      - "E", "e", "E major", "E minor", "Emaj", "E:maj", "Eb", "D#"
    Raises ValueError if cannot parse.
    """
    if not raw:
        raise ValueError("empty detected key")

    s = str(raw).strip()
    # find first note letter and optional accidental (# or b or Unicode variants)
    m = re.search(r'([A-Ga-g])\s*([#♯b♭]?)', s)
    if not m:
        raise ValueError(f"cannot parse detected key: '{raw}'")

    note = m.group(1).upper()
    acc = m.group(2)
    if acc in ("b", "♭"):
        note = note + "b"
    elif acc in ("#", "♯"):
        note = note + "#"

    # map flats to sharps if needed
    if note in FLAT_TO_SHARP:
        note = FLAT_TO_SHARP[note]
    if note in SPECIAL_EQ:
        note = SPECIAL_EQ[note]

    if note not in NOTES:
        raise ValueError(f"unsupported note after normalization: '{note}' (original: '{raw}')")

    return note


def shift_key(original_key: str, steps: int) -> str:
    """Return a canonical note name after shifting semitones."""
    idx = NOTES.index(original_key)
    new_idx = (idx + steps) % 12
    return NOTES[new_idx]


# === Pitch Shift Function ===
def change_pitch_librosa(input_file: str, output_file: str, pitch_steps: int):
    """Loads audio, applies pitch shifting, and saves it."""
    y, sr = librosa.load(input_file, sr=None)
    y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=pitch_steps)
    sf.write(output_file, y_shifted, sr)


# === Create Pitch-Shifted Versions ===
def create_versions(input_audio: str, song_name: str, original_key: str):
    """
    Creates versions for shifts -3..+3 semitones.
    For shift==0 we copy the original file (no processing).
    Returns list of tuples: (new_key, out_file, semitone_shift)
    """
    version_files = []
    base_dir = os.path.join(BASE_DIR, song_name)
    os.makedirs(base_dir, exist_ok=True)

    for steps in SHIFTS:
        new_key = shift_key(original_key, steps)
        # sanitize filename a bit (keep '#' as-is; if you prefer 'C_sharp' change here)
        filename = f"{song_name}_{new_key}.mp3"
        out_file = os.path.join(base_dir, filename)
        os.makedirs(os.path.dirname(out_file), exist_ok=True)

        if steps == 0:
            # just copy original to the original-key filename
            shutil.copy2(input_audio, out_file)
        else:
            change_pitch_librosa(input_audio, out_file, steps)

        version_files.append((new_key, out_file, steps))
    return version_files


# === Separate Vocals & Instrumental ===
def separate_audio(file_path: str, vocal_out: str, instru_out: str):
    """
    Use Spleeter to separate the provided file into vocals/instrumental and move them
    to the provided output paths.
    """
    separator = Separator("spleeter:2stems", MWF=True)
    # use a temporary dir next to vocal_out so separators output is predictable
    temp_dir = os.path.dirname(vocal_out)
    os.makedirs(temp_dir, exist_ok=True)

    separator.separate_to_file(file_path, temp_dir)

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
        original_raw = key_result.get("detectedKey", None)
        if original_raw is None:
            return JSONResponse(status_code=400, content={"status": "error", "message": "Key detection returned no key"})

        # normalize/parse detected key into a canonical note (C, C#, D, ...)
        try:
            original_key = parse_detected_key(original_raw)
        except ValueError as ex:
            return JSONResponse(status_code=400, content={"status": "error", "message": str(ex), "detectedRaw": original_raw})

        # === Step 2: Create pitch-shifted versions ===
        versions = create_versions(input_path, song_name, original_key)

        separated_meta = []
        shifts_info = []
        for new_key, version_path, semitone_shift in versions:
            vocal_path = os.path.join(BASE_DIR, song_name, "vocal", f"{new_key}.mp3")
            instru_path = os.path.join(BASE_DIR, song_name, "instru", f"{new_key}.mp3")

            os.makedirs(os.path.dirname(vocal_path), exist_ok=True)
            os.makedirs(os.path.dirname(instru_path), exist_ok=True)

            separate_audio(version_path, vocal_path, instru_path)

            is_original = (semitone_shift == 0)
            separated_meta.append({
                "key": new_key,
                "status": "done",
                "vocal_path": vocal_path,
                "instru_path": instru_path,
                "is_original": is_original,
                "semitone_shift": semitone_shift
            })
            shifts_info.append({
                "semitone_shift": semitone_shift,
                "key": new_key,
                "file": os.path.join(BASE_DIR, song_name, f"{song_name}_{new_key}.mp3"),
                "is_original": is_original
            })

        return JSONResponse(content={
            "status": "success",
            "original_detected_raw": original_raw,
            "original_key": original_key,
            "shifts": sorted(shifts_info, key=lambda x: x["semitone_shift"]),
            "separated": separated_meta
        })

    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "error", "message": str(e)})


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8085)
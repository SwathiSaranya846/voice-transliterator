from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path
from model import process_audio
import librosa

app = FastAPI()

# Get the absolute path of the backend directory
BACKEND_DIR = Path(__file__).parent.absolute()
TEMP_DIR = BACKEND_DIR / "temp_audio"

# Create temp directory
TEMP_DIR.mkdir(exist_ok=True)

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Voice Transliterator API running"}

@app.post("/convert")
async def convert_audio(file: UploadFile = File(...)):
    try:
        # Get file extension from uploaded filename
        file_ext = Path(file.filename).suffix or ".webm"
        audio_path = TEMP_DIR / f"audio{file_ext}"
        
        print(f"\n=== Processing Audio ===")
        print(f"File: {file.filename}")
        print(f"Temp path: {audio_path}")

        # Save uploaded file
        with open(audio_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file was not saved: {audio_path}")
        
        file_size = os.path.getsize(audio_path)
        print(f"✓ File saved. Size: {file_size} bytes")

        # Load audio using librosa (works with most formats)
        print(f"→ Loading audio with librosa...")
        audio_data, sr = librosa.load(str(audio_path), sr=16000)
        print(f"✓ Audio loaded. Sample rate: {sr} Hz, Duration: {len(audio_data)/sr:.2f}s")

        # Save as temporary WAV for Whisper
        wav_path = TEMP_DIR / "audio_temp.wav"
        import soundfile as sf
        sf.write(str(wav_path), audio_data, sr)
        print(f"✓ Converted to WAV")

        # Process with Whisper
        print(f"→ Starting Whisper transcription...")
        native, english = process_audio(str(wav_path))
        
        print(f"✓ Processing complete")
        print(f"  Native text: {native[:80] if native else 'Empty'}")
        print(f"  English text: {english[:80] if english else 'Empty'}")
        
        # Clean up temp files
        try:
            if os.path.exists(audio_path):
                os.remove(audio_path)
            if os.path.exists(wav_path):
                os.remove(wav_path)
            print(f"✓ Temp files cleaned up")
        except:
            pass

        return {
            "native_text": native,
            "english_text": english
        }
    except FileNotFoundError as e:
        error_msg = f"File error: {str(e)}"
        print(f"\n❌ {error_msg}")
        return {
            "error": error_msg,
            "native_text": "File not found",
            "english_text": "File not found"
        }
    except Exception as e:
        error_msg = f"Error: {str(e)}"
        print(f"\n❌ {error_msg}")
        import traceback
        traceback.print_exc()
        return {
            "error": error_msg,
            "native_text": "Error processing",
            "english_text": "Error processing"
        }

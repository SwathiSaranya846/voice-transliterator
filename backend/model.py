import whisper
from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

# Load model once
model = whisper.load_model("base")

def process_audio(file_path):
    # Step 1: Speech → Native text
    result = model.transcribe(file_path)
    native_text = result["text"]

    # Step 2: Transliteration (auto assumption Hindi/Devanagari)
    try:
        english_text = transliterate(
            native_text,
            sanscript.DEVANAGARI,
            sanscript.ITRANS
        )
    except:
        english_text = native_text  # fallback

    return native_text, english_text
import os
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import shutil
import uuid
from services.audio_processing import stt_service, tts_service

router = APIRouter()

# Temporary storage for processing
TEMP_DIR = "temp_audio"
os.makedirs(TEMP_DIR, exist_ok=True)

class TTSRequest(BaseModel):
    text: str
    ref_text: str = ""

@router.post("/stt")
async def speech_to_text(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}_{file.filename}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        text = stt_service.transcribe(file_path)
        
        # Cleanup
        os.remove(file_path)
        
        return {"text": text}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    try:
        output_filename = f"{uuid.uuid4()}_tts.wav"
        output_path = os.path.join(TEMP_DIR, output_filename)
        
        # Standard TTS without specific voice cloning
        tts_service.generate(text=request.text, output_path=output_path)
        
        return FileResponse(output_path, media_type="audio/wav", filename="tts_output.wav")
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/clone_voice")
async def clone_voice(
    text: str = Form(...),
    ref_text: str = Form(""),
    ref_audio: UploadFile = File(...)
):
    try:
        ref_audio_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}_ref_{ref_audio.filename}")
        with open(ref_audio_path, "wb") as buffer:
            shutil.copyfileobj(ref_audio.file, buffer)
            
        output_filename = f"{uuid.uuid4()}_clone.wav"
        output_path = os.path.join(TEMP_DIR, output_filename)
        
        tts_service.generate(
            text=text,
            ref_audio=ref_audio_path,
            ref_text=ref_text,
            output_path=output_path
        )
        
        # Keep ref audio around or cleanup (cleanup for now)
        os.remove(ref_audio_path)
        
        return FileResponse(output_path, media_type="audio/wav", filename="cloned_output.wav")
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# Clean up task
@router.post("/cleanup")
async def cleanup():
    for f in os.listdir(TEMP_DIR):
        os.remove(os.path.join(TEMP_DIR, f))
    return {"message": "Temp directory cleaned"}

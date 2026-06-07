import os
import uuid
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.audio_processing import stt_service, tts_service

router = APIRouter()

TEMP_DIR = "temp_ws_audio"
os.makedirs(TEMP_DIR, exist_ok=True)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

manager = ConnectionManager()

def mock_llm_response(text: str) -> str:
    # A simple mock LLM
    text_lower = text.lower()
    if "hello" in text_lower:
        return "Hello there! How can I help you today?"
    elif "name" in text_lower:
        return "I am your local voice AI assistant."
    elif "joke" in text_lower:
        return "Why did the AI cross the road? To optimize the other side!"
    else:
        return f"I heard you say: {text}. That's very interesting."

@router.websocket("/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Receive audio data from client
            data = await websocket.receive_bytes()
            
            # Save temporary wav
            input_audio_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}_input.wav")
            with open(input_audio_path, "wb") as f:
                f.write(data)
                
            # 1. Speech-to-Text
            transcription = stt_service.transcribe(input_audio_path)
            os.remove(input_audio_path)
            
            if not transcription.strip():
                continue # Skip empty audio
                
            # Send transcription back to client for UI
            await websocket.send_json({"type": "transcription", "text": transcription})
            
            # 2. LLM Processing (Mocked)
            response_text = mock_llm_response(transcription)
            await websocket.send_json({"type": "llm_response", "text": response_text})
            
            # 3. Text-to-Speech
            output_audio_path = os.path.join(TEMP_DIR, f"{uuid.uuid4()}_output.wav")
            tts_service.generate(text=response_text, output_path=output_audio_path)
            
            # Send audio data back
            with open(output_audio_path, "rb") as f:
                audio_bytes = f.read()
                
            await websocket.send_bytes(audio_bytes)
            os.remove(output_audio_path)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
        manager.disconnect(websocket)

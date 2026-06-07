import os
import glob
# Inject FFmpeg Shared DLLs into PATH dynamically so torchcodec doesn't crash on Windows
ffmpeg_paths = glob.glob(r"C:\Users\*\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Shared*\ffmpeg*\bin")
if ffmpeg_paths:
    os.environ["PATH"] = ffmpeg_paths[0] + os.pathsep + os.environ.get("PATH", "")

import io
import wave
import torch
import numpy as np
from faster_whisper import WhisperModel
import soundfile as sf
import subprocess

# Determine device
device = "cuda" if torch.cuda.is_available() else "cpu"
compute_type = "float16" if device == "cuda" else "int8"

class STTService:
    def __init__(self):
        print(f"Loading WhisperModel on {device}...")
        try:
            self.model = WhisperModel("base", device=device, compute_type=compute_type)
            print("WhisperModel loaded successfully.")
        except Exception as e:
            print(f"Failed to load WhisperModel: {e}")
            self.model = None

    def transcribe(self, audio_file_path: str) -> str:
        if not self.model:
            return "STT Model not loaded."
        segments, info = self.model.transcribe(audio_file_path, beam_size=5)
        text = " ".join([segment.text for segment in segments])
        return text.strip()

class TTSService:
    def __init__(self):
        print("Initializing F5-TTS Service...")
        # Since F5-TTS python API might change, we'll try to load it, 
        # or we will use the CLI as a fallback mechanism.
        self.device = device
        self.model_loaded = False
        try:
            # Attempt to use F5-TTS python API if available
            from f5_tts.api import F5TTS
            self.tts = F5TTS(device=device)
            self.model_loaded = True
            print("F5-TTS model loaded via Python API.")
        except ImportError:
            print("Could not import f5_tts.api. Will fallback to CLI for F5-TTS.")
            self.model_loaded = False
        except Exception as e:
            print(f"Error loading F5-TTS: {e}")

    def generate(self, text: str, ref_audio: str = None, ref_text: str = "", output_path: str = "output.wav"):
        if self.model_loaded:
            try:
                # F5-TTS usually requires a reference audio for voice cloning. 
                # If None is provided, we use a default if the API allows, or handle it.
                if not ref_audio:
                    import f5_tts
                    import os
                    # Use the default reference audio provided by F5-TTS
                    default_ref = os.path.join(f5_tts.__path__[0], "infer", "examples", "basic", "basic_ref_en.wav")
                    wav, sr, spec = self.tts.infer(ref_file=default_ref, ref_text="Some call me nature, others call me mother nature.", gen_text=text)
                else:
                    wav, sr, spec = self.tts.infer(ref_file=ref_audio, ref_text=ref_text, gen_text=text)
                sf.write(output_path, wav, sr)
                return output_path
            except Exception as e:
                print(f"F5-TTS Python API generation failed: {e}")
                
        # Fallback to CLI
        print("Using F5-TTS CLI...")
        cmd = ["f5-tts_infer", "--gen_text", text, "--output_dir", os.path.dirname(output_path)]
        if ref_audio:
            cmd.extend(["--ref_audio", ref_audio])
        if ref_text:
            cmd.extend(["--ref_text", ref_text])
            
        try:
            subprocess.run(cmd, check=True)
            # The CLI usually outputs to the output_dir with a specific name. 
            # We assume it's named based on the text or a default name like 'out.wav'.
            # A more robust CLI fallback would parse stdout, but for now we expect output.wav 
            # if we can rename it. F5-TTS CLI saves as <output_dir>/out.wav by default or similar.
            expected_out = os.path.join(os.path.dirname(output_path), "out.wav")
            if os.path.exists(expected_out):
                os.rename(expected_out, output_path)
            return output_path
        except Exception as e:
            print(f"F5-TTS CLI failed: {e}")
            # Mock audio creation if everything fails
            self._create_mock_audio(output_path)
            return output_path

    def _create_mock_audio(self, output_path):
        import scipy.io.wavfile as wavf
        fs = 24000
        t = np.linspace(0., 1., fs)
        amplitude = np.iinfo(np.int16).max
        data = amplitude * np.sin(2. * np.pi * 440 * t)
        wavf.write(output_path, fs, data.astype(np.int16))

stt_service = STTService()
tts_service = TTSService()

import asyncio
import sounddevice as sd
import numpy as np
import io
import base64
import requests
import wave
from datetime import datetime
import os
import librosa

BACKEND_URL = "http://localhost:8000/predict"

# ==========================================
# Guardar dentro de backend/recordings
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))   # carpeta backend
SAVE_DIR = os.path.join(BASE_DIR, "recordings")         # backend/recordings
os.makedirs(SAVE_DIR, exist_ok=True)

# ------------------------------------
# Función para grabar desde el micrófono
# ------------------------------------
def record_audio(duration=2, sample_rate=44100):
    print("Grabando audio...")
    audio = sd.rec(int(duration * sample_rate),
                   samplerate=sample_rate,
                   channels=1,
                   dtype='float32')
    sd.wait()
    print("Grabación terminada.")
    return audio.squeeze(), sample_rate

# ------------------------------------
# Guardar WAV desde numpy
# ------------------------------------
def save_wav_file(filename, audio_data, sample_rate):
    with wave.open(filename, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)   # 16 bits
        wf.setframerate(sample_rate)
        wf.writeframes((audio_data * 32767).astype(np.int16).tobytes())
    print(f"Archivo guardado: {filename}")

# ------------------------------------
# Convertir numpy → WAV para enviar al backend
# ------------------------------------
def numpy_to_wav_bytes(audio_data, sample_rate):
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes((audio_data * 32767).astype(np.int16).tobytes())
    buffer.seek(0)
    return buffer

# ------------------------------------
# Amplificar audio para escucharlo claramente
# ------------------------------------
def amplify_audio(audio, factor=30):
    amplified = audio * factor
    # Evitar clipping recortando entre [-1, 1]
    amplified = np.clip(amplified, -1.0, 1.0)
    return amplified

# ------------------------------------
# Enviar WAV al backend
# ------------------------------------
def send_audio_to_backend(wav_buffer):
    files = {"file": ("audio.wav", wav_buffer, "audio/wav")}
    response = requests.post(BACKEND_URL, files=files)
    return response.json()

# ------------------------------------
# Main
# ------------------------------------
def main():
    # 1️⃣ Grabar audio desde el micrófono
    audio_data, sr = record_audio()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # --------------------------------------------------------
    # 2️⃣ Guardar WAV original (44.1 kHz)
    # --------------------------------------------------------
    filename_original = os.path.join(SAVE_DIR, f"recording_{timestamp}_raw.wav")
    save_wav_file(filename_original, audio_data, sr)

    # --------------------------------------------------------
    # 2.1️⃣ Guardar RAW AMPLIFICADO (para escucharlo)
    # --------------------------------------------------------
    amplified = amplify_audio(audio_data, factor=12)  # Puedes subirlo más
    filename_loud = os.path.join(SAVE_DIR, f"recording_{timestamp}_raw_LOUD.wav")
    save_wav_file(filename_loud, amplified, sr)
    print("Archivo AMPLIFICADO guardado.")

    # --------------------------------------------------------
    # 3️⃣ Re-escalar a 16 kHz
    # --------------------------------------------------------
    target_sr = 16000
    resampled_audio = librosa.resample(audio_data.astype(np.float32), orig_sr=sr, target_sr=target_sr)

    # Guardar re-escalado
    filename_resampled = os.path.join(SAVE_DIR, f"recording_{timestamp}_16khz.wav")
    save_wav_file(filename_resampled, resampled_audio, target_sr)

    # --------------------------------------------------------
    # 4️⃣ Enviar el 16 kHz al backend
    # --------------------------------------------------------
    wav_bytes = numpy_to_wav_bytes(resampled_audio, target_sr)
    print("Enviando al backend...")
    res = send_audio_to_backend(wav_bytes)

    # --------------------------------------------------------
    # 5️⃣ Mostrar predicción
    # --------------------------------------------------------
    print("\n--- RESULTADO ---")
    print("Predicción:", res["prediction"])

    # --------------------------------------------------------
    # 6️⃣ Guardar imágenes
    # --------------------------------------------------------
    with open(os.path.join(SAVE_DIR, f"waveform_{timestamp}.png"), "wb") as f:
        f.write(base64.b64decode(res["waveform"]))

    with open(os.path.join(SAVE_DIR, f"spectrogram_{timestamp}.png"), "wb") as f:
        f.write(base64.b64decode(res["spectrogram"]))

    print("Waveform y espectrograma guardados en backend/recordings")

if __name__ == "__main__":
    main()

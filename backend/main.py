import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import matplotlib.pyplot as plt
import io
import base64
import librosa
import os
import uuid
from pydub import AudioSegment

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------
# Custom Layers (needed to load the model)
# --------------------------

class ReduceMeanLayer(tf.keras.layers.Layer):
    def __init__(self, axis=0, **kwargs):
        super().__init__(**kwargs)
        self.axis = axis

    def call(self, inputs):
        return tf.reduce_mean(inputs, axis=self.axis)

class SqueezeLayer(tf.keras.layers.Layer):
    def __init__(self, axis=None, **kwargs):
        super().__init__(**kwargs)
        self.axis = axis

    def call(self, inputs):
        return tf.squeeze(inputs, axis=self.axis)

class SplitLayer(tf.keras.layers.Layer):
    def call(self, inputs):
        return tf.split(inputs, 5, axis=-1)

class YAMNetWrapperLayer(tf.keras.layers.Layer):
    def __init__(self, yamnet_model_handle='https://tfhub.dev/google/yamnet/1', **kwargs):
        super().__init__(**kwargs)
        self.yamnet_model_handle = yamnet_model_handle
        self.yamnet_model = hub.load(yamnet_model_handle)

    def call(self, inputs):
        scores, embeddings, spectrogram = self.yamnet_model(inputs)
        return scores, embeddings, spectrogram

# Register custom layers
tf.keras.utils.get_custom_objects()["Custom>YAMNetWrapperLayer"] = YAMNetWrapperLayer
tf.keras.utils.get_custom_objects()["Custom>ReduceMeanLayer"] = ReduceMeanLayer
tf.keras.utils.get_custom_objects()["Custom>SqueezeLayer"] = SqueezeLayer
tf.keras.utils.get_custom_objects()["Custom>SplitLayer"] = SplitLayer

# --------------------------
# Load model
# --------------------------

model = None
try:
    model = tf.keras.models.load_model("final_model.h5")
except Exception as e:
    # Si el modelo no carga en el entorno de desarrollo, reportar y continuar.
    import logging
    logging.exception('No se pudo cargar final_model.h5: %s', e)
    model = None

my_classes = ['AS', 'MR', 'MS', 'MVP', 'N']

# --------------------------
# Utility functions
# --------------------------

def load_audio_librosa(wav_bytes, target_sr=16000):
    """Load audio safely in Windows using librosa (no tensorflow_io).
    Falls back to scipy if format is not recognized."""
    try:
        # Intenta directamente con librosa
        audio, sr = librosa.load(io.BytesIO(wav_bytes), sr=target_sr, mono=True)
        return audio.astype(np.float32)
    except Exception as librosa_error:
        # Si falla, intenta con scipy usando archivo temporal
        try:
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
                tmp.write(wav_bytes)
                tmp_path = tmp.name
            
            from scipy.io import wavfile
            sr, waveform = wavfile.read(tmp_path)
            os.unlink(tmp_path)
            
            # Normalizar a float32 si es int
            if waveform.dtype != np.float32:
                waveform = waveform.astype(np.float32) / (2 ** 15)
            
            # Resample si es necesario
            if sr != target_sr:
                waveform = librosa.resample(waveform, orig_sr=sr, target_sr=target_sr)
            
            return waveform.astype(np.float32)
        except Exception as scipy_error:
            raise Exception(f"librosa failed: {str(librosa_error)}; scipy failed: {str(scipy_error)}")

def compute_spectrogram(waveform):
    spec = librosa.stft(waveform, n_fft=512, hop_length=256)
    return np.abs(spec)

def fig_to_base64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")

# --------------------------
# Prediction endpoint
# --------------------------

@app.post("/predict_dummy")
async def predict_dummy(file: UploadFile = File(...)):
    """Endpoint dummy para probar que el flujo de audio funciona sin el modelo."""
    try:
        wav_bytes = await file.read()
        
        if not wav_bytes:
            return {"error": "Archivo vacío"}

        # Load waveform
        try:
            waveform = load_audio_librosa(wav_bytes)
        except Exception as e:
            return {"error": f"No se pudo cargar el audio: {str(e)}"}

        # Ensure float32 tensor
        waveform_tf = tf.convert_to_tensor(waveform, dtype=tf.float32)

        # Waveform plot
        fig1, ax1 = plt.subplots()
        ax1.plot(waveform)
        waveform_img = fig_to_base64(fig1)
        plt.close(fig1)

        # Spectrogram plot
        spec = compute_spectrogram(waveform)
        fig2, ax2 = plt.subplots()
        ax2.imshow(np.log(spec + 1e-6), aspect="auto", origin="lower")
        spectrogram_img = fig_to_base64(fig2)
        plt.close(fig2)

        # Predicción dummy (sin usar el modelo)
        cls = 'N'  # Normal (dummy)

        return {
            "prediction": cls,
            "waveform": waveform_img,
            "spectrogram": spectrogram_img
        }
    except Exception as e:
        return {"error": f"Error en predicción dummy: {str(e)}"}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        wav_bytes = await file.read()
        
        if not wav_bytes:
            return {"error": "Archivo vacío"}

        # Load waveform
        try:
            waveform = load_audio_librosa(wav_bytes)
        except Exception as e:
            # Si falla con librosa, intentar con scipy
            try:
                from scipy.io import wavfile
                import tempfile
                import os
                
                with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as tmp:
                    tmp.write(wav_bytes)
                    tmp_path = tmp.name
                
                sr, waveform = wavfile.read(tmp_path)
                waveform = waveform.astype(np.float32) / 32768.0  # Normalizar
                os.unlink(tmp_path)
            except Exception as scipy_error:
                return {"error": f"No se pudo cargar el audio: {str(e)} / {str(scipy_error)}"}

        # Ensure float32 tensor
        waveform_tf = tf.convert_to_tensor(waveform, dtype=tf.float32)

        # Waveform plot
        fig1, ax1 = plt.subplots()
        ax1.plot(waveform)
        waveform_img = fig_to_base64(fig1)
        plt.close(fig1)

        # Spectrogram plot
        spec = compute_spectrogram(waveform)
        fig2, ax2 = plt.subplots()
        ax2.imshow(np.log(spec + 1e-6), aspect="auto", origin="lower")
        spectrogram_img = fig_to_base64(fig2)
        plt.close(fig2)

        # ---- THE FIX ----
        # The model expects a 1D tensor (not batched)
        if model is None:
            return {"error": "Modelo no disponible en el servidor (modo desarrollo)"}
        prediction = model(waveform_tf)  # <--- correct
        cls = my_classes[int(tf.argmax(prediction))]

        return {
            "prediction": cls,
            "waveform": waveform_img,
            "spectrogram": spectrogram_img
        }
    except Exception as e:
        return {"error": f"Error en predicción: {str(e)}"}


@app.post("/upload_debug")
async def upload_debug(file: UploadFile = File(...)):
    """Guardar el archivo recibido y devolver metadata y si librosa puede leerlo."""
    try:
        wav_bytes = await file.read()
        if not wav_bytes:
            return {"ok": False, "message": "Archivo vacío"}

        # Asegurar carpeta recordings
        os.makedirs('recordings', exist_ok=True)
        ext = file.filename.split('.')[-1] if file.filename and '.' in file.filename else 'bin'
        fname = f"recording_{uuid.uuid4().hex}.{ext}"
        path = os.path.join('recordings', fname)
        with open(path, 'wb') as f:
            f.write(wav_bytes)

        # Intentar cargar con librosa
        try:
            _ = load_audio_librosa(wav_bytes)
            load_ok = True
            load_msg = 'librosa loaded audio successfully'
        except Exception as e:
            load_ok = False
            load_msg = f'librosa load error: {str(e)}'

        return {
            "ok": True,
            "filename": fname,
            "size_bytes": len(wav_bytes),
            "content_type": file.content_type,
            "librosa_ok": load_ok,
            "librosa_message": load_msg,
            "saved_path": path,
        }
    except Exception as e:
        return {"ok": False, "message": f"Upload debug failed: {str(e)}"}

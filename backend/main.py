import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import matplotlib.pyplot as plt
import io
import base64
import librosa

app = FastAPI()

# --------------------------
# CORS
# --------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------
# CUSTOM LAYERS EXACTAS (clave para que cargue tu modelo)
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


# ---- REGISTRO EXACTO (esto es lo que hace que tu .h5 funcione) ----
tf.keras.utils.get_custom_objects()["Custom>YAMNetWrapperLayer"] = YAMNetWrapperLayer
tf.keras.utils.get_custom_objects()["Custom>ReduceMeanLayer"] = ReduceMeanLayer
tf.keras.utils.get_custom_objects()["Custom>SqueezeLayer"] = SqueezeLayer
tf.keras.utils.get_custom_objects()["Custom>SplitLayer"] = SplitLayer


# --------------------------
# LOAD MODEL (ya funciona)
# --------------------------

print("\nCargando modelo final_model.h5 ...")

model = tf.keras.models.load_model("final_model.h5")

print("Modelo cargado correctamente!\n")

my_classes = ['AS', 'MR', 'MS', 'MVP', 'N']


# --------------------------
# Utility functions
# --------------------------

def load_audio_librosa(wav_bytes, target_sr=16000):
    audio, sr = librosa.load(io.BytesIO(wav_bytes), sr=target_sr, mono=True)
    return audio.astype(np.float32)


def compute_spectrogram(waveform):
    spec = librosa.stft(waveform, n_fft=512, hop_length=256)
    return np.abs(spec)


def fig_to_base64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


# --------------------------
# PREDICTION ENDPOINT
# --------------------------

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    wav_bytes = await file.read()

    # Load waveform
    waveform = load_audio_librosa(wav_bytes)

    # Convert to tensor
    waveform_tf = tf.convert_to_tensor(waveform, dtype=tf.float32)

    # Plot waveform
    fig1, ax1 = plt.subplots()
    ax1.plot(waveform)
    waveform_img = fig_to_base64(fig1)
    plt.close(fig1)

    # Plot spectrogram
    spec = compute_spectrogram(waveform)
    fig2, ax2 = plt.subplots()
    ax2.imshow(np.log(spec + 1e-6), aspect="auto", origin="lower")
    spectrogram_img = fig_to_base64(fig2)
    plt.close(fig2)

    # -------------------------------
    # PREDICCIÓN REAL (sin batch)
    # -------------------------------
    prediction = model(waveform_tf)

    pred_idx = int(tf.argmax(prediction))
    pred_label = my_classes[pred_idx]

    return {
        "prediction": pred_label,
        "waveform": waveform_img,
        "spectrogram": spectrogram_img
    }

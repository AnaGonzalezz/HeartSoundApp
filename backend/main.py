import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import matplotlib.pyplot as plt
import io
import base64
import librosa
import csv
import os
from datetime import datetime
import scipy.signal as signal

# ==============================================================
# CSV LOG FILE SETUP
# ==============================================================

LOG_FILE = "metrics_log.csv"

# Crear encabezado si el archivo no existe
if not os.path.exists(LOG_FILE):
    with open(LOG_FILE, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "timestamp",
            "filename",
            "snr",
            "dynamic_range",
            "noise_before",
            "noise_after",
            "thd",
            "prediction"
        ])


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

model = tf.keras.models.load_model("final_model.h5")

my_classes = ['AS', 'MR', 'MS', 'MVP', 'N']

# --------------------------
# Utility functions
# --------------------------

def load_audio_librosa(wav_bytes, target_sr=16000):
    """Load audio safely in Windows using librosa (no tensorflow_io)."""
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

# ==============================================================
# SIGNAL QUALITY METRICS
# ==============================================================

def compute_snr(signal_data):
    power_signal = np.mean(signal_data**2)
    noise = signal_data - signal_data.mean()
    power_noise = np.mean(noise**2) + 1e-12
    return float(10 * np.log10(power_signal / power_noise))

def compute_dynamic_range(signal_data):
    max_amp = np.max(np.abs(signal_data))
    min_amp = np.min(np.abs(signal_data)) + 1e-9
    return float(20 * np.log10(max_amp / min_amp))

def compute_noise_level(signal_data):
    return float(np.std(signal_data))

def compute_thd(signal_data, sr):
    N = len(signal_data)
    fft = np.fft.fft(signal_data)
    magnitude = np.abs(fft)

    fund_idx = np.argmax(magnitude[:N//2])
    fund_power = magnitude[fund_idx]

    harmonic_idxs = [
        fund_idx * i for i in range(2, 6)
        if fund_idx * i < len(magnitude)
    ]

    harmonic_power = sum(magnitude[i] for i in harmonic_idxs)
    return float(harmonic_power / (fund_power + 1e-12))

def compute_all_metrics_waveform(waveform, sr=16000):
    snr = compute_snr(waveform)
    dyn = compute_dynamic_range(waveform)
    noise_before = compute_noise_level(waveform)

    # Filtros pasa alto y pasa bajo
    hp = signal.butter(4, 20/(sr/2), btype='highpass', output='sos')
    lp = signal.butter(4, 250/(sr/2), btype='lowpass', output='sos')
    filtered = signal.sosfilt(lp, signal.sosfilt(hp, waveform))

    noise_after = compute_noise_level(filtered)
    thd = compute_thd(waveform, sr)

    return {
        "snr": snr,
        "dynamic_range": dyn,
        "noise_before": noise_before,
        "noise_after": noise_after,
        "thd": thd
    }

# ==============================================================
# LOGGING FUNCTION
# ==============================================================

def log_metrics(filename, metrics, prediction):
    with open(LOG_FILE, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            datetime.now().isoformat(),
            filename,
            metrics["snr"],
            metrics["dynamic_range"],
            metrics["noise_before"],
            metrics["noise_after"],
            metrics["thd"],
            prediction
        ])

# --------------------------
# Prediction endpoint
# --------------------------

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    wav_bytes = await file.read()

    # Load waveform
    waveform = load_audio_librosa(wav_bytes)

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
    prediction = model(waveform_tf)  # <--- correct
    cls = my_classes[int(tf.argmax(prediction))]
    metrics = compute_all_metrics_waveform(waveform)
    log_metrics(file.filename, metrics, cls)
    return {
        "prediction": cls,
        "waveform": waveform_img,
        "spectrogram": spectrogram_img
    }

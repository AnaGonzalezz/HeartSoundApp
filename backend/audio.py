import sounddevice as sd
from scipy.io.wavfile import write

# Parámetros
fs = 44100  # Frecuencia de muestreo (Hz)
seconds = 20 # Duración de la grabación

print("Grabando...")

# Grabar audio
recording = sd.rec(int(seconds * fs), samplerate=fs, channels=1, dtype='int16')
sd.wait()  # Esperar a que termine

print("Grabación finalizada. Guardando archivo...")

# Guardar archivo WAV
write("grabacion.wav", fs, recording)

print("Archivo guardado como grabacion.wav")

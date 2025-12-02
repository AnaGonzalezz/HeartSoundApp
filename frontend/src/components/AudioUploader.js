import React, { useState, useRef } from "react";
import API from "../api";
import "./AudioUploader.css";

const diseaseInfo = {
  'AS': 'Estenosis Aórtica: Estrechamiento de la válvula aórtica que dificulta el flujo sanguíneo.',
  'MR': 'Regurgitación Mitral: La válvula mitral no cierra correctamente, causando reflujo de sangre.',
  'MS': 'Estenosis Mitral: Estrechamiento de la válvula mitral que restringe el flujo sanguíneo.',
  'MVP': 'Prolapso de Válvula Mitral: Las valvas de la válvula mitral sobresalen hacia la aurícula.',
  'N': 'Normal: No se detectaron anomalías cardíacas significativas.'
};

// Función para convertir AudioBuffer a WAV
function audioBufferToWav(buffer, sampleRate = 16000) {
  const numChannels = 1; // Mono
  const format = 1; // PCM
  const bitDepth = 16;
  
  // Resample to target sample rate
  const offlineCtx = new OfflineAudioContext(numChannels, buffer.duration * sampleRate, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  
  return offlineCtx.startRendering().then(resampledBuffer => {
    const samples = resampledBuffer.getChannelData(0);
    const dataLength = samples.length * (bitDepth / 8);
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
    view.setUint16(32, numChannels * (bitDepth / 8), true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write audio data
    const offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export default function AudioUploader() {
  const [prediction, setPrediction] = useState(null);
  const [waveformImg, setWaveformImg] = useState(null);
  const [specImg, setSpecImg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState(null);
  
  // Estados para grabación
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    await processAudio(file);
  };

  const processAudio = async (audioBlob, name = "recording.wav") => {
    setLoading(true);
    setPrediction(null);
    setWaveformImg(null);
    setSpecImg(null);

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, name);

      const res = await API.post("/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPrediction(res.data.prediction);
      setWaveformImg(`data:image/png;base64,${res.data.waveform}`);
      setSpecImg(`data:image/png;base64,${res.data.spectrogram}`);
    } catch (error) {
      console.error("Error al procesar el archivo:", error);
      alert("Error al procesar el archivo de audio. Por favor, intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convertir WebM a WAV usando Web Audio API
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const wavBlob = await audioBufferToWav(audioBuffer, 16000);
        
        setRecordedBlob(wavBlob);
        setAudioURL(URL.createObjectURL(wavBlob));
        audioContext.close();
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      setAudioURL(null);
      setRecordedBlob(null);
      
      // Timer para mostrar tiempo de grabación
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Error al acceder al micrófono:", error);
      alert("No se pudo acceder al micrófono. Por favor, permite el acceso al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const analyzeRecording = async () => {
    if (recordedBlob) {
      setFileName("Grabación de audio");
      await processAudio(recordedBlob, "recording.wav");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="uploader-container">
      <div className="uploader-card">
        <div className="header-section">
          <h1 className="main-title">Clasificador de Enfermedades Cardíacas</h1>
          <p className="subtitle">
            Análisis mediante Inteligencia Artificial de sonidos cardíacos para detección temprana
          </p>
        </div>

        {/* Sección de Grabación */}
        <div className="recording-section">
          <h3 className="section-title">Grabar Audio</h3>
          <div className="recording-controls">
            {!isRecording ? (
              <button 
                className="record-btn start"
                onClick={startRecording}
                disabled={loading}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="8"/>
                </svg>
                Iniciar Grabación
              </button>
            ) : (
              <button 
                className="record-btn stop"
                onClick={stopRecording}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                Detener ({formatTime(recordingTime)})
              </button>
            )}
          </div>
          
          {isRecording && (
            <div className="recording-indicator">
              <span className="pulse-dot"></span>
              Grabando... {formatTime(recordingTime)}
            </div>
          )}
          
          {audioURL && !isRecording && (
            <div className="recorded-audio">
              <audio controls src={audioURL} className="audio-player" />
              <button 
                className="analyze-btn"
                onClick={analyzeRecording}
                disabled={loading}
              >
                {loading ? "Analizando..." : "Analizar Grabación"}
              </button>
            </div>
          )}
        </div>

        <div className="divider">
          <span>o</span>
        </div>

        <div className="upload-section">
          <label htmlFor="audio-file" className="upload-label">
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 18V5l12-2v13M9 18c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm12-2c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zM9 9l12-2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="upload-text">
              {loading ? "Procesando..." : "Seleccionar Archivo de Audio"}
            </p>
            <p className="upload-hint">Formato soportado: WAV</p>
            {fileName && !loading && (
              <div className="file-selected">
                {fileName}
              </div>
            )}
            {loading && (
              <>
                <div className="loading-spinner"></div>
                <p className="loading-text">Analizando audio cardíaco...</p>
              </>
            )}
          </label>
          <input
            id="audio-file"
            type="file"
            accept="audio/wav"
            onChange={handleFile}
            className="file-input"
            disabled={loading}
          />
        </div>

        {prediction && (
          <div className="prediction-section">
            <p className="prediction-label">Diagnóstico detectado</p>
            <h2 className="prediction-result">{prediction}</h2>
            <div className="disease-info">
              {diseaseInfo[prediction] || "Información no disponible"}
            </div>
          </div>
        )}

        {(waveformImg || specImg) && (
          <div className="visualizations-section">
            {waveformImg && (
              <div className="visualization-card">
                <h3 className="visualization-title">Forma de Onda</h3>
                <img
                  src={waveformImg}
                  alt="Forma de onda del audio cardíaco"
                  className="visualization-image"
                />
              </div>
            )}

            {specImg && (
              <div className="visualization-card">
                <h3 className="visualization-title">Espectrograma</h3>
                <img
                  src={specImg}
                  alt="Espectrograma del audio cardíaco"
                  className="visualization-image"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useRef } from "react";
import API from "../api";
import "./RecordAnalyze.css";

const diseaseInfo = {
  'AS': { 
    name: 'Estenosis Aórtica', 
    desc: 'Estrechamiento de la válvula aórtica que dificulta el flujo sanguíneo desde el corazón.',
    severity: 'moderate'
  },
  'MR': { 
    name: 'Regurgitación Mitral', 
    desc: 'La válvula mitral no cierra correctamente, causando reflujo de sangre hacia la aurícula.',
    severity: 'moderate'
  },
  'MS': { 
    name: 'Estenosis Mitral', 
    desc: 'Estrechamiento de la válvula mitral que restringe el flujo sanguíneo hacia el ventrículo.',
    severity: 'moderate'
  },
  'MVP': { 
    name: 'Prolapso de Válvula Mitral', 
    desc: 'Las valvas de la válvula mitral sobresalen hacia la aurícula durante la contracción.',
    severity: 'mild'
  },
  'N': { 
    name: 'Normal', 
    desc: 'No se detectaron anomalías cardíacas significativas en el análisis del sonido.',
    severity: 'normal'
  }
};

// Función para convertir AudioBuffer a WAV
function audioBufferToWav(buffer, sampleRate = 16000) {
  const numChannels = 1;
  const format = 1;
  const bitDepth = 16;
  
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

export default function RecordAnalyze({ onBack }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [waveformImg, setWaveformImg] = useState(null);
  const [specImg, setSpecImg] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

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
      setResult(null);
      setWaveformImg(null);
      setSpecImg(null);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Error al acceder al micrófono:", error);
      alert("No se pudo acceder al micrófono. Por favor, permite el acceso.");
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
    if (!recordedBlob) return;
    
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", recordedBlob, "recording.wav");

      const res = await API.post("/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data.prediction);
      setWaveformImg(`data:image/png;base64,${res.data.waveform}`);
      setSpecImg(`data:image/png;base64,${res.data.spectrogram}`);
    } catch (error) {
      console.error("Error al procesar:", error);
      alert("Error al procesar el audio. Por favor, intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const resetRecording = () => {
    setAudioURL(null);
    setRecordedBlob(null);
    setResult(null);
    setWaveformImg(null);
    setSpecImg(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resultInfo = result ? diseaseInfo[result] : null;

  return (
    <div className="record-container">
      {/* Header */}
      <header className="record-header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver
        </button>
        <h1 className="record-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          Grabar y Analizar
        </h1>
        <div className="header-spacer"></div>
      </header>

      <div className="record-content">
        {/* Recording Section */}
        <div className="recording-panel">
          <div className="recording-visual">
            <div className={`mic-container ${isRecording ? "recording" : ""}`}>
              <div className="mic-ring ring-1"></div>
              <div className="mic-ring ring-2"></div>
              <div className="mic-ring ring-3"></div>
              <div className="mic-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="currentColor" strokeWidth="2"/>
                  <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2"/>
                  <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
            </div>
            
            {isRecording && (
              <div className="recording-timer">
                <span className="rec-dot"></span>
                REC {formatTime(recordingTime)}
              </div>
            )}
          </div>

          <div className="recording-controls">
            {!isRecording && !audioURL && (
              <button className="record-btn start" onClick={startRecording}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="8"/>
                </svg>
                Iniciar Grabación
              </button>
            )}
            
            {isRecording && (
              <button className="record-btn stop" onClick={stopRecording}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                Detener Grabación
              </button>
            )}
            
            {audioURL && !isRecording && (
              <div className="recorded-actions">
                <audio controls src={audioURL} className="audio-player" />
                <div className="action-buttons">
                  <button className="action-btn secondary" onClick={resetRecording}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 4v6h6M23 20v-6h-6"/>
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                    </svg>
                    Nueva Grabación
                  </button>
                  <button 
                    className="action-btn primary" 
                    onClick={analyzeRecording}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="btn-spinner"></div>
                        Analizando...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                        </svg>
                        Analizar con IA
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="recording-tips">
            <p>💡 Para mejores resultados, graba al menos 5 segundos de sonido cardíaco claro</p>
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div className="results-panel">
            <h2 className="results-title">Resultado del Análisis</h2>
            
            <div className={`diagnosis-card ${resultInfo?.severity}`}>
              <div className="diagnosis-header">
                <span className="diagnosis-code">{result}</span>
                <span className={`severity-badge ${resultInfo?.severity}`}>
                  {resultInfo?.severity === 'normal' && '✓ Normal'}
                  {resultInfo?.severity === 'mild' && '⚠ Leve'}
                  {resultInfo?.severity === 'moderate' && '⚠ Moderado'}
                </span>
              </div>
              <h3 className="diagnosis-name">{resultInfo?.name}</h3>
              <p className="diagnosis-desc">{resultInfo?.desc}</p>
            </div>

            {(waveformImg || specImg) && (
              <div className="visualizations">
                {waveformImg && (
                  <div className="viz-card">
                    <h4>Forma de Onda</h4>
                    <img src={waveformImg} alt="Waveform" />
                  </div>
                )}
                {specImg && (
                  <div className="viz-card">
                    <h4>Espectrograma</h4>
                    <img src={specImg} alt="Spectrogram" />
                  </div>
                )}
              </div>
            )}

            <div className="disclaimer-card">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <p>Este resultado es solo orientativo y no reemplaza el diagnóstico de un profesional médico.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

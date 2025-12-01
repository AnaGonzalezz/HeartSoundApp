import React, { useState, useRef } from 'react';
import Button from './Button';
import Card from './Card';
import LoadingSpinner from './LoadingSpinner';
import PredictionResult from './PredictionResult';
import useAudioRecorder from '../hooks/useAudioRecorder';
import { audioService } from '../services/audioService';
import { validateAudioFile } from '../utils/audioUtils';
import './AudioUploader.css';

const AudioUploader = () => {
  const [prediction, setPrediction] = useState(null);
  const [waveformImg, setWaveformImg] = useState(null);
  const [specImg, setSpecImg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' o 'record'
  const [debugResult, setDebugResult] = useState(null);
  const fileInputRef = useRef(null);
  
  const {
    isRecording,
    recordedAudio,
    startRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateAudioFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    await processAudio(file);
  };

  const handleRecordingSubmit = async () => {
    if (!recordedAudio) return;
    await processAudio(recordedAudio);
  };

  const handleDebugUpload = async () => {
    if (!recordedAudio) return;
    setLoading(true);
    setDebugResult(null);
    try {
      const res = await audioService.uploadDebug(recordedAudio);
      setDebugResult(res.data);
    } catch (err) {
      setDebugResult({ ok: false, message: err?.message || 'Debug upload failed' });
      console.error('Debug upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const processAudio = async (audioFile) => {
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      let res;
      if (audioFile instanceof Blob && activeTab === 'record') {
        res = await audioService.predictFromRecording(audioFile);
      } else {
        res = await audioService.predictFromFile(audioFile);
      }
      
      // Verificar si hay error en la respuesta
      if (res.data.error) {
        throw new Error(res.data.error);
      }
      
      setPrediction(res.data.prediction);
      setWaveformImg(`data:image/png;base64,${res.data.waveform}`);
      setSpecImg(`data:image/png;base64,${res.data.spectrogram}`);
    } catch (err) {
      // Si falla /predict, intentar con /predict_dummy para diagnóstico
      console.warn('Main /predict failed, trying /predict_dummy...', err);
      try {
        let res;
        if (audioFile instanceof Blob && activeTab === 'record') {
          res = await audioService.predictFromRecording(audioFile, true);
        } else {
          res = await audioService.predictFromFile(audioFile, true);
        }
        
        if (res.data.error) {
          throw new Error(res.data.error);
        }
        
        setPrediction(res.data.prediction);
        setWaveformImg(`data:image/png;base64,${res.data.waveform}`);
        setSpecImg(`data:image/png;base64,${res.data.spectrogram}`);
        setError('⚠️ Usando endpoint de prueba (modelo no disponible)');
      } catch (dummyErr) {
        // Si también falla, mostrar el error original
        const backendMessage = err?.response?.data?.error || err?.response?.data?.detail || err?.response?.data?.message;
        const clientMessage = err?.message || 'Failed to process audio';
        const finalMessage = backendMessage ? `Error: ${backendMessage}` : `Error: ${clientMessage}`;
        setError(finalMessage);
        console.error('Audio processing error:', {
          error: err,
          responseData: err?.response?.data,
          dummyError: dummyErr,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPrediction(null);
    setWaveformImg(null);
    setSpecImg(null);
    setError(null);
    resetRecording();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="audio-uploader-container">
      <div className="audio-uploader-content">
        <h1 className="uploader-title">Análisis de Sonidos Cardíacos</h1>
        <p className="uploader-subtitle">
          Sube un archivo de audio o graba desde tu micrófono para detectar anomalías
        </p>

        {/* Tabs */}
        <div className="uploader-tabs">
          <button
            onClick={() => {
              setActiveTab('upload');
              handleReset();
            }}
            className={`tab-button ${activeTab === 'upload' ? 'tab-active' : ''}`}
          >
            📁 Cargar Archivo
          </button>
          <button
            onClick={() => {
              setActiveTab('record');
              handleReset();
            }}
            className={`tab-button ${activeTab === 'record' ? 'tab-active' : ''}`}
          >
            🎤 Grabar Audio
          </button>
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <Card className="uploader-card">
            <div className="uploader-text-center">
              <div
                className="uploader-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="dropzone-icon">🎵</div>
                <p className="dropzone-title">Selecciona un archivo de audio</p>
                <p className="dropzone-subtitle">O arrastra y suelta tu archivo aquí</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="lg"
              >
                Seleccionar Archivo
              </Button>
            </div>
          </Card>
        )}

        {/* Recording Tab */}
        {activeTab === 'record' && (
          <Card className="uploader-card">
            <div className="uploader-text-center">
              <div className="recording-status">
                {isRecording ? (
                  <div className="recording-active">
                    <div className="recording-dot"></div>
                    <p className="recording-text">Grabando...</p>
                  </div>
                ) : recordedAudio ? (
                  <div className="recording-ready">
                    <div className="recording-success">✓</div>
                    <p className="recording-text">Grabación lista</p>
                    <audio
                      src={URL.createObjectURL(recordedAudio)}
                      controls
                      className="recording-player"
                    />
                  </div>
                ) : (
                  <div className="recording-idle">
                    <div className="recording-idle-icon">🎤</div>
                    <p className="recording-text">Haz clic en grabar para comenzar</p>
                  </div>
                )}
              </div>

              <div className="recording-buttons">
                {!isRecording && !recordedAudio && (
                  <Button onClick={startRecording} size="lg">
                    🔴 Grabar
                  </Button>
                )}
                {isRecording && (
                  <Button onClick={stopRecording} variant="danger" size="lg">
                    ⏹ Detener
                  </Button>
                )}
                {recordedAudio && (
                  <>
                    <Button onClick={resetRecording} variant="secondary" size="lg">
                      🔄 Grabar de nuevo
                    </Button>
                    <Button onClick={handleRecordingSubmit} size="lg">
                      ✓ Analizar
                    </Button>
                    <Button onClick={handleDebugUpload} variant="outline" size="lg">
                      🐞 Analizar (debug)
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card className="uploader-card">
            <LoadingSpinner message="Analizando audio..." />
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="error-card">
            <div className="error-content">
              <span className="error-icon">❌</span>
              <div className="error-text">
                <p className="error-title">Error</p>
                <p className="error-message">{error}</p>
              </div>
              <Button variant="danger" onClick={() => setError(null)}>
                Cerrar
              </Button>
            </div>
          </Card>
        )}

        {/* Results */}
        {prediction && (
          <div className="uploader-results">
            <PredictionResult
              prediction={prediction}
              waveform={waveformImg}
              spectrogram={specImg}
            />
            <div className="uploader-result-buttons">
              <Button onClick={handleReset} variant="secondary" size="lg">
                🔄 Analizar otro archivo
              </Button>
            </div>
          </div>
        )}

        {/* Debug result */}
        {debugResult && (
          <Card className="uploader-card">
            <div style={{ textAlign: 'left' }}>
              <h4>Debug upload result</h4>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(debugResult, null, 2)}
              </pre>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AudioUploader;

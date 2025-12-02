import React, { useState, useCallback } from "react";
import API from "../api";
import "./FileUploader.css";

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

export default function FileUploader({ onBack }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [waveformImg, setWaveformImg] = useState(null);
  const [specImg, setSpecImg] = useState(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "audio/wav") {
      setFile(droppedFile);
      processFile(droppedFile);
    } else {
      alert("Por favor, sube un archivo WAV válido.");
    }
  }, []);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = async (audioFile) => {
    setLoading(true);
    setResult(null);
    setWaveformImg(null);
    setSpecImg(null);

    try {
      const formData = new FormData();
      formData.append("file", audioFile);

      const res = await API.post("/predict", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(res.data.prediction);
      setWaveformImg(`data:image/png;base64,${res.data.waveform}`);
      setSpecImg(`data:image/png;base64,${res.data.spectrogram}`);
    } catch (error) {
      console.error("Error al procesar:", error);
      alert("Error al procesar el archivo. Por favor, intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setResult(null);
    setWaveformImg(null);
    setSpecImg(null);
  };

  const resultInfo = result ? diseaseInfo[result] : null;

  return (
    <div className="uploader-container">
      {/* Header */}
      <header className="uploader-header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver
        </button>
        <h1 className="uploader-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Subir Archivo de Audio
        </h1>
        <div className="header-spacer"></div>
      </header>

      <div className="uploader-content">
        {/* Upload Section */}
        <div 
          className={`upload-zone ${isDragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {!file && !loading && (
            <label className="upload-label">
              <input
                type="file"
                accept="audio/wav"
                onChange={handleFileSelect}
                className="file-input"
              />
              <div className="upload-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <h3 className="upload-text">Arrastra tu archivo aquí</h3>
              <p className="upload-subtext">o haz clic para seleccionar</p>
              <span className="upload-format">Formato soportado: WAV</span>
            </label>
          )}

          {file && !loading && (
            <div className="file-info">
              <div className="file-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
              <div className="file-details">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
              <button className="remove-file" onClick={resetUpload}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="loader">
                <div className="loader-ring"></div>
                <div className="loader-ring"></div>
                <div className="loader-ring"></div>
              </div>
              <p className="loading-text">Analizando audio con IA...</p>
              <p className="loading-subtext">Esto puede tomar unos segundos</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {result && (
          <div className="results-section">
            <h2 className="results-heading">Resultado del Análisis</h2>
            
            <div className={`result-card ${resultInfo?.severity}`}>
              <div className="result-header">
                <div className="result-code">{result}</div>
                <span className={`result-severity ${resultInfo?.severity}`}>
                  {resultInfo?.severity === 'normal' && '✓ Normal'}
                  {resultInfo?.severity === 'mild' && '⚠ Leve'}
                  {resultInfo?.severity === 'moderate' && '⚠ Moderado'}
                </span>
              </div>
              <h3 className="result-name">{resultInfo?.name}</h3>
              <p className="result-desc">{resultInfo?.desc}</p>
            </div>

            {(waveformImg || specImg) && (
              <div className="viz-grid">
                {waveformImg && (
                  <div className="viz-item">
                    <h4>📊 Forma de Onda</h4>
                    <img src={waveformImg} alt="Waveform" />
                  </div>
                )}
                {specImg && (
                  <div className="viz-item">
                    <h4>📈 Espectrograma</h4>
                    <img src={specImg} alt="Spectrogram" />
                  </div>
                )}
              </div>
            )}

            <button className="new-analysis-btn" onClick={resetUpload}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Analizar Otro Archivo
            </button>

            <div className="disclaimer">
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

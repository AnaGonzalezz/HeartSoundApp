import React from 'react';
import './PredictionResult.css';

const PredictionResult = ({ prediction, waveform, spectrogram }) => {
  const predictionMap = {
    'N': { label: 'Normal', color: 'green', icon: '✓' },
    'AS': { label: 'Aortic Stenosis', color: 'yellow', icon: '⚠' },
    'MR': { label: 'Mitral Regurgitation', color: 'yellow', icon: '⚠' },
    'MS': { label: 'Mitral Stenosis', color: 'red', icon: '⚠' },
    'MVP': { label: 'Mitral Valve Prolapse', color: 'yellow', icon: '⚠' },
  };

  const predInfo = predictionMap[prediction] || { label: 'Unknown', color: 'gray', icon: '?' };

  return (
    <div className="prediction-result">
      <div className={`result-card result-card--${predInfo.color}`}>
        <div className="result-icon">{predInfo.icon}</div>
        <h3 className="result-label">{predInfo.label}</h3>
        <p className="result-prediction">Predicción: <span>{prediction}</span></p>
      </div>

      <div className="result-images">
        {waveform && (
          <div className="result-image-card">
            <h4>Forma de Onda</h4>
            <img src={waveform} alt="Waveform" />
          </div>
        )}
        {spectrogram && (
          <div className="result-image-card">
            <h4>Espectrograma</h4>
            <img src={spectrogram} alt="Spectrogram" />
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionResult;

import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = 'Cargando...' }) => {
  return (
    <div className="loading-spinner">
      <div className="spinner-container">
        <div className="spinner-ring"></div>
      </div>
      <p className="spinner-message">{message}</p>
    </div>
  );
};

export default LoadingSpinner;

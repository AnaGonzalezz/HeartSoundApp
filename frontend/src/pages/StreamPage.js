import React, { useState, useEffect, useRef } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import './StreamPage.css';

const StreamPage = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 2048;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      setIsStreaming(true);
      visualize();
    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
    }
  };

  const stopStream = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsStreaming(false);
  };

  const visualize = () => {
    if (!isStreaming) return;

    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    analyser.getByteFrequencyData(dataArray);

    // Clear canvas
    ctx.fillStyle = 'rgb(244, 246, 250)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw frequency bars
    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height;

      const hue = (i / dataArray.length) * 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }

    requestAnimationFrame(visualize);
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="stream-container">
      <div className="stream-content">
        <h1 className="stream-title">Stream Cardíaco en Vivo</h1>
        <p className="stream-subtitle">
          Monitorea la señal cardíaca en tiempo real con análisis de FFT
        </p>

        <Card className="stream-card">
          <div className="stream-main">
            {/* Visualización */}
            <div className="stream-canvas-container">
              <h3 className="stream-canvas-title">Espectro de Frecuencias</h3>
              <canvas
                ref={canvasRef}
                width={800}
                height={300}
                className="stream-canvas"
              />
            </div>

            {/* Metrics Display */}
            <div className="stream-metrics">
              <div className="metric-card metric-primary">
                <p className="metric-label">Frecuencia Cardíaca</p>
                <p className="metric-value">--</p>
                <p className="metric-unit">BPM</p>
              </div>
              
              <div className="metric-card metric-info">
                <p className="metric-label">Estado</p>
                <p className="metric-value">{isStreaming ? '🟢 Activo' : '🔴 Inactivo'}</p>
              </div>

              <div className="metric-card metric-success">
                <p className="metric-label">Calidad</p>
                <p className="metric-value">Buena</p>
              </div>
            </div>

            {/* Controls */}
            <div className="stream-controls">
              {!isStreaming ? (
                <Button onClick={startStream} size="lg">
                  ▶ Iniciar Stream
                </Button>
              ) : (
                <Button onClick={stopStream} variant="danger" size="lg">
                  ⏹ Detener Stream
                </Button>
              )}
            </div>

            {/* Info */}
            <div className="stream-info">
              <h4>ℹ Información</h4>
              <ul>
                <li>• El stream utiliza WebAudio API para capturar datos en tiempo real</li>
                <li>• FFT (Fast Fourier Transform) descompone la señal en componentes de frecuencia</li>
                <li>• Los datos de BPM se calculan analizando los picos de la señal</li>
                <li>• Esta visualización es educativa y no debe usarse con propósitos médicos</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StreamPage;

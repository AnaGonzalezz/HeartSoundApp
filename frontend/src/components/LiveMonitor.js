import React, { useState, useRef, useEffect, useCallback } from "react";
import "./LiveMonitor.css";

export default function LiveMonitor({ onBack }) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [bpm, setBpm] = useState(null);
  const [beatCount, setBeatCount] = useState(0);
  const [volume, setVolume] = useState(8);
  const [signalLevel, setSignalLevel] = useState(0);
  const [statusText, setStatusText] = useState("Listo para iniciar");

  // Referencias principales
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const gainNodeRef = useRef(null);
  const streamRef = useRef(null);
  const animationRef = useRef(null);

  // Buffer de datos para visualización
  const waveformDataRef = useRef([]);
  const MAX_POINTS = 300;

  // Sistema de detección de latidos
  const beatDetectorRef = useRef({
    buffer: [],
    bufferSize: 30,
    lastBeatTime: 0,
    beatTimes: [],
    threshold: 0.02,
    adaptiveThreshold: 0.02,
    minInterval: 300,  // Mínimo 300ms entre latidos (200 BPM máx)
    maxInterval: 1500, // Máximo 1.5s entre latidos (40 BPM mín)
    peakValue: 0,
    isAboveThreshold: false
  });

  // Calcular BPM desde intervalos de latidos
  const calculateBPM = useCallback((beatTimes) => {
    if (beatTimes.length < 3) return null;

    // Calcular intervalos entre latidos consecutivos
    const intervals = [];
    for (let i = 1; i < beatTimes.length; i++) {
      const interval = beatTimes[i] - beatTimes[i - 1];
      if (interval >= 300 && interval <= 1500) {
        intervals.push(interval);
      }
    }

    if (intervals.length < 2) return null;

    // Usar mediana para robustez contra outliers
    const sorted = [...intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const calculatedBpm = Math.round(60000 / median);
    
    // Validar rango razonable
    if (calculatedBpm >= 40 && calculatedBpm <= 200) {
      return calculatedBpm;
    }
    return null;
  }, []);

  // Procesar audio y detectar latidos
  const processAudio = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return { amplitude: 0, isBeat: false };

    const dataArray = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(dataArray);

    // Calcular amplitud RMS
    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);

    // Actualizar nivel de señal para UI
    setSignalLevel(Math.min(rms * 500, 100));

    // Sistema de detección de latidos
    const detector = beatDetectorRef.current;
    const now = performance.now();
    let isBeat = false;

    // Añadir al buffer circular
    detector.buffer.push(rms);
    if (detector.buffer.length > detector.bufferSize) {
      detector.buffer.shift();
    }

    // Calcular media del buffer para umbral adaptativo
    if (detector.buffer.length >= detector.bufferSize) {
      const avg = detector.buffer.reduce((a, b) => a + b, 0) / detector.buffer.length;
      const max = Math.max(...detector.buffer);
      
      // Umbral adaptativo: promedio + porcentaje del máximo
      detector.adaptiveThreshold = Math.max(
        detector.threshold,
        avg * 1.5,
        max * 0.4
      );
    }

    // Detectar cruce ascendente del umbral (inicio de latido)
    const timeSinceLastBeat = now - detector.lastBeatTime;

    if (rms > detector.adaptiveThreshold && !detector.isAboveThreshold) {
      if (timeSinceLastBeat > detector.minInterval) {
        // ¡LATIDO DETECTADO!
        isBeat = true;
        detector.lastBeatTime = now;
        detector.isAboveThreshold = true;
        detector.peakValue = rms;

        // Guardar tiempo del latido
        detector.beatTimes.push(now);
        
        // Mantener solo últimos 10 latidos
        if (detector.beatTimes.length > 10) {
          detector.beatTimes.shift();
        }

        // Actualizar contador
        setBeatCount(prev => prev + 1);

        // Calcular BPM
        const newBpm = calculateBPM(detector.beatTimes);
        if (newBpm) {
          setBpm(newBpm);
        }
      }
    }

    // Reset cuando baja del umbral
    if (rms < detector.adaptiveThreshold * 0.6) {
      detector.isAboveThreshold = false;
    }

    // Limpiar si no hay actividad
    if (timeSinceLastBeat > detector.maxInterval * 2) {
      detector.beatTimes = [];
      setBpm(null);
    }

    return { amplitude: rms, isBeat };
  }, [calculateBPM]);

  // Dibujar visualización del ECG
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    // Procesar audio
    const { amplitude, isBeat } = processAudio();

    // Crear valor de visualización
    let displayValue = amplitude * 8;

    // Añadir pico cuando hay latido
    if (isBeat) {
      displayValue = Math.max(displayValue, 0.8);
    }

    // Añadir al buffer de visualización
    waveformDataRef.current.push({
      value: displayValue,
      isBeat: isBeat,
      time: performance.now()
    });

    if (waveformDataRef.current.length > MAX_POINTS) {
      waveformDataRef.current.shift();
    }

    // Limpiar canvas con fondo oscuro
    ctx.fillStyle = "#0a0f1a";
    ctx.fillRect(0, 0, width, height);

    // Dibujar cuadrícula
    ctx.strokeStyle = "rgba(34, 197, 94, 0.1)";
    ctx.lineWidth = 1;
    
    const gridSpacing = 40;
    for (let x = 0; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Línea central de referencia
    ctx.strokeStyle = "rgba(34, 197, 94, 0.2)";
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Dibujar forma de onda ECG
    const data = waveformDataRef.current;
    if (data.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 10;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      const pointWidth = width / MAX_POINTS;
      const centerY = height / 2;
      const amplitude = height * 0.4;

      data.forEach((point, index) => {
        const x = index * pointWidth;
        let y = centerY;

        if (point.isBeat) {
          // Dibujar complejo QRS cuando hay latido
          const progress = (index % 20) / 20;
          if (progress < 0.3) {
            y = centerY + amplitude * 0.3 * Math.sin(progress * Math.PI / 0.3);
          } else if (progress < 0.5) {
            y = centerY - amplitude * Math.sin((progress - 0.3) * Math.PI / 0.2);
          } else if (progress < 0.7) {
            y = centerY + amplitude * 0.4 * Math.sin((progress - 0.5) * Math.PI / 0.2);
          }
        } else {
          // Línea base con pequeña variación
          y = centerY - point.value * amplitude;
        }

        // Clamp valores
        y = Math.max(10, Math.min(height - 10, y));

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
      ctx.shadowBlur = 0;

      // Punto de escaneo brillante
      const lastIndex = data.length - 1;
      const lastX = lastIndex * pointWidth;
      const lastPoint = data[lastIndex];
      let lastY = centerY - lastPoint.value * amplitude;
      lastY = Math.max(10, Math.min(height - 10, lastY));

      // Glow exterior
      ctx.beginPath();
      ctx.arc(lastX, lastY, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34, 197, 94, 0.3)";
      ctx.fill();

      // Punto central
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e";
      ctx.fill();
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [processAudio]);

  // Iniciar monitoreo
  const startMonitoring = async () => {
    try {
      setStatusText("Solicitando acceso al micrófono...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1
        }
      });

      streamRef.current = stream;
      setStatusText("Conectando audio...");

      // Crear contexto de audio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      // Filtro paso alto (elimina frecuencias muy bajas / ruido)
      const highpassFilter = audioContext.createBiquadFilter();
      highpassFilter.type = "highpass";
      highpassFilter.frequency.value = 20;

      // Filtro paso bajo (elimina frecuencias altas / ruido)
      const lowpassFilter = audioContext.createBiquadFilter();
      lowpassFilter.type = "lowpass";
      lowpassFilter.frequency.value = 200;

      // Nodo de ganancia
      const gainNode = audioContext.createGain();
      gainNode.gain.value = volume;
      gainNodeRef.current = gainNode;

      // Analizador
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      // Conectar cadena de audio para análisis
      source.connect(highpassFilter);
      highpassFilter.connect(lowpassFilter);
      lowpassFilter.connect(analyser);

      // Conectar para salida de audio (escuchar)
      lowpassFilter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Resetear detector de latidos
      beatDetectorRef.current = {
        buffer: [],
        bufferSize: 30,
        lastBeatTime: 0,
        beatTimes: [],
        threshold: 0.02,
        adaptiveThreshold: 0.02,
        minInterval: 300,
        maxInterval: 1500,
        peakValue: 0,
        isAboveThreshold: false
      };

      // Resetear visualización
      waveformDataRef.current = [];
      setBeatCount(0);
      setBpm(null);

      // Configurar canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);
        canvas.style.width = rect.width + "px";
        canvas.style.height = rect.height + "px";
      }

      setIsMonitoring(true);
      setStatusText("Monitoreando...");
      
      // Iniciar animación
      draw();

    } catch (error) {
      console.error("Error:", error);
      setStatusText("Error: No se pudo acceder al micrófono");
      alert("No se pudo acceder al micrófono. Verifica los permisos.");
    }
  };

  // Detener monitoreo
  const stopMonitoring = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsMonitoring(false);
    setStatusText("Monitoreo detenido");
  }, []);

  // Actualizar volumen en tiempo real
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        volume,
        audioContextRef.current.currentTime
      );
    }
  }, [volume]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // Obtener estado del BPM
  const getBpmStatus = () => {
    if (!bpm) return { text: "--", className: "" };
    if (bpm < 60) return { text: "Bradicardia", className: "bradycardia" };
    if (bpm > 100) return { text: "Taquicardia", className: "tachycardia" };
    return { text: "Normal", className: "normal" };
  };

  const bpmStatus = getBpmStatus();

  return (
    <div className="monitor-container">
      {/* Header */}
      <header className="monitor-header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
        <h1 className="monitor-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          Monitor Cardíaco
        </h1>
        <div className="monitor-status">
          <span className={`status-dot ${isMonitoring ? "active" : ""}`}></span>
          {statusText}
        </div>
      </header>

      {/* Main Content */}
      <div className="monitor-content">
        {/* Stats Panel */}
        <div className="stats-panel">
          {/* BPM Card */}
          <div className="stat-card bpm-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">Frecuencia Cardíaca</span>
              <span className={`stat-value ${isMonitoring && bpm ? "pulse" : ""}`}>
                {bpm || "--"}
              </span>
              <span className="stat-unit">BPM</span>
            </div>
            <span className={`stat-status ${bpmStatus.className}`}>
              {bpmStatus.text}
            </span>
          </div>

          {/* Beat Counter */}
          <div className="stat-card">
            <div className="stat-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">Latidos Detectados</span>
              <span className="stat-value">{beatCount}</span>
              <span className="stat-unit">latidos</span>
            </div>
          </div>

          {/* Signal Level */}
          <div className="stat-card">
            <div className="stat-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5v14M7 7v10M22 9v6M2 9v6" />
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">Nivel de Señal</span>
              <div className="signal-bar-container">
                <div 
                  className="signal-bar" 
                  style={{ width: `${signalLevel}%` }}
                ></div>
              </div>
              <span className="stat-unit">{Math.round(signalLevel)}%</span>
            </div>
          </div>
        </div>

        {/* ECG Display */}
        <div className="ecg-panel">
          <div className="ecg-header">
            <span className="ecg-title">Electrocardiograma en Tiempo Real</span>
            <span className={`ecg-indicator ${isMonitoring ? "active" : ""}`}>
              ● {isMonitoring ? "EN VIVO" : "DETENIDO"}
            </span>
          </div>
          <div className="ecg-canvas-container">
            <canvas ref={canvasRef} className="ecg-canvas"></canvas>
          </div>
        </div>

        {/* Controls */}
        <div className="controls-panel">
          <div className="volume-control">
            <label>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
              Volumen: {volume}
            </label>
            <input
              type="range"
              min="0"
              max="15"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="volume-slider"
            />
          </div>

          <div className="action-buttons">
            {!isMonitoring ? (
              <button className="start-btn" onClick={startMonitoring}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Iniciar Monitoreo
              </button>
            ) : (
              <button className="stop-btn" onClick={stopMonitoring}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Detener
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="instructions-panel">
        <h3>📋 Instrucciones de Uso</h3>
        <ol>
          <li>Coloca el micrófono o estetoscopio digital cerca del pecho</li>
          <li>Mantén un ambiente silencioso para mejor detección</li>
          <li>Ajusta el volumen para escuchar los sonidos cardíacos</li>
          <li>El BPM se calculará automáticamente tras detectar latidos</li>
        </ol>
      </div>
    </div>
  );
}

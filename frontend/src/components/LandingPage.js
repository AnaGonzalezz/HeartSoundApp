import React, { useEffect, useState } from "react";
import "./LandingPage.css";

export default function LandingPage({ onNavigate }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const features = [
    {
      id: "monitor",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 12h4l3-9 4 18 3-9h4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: "Monitor en Tiempo Real",
      description: "Visualiza el ECG en vivo con audio amplificado y detección automática de BPM",
      badge: "NUEVO",
      color: "#ef4444"
    },
    {
      id: "record",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      ),
      title: "Grabar y Analizar",
      description: "Captura audio cardíaco y obtén un diagnóstico preciso con inteligencia artificial",
      badge: null,
      color: "#10b981"
    },
    {
      id: "upload",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      ),
      title: "Subir Archivo",
      description: "Analiza archivos de audio WAV existentes para obtener diagnóstico instantáneo",
      badge: null,
      color: "#3b82f6"
    }
  ];

  return (
    <div className={`landing-container ${isVisible ? "visible" : ""}`}>
      {/* Fondo animado */}
      <div className="background-animation">
        <div className="pulse-ring pulse-ring-1"></div>
        <div className="pulse-ring pulse-ring-2"></div>
        <div className="pulse-ring pulse-ring-3"></div>
      </div>

      {/* Header */}
      <header className="landing-header">
        <div className="logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <span className="logo-text">CardioSound AI</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Análisis Inteligente de
            <span className="gradient-text"> Sonidos Cardíacos</span>
          </h1>
          <p className="hero-subtitle">
            Sistema avanzado de inteligencia artificial para la detección temprana de enfermedades 
            cardíacas mediante el análisis de auscultación digital.
          </p>
        </div>

        <div className="hero-visual">
          <div className="heart-container">
            <div className="heart-glow"></div>
            <svg className="heart-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <div className="heart-pulse-ring"></div>
            <div className="heart-pulse-ring heart-pulse-ring-2"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Selecciona un Modo de Análisis</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <button
              key={feature.id}
              className="feature-card"
              onClick={() => onNavigate(feature.id)}
              style={{ 
                "--feature-color": feature.color,
                "--delay": `${index * 0.1}s`
              }}
            >
              {feature.badge && (
                <span className="feature-badge">{feature.badge}</span>
              )}
              <div className="feature-icon">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
              <div className="feature-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Conditions Section */}
      <section className="conditions-section">
        <h2 className="section-title">Condiciones Detectables</h2>
        <p className="conditions-subtitle">
          Nuestro modelo de IA puede identificar las siguientes condiciones cardíacas
        </p>
        <div className="conditions-grid">
          <div className="condition-card">
            <div className="condition-icon" style={{ "--condition-color": "#22c55e" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3>Normal (N)</h3>
            <p>Sonido cardíaco saludable sin anomalías detectadas</p>
          </div>
          
          <div className="condition-card">
            <div className="condition-icon" style={{ "--condition-color": "#f59e0b" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3>Estenosis Aórtica (AS)</h3>
            <p>Estrechamiento de la válvula aórtica</p>
          </div>
          
          <div className="condition-card">
            <div className="condition-icon" style={{ "--condition-color": "#ef4444" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <h3>Regurgitación Mitral (MR)</h3>
            <p>Reflujo de sangre por la válvula mitral</p>
          </div>
          
          <div className="condition-card">
            <div className="condition-icon" style={{ "--condition-color": "#8b5cf6" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <h3>Estenosis Mitral (MS)</h3>
            <p>Estrechamiento de la válvula mitral</p>
          </div>
          
          <div className="condition-card">
            <div className="condition-icon" style={{ "--condition-color": "#3b82f6" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <h3>Prolapso Mitral (MVP)</h3>
            <p>Prolapso de la válvula mitral</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>CardioSound AI - Sistema de Diagnóstico Cardíaco por IA</p>
        <p className="disclaimer">
          ⚠️ Este sistema es una herramienta de apoyo y no reemplaza el diagnóstico médico profesional.
        </p>
      </footer>
    </div>
  );
}

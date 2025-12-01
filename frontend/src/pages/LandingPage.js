import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: '🔍',
      title: 'Análisis Detallado',
      description: 'Sube o graba audio para detectar anomalías cardíacas con IA'
    },
    {
      icon: '📊',
      title: 'Visualización',
      description: 'Observa la forma de onda y espectrograma del audio'
    },
    {
      icon: '⚡',
      title: 'Resultados Instantáneos',
      description: 'Obtén predicciones en tiempo real'
    },
  ];

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <nav className="landing-nav">
          <div className="landing-logo">
            <div className="logo-icon">❤️</div>
            <h1 className="logo-text">Heart Sound App</h1>
          </div>
          <div className="landing-tagline">Análisis Cardíaco con IA</div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h2 className="hero-title">Detecta Anomalías Cardíacas con IA</h2>
            <p className="hero-description">
              Heart Sound App es una plataforma educativa y de diagnóstico que utiliza 
              inteligencia artificial para analizar sonidos cardíacos y detectar posibles 
              enfermedades. Ideal para cursos de Teoría de la Información y Sistemas de Comunicaciones.
            </p>
            
            <div className="hero-diseases">
              <h3 className="hero-diseases-title">Enfermedades detectadas:</h3>
              <ul className="hero-diseases-list">
                <li>✓ Estenosis Aórtica (AS)</li>
                <li>✓ Regurgitación Mitral (MR)</li>
                <li>✓ Estenosis Mitral (MS)</li>
                <li>✓ Prolapso de Válvula Mitral (MVP)</li>
              </ul>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-visual-inner">
              <div className="hero-visual-icon">❤️</div>
              <p className="hero-visual-text">Heart Sound App</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <h3 className="features-title">Características</h3>
        <div className="features-grid">
          {features.map((feature, idx) => (
            <Card key={idx} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h4 className="feature-title">{feature.title}</h4>
              <p className="feature-description">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Main Actions */}
      <section className="landing-actions">
        <h3 className="actions-title">¿Qué quieres hacer?</h3>
        
        <div className="actions-grid">
          {/* Análisis */}
          <Card className="action-card action-card-analyze">
            <div className="action-icon">📊</div>
            <h4 className="action-title">Análisis de Audio</h4>
            <p className="action-description">
              Carga un archivo de audio o graba desde tu micrófono para analizar sonidos cardíacos 
              y obtener resultados detallados con visualizaciones.
            </p>
            <div className="action-features">
              <p>✓ Carga de archivos</p>
              <p>✓ Grabación en vivo</p>
              <p>✓ Análisis inmediato</p>
            </div>
            <Button
              onClick={() => navigate('/analyze')}
              size="lg"
              className="action-button"
            >
              Ir al Análisis
            </Button>
          </Card>

          {/* Stream */}
          <Card className="action-card action-card-stream">
            <div className="action-icon">🔴</div>
            <h4 className="action-title">Stream en Vivo</h4>
            <p className="action-description">
              Monitorea en tiempo real la señal cardíaca, espectro de frecuencias, BPM y análisis 
              de FFT. Perfecto para propósitos educativos y de investigación.
            </p>
            <div className="action-features">
              <p>✓ Señal en vivo</p>
              <p>✓ Análisis de FFT</p>
              <p>✓ Métricas en tiempo real</p>
            </div>
            <Button
              onClick={() => navigate('/stream')}
              size="lg"
              className="action-button"
            >
              Ir al Stream
            </Button>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p className="footer-main">Heart Sound App - Análisis Cardíaco con Inteligencia Artificial</p>
        <p className="footer-subtitle">
          Desarrollado para el curso de Teoría de la Información y Sistemas de Comunicaciones
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;

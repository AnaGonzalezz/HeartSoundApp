// Utilidades para procesamiento de audio
export const convertAudioBlobToWav = async (blob) => {
  const arrayBuffer = await blob.arrayBuffer();
  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

export const getAudioDuration = (blob) => {
  return new Promise((resolve) => {
    const audio = new Audio(URL.createObjectURL(blob));
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
    };
  });
};

export const validateAudioFile = (file, maxSizeMB = 10) => {
  const maxSize = maxSizeMB * 1024 * 1024;
  
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }
  
  if (!file.type.startsWith('audio/')) {
    return { valid: false, error: 'File must be an audio file' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }
  
  return { valid: true };
};

// Mapeo de predicciones a información médica
export const getPredictionInfo = (prediction) => {
  const predictionMap = {
    'N': {
      label: 'Normal',
      color: 'green',
      description: 'Sonidos cardíacos normales. No se detectan anomalías.',
      icon: '✓'
    },
    'AS': {
      label: 'Aortic Stenosis (Estenosis Aórtica)',
      color: 'orange',
      description: 'Estrechamiento de la válvula aórtica. Requiere seguimiento médico.',
      icon: '⚠'
    },
    'MR': {
      label: 'Mitral Regurgitation (Regurgitación Mitral)',
      color: 'orange',
      description: 'La válvula mitral no cierra completamente. Requiere atención médica.',
      icon: '⚠'
    },
    'MS': {
      label: 'Mitral Stenosis (Estenosis Mitral)',
      color: 'red',
      description: 'Estrechamiento de la válvula mitral. Requiere atención médica urgente.',
      icon: '⚠'
    },
    'MVP': {
      label: 'Mitral Valve Prolapse (Prolapso de Válvula Mitral)',
      color: 'orange',
      description: 'La válvula mitral se abomba hacia atrás. Requiere seguimiento.',
      icon: '⚠'
    }
  };
  
  return predictionMap[prediction] || {
    label: 'Unknown',
    color: 'gray',
    description: 'Predicción desconocida',
    icon: '?'
  };
};

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejo de errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const audioService = {
  // Enviar archivo de audio al modelo
  predictFromFile: async (file, dummy = false) => {
    const formData = new FormData();
    formData.append('file', file);
    const endpoint = dummy ? '/predict_dummy' : '/predict';
    return apiClient.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Enviar audio grabado al modelo
  predictFromRecording: async (audioBlob, dummy = false) => {
    const formData = new FormData();
    // Determinar extensión basada en el tipo MIME
    const mimeType = audioBlob.type || 'audio/webm';
    const ext = mimeType.includes('wav') ? 'wav' : 
                mimeType.includes('mp4') ? 'm4a' : 'webm';
    formData.append('file', audioBlob, `recording.${ext}`);
    const endpoint = dummy ? '/predict_dummy' : '/predict';
    return apiClient.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Endpoint de debug que guarda el archivo y devuelve metadata
  uploadDebug: async (audioBlob) => {
    const formData = new FormData();
    const mimeType = audioBlob.type || 'audio/webm';
    const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('mp4') ? 'm4a' : 'webm';
    formData.append('file', audioBlob, `recording.${ext}`);
    return apiClient.post('/upload_debug', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default apiClient;

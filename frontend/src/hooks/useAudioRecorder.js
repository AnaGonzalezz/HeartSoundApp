// Hook personalizado para grabar audio desde el navegador
import { useState, useRef, useCallback } from 'react';

// Función auxiliar para convertir AudioBuffer a WAV
function audioBufferToWav(audioBuffer) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  const channels = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }

  const interleaved = new Float32Array(audioBuffer.length * numberOfChannels);
  let index = 0;
  const channelLength = audioBuffer.length;
  for (let i = 0; i < channelLength; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      interleaved[index++] = channels[ch][i];
    }
  }

  const dataLength = interleaved.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  const volume = 0.8;
  for (let i = 0; i < interleaved.length; i++) {
    let s = Math.max(-1, Math.min(1, interleaved[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, s, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const audioBufferRef = useRef(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      
      const audioChunks = [];
      scriptProcessor.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0);
        audioChunks.push(new Float32Array(audioData));
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContext.destination);

      processorRef.current = { scriptProcessor, audioChunks };
      setIsRecording(true);
    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (processorRef.current && audioContextRef.current) {
      const { scriptProcessor, audioChunks } = processorRef.current;
      scriptProcessor.disconnect();

      // Combinar chunks en un solo buffer
      const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const wavData = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of audioChunks) {
        wavData.set(chunk, offset);
        offset += chunk.length;
      }

      // Crear AudioBuffer y convertir a WAV
      const audioBuffer = audioContextRef.current.createBuffer(
        1,
        wavData.length,
        audioContextRef.current.sampleRate
      );
      audioBuffer.getChannelData(0).set(wavData);

      const wavBlob = audioBufferToWav(audioBuffer);
      setRecordedAudio(wavBlob);

      // Limpiar
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    }
  }, []);

  const resetRecording = useCallback(() => {
    setRecordedAudio(null);
    processorRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  return {
    isRecording,
    recordedAudio,
    startRecording,
    stopRecording,
    resetRecording,
  };
};

export default useAudioRecorder;

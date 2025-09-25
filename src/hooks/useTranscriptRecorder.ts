import { useState, useRef, useCallback } from 'react';

export interface TranscriptRecorderState {
  isRecording: boolean;
  hasPermission: boolean | null;
  error: string | null;
}

export interface UseTranscriptRecorderReturn extends TranscriptRecorderState {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  requestPermission: () => Promise<boolean>;
}

export const useTranscriptRecorder = (
  onAudioChunk?: (chunk: Blob) => void,
  timeslice = 5000 // 5 seconds
): UseTranscriptRecorderReturn => {
  const [state, setState] = useState<TranscriptRecorderState>({
    isRecording: false,
    hasPermission: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      // Test that we can create a MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
      setState(prev => ({ ...prev, hasPermission: true }));
      return true;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      setState(prev => ({ 
        ...prev, 
        hasPermission: false, 
        error: error instanceof Error ? error.message : 'Failed to access microphone'
      }));
      return false;
    }
  }, []);

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Request fresh stream for recording
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && onAudioChunk) {
          onAudioChunk(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setState(prev => ({ 
          ...prev, 
          error: 'Recording error occurred',
          isRecording: false 
        }));
      };

      mediaRecorder.onstop = () => {
        setState(prev => ({ ...prev, isRecording: false }));
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(timeslice);
      setState(prev => ({ ...prev, isRecording: true }));

    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start recording',
        isRecording: false 
      }));
    }
  }, [onAudioChunk, timeslice]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    mediaRecorderRef.current = null;
    setState(prev => ({ ...prev, isRecording: false }));
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    requestPermission,
  };
};
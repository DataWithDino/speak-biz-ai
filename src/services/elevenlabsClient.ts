import { supabase } from "@/integrations/supabase/client";

export interface FlashCard {
  term: string;
  definition: string;
  example_sentence: string;
  german_translation: string;
  common_mistake: string;
  correction: string;
  cefr_level: 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  topic_tag: string;
}

export interface AgentResponse {
  transcript: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  flashcards: FlashCard[];
  analysis?: string;
}

export class ElevenLabsClient {
  private sessionId: string | null = null;

  async startSession(agentId: string, voiceId: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-agent', {
        body: {
          action: 'start',
          agentId,
          voiceId,
        },
      });

      if (error) throw error;
      
      this.sessionId = data.sessionId;
      return this.sessionId;
    } catch (error) {
      console.error('Failed to start ElevenLabs session:', error);
      throw error;
    }
  }

  async streamAudio(audioChunk: Blob): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session. Call startSession first.');
    }

    try {
      // Convert Blob to base64 for transmission
      const arrayBuffer = await audioChunk.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      await supabase.functions.invoke('elevenlabs-agent', {
        body: {
          action: 'stream',
          sessionId: this.sessionId,
          audioData: base64Audio,
          mimeType: audioChunk.type,
        },
      });
    } catch (error) {
      console.error('Failed to stream audio to ElevenLabs:', error);
      // Don't throw here to avoid disrupting the recording
    }
  }

  async endSession(): Promise<AgentResponse> {
    if (!this.sessionId) {
      throw new Error('No active session to end.');
    }

    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-agent', {
        body: {
          action: 'end',
          sessionId: this.sessionId,
        },
      });

      if (error) throw error;
      
      this.sessionId = null;
      return data as AgentResponse;
    } catch (error) {
      console.error('Failed to end ElevenLabs session:', error);
      throw error;
    }
  }

  async generateTTS(text: string, voiceId: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-agent', {
        body: {
          action: 'tts',
          text,
          voiceId,
        },
      });

      if (error) throw error;
      
      return data.audioUrl;
    } catch (error) {
      console.error('Failed to generate TTS:', error);
      throw error;
    }
  }

  isActive(): boolean {
    return this.sessionId !== null;
  }
}

export const elevenlabsClient = new ElevenLabsClient();
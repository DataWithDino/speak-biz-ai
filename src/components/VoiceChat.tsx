import React, { useEffect, useState, useCallback } from 'react';
import { useConversation } from '@11labs/react';
import { Mic, Headphones, MicOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceChatProps {
  topic: string;
  persona: string;
  skillLevel: string;
}

const VoiceChat: React.FC<VoiceChatProps> = ({ topic, persona, skillLevel }) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs');
      setIsConnected(true);
      toast({
        title: "Connected",
        description: "Voice chat is ready",
      });
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs');
      setIsConnected(false);
      setIsSpeaking(false);
      toast({
        title: "Disconnected",
        description: "Voice chat ended",
      });
    },
    onMessage: (message) => {
      console.log('Received message:', message);
    },
    onError: (error) => {
      console.error('Conversation error:', error);
      toast({
        title: "Error",
        description: "Failed to connect to voice service",
        variant: "destructive",
      });
    },
  });

  // Fetch agent ID from Edge Function
  const fetchAgentId = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-agent', {
        body: { 
          topic,
          persona,
          skillLevel
        }
      });

      if (error) throw error;
      
      if (data?.agentId) {
        setAgentId(data.agentId);
        return data.agentId;
      }
      throw new Error('No agent ID received');
    } catch (error) {
      console.error('Error fetching agent:', error);
      toast({
        title: "Error",
        description: "Failed to initialize voice agent",
        variant: "destructive",
      });
      return null;
    }
  }, [topic, persona, skillLevel, toast]);

  const startConversation = async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get or fetch agent ID
      let currentAgentId = agentId;
      if (!currentAgentId) {
        currentAgentId = await fetchAgentId();
        if (!currentAgentId) return;
      }

      // Start the conversation
      await conversation.startSession({ 
        agentId: currentAgentId 
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to start conversation',
        variant: "destructive",
      });
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error('Error ending conversation:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (conversation.status === 'connected') {
        conversation.endSession();
      }
    };
  }, [conversation]);

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="relative">
        {/* Outer glow effect */}
        <div className="absolute inset-0 blur-3xl opacity-20">
          <div className="w-64 h-64 rounded-full bg-gradient-to-br from-primary via-primary/50 to-transparent animate-pulse" />
        </div>
        
        {/* Main bubble container */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Animated rings when connected */}
          {isConnected && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
              <div className="absolute inset-4 rounded-full border-2 border-primary/30 animate-ping animation-delay-200" />
              <div className="absolute inset-8 rounded-full border-2 border-primary/40 animate-ping animation-delay-400" />
            </>
          )}
          
          {/* Core bubble - clickable */}
          <button
            onClick={isConnected ? endConversation : startConversation}
            className={`relative w-48 h-48 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center transition-all duration-300 hover:scale-105 ${
              conversation.isSpeaking ? 'scale-110 shadow-2xl shadow-primary/50' : 'scale-100 shadow-xl shadow-primary/30'
            }`}
          >
            {/* Inner glow */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-white/20 to-transparent blur-md" />
            
            {/* Icon */}
            <div className="relative z-10">
              {!isConnected ? (
                <MicOff className="w-16 h-16 text-white" />
              ) : conversation.isSpeaking ? (
                <Headphones className="w-16 h-16 text-white animate-pulse" />
              ) : (
                <Mic className="w-16 h-16 text-white animate-pulse" />
              )}
            </div>
            
            {/* Sound wave effect when agent is speaking */}
            {conversation.isSpeaking && (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping" />
                <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping animation-delay-200" />
              </>
            )}
          </button>
        </div>
        
        {/* Status text */}
        <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {!isConnected ? 'Click to start voice chat' : 
             conversation.isSpeaking ? `${persona} is speaking...` : 
             'Listening...'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceChat;
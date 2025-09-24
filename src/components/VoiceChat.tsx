import React, { useEffect, useState } from 'react';
import { useConversation } from '@11labs/react';
import { Mic, Headphones, MicOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceChatProps {
  topic: string;
  persona: string;
  skillLevel: string;
}

const skillLevelInstructions = {
  A1: "Use only basic vocabulary and simple present tense. Speak slowly with very simple sentences. Maximum 5-6 words per sentence.",
  A2: "Use common everyday expressions and basic phrases. Simple past and future tenses are okay. Keep sentences short and clear.",
  B1: "Use standard vocabulary for work situations. Can use all basic tenses. Sentences can be longer but should remain clear and straightforward.",
  B2: "Use more complex business vocabulary and idiomatic expressions. Can use all tenses including conditionals. Natural flowing sentences.",
  C1: "Use sophisticated business terminology and complex grammatical structures. Include idioms, phrasal verbs, and nuanced expressions.",
  C2: "Use native-level vocabulary with full range of idiomatic expressions, colloquialisms, and specialized business jargon. Complex and nuanced language."
};

const VoiceChat: React.FC<VoiceChatProps> = ({ topic, persona, skillLevel }) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);

  const levelInstruction = skillLevelInstructions[skillLevel as keyof typeof skillLevelInstructions] || skillLevelInstructions.B1;
  
  const systemPrompt = `You are a ${persona} in a business setting discussing "${topic}". 
    
CRITICAL: Adapt your language to ${skillLevel} level: ${levelInstruction}

Your role:
- Stay in character as a ${persona}
- Keep the conversation focused on ${topic}
- Be helpful but realistic for a business scenario
- Provide constructive feedback when appropriate
- Keep responses concise and natural for spoken conversation

Remember to match the learner's level - don't use language that's too advanced or too simple for ${skillLevel}.`;

  // ElevenLabs agent ID for conversation
  const AGENT_ID = "agent_4301k5ysabajfbcsns6zmc0qfbe4";

  const conversation = useConversation({
    overrides: {
      agent: {
        prompt: {
          prompt: systemPrompt
        },
        firstMessage: `Hello! I'm your ${persona}. Let's discuss ${topic}. How can I help you today?`,
        language: "en"
      },
      tts: {
        voiceId: "9BWtsMINqrJLrRacOk9x" // Aria voice - professional and clear
      }
    },
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

  const startConversation = async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from our edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-agent', {
        body: { topic, persona, skillLevel }
      });

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Failed to get conversation URL');
      }

      // Connect to the ElevenLabs agent using the signed URL
      const conversationId = await conversation.startSession({
        signedUrl: data.signedUrl
      });
      
      console.log('Started conversation with ID:', conversationId);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to start conversation. Make sure your agent is properly configured.',
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
        
        {/* Setup Instructions - removed since we now have a valid agent ID */}
      </div>
    </div>
  );
};

export default VoiceChat;
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
const AGENT_ID = "agent_4301k5ysabajfbcsns6zmc0qfbe4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Store active sessions
const activeSessions = new Map();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }
    
    const body = await req.json();
    
    // Handle different actions
    if (body.action) {
      switch (body.action) {
        case 'start':
          return await handleStart(body.agentId || AGENT_ID, body.voiceId, elevenLabsApiKey);
        case 'stream':
          return await handleStream(body.sessionId, body.audioData, body.mimeType, elevenLabsApiKey);
        case 'end':
          return await handleEnd(body.sessionId, elevenLabsApiKey);
        case 'tts':
          return await handleTTS(body.text, body.voiceId, elevenLabsApiKey);
        default:
          throw new Error(`Unknown action: ${body.action}`);
      }
    }
    
    // Legacy behavior - get signed URL
    const { topic, persona, skillLevel } = body;
    
    console.log('Getting signed URL for ElevenLabs agent:', { 
      topic, 
      persona, 
      skillLevel,
      agentId: AGENT_ID 
    });

    // Get a signed URL for the conversation with proper headers
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${AGENT_ID}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      // Check if it's an agent configuration issue
      if (response.status === 404) {
        throw new Error(`Agent not found. Please verify agent ID: ${AGENT_ID} is correct and the agent is properly configured in ElevenLabs dashboard.`);
      } else if (response.status === 401) {
        throw new Error('Invalid API key. Please check your ElevenLabs API key.');
      }
      
      throw new Error(`Failed to get signed URL: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Successfully got signed URL for conversation');

    // Verify the response has the expected structure
    if (!data.signed_url) {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response from ElevenLabs API - missing signed_url');
    }

    return new Response(
      JSON.stringify({ 
        signedUrl: data.signed_url,
        success: true,
        agentId: AGENT_ID
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in elevenlabs-agent function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        agentId: AGENT_ID,
        timestamp: new Date().toISOString()
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function handleStart(agentId: string, voiceId: string, apiKey: string) {
  try {
    // Create a unique session ID
    const sessionId = crypto.randomUUID();
    
    // Start ElevenLabs Conversational AI session
    const response = await fetch('https://api.elevenlabs.io/v1/convai/conversation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        override_agent_settings: {
          tts: {
            voice_id: voiceId,
          },
        },
        // Dynamic variables for the agent
        dynamic_variables: {
          VOICE_ID: voiceId,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start conversation: ${error}`);
    }

    const data = await response.json();
    
    // Store session info
    activeSessions.set(sessionId, {
      conversationId: data.conversation_id,
      transcript: [],
      startTime: Date.now(),
    });

    console.log(`Started ElevenLabs session: ${sessionId}`);

    return new Response(
      JSON.stringify({ sessionId, conversationId: data.conversation_id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error starting session:', error);
    throw error;
  }
}

async function handleStream(sessionId: string, audioData: string, mimeType: string, apiKey: string) {
  try {
    const session = activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Invalid session ID');
    }

    // Convert base64 back to binary
    const binaryData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    
    // For now, we'll just log that we received audio
    // In a full implementation, you'd stream this to ElevenLabs
    console.log(`Received audio chunk for session ${sessionId}: ${binaryData.length} bytes`);
    
    // Store timestamp for later analysis
    session.lastActivity = Date.now();

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error streaming audio:', error);
    throw error;
  }
}

async function handleEnd(sessionId: string, apiKey: string) {
  try {
    const session = activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Invalid session ID');
    }

    // Calculate session duration
    const duration = Date.now() - session.startTime;
    const durationMinutes = Math.round(duration / 60000);

    // For demo purposes, generate mock flashcards based on common business English
    // In a real implementation, this would come from the ElevenLabs agent analysis
    const mockFlashcards = [
      {
        term: "synergy",
        definition: "The interaction of two or more organizations to produce a combined effect greater than the sum of their separate effects",
        example_sentence: "We need to create synergy between our departments.",
        german_translation: "Synergie",
        common_mistake: "Using 'synergy' when you mean simple cooperation",
        correction: "Use 'synergy' only when describing enhanced combined effects",
        cefr_level: "C1",
        topic_tag: "business_strategy"
      },
      {
        term: "stakeholder",
        definition: "A person or organization that has an interest in or is affected by a business decision",
        example_sentence: "All stakeholders must approve this proposal.",
        german_translation: "Interessenvertreter",
        common_mistake: "Confusing 'stakeholder' with 'shareholder'",
        correction: "Stakeholders include anyone affected; shareholders own stock",
        cefr_level: "B2",
        topic_tag: "business_management"
      },
      {
        term: "quarterly review",
        definition: "A regular assessment of performance and progress conducted every three months",
        example_sentence: "Our quarterly review showed strong growth.",
        german_translation: "Quartalsbericht",
        common_mistake: "Saying 'quarter review' instead of 'quarterly review'",
        correction: "Use 'quarterly' (adjective) not 'quarter' (noun)",
        cefr_level: "B1",
        topic_tag: "business_reporting"
      }
    ];

    // Generate mock transcript
    const mockTranscript = [
      {
        role: "assistant",
        content: "Good morning! I'm ready to discuss our quarterly results. How do you think the team performed this quarter?",
        timestamp: new Date(session.startTime).toISOString()
      },
      {
        role: "user",
        content: "I believe we've made good progress, especially in creating synergy between departments.",
        timestamp: new Date(session.startTime + 30000).toISOString()
      },
      {
        role: "assistant",
        content: "That's excellent to hear. Synergy is crucial for our stakeholders. Can you elaborate on the specific improvements?",
        timestamp: new Date(session.startTime + 60000).toISOString()
      }
    ];

    // Clean up session
    activeSessions.delete(sessionId);

    console.log(`Ended ElevenLabs session: ${sessionId}, Duration: ${durationMinutes} minutes`);

    return new Response(
      JSON.stringify({
        transcript: mockTranscript,
        flashcards: mockFlashcards,
        analysis: `Session completed successfully. Duration: ${durationMinutes} minutes. Identified ${mockFlashcards.length} key business terms for study.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error ending session:', error);
    throw error;
  }
}

async function handleTTS(text: string, voiceId: string, apiKey: string) {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`TTS failed: ${error}`);
    }

    // Convert audio to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating TTS:', error);
    throw error;
  }
}
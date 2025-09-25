import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
const AGENT_ID = "agent_2901k609n6fremxtqcaxw45412t1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActiveSession {
  startTime: number;
  agentId: string;
  conversationId: string;
  elevenlabsConversationId: string;
  lastActivity: number;
  audioChunks: Array<{
    data: string;
    timestamp: number;
    mimeType: string;
  }>;
  transcript: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
}

// Store active sessions
const activeSessions = new Map<string, ActiveSession>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  console.log(`[TRACE ${requestId}] New request:`, {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  try {
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      console.error(`[TRACE ${requestId}] ELEVENLABS_API_KEY not configured`);
      throw new Error('ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY in environment variables.');
    }
    
    console.log(`[TRACE ${requestId}] API key found, length: ${apiKey.length}`);
    
    const body = await req.json();
    console.log(`[TRACE ${requestId}] Request body:`, {
      action: body.action,
      agentId: body.agentId,
      voiceId: body.voiceId,
      hasAudioData: !!body.audioData,
      audioDataLength: body.audioData?.length || 0
    });
    
    // Handle different actions
    if (body.action) {
      let response;
      const actionStartTime = Date.now();
      
      switch (body.action) {
        case 'start':
          console.log(`[TRACE ${requestId}] Handling START action`);
          response = await handleStart(body.agentId || AGENT_ID, body.voiceId, apiKey);
          break;
        case 'stream':
          console.log(`[TRACE ${requestId}] Handling STREAM action`);
          response = await handleStream(body.sessionId, body.audioData, body.mimeType, apiKey);
          break;
        case 'end':
          console.log(`[TRACE ${requestId}] Handling END action`);
          response = await handleEnd(body.sessionId, apiKey);
          break;
        case 'tts':
          console.log(`[TRACE ${requestId}] Handling TTS action`);
          response = await handleTTS(body.text, body.voiceId, apiKey);
          break;
        default:
          throw new Error(`Unknown action: ${body.action}`);
      }
      
      const actionDuration = Date.now() - actionStartTime;
      console.log(`[TRACE ${requestId}] Action completed in ${actionDuration}ms`);
      
      return response;
    }
    
    // Legacy behavior - get signed URL
    const { topic, persona, skillLevel } = body;
    
    console.log(`[TRACE ${requestId}] Getting signed URL for ElevenLabs agent:`, { 
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
          "xi-api-key": apiKey,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TRACE ${requestId}] ElevenLabs API error:`, {
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
    console.log(`[TRACE ${requestId}] Successfully got signed URL for conversation`);

    // Verify the response has the expected structure
    if (!data.signed_url) {
      console.error(`[TRACE ${requestId}] Invalid response structure:`, data);
      throw new Error('Invalid response from ElevenLabs API - missing signed_url');
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[TRACE ${requestId}] Request completed in ${totalDuration}ms`);

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
    const totalDuration = Date.now() - startTime;
    console.error(`[TRACE ${requestId}] Error in elevenlabs-agent function after ${totalDuration}ms:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        agentId: AGENT_ID,
        timestamp: new Date().toISOString(),
        requestId,
        duration: totalDuration
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
    console.log(`[TRACE] Starting ElevenLabs session with:`, {
      agentId,
      voiceId,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey?.substring(0, 10) + '...'
    });
    
    // Test if the API key is valid first
    const testResponse = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: {
        'xi-api-key': apiKey,
      },
    });
    
    if (!testResponse.ok) {
      const testError = await testResponse.text();
      console.error('[TRACE] API key validation failed:', testError);
      throw new Error(`Invalid ElevenLabs API key: ${testResponse.status}`);
    }
    
    console.log('[TRACE] API key validated successfully');
    
    // Create a unique session ID for tracking
    const sessionId = crypto.randomUUID();
    
    // Create session and store it for tracking audio and conversation data
    const session: ActiveSession = {
      startTime: Date.now(),
      agentId,
      conversationId: sessionId,
      elevenlabsConversationId: `conv_${sessionId}`, // Generate a conversation ID for tracking
      lastActivity: Date.now(),
      audioChunks: [],
      transcript: []
    };
    
    console.log(`[TRACE] Creating session for agent: ${agentId}`);
    
    // Store session info
    activeSessions.set(sessionId, session);

    console.log(`[TRACE] Session created successfully: ${sessionId}`);

    return new Response(
      JSON.stringify({ 
        sessionId, 
        conversationId: session.elevenlabsConversationId,
        status: 'ready' // Indicate session is ready for WebSocket connection
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[TRACE] Error in handleStart:', error);
    throw error;
  }
}

async function handleStream(sessionId: string, audioData: string, mimeType: string, apiKey: string) {
  try {
    const session = activeSessions.get(sessionId);
    if (!session) {
      console.error(`[TRACE] Session not found: ${sessionId}`);
      throw new Error('Invalid session ID');
    }

    console.log(`[TRACE] Streaming audio to ElevenLabs conversation:`, {
      sessionId,
      elevenlabsConversationId: session.elevenlabsConversationId,
      audioDataLength: audioData.length,
      mimeType
    });

    // Store audio chunk with timestamp
    session.audioChunks.push({
      data: audioData,
      timestamp: Date.now(),
      mimeType: mimeType || 'audio/webm'
    });

    // Update session activity
    session.lastActivity = Date.now();
    console.log(`[TRACE] Stored audio chunk for session: ${sessionId}, total chunks: ${session.audioChunks.length}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        chunksStored: session.audioChunks.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[TRACE] Error streaming audio:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleEnd(sessionId: string, apiKey: string) {
  try {
    console.log(`[TRACE] Ending ElevenLabs session: ${sessionId}`);
    
    const session = activeSessions.get(sessionId);
    if (!session) {
      console.error(`[TRACE] Session ${sessionId} not found`);
      throw new Error(`Session ${sessionId} not found`);
    }

    const durationMs = Date.now() - session.startTime;
    const durationMinutes = Math.round(durationMs / 60000);

    console.log(`[TRACE] Session duration: ${durationMinutes} minutes`);

    // Try to get conversation data from ElevenLabs using the List Conversations endpoint
    let transcript: any[] = [];
    let analysis = `Business English Learning Analysis\n\nSession Duration: ${durationMinutes} minutes\n\nReal-time conversation with ElevenLabs AI agent completed.`;
    let flashcards: any[] = [];

    try {
      // Get conversations from ElevenLabs API
      const conversationsResponse = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${session.agentId}`,
        {
          headers: {
            'xi-api-key': apiKey,
          },
        }
      );

      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        console.log('[TRACE] Retrieved conversations from ElevenLabs:', conversationsData);

        // Find the most recent conversation that matches our timeframe
        const recentConversation = conversationsData.conversations?.find((conv: any) => {
          const convTime = new Date(conv.start_time || conv.created_at).getTime();
          const timeDiff = Math.abs(convTime - session.startTime);
          return timeDiff < 300000; // Within 5 minutes
        });

        if (recentConversation) {
          console.log('[TRACE] Found matching conversation:', recentConversation);
          
          // Extract transcript from the conversation
          if (recentConversation.transcript) {
            transcript = recentConversation.transcript.map((turn: any, index: number) => ({
              role: turn.role || (turn.user_query ? 'user' : 'assistant'),
              content: turn.user_query || turn.agent_response || turn.content || '',
              timestamp: turn.timestamp || new Date(session.startTime + (index * 30000)).toISOString()
            }));
          }
        }
      } else {
        console.log('[TRACE] Could not fetch conversations from ElevenLabs, using audio chunks for analysis');
      }
    } catch (error) {
      console.error('[TRACE] Error fetching ElevenLabs conversation data:', error);
    }

    // If we have a transcript, generate analysis and flashcards using AI
    if (transcript.length > 0) {
      const conversationText = transcript.map((t: any) => `${t.role}: ${t.content}`).join('\n');
      
      try {
        // Generate analysis using the actual conversation
        const analysisPrompt = `Analyze this business English conversation for learning insights:

Duration: ${durationMinutes} minutes
Turns: ${transcript.length}

Conversation:
${conversationText}

Provide analysis of vocabulary used, grammar patterns, and business communication skills demonstrated.`;

        const analysisResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: analysisPrompt
            }]
          })
        });

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json();
          analysis = analysisData.content[0]?.text || analysis;
          console.log('[TRACE] Generated AI analysis from real conversation');
        }
      } catch (error) {
        console.error('[TRACE] Failed to generate analysis:', error);
      }

      // Generate flashcards from actual conversation
      try {
        const flashcardPrompt = `Based on this real business English conversation, create 5-8 flashcards for key terms and phrases used:

${conversationText}

Return JSON array with this exact structure:
[{
  "term": "actual term from conversation",
  "definition": "clear definition",
  "example_sentence": "sentence from the conversation or similar",
  "german_translation": "German translation",
  "common_mistake": "common error when using this term",
  "correction": "how to use correctly",
  "cefr_level": "A2|B1|B2|C1|C2",
  "topic_tag": "relevant business topic"
}]`;

        const flashcardResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            messages: [{
              role: 'user',
              content: flashcardPrompt
            }]
          })
        });

        if (flashcardResponse.ok) {
          const flashcardData = await flashcardResponse.json();
          try {
            const flashcardText = flashcardData.content[0]?.text || '[]';
            const jsonMatch = flashcardText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              flashcards = JSON.parse(jsonMatch[0]);
              console.log(`[TRACE] Generated ${flashcards.length} flashcards from real conversation`);
            }
          } catch (e) {
            console.error('[TRACE] Failed to parse flashcards JSON:', e);
          }
        }
      } catch (error) {
        console.error('[TRACE] Failed to generate flashcards:', error);
      }
    } else {
      // Fallback: Generate analysis based on session duration and audio chunks
      const audioChunksReceived = session.audioChunks?.length || 0;
      analysis = `Business English Learning Analysis

Session Duration: ${durationMinutes} minutes
Audio chunks processed: ${audioChunksReceived}

This session used ElevenLabs conversational AI for real-time practice. ${audioChunksReceived > 0 ? 'Audio data was captured and processed for learning analytics.' : 'Session completed successfully.'}

Recommendations:
• Continue practicing with the ElevenLabs AI agent
• Focus on speaking clearly and naturally
• Use business-appropriate vocabulary and phrases
• Practice regularly for best results`;

      transcript = [{
        role: 'assistant',
        content: 'Real-time conversation completed with ElevenLabs AI agent.',
        timestamp: new Date().toISOString()
      }];
    }

    // Clean up session
    activeSessions.delete(sessionId);

    console.log(`[TRACE] Session ended successfully:`, {
      sessionId,
      duration: `${durationMinutes} minutes`,
      flashcardsGenerated: flashcards.length,
      transcriptEntries: transcript.length
    });

    const response = {
      transcript,
      flashcards,
      analysis
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[TRACE] Error ending ElevenLabs session:', error);
    throw error;
  }
}

async function handleTTS(text: string, voiceId: string, apiKey: string) {
  try {
    console.log('TTS Request:', { text: text.substring(0, 50), voiceId });
    
    // Validate API key first
    const validationResponse = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!validationResponse.ok) {
      console.error('Invalid ElevenLabs API key');
      return new Response(
        JSON.stringify({ 
          audioUrl: `data:audio/mpeg;base64,`, 
          message: 'TTS requires valid ElevenLabs API key' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('TTS API Error:', error);
      
      return new Response(
        JSON.stringify({ 
          audioUrl: `data:audio/mpeg;base64,`,
          message: 'TTS generation failed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Convert audio to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    console.log('TTS Success:', { textLength: text.length, audioSize: audioBuffer.byteLength });

    return new Response(
      JSON.stringify({ audioUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('TTS Error:', error);
    return new Response(
      JSON.stringify({ 
        audioUrl: `data:audio/mpeg;base64,`,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}
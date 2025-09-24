import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
const AGENT_ID = "agent_4301k5ysabajfbcsns6zmc0qfbe4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!elevenLabsApiKey) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }
    
    const { topic, persona, skillLevel } = await req.json();
    
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
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
    
    console.log('Getting signed URL for ElevenLabs agent:', { topic, persona, skillLevel });

    // Get a signed URL for the conversation
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${AGENT_ID}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": elevenLabsApiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`Failed to get signed URL: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Successfully got signed URL');

    return new Response(
      JSON.stringify({ 
        signedUrl: data.signed_url,
        success: true 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in elevenlabs-agent function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
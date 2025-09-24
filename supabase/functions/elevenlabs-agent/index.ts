import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');

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
    
    console.log('Setting up ElevenLabs agent for:', { topic, persona, skillLevel });

    // For ElevenLabs Voice Agents, we need to use a pre-created agent
    // You should create agents in the ElevenLabs dashboard and use their IDs here
    // For demo purposes, we'll return a placeholder response
    
    const response = {
      success: true,
      message: 'ElevenLabs Voice Agent requires a pre-configured agent ID. Please create an agent at https://elevenlabs.io/app/conversational-ai',
      instructions: {
        1: 'Go to ElevenLabs dashboard',
        2: 'Create a new Conversational AI agent',
        3: 'Configure the agent with your desired persona and settings',
        4: 'Copy the agent ID and use it in the VoiceChat component'
      }
    };

    console.log('Response:', response);

    return new Response(
      JSON.stringify(response),
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
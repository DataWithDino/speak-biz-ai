import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, persona, skillLevel, duration } = await req.json();

    if (!topic || !persona || !skillLevel) {
      throw new Error('Missing required parameters');
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Calculate number of exchanges based on duration (roughly 1 exchange per 30 seconds)
    const exchangeCount = Math.max(3, Math.floor((duration || 180) / 30));

    // Create a prompt for Claude to generate a realistic business conversation
    const systemPrompt = `You are generating a realistic business English conversation transcript between a user and a ${persona}. 
    The conversation should be about "${topic}" and appropriate for skill level ${skillLevel}.
    Generate ${exchangeCount} exchanges (user message + assistant response).
    Focus on practical business scenarios and language.
    Return ONLY a JSON array of message objects with this exact structure:
    [
      {"role": "user", "content": "message text", "timestamp": "2024-01-25T10:00:00Z"},
      {"role": "assistant", "content": "response text", "timestamp": "2024-01-25T10:00:30Z"}
    ]
    Start timestamps from the current time and increment by 20-40 seconds for each message.
    Make the conversation natural and educational for someone learning business English.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: systemPrompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      throw new Error('Failed to generate transcript');
    }

    const data = await response.json();
    const transcriptText = data.content[0].text;
    
    // Parse the JSON response
    let transcript;
    try {
      transcript = JSON.parse(transcriptText);
    } catch (parseError) {
      console.error('Failed to parse transcript JSON:', transcriptText);
      // Fallback to a simple transcript
      transcript = [
        {
          role: "user",
          content: `I'd like to discuss ${topic} with you.`,
          timestamp: new Date().toISOString()
        },
        {
          role: "assistant",
          content: `Excellent! I'm happy to discuss ${topic} with you. As a ${persona}, I can provide valuable insights on this topic.`,
          timestamp: new Date(Date.now() + 30000).toISOString()
        }
      ];
    }

    return new Response(
      JSON.stringify({ transcript }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-transcript function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
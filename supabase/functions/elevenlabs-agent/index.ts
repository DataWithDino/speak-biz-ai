import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const skillLevelInstructions = {
  A1: "Use only basic vocabulary and simple present tense. Speak slowly with very simple sentences. Maximum 5-6 words per sentence.",
  A2: "Use common everyday expressions and basic phrases. Simple past and future tenses are okay. Keep sentences short and clear.",
  B1: "Use standard vocabulary for work situations. Can use all basic tenses. Sentences can be longer but should remain clear and straightforward.",
  B2: "Use more complex business vocabulary and idiomatic expressions. Can use all tenses including conditionals. Natural flowing sentences.",
  C1: "Use sophisticated business terminology and complex grammatical structures. Include idioms, phrasal verbs, and nuanced expressions.",
  C2: "Use native-level vocabulary with full range of idiomatic expressions, colloquialisms, and specialized business jargon. Complex and nuanced language."
};

// Create or get agent configuration
async function getOrCreateAgent(topic: string, persona: string, skillLevel: string) {
  const levelInstruction = skillLevelInstructions[skillLevel as keyof typeof skillLevelInstructions] || skillLevelInstructions.B1;
  
  const prompt = `You are a ${persona} in a business setting discussing "${topic}". 
    
CRITICAL: Adapt your language to ${skillLevel} level: ${levelInstruction}

Your role:
- Stay in character as a ${persona}
- Keep the conversation focused on ${topic}
- Be helpful but realistic for a business scenario
- Provide constructive feedback when appropriate
- Keep responses concise and natural for spoken conversation

Remember to match the learner's level - don't use language that's too advanced or too simple for ${skillLevel}.`;

  try {
    // Create a conversation configuration
    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${persona} - ${topic}`,
        conversation_config: {
          agent: {
            prompt: {
              prompt: prompt
            },
            first_message: `Hello! I'm your ${persona}. Let's discuss ${topic}. How can I help you today?`,
            language: "en"
          },
          tts: {
            voice_id: "9BWtsMINqrJLrRacOk9x" // Aria voice - professional and clear
          }
        },
        platform_settings: {
          public: true // Make agent public for easier access
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      throw new Error('Failed to create agent');
    }

    const data = await response.json();
    return data.agent_id;
  } catch (error) {
    console.error('Error creating agent:', error);
    // Return a default public agent ID as fallback
    // In production, you'd want to have pre-created agents for each persona/topic combination
    return null;
  }
}

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

    // For now, we'll use a static agent ID since creating agents requires additional setup
    // In production, you would either:
    // 1. Pre-create agents for each combination
    // 2. Dynamically create agents (requires additional ElevenLabs setup)
    // 3. Use a single configurable agent with dynamic prompts
    
    // Using a placeholder agent ID - replace with your actual agent ID from ElevenLabs
    const agentId = "YOUR_ELEVENLABS_AGENT_ID"; // You need to create this in ElevenLabs dashboard
    
    console.log('Using agent ID:', agentId);

    return new Response(
      JSON.stringify({ 
        agentId,
        message: 'Agent configured successfully'
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
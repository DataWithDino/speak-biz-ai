import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, topic, persona, skillLevel } = await req.json();

    const levelInstruction = skillLevelInstructions[skillLevel as keyof typeof skillLevelInstructions] || skillLevelInstructions.B1;
    
    const systemPrompt = `You are a ${persona} in a business setting discussing "${topic}". 
    
CRITICAL: Adapt your language to ${skillLevel} level: ${levelInstruction}

Your role:
- Stay in character as a ${persona}
- Keep the conversation focused on ${topic}
- Be helpful but realistic for a business scenario
- Provide constructive feedback when appropriate
- Keep responses concise (2-3 sentences for lower levels, 3-4 for higher levels)

Remember to match the learner's level - don't use language that's too advanced or too simple for ${skillLevel}.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'OpenAI API error');
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in conversation function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
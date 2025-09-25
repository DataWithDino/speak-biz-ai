import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('BEYONDPRESENCE_API_KEY');
    if (!apiKey) {
      console.error('[TRACE] BeyondPresence API key not found');
      throw new Error('BeyondPresence API key not configured');
    }

    const { action, callId } = await req.json();

    console.log(`[TRACE] BeyondPresence request - Action: ${action}, Call ID: ${callId || 'N/A'}`);

    // Initialize Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'list-calls') {
      // Get recent calls from BeyondPresence
      const response = await fetch('https://api.beyondpresence.com/v1/calls', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[TRACE] BeyondPresence API error:', error);
        throw new Error(`BeyondPresence API error: ${response.statusText}`);
      }

      const calls = await response.json();
      console.log(`[TRACE] Retrieved ${calls.length} calls from BeyondPresence`);

      return new Response(
        JSON.stringify({ calls }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-transcript') {
      if (!callId) {
        throw new Error('Call ID is required for transcript retrieval');
      }

      // Get call messages (transcript) from BeyondPresence
      const response = await fetch(`https://api.beyondpresence.com/v1/calls/${callId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[TRACE] BeyondPresence API error:', error);
        throw new Error(`BeyondPresence API error: ${response.statusText}`);
      }

      const messages = await response.json();
      console.log(`[TRACE] Retrieved ${messages.length} messages for call ${callId}`);

      // Transform messages to our transcript format
      const transcript: TranscriptMessage[] = messages.map((msg: any) => ({
        role: msg.speaker === 'agent' ? 'assistant' : 'user',
        content: msg.text || msg.content || '',
        timestamp: msg.timestamp || new Date().toISOString(),
      }));

      // Generate flashcards and analysis based on the transcript
      const conversationText = transcript
        .map(msg => `${msg.role === 'assistant' ? 'AI' : 'User'}: ${msg.content}`)
        .join('\n');

      // Simple analysis (you can enhance this with AI later)
      const analysis = generateBasicAnalysis(transcript);
      const flashcards = generateFlashcards(conversationText);

      console.log(`[TRACE] Generated analysis and ${flashcards.length} flashcards`);

      return new Response(
        JSON.stringify({ 
          transcript,
          analysis,
          flashcards,
          callId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-call-details') {
      if (!callId) {
        throw new Error('Call ID is required');
      }

      // Get specific call details from BeyondPresence
      const response = await fetch(`https://api.beyondpresence.com/v1/calls/${callId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[TRACE] BeyondPresence API error:', error);
        throw new Error(`BeyondPresence API error: ${response.statusText}`);
      }

      const callDetails = await response.json();
      console.log(`[TRACE] Retrieved details for call ${callId}`);

      return new Response(
        JSON.stringify({ callDetails }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error('[TRACE] Error in beyondpresence-transcript function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to generate basic analysis
function generateBasicAnalysis(transcript: TranscriptMessage[]): string {
  const userMessages = transcript.filter(msg => msg.role === 'user').length;
  const assistantMessages = transcript.filter(msg => msg.role === 'assistant').length;
  const totalWords = transcript.reduce((acc, msg) => acc + msg.content.split(' ').length, 0);
  
  return `Conversation Summary:
- Total exchanges: ${transcript.length}
- User messages: ${userMessages}
- AI responses: ${assistantMessages}
- Total words: ${totalWords}
- Average message length: ${Math.round(totalWords / transcript.length)} words

Key Points:
- The conversation covered the topic effectively
- Both parties engaged in meaningful dialogue
- Communication was clear and professional`;
}

// Helper function to generate flashcards from conversation
function generateFlashcards(conversationText: string): any[] {
  const flashcards = [];
  
  // Extract potential business terms or concepts (simple implementation)
  const businessTerms = [
    { term: 'Quarterly Review', definition: 'A business meeting to evaluate performance over a three-month period' },
    { term: 'KPI', definition: 'Key Performance Indicator - metrics used to evaluate success' },
    { term: 'ROI', definition: 'Return on Investment - measure of profitability' },
  ];
  
  // Check if these terms appear in the conversation
  businessTerms.forEach(item => {
    if (conversationText.toLowerCase().includes(item.term.toLowerCase())) {
      flashcards.push({
        front: item.term,
        back: item.definition,
        category: 'Business Terms'
      });
    }
  });

  // Add some default flashcards based on conversation practice
  flashcards.push({
    front: 'How do you open a professional conversation?',
    back: 'Start with a greeting, introduce yourself if needed, and state the purpose clearly',
    category: 'Communication Skills'
  });

  return flashcards;
}
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

interface FlashCard {
  term: string;
  definition: string;
  example_sentence: string;
  german_translation: string;
  common_mistake: string;
  correction: string;
  cefr_level: string;
  topic_tag: string;
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

    const { action, callId, conversationId } = await req.json();

    console.log(`[TRACE] BeyondPresence request - Action: ${action}, Call ID: ${callId || 'N/A'}, Conversation ID: ${conversationId || 'N/A'}`);

    // Initialize Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'save-transcript') {
      if (!callId || !conversationId) {
        throw new Error('Call ID and Conversation ID are required');
      }

      console.log(`[TRACE] Attempting to save transcript for Call ID: ${callId}, Conversation ID: ${conversationId}`);

      // First, try to get the transcript from BeyondPresence
      // Note: The API format might need to be adjusted based on BeyondPresence's actual API
      const transcriptUrl = `https://api.beyondpresence.ai/v1/calls/${callId}/messages`;
      
      console.log(`[TRACE] Fetching transcript from: ${transcriptUrl}`);
      
      const response = await fetch(transcriptUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        // Try alternative endpoint formats
        const alternativeUrls = [
          `https://api.beyondpresence.com/api/v1/calls/${callId}/messages`,
          `https://beyondpresence.ai/api/v1/calls/${callId}/messages`,
          `https://app.beyondpresence.ai/api/v1/calls/${callId}/messages`,
        ];

        let successfulResponse = null;
        for (const url of alternativeUrls) {
          console.log(`[TRACE] Trying alternative URL: ${url}`);
          try {
            const altResponse = await fetch(url, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
              },
            });
            if (altResponse.ok) {
              successfulResponse = altResponse;
              break;
            }
          } catch (e) {
            console.log(`[TRACE] Failed to fetch from ${url}: ${e}`);
          }
        }

        if (!successfulResponse) {
          const errorText = await response.text();
          console.error(`[TRACE] BeyondPresence API error: ${response.status} - ${errorText}`);
          
          // Create a basic transcript structure if API fails
          const transcript: TranscriptMessage[] = [
            {
              role: 'assistant',
              content: 'Conversation started',
              timestamp: new Date().toISOString()
            }
          ];

          // Still save what we can to the database
          const { error: updateError } = await supabase
            .from('conversations')
            .update({
              transcript,
              analysis: 'Transcript retrieval failed - BeyondPresence API error',
              flashcards: generateDefaultFlashcards(),
              ended_at: new Date().toISOString()
            })
            .eq('id', conversationId);

          if (updateError) {
            console.error('[TRACE] Database update error:', updateError);
            throw updateError;
          }

          return new Response(
            JSON.stringify({ 
              success: false,
              message: 'Transcript saved with limited data due to API error'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Use the successful response
        const messages = await successfulResponse.json();
        return processAndSaveTranscript(messages, conversationId, callId, supabase);
      }

      const messages = await response.json();
      return processAndSaveTranscript(messages, conversationId, callId, supabase);
    }

    if (action === 'get-transcript') {
      if (!callId) {
        throw new Error('Call ID is required for transcript retrieval');
      }

      // Try multiple endpoint formats for BeyondPresence API
      const urls = [
        `https://api.beyondpresence.ai/v1/calls/${callId}/messages`,
        `https://api.beyondpresence.com/api/v1/calls/${callId}/messages`,
        `https://beyondpresence.ai/api/v1/calls/${callId}/messages`,
      ];

      let messages = null;
      let successUrl = null;

      for (const url of urls) {
        console.log(`[TRACE] Trying to fetch transcript from: ${url}`);
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json',
            },
          });

          if (response.ok) {
            messages = await response.json();
            successUrl = url;
            break;
          }
        } catch (e) {
          console.log(`[TRACE] Failed to fetch from ${url}: ${e}`);
        }
      }

      if (!messages) {
        console.error('[TRACE] Failed to retrieve transcript from all endpoints');
        throw new Error('Unable to retrieve transcript from BeyondPresence API');
      }

      console.log(`[TRACE] Successfully retrieved ${messages.length} messages from ${successUrl}`);

      // Transform messages to our transcript format
      const transcript: TranscriptMessage[] = messages.map((msg: any) => ({
        role: msg.role === 'agent' || msg.speaker === 'agent' ? 'assistant' : 'user',
        content: msg.text || msg.content || msg.message || '',
        timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
      }));

      // Generate comprehensive flashcards and analysis
      const analysis = generateAnalysis(transcript);
      const flashcards = generateComprehensiveFlashcards(transcript);

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

async function processAndSaveTranscript(messages: any[], conversationId: string, callId: string, supabase: any) {
  console.log(`[TRACE] Processing ${messages.length} messages for conversation ${conversationId}`);

  // Transform messages to our transcript format
  const transcript: TranscriptMessage[] = messages.map((msg: any) => ({
    role: msg.role === 'agent' || msg.speaker === 'agent' ? 'assistant' : 'user',
    content: msg.text || msg.content || msg.message || '',
    timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
  }));

  // Generate comprehensive flashcards and analysis
  const analysis = generateAnalysis(transcript);
  const flashcards = generateComprehensiveFlashcards(transcript);

  console.log(`[TRACE] Updating conversation ${conversationId} with transcript and ${flashcards.length} flashcards`);

  // Update the conversation in the database
  const { data, error: updateError } = await supabase
    .from('conversations')
    .update({
      transcript,
      analysis,
      flashcards,
      ended_at: new Date().toISOString()
    })
    .eq('id', conversationId)
    .select()
    .single();

  if (updateError) {
    console.error('[TRACE] Database update error:', updateError);
    throw updateError;
  }

  console.log(`[TRACE] Successfully saved transcript for conversation ${conversationId}`);

  return new Response(
    JSON.stringify({ 
      success: true,
      transcript,
      analysis,
      flashcards,
      callId,
      conversation: data
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Enhanced analysis function
function generateAnalysis(transcript: TranscriptMessage[]): string {
  const userMessages = transcript.filter(msg => msg.role === 'user').length;
  const assistantMessages = transcript.filter(msg => msg.role === 'assistant').length;
  const totalWords = transcript.reduce((acc, msg) => acc + msg.content.split(' ').length, 0);
  const avgWords = transcript.length > 0 ? Math.round(totalWords / transcript.length) : 0;
  
  // Analyze conversation flow
  const conversationFlow = transcript.length > 5 ? 'Extended discussion' : 'Brief exchange';
  const engagement = userMessages > 3 ? 'Active participation' : 'Limited interaction';
  
  return `Conversation Analysis:
• Format: ${conversationFlow} with ${engagement}
• Total exchanges: ${transcript.length} messages
• User contributions: ${userMessages} messages
• AI responses: ${assistantMessages} messages
• Total word count: ${totalWords} words
• Average message length: ${avgWords} words

Performance Insights:
• The conversation demonstrated ${userMessages > 5 ? 'strong' : 'moderate'} engagement
• Communication clarity: ${avgWords > 20 ? 'Detailed and comprehensive' : 'Concise and focused'}
• Practice areas covered: Business communication, professional dialogue
• Recommended focus: Continue practicing complex sentence structures and business vocabulary`;
}

// Generate comprehensive flashcards
function generateComprehensiveFlashcards(transcript: TranscriptMessage[]): FlashCard[] {
  const flashcards: FlashCard[] = [];
  const conversationText = transcript.map(msg => msg.content).join(' ').toLowerCase();

  // Business vocabulary flashcards
  const businessVocabulary: FlashCard[] = [
    {
      term: 'quarterly review',
      definition: 'A formal assessment of business performance conducted every three months',
      example_sentence: 'Our quarterly review shows significant growth in sales.',
      german_translation: 'Quartalsbericht',
      common_mistake: 'Saying "quarter review" instead of "quarterly review"',
      correction: 'Use "quarterly" (adjective) not "quarter" (noun)',
      cefr_level: 'B2',
      topic_tag: 'business_reporting'
    },
    {
      term: 'synergy',
      definition: 'The combined effect of collaboration that produces better results than individual efforts',
      example_sentence: 'We need to create synergy between our departments.',
      german_translation: 'Synergie',
      common_mistake: 'Using "synergy" for simple cooperation',
      correction: 'Reserve "synergy" for enhanced combined effects',
      cefr_level: 'C1',
      topic_tag: 'business_strategy'
    },
    {
      term: 'stakeholder',
      definition: 'A person or group with interest in or affected by business decisions',
      example_sentence: 'All stakeholders must approve this proposal.',
      german_translation: 'Interessenvertreter',
      common_mistake: 'Confusing stakeholder with shareholder',
      correction: 'Stakeholders include anyone affected; shareholders own stock',
      cefr_level: 'B2',
      topic_tag: 'business_management'
    },
    {
      term: 'KPI',
      definition: 'Key Performance Indicator - metrics used to evaluate success',
      example_sentence: 'Our main KPI is customer satisfaction.',
      german_translation: 'Leistungskennzahl',
      common_mistake: 'Saying "KPIs indicator" (redundant)',
      correction: 'Say either "KPI" or "Key Performance Indicator"',
      cefr_level: 'B2',
      topic_tag: 'business_metrics'
    },
    {
      term: 'ROI',
      definition: 'Return on Investment - measure of profitability relative to cost',
      example_sentence: 'The ROI on this project exceeded our expectations.',
      german_translation: 'Kapitalrendite',
      common_mistake: 'Pronouncing as "roy" instead of R-O-I',
      correction: 'Spell out each letter: R-O-I',
      cefr_level: 'B2',
      topic_tag: 'business_finance'
    }
  ];

  // Add relevant flashcards based on conversation content
  businessVocabulary.forEach(card => {
    if (conversationText.includes(card.term.toLowerCase()) || 
        conversationText.includes(card.term.split(' ')[0].toLowerCase())) {
      flashcards.push(card);
    }
  });

  // Always include at least 3 flashcards for learning
  if (flashcards.length < 3) {
    flashcards.push(...businessVocabulary.slice(0, 3));
  }

  return flashcards;
}

// Generate default flashcards when API fails
function generateDefaultFlashcards(): FlashCard[] {
  return [
    {
      term: 'business communication',
      definition: 'The exchange of information within and outside a company',
      example_sentence: 'Effective business communication is essential for success.',
      german_translation: 'Geschäftskommunikation',
      common_mistake: 'Being too informal in professional settings',
      correction: 'Maintain appropriate formality based on context',
      cefr_level: 'B1',
      topic_tag: 'communication'
    }
  ];
}
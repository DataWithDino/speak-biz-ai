import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Download, Play, ArrowLeft, Volume2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { elevenlabsClient, type FlashCard, type AgentResponse } from "@/services/elevenlabsClient";
import { supabase } from "@/integrations/supabase/client";

const StudyView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [studyData, setStudyData] = useState<AgentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioLoading, setAudioLoading] = useState<{[key: string]: boolean}>({});
  const [audioUrls, setAudioUrls] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const loadStudyData = async () => {
      const conversationId = searchParams.get('conversationId');
      
      // Default practice flashcards that match the Dashboard
      const defaultFlashcards: FlashCard[] = [
        {
          term: "synergy",
          definition: "The interaction of two or more agents or forces so that their combined effect is greater than the sum of their individual effects.",
          example_sentence: "The merger created synergy between the two companies' operations.",
          german_translation: "Synergie",
          common_mistake: "Using it to mean simple cooperation",
          correction: "Use it when referring to combined efforts producing greater results",
          cefr_level: "C1" as const,
          topic_tag: "business_general"
        },
        {
          term: "stakeholder",
          definition: "A person with an interest or concern in something, especially a business.",
          example_sentence: "We need to consider all stakeholders before making this decision.",
          german_translation: "Interessenvertreter",
          common_mistake: "Confusing with shareholder",
          correction: "Stakeholder includes anyone affected, not just owners",
          cefr_level: "B2" as const,
          topic_tag: "business_general"
        },
        {
          term: "quarterly review",
          definition: "A formal assessment of performance or progress conducted every three months.",
          example_sentence: "The quarterly review showed significant improvement in sales.",
          german_translation: "Quartalsüberprüfung",
          common_mistake: "Saying 'quarter review'",
          correction: "Always use 'quarterly' as the adjective",
          cefr_level: "B2" as const,
          topic_tag: "meetings"
        }
      ];
      
      // If we have a conversation ID, load from database
      if (conversationId) {
        try {
          const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .single();
            
          if (error) throw error;
          
          // Type cast the data properly
          const conversationData = data as any;
          const flashcards = conversationData.flashcards as any[];
          const transcript = data.transcript as Array<{
            role: "user" | "assistant";
            content: string;
            timestamp: string;
          }>;
          const analysis = conversationData.analysis as string;
          
          if (flashcards && flashcards.length > 0) {
            const studyData: AgentResponse = {
              transcript: transcript || [],
              flashcards: flashcards,
              analysis: analysis
            };
            setStudyData(studyData);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error loading conversation data:', error);
        }
      }
      
      // Fallback to sessionStorage (from conversation flow)
      const storedData = sessionStorage.getItem('studyData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          if (parsedData.flashcards && parsedData.flashcards.length > 0) {
            setStudyData(parsedData);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error parsing stored study data:', error);
        }
      }

      // Use default practice data
      const defaultStudyData: AgentResponse = {
        transcript: [],
        flashcards: defaultFlashcards,
        analysis: "Practice session for improving your business English vocabulary. These flashcards cover essential business terms."
      };

      setStudyData(defaultStudyData);
      setLoading(false);
    };
    
    loadStudyData();
  }, [searchParams]);

  const playAudio = async (text: string, type: 'term' | 'example', index: number) => {
    const audioKey = `${index}-${type}`;
    
    // Check if audio is already cached
    if (audioUrls[audioKey]) {
      const audio = new Audio(audioUrls[audioKey]);
      audio.play();
      return;
    }

    setAudioLoading(prev => ({ ...prev, [audioKey]: true }));
    
    try {
      // Use Roger voice (professional male voice) for business English
      const voiceId = "CwhRBWXzGAHq8TQ4Fs17"; // Roger - clear professional voice
      const audioUrl = await elevenlabsClient.generateTTS(text, voiceId);
      
      // Store the URL for future playback
      setAudioUrls(prev => ({ ...prev, [audioKey]: audioUrl }));
      
      // Play the audio
      const audio = new Audio(audioUrl);
      await audio.play();
    } catch (error) {
      console.error('Failed to generate TTS:', error);
      toast({
        title: "Audio Playback",
        description: "Using fallback pronunciation. Check your ElevenLabs API key.",
        variant: "default",
      });
      
      // Fallback to browser's built-in speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        speechSynthesis.speak(utterance);
      }
    } finally {
      setAudioLoading(prev => ({ ...prev, [audioKey]: false }));
    }
  };

  const exportCSV = () => {
    if (!studyData?.flashcards) return;
    
    const headers = ['Term', 'Definition', 'Example', 'German Translation', 'Common Mistake', 'Correction', 'CEFR Level', 'Topic'];
    const rows = studyData.flashcards.map(card => [
      card.term,
      card.definition,
      card.example_sentence,
      card.german_translation,
      card.common_mistake,
      card.correction,
      card.cefr_level,
      card.topic_tag
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business-english-flashcards.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAnki = () => {
    if (!studyData?.flashcards) return;
    
    const tsvContent = studyData.flashcards
      .map(card => [
        card.term,
        `${card.definition}<br><br><b>Example:</b> ${card.example_sentence}<br><b>German:</b> ${card.german_translation}<br><b>Level:</b> ${card.cefr_level}`,
        card.common_mistake,
        card.correction,
        card.topic_tag
      ].join('\t'))
      .join('\n');
    
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business-english-flashcards.tsv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Processing your conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            {/* Navigation Bar */}
            <div className="mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="hover:bg-accent/10 transition-all"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>

            {/* Main Header Card */}
            <Card className="border-none shadow-lg bg-gradient-to-r from-card to-accent/5">
              <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Title Section */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="p-3 rounded-xl bg-primary/10 shadow-inner">
                        <BookOpen className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                          Your Learning Environment
                        </h1>
                        <p className="text-muted-foreground mt-1 text-lg">
                          Master your mistakes and improve your business English
                        </p>
                      </div>
                    </div>
                    
                    {/* Stats or progress indicators could go here */}
                    <div className="flex gap-4 mt-4">
                      {studyData?.flashcards && (
                        <>
                          <Badge variant="secondary" className="px-3 py-1">
                            {studyData.flashcards.length} Flashcards
                          </Badge>
                          <Badge variant="outline" className="px-3 py-1">
                            Practice Mode
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      onClick={exportCSV}
                      className="hover:bg-accent/10 transition-all group"
                    >
                      <Download className="h-4 w-4 mr-2 group-hover:translate-y-0.5 transition-transform" />
                      Export CSV
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={exportAnki}
                      className="hover:bg-accent/10 transition-all group"
                    >
                      <Download className="h-4 w-4 mr-2 group-hover:translate-y-0.5 transition-transform" />
                      Anki Format
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Summary */}
          {studyData?.analysis && (
            <Card className="mb-8 border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-full bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Your Learning Session Summary</CardTitle>
                    <p className="text-sm text-muted-foreground">Key insights from your conversation</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-4 rounded-lg">
                  <p className="text-foreground leading-relaxed">{studyData.analysis}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flashcards Grid */}
          <div className="grid gap-6">
            {studyData?.flashcards.map((card, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center space-x-3">
                        <span className="text-2xl font-bold text-primary">{card.term}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => playAudio(card.term, 'term', index)}
                          disabled={audioLoading[`${index}-term`]}
                          className="h-8 w-8 p-0"
                        >
                          {audioLoading[`${index}-term`] ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </Button>
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        {card.definition}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Badge variant="secondary">{card.cefr_level}</Badge>
                      <Badge variant="outline">{card.topic_tag.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Example Sentence */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-sm">Example:</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => playAudio(card.example_sentence, 'example', index)}
                        disabled={audioLoading[`${index}-example`]}
                        className="h-6 w-6 p-0"
                      >
                        {audioLoading[`${index}-example`] ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <p className="text-muted-foreground italic">"{card.example_sentence}"</p>
                  </div>

                  <Separator />

                  {/* German Translation */}
                  <div>
                    <h4 className="font-semibold text-sm mb-1">German Translation:</h4>
                    <p className="text-muted-foreground">{card.german_translation}</p>
                  </div>

                  <Separator />

                  {/* Learning from Mistakes Section - Enhanced */}
                  <div className="bg-gradient-to-r from-red-50 to-green-50 dark:from-red-950/20 dark:to-green-950/20 p-4 rounded-lg border">
                    <h4 className="font-semibold text-base mb-3 flex items-center space-x-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">!</span>
                      </div>
                      <span>Learn from Common Mistakes</span>
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-md">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="h-2 w-2 bg-destructive rounded-full"></div>
                          <h5 className="font-medium text-sm text-destructive">Avoid This:</h5>
                        </div>
                        <p className="text-sm text-foreground/80 italic">"{card.common_mistake}"</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 p-3 rounded-md">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                          <h5 className="font-medium text-sm text-green-700 dark:text-green-400">Say This Instead:</h5>
                        </div>
                        <p className="text-sm text-foreground/80 font-medium">"{card.correction}"</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {(!studyData?.flashcards || studyData.flashcards.length === 0) && (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No flashcards generated</h3>
                <p className="text-muted-foreground">
                  Start a conversation to generate personalized learning cards.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudyView;
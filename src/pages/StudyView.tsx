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
          toast({
            title: "Error",
            description: "Failed to load study data",
            variant: "destructive"
          });
        }
      }
      
      // Fallback to sessionStorage (from conversation flow)
      const storedData = sessionStorage.getItem('studyData');
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          setStudyData(parsedData);
          setLoading(false);
          return;
        } catch (error) {
          console.error('Error parsing stored study data:', error);
        }
      }

    // Fallback to mock data
    const mockStudyData: AgentResponse = {
      transcript: [
        {
          role: "assistant",
          content: "Good morning! I'm ready to discuss our quarterly results. How do you think the team performed this quarter?",
          timestamp: new Date().toISOString()
        },
        {
          role: "user", 
          content: "I believe we've made good progress, especially in creating synergy between departments.",
          timestamp: new Date().toISOString()
        }
      ],
      flashcards: [
        {
          term: "synergy",
          definition: "The interaction of two or more organizations to produce a combined effect greater than the sum of their separate effects",
          example_sentence: "We need to create synergy between our departments.",
          german_translation: "Synergie",
          common_mistake: "Using 'synergy' when you mean simple cooperation",
          correction: "Use 'synergy' only when describing enhanced combined effects",
          cefr_level: "C1",
          topic_tag: "business_strategy"
        },
        {
          term: "stakeholder",
          definition: "A person or organization that has an interest in or is affected by a business decision",
          example_sentence: "All stakeholders must approve this proposal.",
          german_translation: "Interessenvertreter",
          common_mistake: "Confusing 'stakeholder' with 'shareholder'",
          correction: "Stakeholders include anyone affected; shareholders own stock",
          cefr_level: "B2",
          topic_tag: "business_management"
        },
        {
          term: "quarterly review",
          definition: "A regular assessment of performance and progress conducted every three months",
          example_sentence: "Our quarterly review showed strong growth.",
          german_translation: "Quartalsbericht",
          common_mistake: "Saying 'quarter review' instead of 'quarterly review'",
          correction: "Use 'quarterly' (adjective) not 'quarter' (noun)",
          cefr_level: "B1",
          topic_tag: "business_reporting"
        }
      ],
      analysis: "Session completed successfully. Identified 3 key business terms for study."
    };

      // If no data found anywhere, show fallback
      setStudyData(mockStudyData);
      setLoading(false);
    };
    
    loadStudyData();
  }, [searchParams]);

  const playAudio = async (text: string, type: 'term' | 'example', index: number) => {
    const audioKey = `${index}-${type}`;
    
    if (audioUrls[audioKey]) {
      // Audio already generated, play it
      const audio = new Audio(audioUrls[audioKey]);
      audio.play();
      return;
    }

    setAudioLoading(prev => ({ ...prev, [audioKey]: true }));
    
    try {
      const response = await elevenlabsClient.generateTTS(text, "1"); // Using voice ID 1 as specified
      
      // Convert base64 to blob URL
      const audioBlob = new Blob([
        Uint8Array.from(atob(response), c => c.charCodeAt(0))
      ], { type: 'audio/mpeg' });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioUrls(prev => ({ ...prev, [audioKey]: audioUrl }));
      
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error('Failed to generate TTS:', error);
      toast({
        title: "Audio Error",
        description: "Failed to generate audio. Please try again.",
        variant: "destructive",
      });
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
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
                <div>
                  <h1 className="text-3xl font-bold flex items-center space-x-2">
                    <BookOpen className="h-8 w-8 text-primary" />
                    <span>Your Learning Environment</span>
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Master your mistakes and improve your business English
                  </p>
                </div>
            </div>
            
            <div className="flex space-x-2">
              <Button variant="outline" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={exportAnki}>
                <Download className="h-4 w-4 mr-2" />
                Export Anki TSV
              </Button>
            </div>
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
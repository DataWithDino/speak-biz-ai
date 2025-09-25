import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, BookOpen, LogOut, MessageSquare, Menu, Activity, Calendar, Clock, ChevronLeft, ChevronRight, Volume2, X, Check, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ConversationSetup from "@/components/ConversationSetup";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { elevenlabsClient } from "@/services/elevenlabsClient";

type SkillLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface Profile {
  full_name: string | null;
  skill_level: SkillLevel;
  email: string;
}

interface Conversation {
  id: string;
  topic: string;
  ai_persona: string;
  skill_level: SkillLevel;
  created_at: string;
  ended_at: string | null;
  transcript: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
  flashcards?: any[];
  analysis?: string;
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const conversationsPerPage = 3;
  const [selectedFlashcard, setSelectedFlashcard] = useState<FlashCard | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioUrls, setAudioUrls] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchProfile();
    fetchRecentConversations();
  }, []);

  const playPronunciation = async (text: string) => {
    const audioKey = text;
    
    // Check if audio is already cached
    if (audioUrls[audioKey]) {
      const audio = new Audio(audioUrls[audioKey]);
      audio.play();
      return;
    }

    setAudioLoading(true);
    
    try {
      // Use Roger voice (professional male voice) for business English - same as Study page
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
      setAudioLoading(false);
    }
  };

  const fetchRecentConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching conversations:", error);
      } else {
        // Type cast the transcript field properly
        const typedConversations: Conversation[] = (data || []).map(conv => {
          const conversationData = conv as any;
          return {
            ...conv,
            transcript: conv.transcript as Array<{
              role: "user" | "assistant";
              content: string;
              timestamp: string;
            }>,
            flashcards: conversationData.flashcards as any[],
            analysis: conversationData.analysis as string
          };
        });
        setRecentConversations(typedConversations);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background grid-pattern">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-background/80 backdrop-blur-md flex items-center px-4">
            <SidebarTrigger className="mr-4">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-glow">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">BizEnglishAI</h1>
                <p className="text-xs text-muted-foreground">Professional Dashboard</p>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-8">
              <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Start Conversation Card */}
                <div id="conversation">
                  <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80 card-hover">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <span>Practice Conversations</span>
                      </CardTitle>
                      <CardDescription>
                        Engage in realistic business conversations with AI personas tailored to your skill level
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center py-8">
                      <Button 
                        variant="professional"
                        size="xl" 
                        onClick={() => setShowSetup(true)}
                      >
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Start New Conversation
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Your Practice List */}
                <div id="practice">
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Practice List</CardTitle>
                      <CardDescription>Click on any flashcard to practice pronunciation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {/* Mock flashcards from Study page */}
                        <div 
                          className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/10 hover:border-primary/20 cursor-pointer transition-all hover:shadow-sm"
                          onClick={() => setSelectedFlashcard({
                            term: "synergy",
                            definition: "The interaction of two or more organizations to produce a combined effect greater than the sum of their separate effects",
                            example_sentence: "We need to create synergy between our departments.",
                            german_translation: "Synergie",
                            common_mistake: "Using 'synergy' when you mean simple cooperation",
                            correction: "Use 'synergy' only when describing enhanced combined effects",
                            cefr_level: "C1",
                            topic_tag: "business_strategy"
                          })}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-primary mb-1">synergy</p>
                              <p className="text-xs text-muted-foreground italic">SIN-er-jee</p>
                              <p className="text-sm text-muted-foreground mt-2">Interaction producing greater combined effect</p>
                            </div>
                            <Volume2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">C1</Badge>
                            <Badge variant="outline" className="text-xs">business strategy</Badge>
                          </div>
                        </div>

                        <div 
                          className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/10 hover:border-primary/20 cursor-pointer transition-all hover:shadow-sm"
                          onClick={() => setSelectedFlashcard({
                            term: "stakeholder",
                            definition: "A person or organization that has an interest in or is affected by a business decision",
                            example_sentence: "All stakeholders must approve this proposal.",
                            german_translation: "Interessenvertreter",
                            common_mistake: "Confusing 'stakeholder' with 'shareholder'",
                            correction: "Stakeholders include anyone affected; shareholders own stock",
                            cefr_level: "B2",
                            topic_tag: "business_management"
                          })}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-primary mb-1">stakeholder</p>
                              <p className="text-xs text-muted-foreground italic">STAKE-hohl-der</p>
                              <p className="text-sm text-muted-foreground mt-2">Person with interest in business decision</p>
                            </div>
                            <Volume2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">B2</Badge>
                            <Badge variant="outline" className="text-xs">business management</Badge>
                          </div>
                        </div>

                        <div 
                          className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/10 hover:border-primary/20 cursor-pointer transition-all hover:shadow-sm"
                          onClick={() => setSelectedFlashcard({
                            term: "quarterly review",
                            definition: "A regular assessment of performance and progress conducted every three months",
                            example_sentence: "Our quarterly review showed strong growth.",
                            german_translation: "Quartalsbericht",
                            common_mistake: "Saying 'quarter review' instead of 'quarterly review'",
                            correction: "Use 'quarterly' (adjective) not 'quarter' (noun)",
                            cefr_level: "B1",
                            topic_tag: "business_reporting"
                          })}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-primary mb-1">quarterly review</p>
                              <p className="text-xs text-muted-foreground italic">KWAR-ter-lee ree-VYOO</p>
                              <p className="text-sm text-muted-foreground mt-2">Three-month performance assessment</p>
                            </div>
                            <Volume2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">B1</Badge>
                            <Badge variant="outline" className="text-xs">business reporting</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity Card */}
                <div id="activity">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>Your recent practice sessions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {recentConversations.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No conversations yet. Start your first practice session above!
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {/* Display only conversations for current page */}
                          {recentConversations
                            .slice((currentPage - 1) * conversationsPerPage, currentPage * conversationsPerPage)
                            .map((conversation) => (
                              <div
                                key={conversation.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                              >
                                <div 
                                  className="flex-1 cursor-pointer"
                                  onClick={() => setSelectedConversation(conversation)}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                    <p className="font-medium text-sm">{conversation.topic}</p>
                                    {conversation.flashcards && conversation.flashcards.length > 0 && (
                                      <BookOpen className="h-3 w-3 text-primary" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    <span>{conversation.ai_persona}</span>
                                    <span>•</span>
                                    <Calendar className="h-3 w-3" />
                                    <span>{format(new Date(conversation.created_at), "MMM d, yyyy")}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {conversation.flashcards && conversation.flashcards.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/study?conversationId=${conversation.id}`);
                                      }}
                                      className="text-xs"
                                    >
                                      <BookOpen className="h-3 w-3 mr-1" />
                                      Study
                                    </Button>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {conversation.skill_level}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          
                          {/* Pagination */}
                          {recentConversations.length > conversationsPerPage && (
                            <div className="flex justify-center items-center gap-1 pt-4">
                              {/* Previous arrow */}
                              <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className={`p-1.5 rounded-md transition-colors ${
                                  currentPage === 1
                                    ? "text-muted-foreground/50 cursor-not-allowed"
                                    : "text-foreground hover:bg-secondary/30"
                                }`}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>

                              {/* Page numbers with smart display */}
                              {(() => {
                                const totalPages = Math.ceil(recentConversations.length / conversationsPerPage);
                                const pages = [];
                                
                                // Always show first page
                                pages.push(
                                  <button
                                    key={1}
                                    onClick={() => setCurrentPage(1)}
                                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                      currentPage === 1
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-secondary/20 hover:bg-secondary/30 text-foreground"
                                    }`}
                                  >
                                    1
                                  </button>
                                );

                                // Show ellipsis if needed
                                if (currentPage > 3) {
                                  pages.push(
                                    <span key="ellipsis1" className="px-2 text-muted-foreground">
                                      ...
                                    </span>
                                  );
                                }

                                // Show current page and surrounding pages
                                for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                                  pages.push(
                                    <button
                                      key={i}
                                      onClick={() => setCurrentPage(i)}
                                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                        currentPage === i
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-secondary/20 hover:bg-secondary/30 text-foreground"
                                      }`}
                                    >
                                      {i}
                                    </button>
                                  );
                                }

                                // Show ellipsis if needed
                                if (currentPage < totalPages - 2) {
                                  pages.push(
                                    <span key="ellipsis2" className="px-2 text-muted-foreground">
                                      ...
                                    </span>
                                  );
                                }

                                // Always show last page if there's more than one page
                                if (totalPages > 1) {
                                  pages.push(
                                    <button
                                      key={totalPages}
                                      onClick={() => setCurrentPage(totalPages)}
                                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                        currentPage === totalPages
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-secondary/20 hover:bg-secondary/30 text-foreground"
                                      }`}
                                    >
                                      {totalPages}
                                    </button>
                                  );
                                }

                                return pages;
                              })()}

                              {/* Next arrow */}
                              <button
                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(recentConversations.length / conversationsPerPage), prev + 1))}
                                disabled={currentPage === Math.ceil(recentConversations.length / conversationsPerPage)}
                                className={`p-1.5 rounded-md transition-colors ${
                                  currentPage === Math.ceil(recentConversations.length / conversationsPerPage)
                                    ? "text-muted-foreground/50 cursor-not-allowed"
                                    : "text-foreground hover:bg-secondary/30"
                                }`}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Conversation Setup Modal */}
      <ConversationSetup 
        open={showSetup} 
        onClose={() => setShowSetup(false)}
        skillLevel={profile?.skill_level || "B1"}
      />

      {/* Transcript Viewer Modal */}
      {selectedConversation && (
        <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedConversation.topic}</span>
                <Badge>{selectedConversation.skill_level}</Badge>
              </DialogTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {selectedConversation.ai_persona}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedConversation.created_at), "PPP")}
                </span>
                {selectedConversation.ended_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {Math.round(
                      (new Date(selectedConversation.ended_at).getTime() - 
                       new Date(selectedConversation.created_at).getTime()) / 60000
                    )} minutes
                  </span>
                )}
              </div>
            </DialogHeader>
            <ScrollArea className="h-[500px] mt-4">
              <div className="space-y-4 pr-4">
                {selectedConversation.transcript && selectedConversation.transcript.length > 0 ? (
                  selectedConversation.transcript.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {format(new Date(message.timestamp), "HH:mm:ss")}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">
                    No transcript available for this conversation.
                  </p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Pronunciation Practice Modal */}
      {selectedFlashcard && (
        <Dialog open={!!selectedFlashcard} onOpenChange={() => setSelectedFlashcard(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 animate-scale-in">
            {/* Header with gradient background */}
            <div className="bg-gradient-to-r from-primary to-primary/80 p-6 pb-8 relative">
              <button
                onClick={() => setSelectedFlashcard(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 backdrop-blur hover:bg-white/20 transition-all hover:scale-110"
              >
                <X className="h-5 w-5 text-white" />
              </button>
              
              <div className="text-center text-white">
                <h2 className="text-4xl font-bold mb-2 animate-fade-in">
                  {selectedFlashcard.term}
                </h2>
                <p className="text-xl opacity-90 italic">
                  {selectedFlashcard.term === "synergy" && "SIN-er-jee"}
                  {selectedFlashcard.term === "stakeholder" && "STAKE-hohl-der"}
                  {selectedFlashcard.term === "quarterly review" && "KWAR-ter-lee ree-VYOO"}
                </p>
                <div className="flex gap-2 justify-center mt-3">
                  <Badge className="bg-white/20 backdrop-blur text-white border-white/30">
                    {selectedFlashcard.cefr_level}
                  </Badge>
                  <Badge className="bg-white/20 backdrop-blur text-white border-white/30">
                    {selectedFlashcard.topic_tag.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
            
            <ScrollArea className="max-h-[calc(90vh-120px)]">
              <div className="p-6 space-y-6">
                {/* Main Pronunciation Section */}
                <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 p-6 rounded-xl border border-primary/10 animate-fade-in">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Volume2 className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Practice Pronunciation</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Term pronunciation */}
                    <div className="flex gap-3">
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => playPronunciation(selectedFlashcard.term)}
                        disabled={audioLoading}
                        className="flex-1 h-14 text-lg font-medium hover:scale-105 transition-transform"
                      >
                        {audioLoading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Volume2 className="h-6 w-6 mr-3" />
                            Listen to Pronunciation
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* Example sentence */}
                    <div className="bg-background/60 backdrop-blur p-5 rounded-lg border">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Example in context:</p>
                      <p className="text-lg italic mb-4">"{selectedFlashcard.example_sentence}"</p>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => playPronunciation(selectedFlashcard.example_sentence)}
                        disabled={audioLoading}
                        className="hover:scale-105 transition-transform"
                      >
                        <Volume2 className="h-4 w-4 mr-2" />
                        Play Full Sentence
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Definition Card */}
                <div className="bg-gradient-to-r from-secondary/10 to-secondary/5 p-5 rounded-lg border border-secondary/20 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-secondary" />
                    Definition
                  </h3>
                  <p className="text-foreground/80 leading-relaxed">{selectedFlashcard.definition}</p>
                </div>

                {/* Common Mistakes Section - Visual Improvement */}
                <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Learn from Common Mistakes
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 p-5 rounded-lg border-2 border-destructive/20 hover:border-destructive/30 transition-colors">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center">
                          <X className="h-5 w-5 text-destructive" />
                        </div>
                        <h4 className="font-semibold text-destructive">Common Mistake</h4>
                      </div>
                      <p className="text-sm italic text-foreground/70">"{selectedFlashcard.common_mistake}"</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 p-5 rounded-lg border-2 border-green-500/20 hover:border-green-500/30 transition-colors">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Check className="h-5 w-5 text-green-600 dark:text-green-500" />
                        </div>
                        <h4 className="font-semibold text-green-700 dark:text-green-400">Correct Usage</h4>
                      </div>
                      <p className="text-sm font-medium text-foreground/80">"{selectedFlashcard.correction}"</p>
                    </div>
                  </div>
                </div>

                {/* Translation */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border animate-fade-in" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">German Translation:</span>
                  </div>
                  <span className="font-semibold text-foreground">{selectedFlashcard.german_translation}</span>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </SidebarProvider>
  );
};

export default Dashboard;
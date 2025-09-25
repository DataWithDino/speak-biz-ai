import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, BookOpen, LogOut, MessageSquare, Menu, Activity, Calendar, Clock, ChevronLeft, ChevronRight, Volume2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ConversationSetup from "@/components/ConversationSetup";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

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

  useEffect(() => {
    fetchProfile();
    fetchRecentConversations();
  }, []);

  const playPronunciation = async (text: string) => {
    setAudioLoading(true);
    
    try {
      // Use browser's built-in speech synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        speechSynthesis.speak(utterance);
        
        // Wait for speech to finish
        utterance.onend = () => {
          setAudioLoading(false);
        };
        
        utterance.onerror = () => {
          setAudioLoading(false);
          toast({
            title: "Pronunciation Error",
            description: "Could not play pronunciation",
            variant: "destructive",
          });
        };
      } else {
        // Fallback if speech synthesis not supported
        toast({
          title: "Not Supported",
          description: "Your browser doesn't support text-to-speech",
          variant: "destructive",
        });
        setAudioLoading(false);
      }
    } catch (error) {
      console.error('Pronunciation error:', error);
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
      <div className="min-h-screen flex w-full bg-gradient-to-br from-primary/5 to-secondary/5">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-4">
            <SidebarTrigger className="mr-4">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">BizEnglishAI</h1>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-8">
              <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Start Conversation Card */}
                <div id="conversation">
                  <Card className="border-primary">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <MessageSquare className="h-6 w-6" />
                        <span>Practice Conversations</span>
                      </CardTitle>
                      <CardDescription>
                        Engage in realistic business conversations with AI personas tailored to your skill level
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center py-8">
                      <Button 
                        size="lg" 
                        className="px-8 py-6 text-lg"
                        onClick={() => setShowSetup(true)}
                      >
                        <MessageSquare className="h-6 w-6 mr-3" />
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-primary flex items-center justify-between">
                <span>{selectedFlashcard.term}</span>
                <button
                  onClick={() => setSelectedFlashcard(null)}
                  className="p-1 rounded-md hover:bg-secondary/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 mt-4">
              {/* Pronunciation Section - Most Important */}
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg border border-primary/20">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-primary" />
                  Pronunciation Practice
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => playPronunciation(selectedFlashcard.term)}
                      disabled={audioLoading}
                      className="flex-1"
                    >
                      {audioLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Volume2 className="h-5 w-5 mr-2" />
                          Play Term
                        </>
                      )}
                    </Button>
                    <span className="text-lg italic text-muted-foreground">
                      {selectedFlashcard.term === "synergy" && "SIN-er-jee"}
                      {selectedFlashcard.term === "stakeholder" && "STAKE-hohl-der"}
                      {selectedFlashcard.term === "quarterly review" && "KWAR-ter-lee ree-VYOO"}
                    </span>
                  </div>
                  
                  <div className="mt-4 p-4 bg-background rounded-md border">
                    <p className="font-medium mb-2">Example Sentence:</p>
                    <p className="italic text-muted-foreground mb-3">"{selectedFlashcard.example_sentence}"</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playPronunciation(selectedFlashcard.example_sentence)}
                      disabled={audioLoading}
                    >
                      <Volume2 className="h-4 w-4 mr-2" />
                      Play Example
                    </Button>
                  </div>
                </div>
              </div>

              {/* Definition */}
              <div>
                <h3 className="font-semibold mb-2">Definition:</h3>
                <p className="text-muted-foreground">{selectedFlashcard.definition}</p>
              </div>

              {/* Common Mistakes */}
              <div className="bg-gradient-to-r from-red-50 to-green-50 dark:from-red-950/20 dark:to-green-950/20 p-4 rounded-lg border">
                <h3 className="font-semibold mb-3">Learn from Common Mistakes:</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-md">
                    <h4 className="font-medium text-sm text-destructive mb-1">❌ Avoid:</h4>
                    <p className="text-sm italic">{selectedFlashcard.common_mistake}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/50 p-3 rounded-md">
                    <h4 className="font-medium text-sm text-green-700 dark:text-green-400 mb-1">✓ Correct:</h4>
                    <p className="text-sm font-medium">{selectedFlashcard.correction}</p>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <Badge variant="secondary">{selectedFlashcard.cefr_level}</Badge>
                  <Badge variant="outline">{selectedFlashcard.topic_tag.replace('_', ' ')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">German:</span> {selectedFlashcard.german_translation}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </SidebarProvider>
  );
};

export default Dashboard;
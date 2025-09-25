import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, BookOpen, LogOut, MessageSquare, Menu, Activity, Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
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

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const conversationsPerPage = 3;

  useEffect(() => {
    fetchProfile();
    fetchRecentConversations();
  }, []);

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
                      <CardDescription>Suggested words and phrases to improve your pronunciation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {profile?.skill_level === "A1" || profile?.skill_level === "A2" ? (
                          <>
                            <div className="p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                              <p className="font-medium mb-1">negotiate</p>
                              <p className="text-sm text-muted-foreground">ne-GOH-shee-ate - "Let's negotiate the terms"</p>
                            </div>
                            <div className="p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                              <p className="font-medium mb-1">schedule</p>
                              <p className="text-sm text-muted-foreground">SKED-yool - "Can we schedule a meeting?"</p>
                            </div>
                            <div className="p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                              <p className="font-medium mb-1">colleague</p>
                              <p className="text-sm text-muted-foreground">KOL-eeg - "My colleague will join us"</p>
                            </div>
                          </>
                        ) : profile?.skill_level === "B1" || profile?.skill_level === "B2" ? (
                          <>
                            <div className="p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                              <p className="font-medium mb-1">prioritize</p>
                              <p className="text-sm text-muted-foreground">pry-OR-ih-tize - "We need to prioritize our objectives"</p>
                            </div>
                            <div className="p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                              <p className="font-medium mb-1">stakeholder</p>
                              <p className="text-sm text-muted-foreground">STAKE-hohl-der - "All stakeholders must approve"</p>
                            </div>
                            <div className="p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                              <p className="font-medium mb-1">implementation</p>
                              <p className="text-sm text-muted-foreground">im-pleh-men-TAY-shun - "The implementation phase begins next week"</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                              <p className="font-medium mb-1">synergy</p>
                              <p className="text-sm text-muted-foreground">SIN-er-jee - "We're looking for synergy between departments"</p>
                            </div>
                            <div className="p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                              <p className="font-medium mb-1">paradigm shift</p>
                              <p className="text-sm text-muted-foreground">PAIR-uh-dime shift - "This represents a paradigm shift in our approach"</p>
                            </div>
                            <div className="p-3 rounded-lg bg-secondary/20 border border-secondary/30">
                              <p className="font-medium mb-1">scalability</p>
                              <p className="text-sm text-muted-foreground">skay-luh-BIL-ih-tee - "We must consider the scalability of this solution"</p>
                            </div>
                          </>
                        )}
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
    </SidebarProvider>
  );
};

export default Dashboard;
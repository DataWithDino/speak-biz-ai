import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, BookOpen, LogOut, MessageSquare, Menu } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ConversationSetup from "@/components/ConversationSetup";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

type SkillLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface Profile {
  full_name: string | null;
  skill_level: SkillLevel;
  email: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

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
                      <CardTitle>Recent Activity</CardTitle>
                      <CardDescription>Your conversation history will appear here</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-center py-8">
                        No conversations yet. Start your first practice session above!
                      </p>
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
    </SidebarProvider>
  );
};

export default Dashboard;
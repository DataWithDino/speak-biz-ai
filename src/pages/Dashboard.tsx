import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, BookOpen, LogOut, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ConversationSetup from "@/components/ConversationSetup";

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  const getSkillLevelDescription = (level: SkillLevel) => {
    const descriptions = {
      A1: "Beginner - Basic phrases and simple interactions",
      A2: "Elementary - Common expressions and routine tasks",
      B1: "Intermediate - Main points and standard situations",
      B2: "Upper Intermediate - Complex texts and spontaneous interaction",
      C1: "Advanced - Fluent expression and flexible language use",
      C2: "Proficient - Near-native fluency and precise expression"
    };
    return descriptions[level];
  };

  const getSkillLevelColor = (level: SkillLevel) => {
    const colors = {
      A1: "bg-red-500",
      A2: "bg-orange-500",
      B1: "bg-yellow-500",
      B2: "bg-green-500",
      C1: "bg-blue-500",
      C2: "bg-purple-500"
    };
    return colors[level];
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">BizEnglishAI</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">
                Welcome back, {profile?.full_name || "Learner"}!
              </CardTitle>
              <CardDescription>
                Ready to improve your Business English skills today?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <User className="h-16 w-16 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">Current Skill Level</p>
                  <div className="flex items-center space-x-3">
                    <Badge className={`${getSkillLevelColor(profile!.skill_level)} text-white text-lg px-3 py-1`}>
                      {profile?.skill_level}
                    </Badge>
                    <span className="text-sm">
                      {getSkillLevelDescription(profile!.skill_level)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Start Conversation Card */}
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

          {/* Your Practice List */}
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

          {/* Recent Activity Card (placeholder) */}
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
      </main>

      {/* Conversation Setup Modal */}
      <ConversationSetup 
        open={showSetup} 
        onClose={() => setShowSetup(false)}
        skillLevel={profile?.skill_level || "B1"}
      />
    </div>
  );
};

export default Dashboard;
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, MessageSquare, Target, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">BizEnglishAI</h1>
          </div>
          <Button onClick={() => navigate("/auth")}>
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">
            Master Business English with AI
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Interactive, conversation-based tutoring tailored to your skill level.
            Practice real business scenarios with intelligent AI personas.
          </p>
          <Button size="lg" className="px-8" onClick={() => navigate("/auth")}>
            Start Learning Now
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardHeader>
              <Target className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Level-Appropriate Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                AI adapts to your English skill level (A1-C2) for optimal learning progression
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Real Business Scenarios</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Practice negotiations, presentations, meetings, and client interactions
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-10 w-10 text-primary mb-2" />
              <CardTitle>AI Business Personas</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Converse with various professional roles like CEOs, HR managers, and clients
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto text-center">
          <CardHeader>
            <CardTitle className="text-3xl">Ready to Improve Your Business English?</CardTitle>
            <CardDescription className="text-lg">
              Join professionals worldwide who are advancing their careers with better communication skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" onClick={() => navigate("/auth")}>
              Create Free Account
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;

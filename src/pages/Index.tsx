import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, MessageSquare, Target, Users, ArrowRight, CheckCircle, TrendingUp, BarChart3 } from "lucide-react";

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
    <div className="min-h-screen bg-background grid-pattern">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-glow">
              <BookOpen className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">BizEnglishAI</h1>
              <p className="text-xs text-muted-foreground">Professional Communication Training</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button variant="professional" onClick={() => navigate("/auth")}>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-6xl font-bold leading-tight">
              <span className="gradient-text">Master Business English</span>
              <br />
              <span>with AI-Powered Coaching</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join <span className="text-primary font-semibold">450 million professionals</span> improving their communication skills. 
              Our AI adapts to your level and provides personalized coaching for real business scenarios.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button variant="professional" size="xl" onClick={() => navigate("/auth")}>
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="xl" onClick={() => navigate("/auth")}>
              View Demo
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>73% see improvement in 2 weeks</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Personalized to your level</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">The Communication Gap Problem</h3>
            <p className="text-muted-foreground">Harvard study reveals critical need for business communication training</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            <div className="text-center p-6 rounded-lg bg-card border card-hover">
              <div className="text-4xl font-bold gradient-text mb-2">77%</div>
              <div className="text-sm text-muted-foreground">Senior Leaders need training</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-card border card-hover">
              <div className="text-4xl font-bold gradient-text mb-2">73%</div>
              <div className="text-sm text-muted-foreground">Admit communication gaps</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-card border card-hover">
              <div className="text-4xl font-bold gradient-text mb-2">65%</div>
              <div className="text-sm text-muted-foreground">People Managers struggle</div>
            </div>
            <div className="text-center p-6 rounded-lg bg-card border card-hover">
              <div className="text-4xl font-bold gradient-text mb-2">450M</div>
              <div className="text-sm text-muted-foreground">Professionals need help</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16 bg-secondary/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">AI-Powered Learning Experience</h3>
            <p className="text-muted-foreground">Personalized coaching that adapts to your needs</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="card-hover border-primary/20">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4 shadow-glow">
                  <Target className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle>Adaptive Learning</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  AI adjusts difficulty based on your CEFR level (A1-C2) for optimal progression
                </CardDescription>
                <div className="mt-4 flex items-center text-sm text-primary">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  <span>2x faster improvement</span>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover border-primary/20">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4 shadow-glow">
                  <MessageSquare className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle>Real Scenarios</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Practice negotiations, presentations, meetings with context-aware AI
                </CardDescription>
                <div className="mt-4 flex items-center text-sm text-primary">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  <span>100+ business contexts</span>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover border-primary/20">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4 shadow-glow">
                  <Users className="h-7 w-7 text-primary-foreground" />
                </div>
                <CardTitle>Expert Personas</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Interact with CEOs, clients, colleagues tailored to your industry
                </CardDescription>
                <div className="mt-4 flex items-center text-sm text-primary">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span>Industry-specific training</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto text-center bg-gradient-to-br from-card to-card/80 border-primary/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-4xl mb-4">
              Ready to <span className="gradient-text">Transform Your Career?</span>
            </CardTitle>
            <CardDescription className="text-lg">
              Join <span className="font-semibold text-foreground">67,500+ professionals</span> who are advancing their careers with better communication skills
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 space-y-6">
            <div className="flex justify-center items-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>€24.99/month</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>7-day free trial</span>
              </div>
            </div>
            <Button variant="professional" size="xl" onClick={() => navigate("/auth")}>
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;

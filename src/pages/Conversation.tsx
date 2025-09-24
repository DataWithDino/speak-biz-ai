import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Send, Mic, MicOff, Volume2, Square, ArrowLeft, Save } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const Conversation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const topic = searchParams.get("topic") || "";
  const persona = searchParams.get("persona") || "";
  const skillLevel = searchParams.get("level") || "B1";
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  useEffect(() => {
    checkAuth();
    startConversation();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const startConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          topic: topic,
          ai_persona: persona,
          skill_level: skillLevel as "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
          transcript: []
        })
        .select()
        .single();

      if (error) throw error;
      
      setConversationId(data.id);
      
      // Add initial AI greeting
      const greeting = getInitialGreeting();
      const aiMessage: Message = {
        role: "assistant",
        content: greeting,
        timestamp: new Date()
      };
      setMessages([aiMessage]);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive"
      });
    }
  };

  const getInitialGreeting = () => {
    const greetings = {
      "hr-manager": "Hello! I'm the HR manager. Let's discuss the topic at hand.",
      "venture-capitalist": "Good to meet you. I'm interested in hearing about your business.",
      "client": "Hi there! I'm looking forward to our discussion.",
      "ceo": "Welcome. Let's get straight to business.",
      "colleague": "Hey! Ready to collaborate on this?",
      "supplier": "Hello! I'm here to discuss our business arrangement."
    };
    return greetings[persona as keyof typeof greetings] || "Hello! Let's begin our conversation.";
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke("conversation", {
        body: {
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          topic,
          persona,
          skillLevel
        }
      });

      if (response.error) throw response.error;

      const aiResponse = response.data.choices[0].message.content;
      const aiMessage: Message = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    sendMessage(inputMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks(prev => [...prev, event.data]);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        // Here you would normally send to a speech-to-text service
        // For now, we'll just show a placeholder
        toast({
          title: "Recording stopped",
          description: "Voice-to-text feature coming soon!",
        });
        setAudioChunks([]);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const playAudioMessage = (content: string) => {
    // Text-to-speech placeholder
    const utterance = new SpeechSynthesisUtterance(content);
    speechSynthesis.speak(utterance);
  };

  const endConversation = async () => {
    if (!conversationId) return;

    try {
      const { error } = await supabase
        .from("conversations")
        .update({
          transcript: messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString()
          })),
          ended_at: new Date().toISOString()
        })
        .eq("id", conversationId);

      if (error) throw error;

      toast({
        title: "Conversation saved",
        description: "Your conversation has been saved successfully",
      });
      
      navigate("/dashboard");
    } catch (error) {
      console.error("Error ending conversation:", error);
      toast({
        title: "Error",
        description: "Failed to save conversation",
        variant: "destructive"
      });
    }
  };

  const formatTopic = (topicId: string) => {
    return topicId.split("-").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const formatPersona = (personaId: string) => {
    return personaId.split("-").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="font-semibold">{formatTopic(topic)}</h2>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>with {formatPersona(persona)}</span>
                <Badge variant="outline">{skillLevel}</Badge>
              </div>
            </div>
          </div>
          <Button 
            onClick={endConversation}
            variant="destructive"
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            End & Save
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto py-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card className={`max-w-[80%] p-4 ${
                message.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted"
              }`}>
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {message.role === "user" ? "You" : formatPersona(persona)}
                  </p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === "assistant" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => playAudioMessage(message.content)}
                      className="mt-2"
                    >
                      <Volume2 className="h-4 w-4 mr-1" />
                      Play
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <Card className="bg-muted p-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse flex space-x-1">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animation-delay-200"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animation-delay-400"></div>
                  </div>
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto flex space-x-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
          >
            {isRecording ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Conversation;
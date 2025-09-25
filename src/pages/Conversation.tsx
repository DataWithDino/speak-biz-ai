import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Mic, MicOff, ArrowLeft, Save, Video, AlertCircle } from "lucide-react";
import { useTranscriptRecorder } from "@/hooks/useTranscriptRecorder";
import { elevenlabsClient } from "@/services/elevenlabsClient";
import { ConsentModal } from "@/components/ConsentModal";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const Conversation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const topic = searchParams.get("topic") || "";
  const persona = searchParams.get("persona") || "";
  const skillLevel = searchParams.get("level") || "B1";
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [elevenlabsSessionId, setElevenlabsSessionId] = useState<string | null>(null);
  
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Consent and recording states
  const [showConsentModal, setShowConsentModal] = useState(true);
  const [recordingEnabled, setRecordingEnabled] = useState(false);
  const [backgroundRecordingActive, setBackgroundRecordingActive] = useState(false);

  // Background transcript recorder
  const transcriptRecorder = useTranscriptRecorder(
    async (audioChunk: Blob) => {
      if (elevenlabsSessionId && recordingEnabled) {
        await elevenlabsClient.streamAudio(audioChunk);
      }
    },
    5000 // 5 second chunks
  );

  useEffect(() => {
    checkAuth();
    startConversation();
  }, []);

  useEffect(() => {
    // Auto-start background recording when enabled and consent given
    if (recordingEnabled && !backgroundRecordingActive && !showConsentModal) {
      startBackgroundRecording();
    }
  }, [recordingEnabled, showConsentModal]);

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

      const { data, error } = await supabase.from("conversations").insert({
        user_id: user.id,
        topic: topic,
        ai_persona: persona,
        skill_level: skillLevel as "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
        transcript: []
      }).select().single();

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

  const startBackgroundRecording = async () => {
    try {
      // Start ElevenLabs session using our edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-agent', {
        body: { 
          action: 'start',
          agentId: "agent_2901k609n6fremxtqcaxw45412t1",
          voiceId: "1"
        }
      });

      if (error || !data?.sessionId) {
        throw new Error(error?.message || 'Failed to start ElevenLabs session');
      }

      setElevenlabsSessionId(data.sessionId);

      // Start transcript recording
      await transcriptRecorder.startRecording();
      setBackgroundRecordingActive(true);

      console.log("Background recording started with ElevenLabs session:", data.sessionId);
    } catch (error) {
      console.error("Failed to start background recording:", error);
      toast({
        title: "Recording Error",
        description: "Failed to start background recording",
        variant: "destructive"
      });
    }
  };

  const stopBackgroundRecording = async () => {
    try {
      let agentResponse = null;
      
      if (elevenlabsSessionId) {
        agentResponse = await elevenlabsClient.endSession();
        setElevenlabsSessionId(null);
        console.log('ElevenLabs session ended with response:', agentResponse);
      }
      
      transcriptRecorder.stopRecording();
      setBackgroundRecordingActive(false);
      
      console.log('Background recording stopped');
      return agentResponse;
    } catch (error) {
      console.error('Error stopping background recording:', error);
      return null;
    }
  };

  const handleConsentAccept = async () => {
    setRecordingEnabled(true);
    setShowConsentModal(false);
    
    // Request permission first
    const hasPermission = await transcriptRecorder.requestPermission();
    if (!hasPermission) {
      toast({
        title: "Permission Denied",
        description: "Microphone access is required for background recording",
        variant: "destructive"
      });
      setRecordingEnabled(false);
    }
  };

  const handleConsentDecline = () => {
    setRecordingEnabled(false);
    setShowConsentModal(false);
    toast({
      title: "Recording Disabled",
      description: "You can enable recording in Settings later",
    });
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

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      toast({
        title: "Video started",
        description: "Your camera is now active"
      });
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to use video chat",
        variant: "destructive"
      });
    }
  };

  const stopVideoCall = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const endConversation = async () => {
    if (!conversationId) return;

    try {
      // Stop background recording and get analysis
      let studyData = null;
      if (elevenlabsSessionId && recordingEnabled) {
        // Call our edge function to end the ElevenLabs session and get transcript
        try {
          const { data, error } = await supabase.functions.invoke('elevenlabs-agent', {
            body: { 
              action: 'end',
              sessionId: elevenlabsSessionId
            }
          });
          
          if (error) {
            console.error('Failed to end ElevenLabs session:', error);
          } else {
            studyData = data;
            console.log('ElevenLabs session ended with data:', studyData);
          }
        } catch (error) {
          console.error('Error calling end session:', error);
        }
        
        setElevenlabsSessionId(null);
        transcriptRecorder.stopRecording();
        setBackgroundRecordingActive(false);
      }

      // Stop video call if active
      if (videoStream) {
        stopVideoCall();
      }

      // Save conversation to database
      const updateData: any = {
        ended_at: new Date().toISOString()
      };

      // Include transcript and analysis if available from ElevenLabs
      if (studyData && studyData.transcript) {
        updateData.transcript = studyData.transcript;
        if (studyData.flashcards) {
          updateData.flashcards = studyData.flashcards;
        }
        if (studyData.analysis) {
          updateData.analysis = studyData.analysis;
        }
      } else {
        // Fallback to conversation messages if no ElevenLabs data
        updateData.transcript = messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString()
        }));
      }

      const { error } = await supabase
        .from("conversations")
        .update(updateData)
        .eq("id", conversationId);

      if (error) throw error;

      // Always navigate to study view after saving conversation
      if (studyData && studyData.flashcards && studyData.flashcards.length > 0) {
        // Store study data in sessionStorage for the StudyView
        sessionStorage.setItem('studyData', JSON.stringify(studyData));
        navigate('/study');
      } else {
        // Even without flashcards, navigate to study page - it will show analysis
        navigate('/study');
      }
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
    return topicId.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const formatPersona = (personaId: string) => {
    return personaId.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Consent Modal */}
      <ConsentModal
        open={showConsentModal}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />

      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="font-semibold">{formatTopic(topic)}</h2>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>with {formatPersona(persona)}</span>
                  <Badge variant="outline">{skillLevel}</Badge>
                  {recordingEnabled && backgroundRecordingActive && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                      Recording
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button onClick={endConversation} variant="destructive" size="sm">
              <Save className="h-4 w-4 mr-2" />
              End & Save
            </Button>
          </div>
          
          {/* Recording Status */}
          {recordingEnabled && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
              <AlertCircle className="h-3 w-3" />
              Background recording active for learning analytics
            </div>
          )}
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 px-4 py-4">
        <div className="max-w-4xl mx-auto h-full">
          {/* AI Agent Video */}
          <div className="relative bg-muted rounded-lg overflow-hidden h-full">
            <iframe 
              src="https://bey.chat/59ee6a14-f254-4b87-9a8e-706a9e56abf7" 
              className="w-full h-full rounded-lg" 
              frameBorder="0" 
              allowFullScreen 
              allow="camera *; microphone *; autoplay *; encrypted-media *; fullscreen *" 
              style={{
                border: 'none',
                minHeight: '500px'
              }} 
              title="AI Conversational Agent" 
            />
            
            <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur px-3 py-1 rounded-md">
              <span className="text-sm font-medium">CEO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Controls */}
      <div className="border-t bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center space-x-4">
            <Button 
              onClick={videoStream ? stopVideoCall : startVideoCall} 
              variant={videoStream ? "destructive" : "outline"} 
              size="icon"
            >
              <Video className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2 px-3 py-2 bg-muted rounded-md">
              <div className={`h-2 w-2 rounded-full ${videoStream ? "bg-green-500" : "bg-muted-foreground"}`}></div>
              <span className="text-sm text-muted-foreground">
                {videoStream ? "Camera on" : "Camera off"}
              </span>
            </div>
            {recordingEnabled && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
                <div className={`h-2 w-2 rounded-full ${backgroundRecordingActive ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`}></div>
                <span className="text-sm text-red-700">
                  {backgroundRecordingActive ? "Learning analytics active" : "Recording stopped"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Conversation;
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Shield, Settings } from "lucide-react";

interface ConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const ConsentModal = ({ open, onAccept, onDecline }: ConsentModalProps) => {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Microphone Permission Required
          </DialogTitle>
          <DialogDescription className="text-left space-y-3">
            <p>
              To provide you with personalized learning analytics, we need to record your microphone during the conversation.
            </p>
            
            <div className="bg-muted/50 p-3 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <Mic className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <strong>What we record:</strong> Your voice during the business conversation for language analysis
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Settings className="h-4 w-4 text-primary mt-0.5" />
                <div className="text-sm">
                  <strong>What we don't do:</strong> No audio will be played back by our AI during the session
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Your recording is processed to generate personalized flashcards and pronunciation feedback. 
              You can disable this feature in Settings at any time.
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onDecline} className="w-full sm:w-auto">
            Continue Without Recording
          </Button>
          <Button onClick={onAccept} className="w-full sm:w-auto">
            Allow Recording
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Briefcase, Users, Phone, FileText, TrendingUp, UserCheck } from "lucide-react";

interface ConversationSetupProps {
  open: boolean;
  onClose: () => void;
  skillLevel: string;
}

const businessTopics = [
  { id: "quarterly-review", name: "Quarterly Review", icon: TrendingUp, description: "Discuss company performance and goals" },
  { id: "negotiation", name: "Negotiating a Contract", icon: FileText, description: "Practice contract negotiation skills" },
  { id: "client-onboarding", name: "Client Onboarding", icon: UserCheck, description: "Guide new clients through your services" },
  { id: "team-meeting", name: "Team Meeting", icon: Users, description: "Lead or participate in team discussions" },
  { id: "sales-pitch", name: "Sales Pitch", icon: Briefcase, description: "Present products or services to clients" },
  { id: "phone-conference", name: "Phone Conference", icon: Phone, description: "Remote business communication practice" },
];

const aiPersonas = [
  { id: "hr-manager", name: "HR Manager", description: "Human resources professional" },
  { id: "venture-capitalist", name: "Venture Capitalist", description: "Investment and funding discussions" },
  { id: "client", name: "Client", description: "Customer or buyer perspective" },
  { id: "ceo", name: "CEO", description: "Executive leadership discussions" },
  { id: "colleague", name: "Colleague", description: "Peer-level professional interaction" },
  { id: "supplier", name: "Supplier", description: "Vendor and supply chain talks" },
];

const ConversationSetup: React.FC<ConversationSetupProps> = ({ open, onClose, skillLevel }) => {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("");
  const [step, setStep] = useState(1);

  const handleNext = () => {
    if (step === 1 && selectedTopic) {
      setStep(2);
    } else if (step === 2 && selectedPersona) {
      // Navigate to conversation with parameters
      navigate(`/conversation?topic=${selectedTopic}&persona=${selectedPersona}&level=${skillLevel}`);
      onClose();
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const resetAndClose = () => {
    setSelectedTopic("");
    setSelectedPersona("");
    setStep(1);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Choose a Business Topic" : "Select AI Persona"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Select the business scenario you'd like to practice"
              : "Choose who you'd like to have a conversation with"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 1 ? (
            <RadioGroup value={selectedTopic} onValueChange={setSelectedTopic}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {businessTopics.map((topic) => {
                  const Icon = topic.icon;
                  return (
                    <Label key={topic.id} htmlFor={topic.id} className="cursor-pointer">
                      <Card className={`p-4 hover:border-primary transition-colors ${selectedTopic === topic.id ? 'border-primary bg-primary/5' : ''}`}>
                        <div className="flex items-start space-x-3">
                          <RadioGroupItem value={topic.id} id={topic.id} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <Icon className="h-4 w-4 text-primary" />
                              <span className="font-medium">{topic.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{topic.description}</p>
                          </div>
                        </div>
                      </Card>
                    </Label>
                  );
                })}
              </div>
            </RadioGroup>
          ) : (
            <RadioGroup value={selectedPersona} onValueChange={setSelectedPersona}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiPersonas.map((persona) => (
                  <Label key={persona.id} htmlFor={persona.id} className="cursor-pointer">
                    <Card className={`p-4 hover:border-primary transition-colors ${selectedPersona === persona.id ? 'border-primary bg-primary/5' : ''}`}>
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value={persona.id} id={persona.id} className="mt-1" />
                        <div className="flex-1">
                          <span className="font-medium">{persona.name}</span>
                          <p className="text-sm text-muted-foreground">{persona.description}</p>
                        </div>
                      </div>
                    </Card>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          )}
        </div>

        <DialogFooter>
          {step === 2 && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          <Button 
            onClick={handleNext}
            disabled={(step === 1 && !selectedTopic) || (step === 2 && !selectedPersona)}
          >
            {step === 1 ? "Next" : "Start Conversation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConversationSetup;
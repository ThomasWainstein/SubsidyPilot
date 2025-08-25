import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ApplicantTypeSelector, type ApplicantType } from "@/components/profile/ApplicantTypeSelector";
import { useToast } from "@/hooks/use-toast";

const NewProfilePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<ApplicantType | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profileDescription, setProfileDescription] = useState("");

  const handleCreateProfile = async () => {
    if (!selectedType || !profileName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an applicant type and enter a profile name.",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Implement actual profile creation API call
      console.log('Creating profile:', {
        type: selectedType,
        name: profileName,
        description: profileDescription
      });

      toast({
        title: "Profile Created",
        description: `Your ${selectedType} profile "${profileName}" has been created successfully.`,
      });

      // Navigate to the new profile (mock ID for now)
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/dashboard')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create New Profile</h1>
          <p className="text-muted-foreground">
            Set up a new applicant profile to access relevant funding opportunities
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            step >= 1 ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground'
          }`}>
            1
          </div>
          <div className={`h-px w-16 ${step > 1 ? 'bg-primary' : 'bg-muted-foreground'}`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            step >= 2 ? 'bg-primary text-primary-foreground border-primary' : 'border-muted-foreground'
          }`}>
            2
          </div>
        </div>
      </div>

      {/* Step Content */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Applicant Type</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose the type of applicant profile you want to create. This will determine which funding opportunities are most relevant to you.
            </p>
          </CardHeader>
          <CardContent>
            <ApplicantTypeSelector
              selectedType={selectedType}
              onTypeSelect={setSelectedType}
            />
            <div className="flex justify-end mt-6">
              <Button 
                onClick={() => setStep(2)}
                disabled={!selectedType}
                className="gap-2"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && selectedType && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <p className="text-sm text-muted-foreground">
              Provide basic information about your {selectedType} profile.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="profileName">Profile Name *</Label>
              <Input
                id="profileName"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder={
                  selectedType === 'individual' ? 'e.g., John Doe' :
                  selectedType === 'business' ? 'e.g., Green Tech Solutions Ltd.' :
                  selectedType === 'nonprofit' ? 'e.g., Environmental Action NGO' :
                  'e.g., City of Berlin'
                }
                className="max-w-md"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileDescription">Description (Optional)</Label>
              <Textarea
                id="profileDescription"
                value={profileDescription}
                onChange={(e) => setProfileDescription(e.target.value)}
                placeholder={
                  selectedType === 'individual' ? 'Brief description of your background and interests...' :
                  selectedType === 'business' ? 'Brief description of your business activities...' :
                  selectedType === 'nonprofit' ? 'Brief description of your organization\'s mission...' :
                  'Brief description of your municipality and priorities...'
                }
                rows={4}
              />
            </div>

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={handleCreateProfile}
                disabled={!profileName.trim()}
                className="gap-2"
              >
                Create Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NewProfilePage;
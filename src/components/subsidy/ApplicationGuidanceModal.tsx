import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Building, 
  Euro, 
  Calendar,
  ArrowRight,
  ExternalLink,
  Shield,
  Info
} from 'lucide-react';
import { analytics } from '@/lib/analytics/events';

interface ApplicationGuidanceModalProps {
  subsidy: any;
  onProceed: (url: string) => void;
  trigger?: React.ReactNode;
}

interface PrerequisiteItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  category: 'document' | 'eligibility' | 'preparation';
  estimatedTime?: string;
}

/**
 * Application guidance modal to prepare users before redirecting to external platforms
 */
export const ApplicationGuidanceModal: React.FC<ApplicationGuidanceModalProps> = ({
  subsidy,
  onProceed,
  trigger
}) => {
  const [open, setOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [currentStep, setCurrentStep] = useState(0);

  // Extract application data
  const lesAidesData = subsidy.raw_data?.fiche;
  const applicationUrl = lesAidesData?.url || subsidy.application_url;
  const deadline = subsidy.deadline || subsidy.application_deadline;

  // Generate prerequisites based on subsidy data
  const prerequisites: PrerequisiteItem[] = [
    {
      id: 'eligibility-check',
      title: 'Verify Eligibility',
      description: 'Ensure your business/project meets all eligibility criteria',
      required: true,
      category: 'eligibility',
      estimatedTime: '10-15 min'
    },
    {
      id: 'business-registration',
      title: 'Business Registration',
      description: 'Valid registration in RCS (Registre du Commerce) or RM (Répertoire des Métiers)',
      required: true,
      category: 'document',
      estimatedTime: '5 min'
    },
    {
      id: 'financial-docs',
      title: 'Financial Documentation',
      description: 'Recent financial statements, tax returns, or business plan',
      required: true,
      category: 'document',
      estimatedTime: '15-20 min'
    },
    {
      id: 'project-details',
      title: 'Project Information',
      description: 'Detailed project description, timeline, and budget',
      required: true,
      category: 'preparation',
      estimatedTime: '30-45 min'
    },
    {
      id: 'contact-info',
      title: 'Contact Information',
      description: 'Updated business address, phone, and email',
      required: true,
      category: 'preparation',
      estimatedTime: '5 min'
    }
  ];

  const requiredItems = prerequisites.filter(item => item.required);
  const allRequiredChecked = requiredItems.every(item => checkedItems[item.id]);
  const totalEstimatedTime = calculateTotalTime(prerequisites.filter(p => checkedItems[p.id] || p.required));

  function calculateTotalTime(items: PrerequisiteItem[]): string {
    const totalMinutes = items.reduce((sum, item) => {
      if (!item.estimatedTime) return sum;
      const match = item.estimatedTime.match(/(\d+)-?(\d+)?/);
      if (match) {
        const min = parseInt(match[1]);
        const max = match[2] ? parseInt(match[2]) : min;
        return sum + Math.ceil((min + max) / 2);
      }
      return sum;
    }, 0);

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours} hour${hours > 1 ? 's' : ''}`;
    }
  }

  const handleItemCheck = (itemId: string, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: checked }));
  };

  const handleProceed = () => {
    analytics.trackSubsidyInteraction('apply', subsidy.id);
    
    setOpen(false);
    onProceed(applicationUrl);
  };

  const steps = [
    'Preparation Checklist',
    'Application Overview',
    'Ready to Apply'
  ];

  const renderPreparationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Application Preparation</h3>
        <p className="text-sm text-muted-foreground">
          Complete these steps to ensure a successful application
        </p>
      </div>

      <Alert>
        <Clock className="h-4 w-4" />
        <AlertDescription>
          <strong>Estimated time to complete:</strong> {totalEstimatedTime}
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        {prerequisites.map((item) => (
          <Card key={item.id} className={`transition-all ${checkedItems[item.id] ? 'bg-green-50 border-green-200' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={item.id}
                  checked={checkedItems[item.id] || false}
                  onCheckedChange={(checked) => handleItemCheck(item.id, checked as boolean)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <label htmlFor={item.id} className="font-medium cursor-pointer">
                      {item.title}
                    </label>
                    {item.required && (
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    )}
                    {item.estimatedTime && (
                      <span className="text-xs text-muted-foreground">
                        ⏱️ {item.estimatedTime}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <div className="text-right">
                  {getCategoryIcon(item.category)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button 
          onClick={() => setCurrentStep(1)}
          disabled={!allRequiredChecked}
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderOverviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Application Overview</h3>
        <p className="text-sm text-muted-foreground">
          What to expect when you proceed to the application platform
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">Platform Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You'll be redirected to the official regional platform where you can create an account 
              and submit your application directly to the agency.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-green-600" />
              <CardTitle className="text-base">Application Process</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Create account or log in</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Fill out application form</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Upload required documents</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Review and submit</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {deadline && (
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              <strong>Application deadline:</strong> {new Date(deadline).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(0)}>
          Back
        </Button>
        <Button onClick={() => setCurrentStep(2)}>
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  const renderReadyStep = () => (
    <div className="space-y-6 text-center">
      <div>
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Ready to Apply!</h3>
        <p className="text-sm text-muted-foreground">
          You're all set to proceed with your application
        </p>
      </div>

      <Card className="text-left">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-1" />
            <div className="text-sm">
              <p className="font-medium mb-2">Important reminders:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Save your application progress frequently</li>
                <li>• Keep all document files under 10MB</li>
                <li>• Double-check all information before submitting</li>
                <li>• Save your application reference number</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
          Back
        </Button>
        <Button onClick={handleProceed} className="bg-green-600 hover:bg-green-700">
          <ExternalLink className="w-4 h-4 mr-2" />
          Apply Now
        </Button>
      </div>
    </div>
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'document':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'eligibility':
        return <User className="w-4 h-4 text-green-600" />;
      case 'preparation':
        return <Clock className="w-4 h-4 text-orange-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderPreparationStep();
      case 1:
        return renderOverviewStep();
      case 2:
        return renderReadyStep();
      default:
        return renderPreparationStep();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <ExternalLink className="w-4 h-4 mr-2" />
            Apply Now
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application Guidance</DialogTitle>
          <DialogDescription>
            Prepare for your subsidy application to improve your chances of success
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center space-x-2 mb-6">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index === currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : index < currentStep 
                    ? 'bg-green-500 text-white' 
                    : 'bg-muted text-muted-foreground'
              }`}>
                {index < currentStep ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-1 mx-2 ${
                  index < currentStep ? 'bg-green-500' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {renderStep()}
      </DialogContent>
    </Dialog>
  );
};
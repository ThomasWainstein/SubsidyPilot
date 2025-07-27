import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Upload, 
  Download, 
  Edit, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  Clock,
  Globe,
  Database,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApplicationStep {
  id: string;
  title: string;
  description: string;
  required: boolean;
  type: 'file_upload' | 'text_input' | 'form_data' | 'verification';
  source: 'website' | 'file' | 'manual' | 'ai_extracted';
  confidence: number;
  source_file?: string;
  source_excerpt?: string;
  value?: any;
  completed: boolean;
  flagged: boolean;
  audit_trail: AuditEntry[];
}

interface AuditEntry {
  timestamp: string;
  actor: 'ai' | 'user' | 'admin';
  action: string;
  old_value?: any;
  new_value?: any;
  source: string;
}

interface ApplicationWizardProps {
  subsidyId: string;
  onComplete: (data: any) => void;
  onSave: (data: any) => void;
}

const ApplicationWizard: React.FC<ApplicationWizardProps> = ({ 
  subsidyId, 
  onComplete, 
  onSave 
}) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<ApplicationStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingStep, setEditingStep] = useState<string | null>(null);

  useEffect(() => {
    loadApplicationSteps();
  }, [subsidyId]);

  const loadApplicationSteps = async () => {
    try {
      setIsLoading(true);
      
      // Mock application steps - in real implementation, fetch from backend
      const mockSteps: ApplicationStep[] = [
        {
          id: 'step_1',
          title: 'Formulaire 15505*03',
          description: 'Official application form for agricultural subsidies',
          required: true,
          type: 'file_upload',
          source: 'website',
          confidence: 95,
          completed: false,
          flagged: false,
          audit_trail: [{
            timestamp: new Date().toISOString(),
            actor: 'ai',
            action: 'extracted_from_website',
            source: 'https://example.gov/forms'
          }]
        },
        {
          id: 'step_2',
          title: 'Environmental Impact Report',
          description: 'Required for projects affecting more than 5 hectares',
          required: true,
          type: 'file_upload',
          source: 'file',
          confidence: 78,
          source_file: 'annex_3_requirements.pdf',
          source_excerpt: 'Environmental assessment must be provided for all agricultural projects...',
          completed: false,
          flagged: true,
          audit_trail: [{
            timestamp: new Date().toISOString(),
            actor: 'ai',
            action: 'extracted_from_file',
            source: 'annex_3_requirements.pdf'
          }]
        },
        {
          id: 'step_3',
          title: 'SIRET Number',
          description: 'Business registration number',
          required: true,
          type: 'text_input',
          source: 'manual',
          confidence: 100,
          completed: false,
          flagged: false,
          audit_trail: []
        }
      ];

      setSteps(mockSteps);
    } catch (error) {
      toast({
        title: "Error Loading Application",
        description: "Failed to load application requirements.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const triggerFileAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      toast({
        title: "Analyzing Files",
        description: "Re-analyzing attached documents for missing requirements...",
      });
      
      // In real implementation, call edge function for file analysis
      setTimeout(() => {
        setIsAnalyzing(false);
        toast({
          title: "Analysis Complete",
          description: "Found 2 additional requirements from attached files.",
        });
      }, 3000);
    } catch (error) {
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze attached files.",
        variant: "destructive",
      });
    }
  };

  const updateStepValue = (stepId: string, value: any) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            value,
            completed: !!value,
            audit_trail: [...step.audit_trail, {
              timestamp: new Date().toISOString(),
              actor: 'user',
              action: 'updated_value',
              old_value: step.value,
              new_value: value,
              source: 'user_input'
            }]
          }
        : step
    ));
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'website': return Globe;
      case 'file': return FileText;
      case 'manual': return User;
      case 'ai_extracted': return Database;
      default: return FileText;
    }
  };

  const getConfidenceBadge = (confidence: number, flagged: boolean) => {
    if (flagged) {
      return <Badge variant="destructive" className="text-xs">Needs Review</Badge>;
    }
    
    if (confidence >= 90) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">High Confidence</Badge>;
    } else if (confidence >= 70) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">Medium Confidence</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">Low Confidence</Badge>;
    }
  };

  const currentStepData = steps[currentStep];
  const completedSteps = steps.filter(step => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Database className="w-8 h-8 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading application requirements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Application Wizard</h2>
          <p className="text-muted-foreground">Step-by-step application guidance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={triggerFileAnalysis} disabled={isAnalyzing}>
            {isAnalyzing ? <Clock className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            {isAnalyzing ? 'Analyzing...' : 'Re-analyze Files'}
          </Button>
          <Button variant="outline" onClick={() => onSave(steps)}>
            Save Progress
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedSteps} of {steps.length} steps completed
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Steps Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {steps.map((step, index) => {
          const SourceIcon = getSourceIcon(step.source);
          
          return (
            <Button
              key={step.id}
              variant={currentStep === index ? "default" : step.completed ? "secondary" : "outline"}
              size="sm"
              onClick={() => setCurrentStep(index)}
              className="justify-start h-auto p-3"
            >
              <div className="flex items-center space-x-2 w-full">
                <div className="flex-shrink-0">
                  {step.completed ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : step.flagged ? (
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                  ) : (
                    <SourceIcon className="w-4 h-4" />
                  )}
                </div>
                <div className="text-left truncate">
                  <div className="text-xs font-medium truncate">{step.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Step {index + 1}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {/* Current Step */}
      {currentStepData && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center space-x-2">
                  <span>{currentStepData.title}</span>
                  {currentStepData.required && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {currentStepData.description}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                {getConfidenceBadge(currentStepData.confidence, currentStepData.flagged)}
                <Badge variant="outline" className="text-xs capitalize">
                  {currentStepData.source.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Source Information */}
            {(currentStepData.source_file || currentStepData.source_excerpt) && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    {currentStepData.source_file && (
                      <p className="text-sm">
                        <strong>Source file:</strong> {currentStepData.source_file}
                        <Button variant="ghost" size="sm" className="ml-2 h-6 px-2">
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </p>
                    )}
                    {currentStepData.source_excerpt && (
                      <p className="text-sm bg-muted p-2 rounded italic">
                        "{currentStepData.source_excerpt}"
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Step Input */}
            {currentStepData.type === 'file_upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drop your file here or click to browse
                  </p>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              </div>
            )}

            {currentStepData.type === 'text_input' && (
              <div className="space-y-2">
                <Input
                  placeholder={`Enter ${currentStepData.title.toLowerCase()}`}
                  value={currentStepData.value || ''}
                  onChange={(e) => updateStepValue(currentStepData.id, e.target.value)}
                />
              </div>
            )}

            {/* Audit Trail */}
            {currentStepData.audit_trail.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Change History</h4>
                <div className="space-y-1 text-xs">
                  {currentStepData.audit_trail.slice(-3).map((entry, index) => (
                    <div key={index} className="flex items-center space-x-2 text-muted-foreground">
                      <span>{new Date(entry.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span className="capitalize">{entry.actor}</span>
                      <span>{entry.action.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          Previous
        </Button>
        
        <div className="flex items-center space-x-2">
          {currentStep === steps.length - 1 ? (
            <Button 
              onClick={() => onComplete(steps)}
              disabled={completedSteps < steps.length}
            >
              Submit Application
            </Button>
          ) : (
            <Button 
              onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationWizard;
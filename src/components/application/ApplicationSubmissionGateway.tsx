import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Lock, 
  Unlock,
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  FileText,
  Clock,
  Send,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubmissionValidation {
  canSubmit: boolean;
  criticalErrors: ValidationError[];
  warnings: ValidationWarning[];
  missingFields: string[];
  completionRate: number;
  auditSummary: AuditSummary;
}

interface ValidationError {
  stepId: string;
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium';
  actionRequired: string;
  canOverride: boolean;
}

interface ValidationWarning {
  stepId: string;
  field: string;
  message: string;
  requiresConfirmation: boolean;
}

interface AuditSummary {
  totalFields: number;
  webExtracted: number;
  fileExtracted: number;
  manualEntry: number;
  adminOverrides: number;
  userCorrections: number;
  lastValidated: string;
}

interface ApplicationSubmissionGatewayProps {
  applicationData: any;
  onSubmit: (data: any, auditTrail: any) => void;
  onSaveDraft: (data: any) => void;
}

const ApplicationSubmissionGateway: React.FC<ApplicationSubmissionGatewayProps> = ({
  applicationData,
  onSubmit,
  onSaveDraft
}) => {
  const { toast } = useToast();
  const [validation, setValidation] = useState<SubmissionValidation>({
    canSubmit: false,
    criticalErrors: [],
    warnings: [],
    missingFields: [],
    completionRate: 0,
    auditSummary: {
      totalFields: 0,
      webExtracted: 0,
      fileExtracted: 0,
      manualEntry: 0,
      adminOverrides: 0,
      userCorrections: 0,
      lastValidated: new Date().toISOString()
    }
  });

  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuditDetails, setShowAuditDetails] = useState(false);
  const [acceptedWarnings, setAcceptedWarnings] = useState<Set<string>>(new Set());

  useEffect(() => {
    runPreSubmissionValidation();
  }, [applicationData]);

  const runPreSubmissionValidation = async () => {
    try {
      setIsValidating(true);
      
      // Simulate comprehensive pre-submission validation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock validation results with strict enforcement
      const mockErrors: ValidationError[] = [
        {
          stepId: 'step_2',
          field: 'environmental_report',
          message: 'Environmental report file is required but missing or corrupted.',
          severity: 'critical',
          actionRequired: 'Upload a valid environmental report file (PDF or DOC format)',
          canOverride: false
        },
        {
          stepId: 'step_4',
          field: 'financial_documents',
          message: 'Financial documents do not match required format specifications.',
          severity: 'high',
          actionRequired: 'Re-upload financial documents in the specified format',
          canOverride: false
        }
      ];

      const mockWarnings: ValidationWarning[] = [
        {
          stepId: 'step_1',
          field: 'project_description',
          message: 'Project description contains potential inconsistencies with uploaded plans.',
          requiresConfirmation: true
        }
      ];

      const mockAuditSummary: AuditSummary = {
        totalFields: 15,
        webExtracted: 8,
        fileExtracted: 4,
        manualEntry: 2,
        adminOverrides: 1,
        userCorrections: 3,
        lastValidated: new Date().toISOString()
      };

      const validationResult: SubmissionValidation = {
        canSubmit: mockErrors.length === 0,
        criticalErrors: mockErrors,
        warnings: mockWarnings,
        missingFields: mockErrors.map(e => e.field),
        completionRate: mockErrors.length === 0 ? 100 : 75,
        auditSummary: mockAuditSummary
      };

      setValidation(validationResult);

      if (!validationResult.canSubmit) {
        toast({
          title: "Submission Blocked",
          description: `${mockErrors.length} critical issues must be resolved before submission.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      toast({
        title: "Validation Failed",
        description: "Could not complete pre-submission validation.",
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleWarningAcceptance = (stepId: string, field: string) => {
    const warningKey = `${stepId}_${field}`;
    setAcceptedWarnings(prev => new Set([...prev, warningKey]));
  };

  const handleSubmission = async () => {
    try {
      setIsSubmitting(true);

      // Final validation check
      if (!validation.canSubmit) {
        toast({
          title: "Submission Denied",
          description: "Critical errors must be resolved before submission.",
          variant: "destructive",
        });
        return;
      }

      // Check all warnings are acknowledged
      const unacceptedWarnings = validation.warnings.filter(w => 
        w.requiresConfirmation && !acceptedWarnings.has(`${w.stepId}_${w.field}`)
      );

      if (unacceptedWarnings.length > 0) {
        toast({
          title: "Warnings Must Be Acknowledged",
          description: "Please review and acknowledge all warnings before submission.",
          variant: "destructive",
        });
        return;
      }

      // Generate final audit trail
      const finalAuditTrail = {
        submissionAttempt: {
          timestamp: new Date().toISOString(),
          validationPassed: true,
          auditSummary: validation.auditSummary,
          warningsAccepted: Array.from(acceptedWarnings),
          finalChecksum: 'abc123def456' // Would be actual checksum
        }
      };

      toast({
        title: "Submitting Application",
        description: "Performing final validation and submission...",
      });

      // Simulate submission process
      await new Promise(resolve => setTimeout(resolve, 3000));

      onSubmit(applicationData, finalAuditTrail);
      
      toast({
        title: "Application Submitted",
        description: "Application has been successfully submitted for processing.",
      });

    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "An error occurred during submission. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubmissionStatus = () => {
    if (validation.canSubmit && acceptedWarnings.size >= validation.warnings.filter(w => w.requiresConfirmation).length) {
      return {
        icon: <Unlock className="w-5 h-5 text-green-600" />,
        text: "Ready for Submission",
        color: "text-green-600",
        bgColor: "bg-green-100"
      };
    } else if (validation.criticalErrors.length > 0) {
      return {
        icon: <Lock className="w-5 h-5 text-red-600" />,
        text: "Submission Blocked",
        color: "text-red-600",
        bgColor: "bg-red-100"
      };
    } else {
      return {
        icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
        text: "Warnings Need Review",
        color: "text-yellow-600",
        bgColor: "bg-yellow-100"
      };
    }
  };

  const status = getSubmissionStatus();

  return (
    <div className="space-y-6">
      {/* Submission Status Header */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-6 h-6" />
              <span>Application Submission Gateway</span>
            </div>
            <Badge className={`${status.bgColor} ${status.color} border-0`}>
              {status.icon}
              <span className="ml-2">{status.text}</span>
            </Badge>
          </CardTitle>
          <CardDescription>
            Enforced validation and audit trail before submission
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Completion Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Completion Status</span>
              <span className="text-sm text-muted-foreground">
                {validation.completionRate}% Complete
              </span>
            </div>
            <Progress value={validation.completionRate} className="h-3" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded">
              <div className="text-lg font-bold text-primary">{validation.auditSummary.totalFields}</div>
              <div className="text-xs text-muted-foreground">Total Fields</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-lg font-bold text-green-600">{validation.auditSummary.webExtracted + validation.auditSummary.fileExtracted}</div>
              <div className="text-xs text-muted-foreground">AI Extracted</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-lg font-bold text-blue-600">{validation.auditSummary.manualEntry}</div>
              <div className="text-xs text-muted-foreground">Manual Entry</div>
            </div>
            <div className="text-center p-3 border rounded">
              <div className="text-lg font-bold text-orange-600">{validation.auditSummary.adminOverrides}</div>
              <div className="text-xs text-muted-foreground">Overrides</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                onClick={runPreSubmissionValidation}
                disabled={isValidating}
              >
                {isValidating ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {isValidating ? 'Validating...' : 'Re-validate'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setShowAuditDetails(!showAuditDetails)}
              >
                <Eye className="w-4 h-4 mr-2" />
                {showAuditDetails ? 'Hide' : 'View'} Audit Trail
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => onSaveDraft(applicationData)}>
                Save Draft
              </Button>
              
              <Button 
                onClick={handleSubmission}
                disabled={!validation.canSubmit || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Errors */}
      {validation.criticalErrors.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <XCircle className="w-5 h-5" />
              <span>Critical Issues - Submission Blocked</span>
            </CardTitle>
            <CardDescription>
              These issues must be resolved before submission can proceed
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {validation.criticalErrors.map((error, index) => (
              <Alert key={index} className="border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="flex items-center justify-between">
                  <span>Step {error.stepId}: {error.field}</span>
                  <Badge variant="destructive" className="text-xs">
                    {error.severity.toUpperCase()}
                  </Badge>
                </AlertTitle>
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">{error.message}</p>
                    <p className="text-sm text-muted-foreground">
                      <strong>Required Action:</strong> {error.actionRequired}
                    </p>
                    {!error.canOverride && (
                      <div className="flex items-center space-x-1 text-sm text-red-600">
                        <Lock className="w-3 h-3" />
                        <span>Cannot be overridden - resolution required</span>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {validation.warnings.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-yellow-700">
              <AlertTriangle className="w-5 h-5" />
              <span>Warnings - Review Required</span>
            </CardTitle>
            <CardDescription>
              Please review and acknowledge these warnings before submission
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {validation.warnings.map((warning, index) => {
              const warningKey = `${warning.stepId}_${warning.field}`;
              const isAccepted = acceptedWarnings.has(warningKey);
              
              return (
                <Alert key={index} className="border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>Step {warning.stepId}: {warning.field}</span>
                    {isAccepted ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Acknowledged
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                        Needs Review
                      </Badge>
                    )}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="space-y-3">
                      <p>{warning.message}</p>
                      {warning.requiresConfirmation && !isAccepted && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleWarningAcceptance(warning.stepId, warning.field)}
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Acknowledge Warning
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Audit Details */}
      {showAuditDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Detailed Audit Trail</span>
            </CardTitle>
            <CardDescription>
              Complete audit summary for this application
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium">Data Sources</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Web Extracted:</span>
                    <span className="font-medium">{validation.auditSummary.webExtracted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>File Extracted:</span>
                    <span className="font-medium">{validation.auditSummary.fileExtracted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manual Entry:</span>
                    <span className="font-medium">{validation.auditSummary.manualEntry}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Corrections</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Admin Overrides:</span>
                    <span className="font-medium">{validation.auditSummary.adminOverrides}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>User Corrections:</span>
                    <span className="font-medium">{validation.auditSummary.userCorrections}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Validation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Last Validated:</span>
                    <span className="font-medium">
                      {new Date(validation.auditSummary.lastValidated).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-medium ${validation.canSubmit ? 'text-green-600' : 'text-red-600'}`}>
                      {validation.canSubmit ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ApplicationSubmissionGateway;
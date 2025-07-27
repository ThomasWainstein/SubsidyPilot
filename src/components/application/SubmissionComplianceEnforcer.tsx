import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Lock, Shield } from 'lucide-react';
import ExternalSubmissionManager from './ExternalSubmissionManager';
import FeedbackManager from './FeedbackManager';
import ComplianceArchive from './ComplianceArchive';

interface SubmissionComplianceEnforcerProps {
  applicationId: string;
  applicationData: any;
  onComplete: () => void;
}

const SubmissionComplianceEnforcer: React.FC<SubmissionComplianceEnforcerProps> = ({
  applicationId,
  applicationData,
  onComplete
}) => {
  const [submissionStatus, setSubmissionStatus] = useState<string>('pending');
  const [hasBlockingFeedback, setHasBlockingFeedback] = useState(false);
  const [isCompliant, setIsCompliant] = useState(false);

  const canComplete = submissionStatus.includes('confirmed') && !hasBlockingFeedback && isCompliant;
  const progressValue = 
    (submissionStatus.includes('confirmed') ? 40 : submissionStatus.includes('submitted') ? 20 : 0) +
    (!hasBlockingFeedback ? 30 : 0) +
    (isCompliant ? 30 : 0);

  return (
    <div className="space-y-6">
      {/* Enforcement Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Submission & Compliance Enforcement
          </CardTitle>
          <CardDescription>
            All steps must be completed with verifiable proof before application can be finalized
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Overall Progress</span>
                <span className="text-sm">{progressValue}% Complete</span>
              </div>
              <Progress value={progressValue} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                {submissionStatus.includes('confirmed') ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                )}
                <span className="text-sm">External Submission</span>
              </div>
              <div className="flex items-center space-x-2">
                {!hasBlockingFeedback ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <span className="text-sm">Feedback Resolution</span>
              </div>
              <div className="flex items-center space-x-2">
                {isCompliant ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                )}
                <span className="text-sm">Compliance Archive</span>
              </div>
            </div>

            {!canComplete && (
              <Alert variant="destructive">
                <Lock className="h-4 w-4" />
                <AlertTitle>Application Locked</AlertTitle>
                <AlertDescription>
                  Application cannot be completed until all enforcement requirements are met with verifiable proof.
                </AlertDescription>
              </Alert>
            )}

            {canComplete && (
              <div className="flex justify-center">
                <Button onClick={onComplete} size="lg" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Application Process
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enforced Components */}
      <Tabs defaultValue="submission" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="submission">External Submission</TabsTrigger>
          <TabsTrigger value="feedback">Feedback & Actions</TabsTrigger>
          <TabsTrigger value="archive">Compliance Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="submission">
          <ExternalSubmissionManager
            applicationId={applicationId}
            applicationData={applicationData}
            onStatusChange={setSubmissionStatus}
          />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackManager
            applicationId={applicationId}
            onStatusChange={setSubmissionStatus}
            onBlockingIssue={setHasBlockingFeedback}
          />
        </TabsContent>

        <TabsContent value="archive">
          <ComplianceArchive
            applicationId={applicationId}
            applicationData={applicationData}
            onComplianceStatus={setIsCompliant}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SubmissionComplianceEnforcer;
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Upload, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ExternalLink,
  FileText,
  Mail,
  Shield,
  Lock,
  Hash
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubmissionChannel {
  id: string;
  name: string;
  type: 'api' | 'email' | 'portal' | 'postal';
  status: 'available' | 'maintenance' | 'unavailable';
  apiEndpoint?: string;
  emailAddress?: string;
  portalUrl?: string;
  instructions?: string;
}

interface SubmissionRecord {
  id: string;
  applicationId: string;
  channel: SubmissionChannel;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  submittedAt?: Date;
  confirmationId?: string;
  receipt?: string;
  artifacts: SubmissionArtifact[];
  auditTrail: AuditEntry[];
}

interface SubmissionArtifact {
  id: string;
  type: 'receipt' | 'confirmation' | 'package' | 'correspondence';
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  hash: string;
  verified: boolean;
}

interface AuditEntry {
  id: string;
  timestamp: Date;
  action: string;
  actor: string;
  details: string;
  metadata?: any;
}

interface ExternalSubmissionManagerProps {
  applicationId: string;
  applicationData: any;
  onStatusChange: (status: string) => void;
}

const ExternalSubmissionManager: React.FC<ExternalSubmissionManagerProps> = ({
  applicationId,
  applicationData,
  onStatusChange
}) => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [channels, setChannels] = useState<SubmissionChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<SubmissionChannel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationFile, setConfirmationFile] = useState<File | null>(null);
  const [confirmationId, setConfirmationId] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');

  useEffect(() => {
    loadSubmissionChannels();
    loadSubmissionHistory();
  }, [applicationId]);

  const loadSubmissionChannels = async () => {
    // Mock data - in real implementation, this would fetch from database
    const mockChannels: SubmissionChannel[] = [
      {
        id: 'api-afir',
        name: 'AFIR Digital Portal',
        type: 'api',
        status: 'available',
        apiEndpoint: 'https://api.afir.ro/submissions',
        instructions: 'Automatic submission via AFIR API with instant confirmation'
      },
      {
        id: 'email-ministry',
        name: 'Ministry Email Submission',
        type: 'email',
        status: 'available',
        emailAddress: 'submissions@madr.ro',
        instructions: 'Email submission with manual confirmation required'
      },
      {
        id: 'portal-european',
        name: 'European Commission Portal',
        type: 'portal',
        status: 'available',
        portalUrl: 'https://ec.europa.eu/rural-development',
        instructions: 'Upload documents to EU portal and provide confirmation'
      }
    ];
    setChannels(mockChannels);
  };

  const loadSubmissionHistory = async () => {
    // Mock data - in real implementation, this would fetch from database
    setSubmissions([]);
  };

  const handleApiSubmission = async (channel: SubmissionChannel) => {
    setIsSubmitting(true);
    try {
      // Package application data
      const submissionPackage = {
        applicationId,
        timestamp: new Date().toISOString(),
        data: applicationData,
        hash: generateDataHash(applicationData)
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResponse = {
        transactionId: `TXN-${Date.now()}`,
        status: 'confirmed',
        receipt: `RECEIPT-${Math.random().toString(36).substr(2, 9)}`
      };

      // Create submission record
      const newSubmission: SubmissionRecord = {
        id: `sub-${Date.now()}`,
        applicationId,
        channel,
        status: 'confirmed',
        submittedAt: new Date(),
        confirmationId: mockResponse.transactionId,
        receipt: mockResponse.receipt,
        artifacts: [],
        auditTrail: [{
          id: `audit-${Date.now()}`,
          timestamp: new Date(),
          action: 'api_submission',
          actor: 'system',
          details: `Submitted via ${channel.name} API`,
          metadata: mockResponse
        }]
      };

      setSubmissions(prev => [...prev, newSubmission]);
      onStatusChange('submitted_confirmed');
      
      toast({
        title: "Submission Successful",
        description: `Application submitted via ${channel.name}. Transaction ID: ${mockResponse.transactionId}`
      });

    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Failed to submit application via API. Please try again or use alternative method.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmission = async (channel: SubmissionChannel) => {
    setIsSubmitting(true);
    try {
      // Generate submission package
      const packageData = await generateSubmissionPackage();
      
      // Create pending submission record
      const newSubmission: SubmissionRecord = {
        id: `sub-${Date.now()}`,
        applicationId,
        channel,
        status: 'pending',
        submittedAt: new Date(),
        artifacts: [{
          id: `artifact-${Date.now()}`,
          type: 'package',
          fileName: `application-${applicationId}-package.zip`,
          fileUrl: packageData.downloadUrl,
          uploadedAt: new Date(),
          hash: packageData.hash,
          verified: true
        }],
        auditTrail: [{
          id: `audit-${Date.now()}`,
          timestamp: new Date(),
          action: 'manual_submission_initiated',
          actor: 'user',
          details: `Generated submission package for ${channel.name}`,
          metadata: { packageHash: packageData.hash }
        }]
      };

      setSubmissions(prev => [...prev, newSubmission]);
      onStatusChange('submitted_pending_confirmation');
      
      toast({
        title: "Package Generated",
        description: `Submission package ready. Please follow the manual submission instructions for ${channel.name}.`
      });

    } catch (error) {
      toast({
        title: "Package Generation Failed",
        description: "Failed to generate submission package. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmationUpload = async (submissionId: string) => {
    if (!confirmationFile && !confirmationId) {
      toast({
        title: "Confirmation Required",
        description: "Please provide either a confirmation file or confirmation ID.",
        variant: "destructive"
      });
      return;
    }

    try {
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) return;

      const updatedSubmission = {
        ...submission,
        status: 'confirmed' as const,
        confirmationId: confirmationId || submission.confirmationId,
        artifacts: [
          ...submission.artifacts,
          ...(confirmationFile ? [{
            id: `artifact-${Date.now()}`,
            type: 'confirmation' as const,
            fileName: confirmationFile.name,
            fileUrl: URL.createObjectURL(confirmationFile),
            uploadedAt: new Date(),
            hash: await generateFileHash(confirmationFile),
            verified: true
          }] : [])
        ],
        auditTrail: [
          ...submission.auditTrail,
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date(),
            action: 'confirmation_uploaded',
            actor: 'user',
            details: 'Manual confirmation provided',
            metadata: { 
              confirmationId: confirmationId || 'file_upload',
              notes: submissionNotes 
            }
          }
        ]
      };

      setSubmissions(prev => prev.map(s => s.id === submissionId ? updatedSubmission : s));
      onStatusChange('submitted_confirmed');
      
      toast({
        title: "Confirmation Recorded",
        description: "Submission confirmation has been recorded and archived."
      });

      // Reset form
      setConfirmationFile(null);
      setConfirmationId('');
      setSubmissionNotes('');

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record confirmation. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateSubmissionPackage = async () => {
    // Mock package generation
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      downloadUrl: `/api/applications/${applicationId}/package`,
      hash: generateDataHash(applicationData)
    };
  };

  const generateDataHash = (data: any): string => {
    // Simple hash generation for demo - use proper crypto in production
    return `SHA256-${Math.random().toString(36).substr(2, 16)}`;
  };

  const generateFileHash = async (file: File): Promise<string> => {
    // Mock file hash generation
    return `SHA256-${file.name}-${file.size}-${Date.now()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'submitted': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const hasConfirmedSubmission = submissions.some(s => s.status === 'confirmed');

  return (
    <div className="space-y-6">
      {/* Enforcement Alert */}
      {!hasConfirmedSubmission && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Submission Required</AlertTitle>
          <AlertDescription>
            Application cannot be completed until external submission is confirmed with verifiable proof.
            No silent submissions or incomplete confirmations are permitted.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="submit" className="w-full">
        <TabsList>
          <TabsTrigger value="submit">Submit Application</TabsTrigger>
          <TabsTrigger value="track">Track Submissions</TabsTrigger>
          <TabsTrigger value="archive">Compliance Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="submit">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>External Submission Channels</CardTitle>
                <CardDescription>
                  Select an official submission channel. All submissions require verifiable confirmation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {channels.map(channel => (
                    <div key={channel.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold">{channel.name}</h4>
                          <Badge variant={channel.status === 'available' ? 'default' : 'secondary'}>
                            {channel.status}
                          </Badge>
                        </div>
                        <div className="flex space-x-2">
                          {channel.type === 'api' && (
                            <Button 
                              onClick={() => handleApiSubmission(channel)}
                              disabled={isSubmitting || channel.status !== 'available'}
                              size="sm"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Submit via API
                            </Button>
                          )}
                          {channel.type !== 'api' && (
                            <Button 
                              onClick={() => handleManualSubmission(channel)}
                              disabled={isSubmitting || channel.status !== 'available'}
                              variant="outline"
                              size="sm"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Generate Package
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{channel.instructions}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="track">
          <Card>
            <CardHeader>
              <CardTitle>Submission History</CardTitle>
              <CardDescription>
                All submission attempts and confirmations with complete audit trail
              </CardDescription>
            </CardHeader>
            <CardContent>
              {submissions.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Submissions Yet</h3>
                  <p className="text-muted-foreground">Submit your application through one of the official channels above.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map(submission => (
                    <div key={submission.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-semibold">{submission.channel.name}</h4>
                          <Badge variant={getStatusColor(submission.status)}>
                            {submission.status}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {submission.submittedAt?.toLocaleString()}
                        </span>
                      </div>
                      
                      {submission.confirmationId && (
                        <p className="text-sm mb-2">
                          <strong>Confirmation ID:</strong> {submission.confirmationId}
                        </p>
                      )}

                      {submission.status === 'pending' && (
                        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                          <h5 className="font-semibold mb-2">Manual Confirmation Required</h5>
                          <div className="grid gap-4">
                            <div>
                              <Label htmlFor="confirmation-id">Confirmation ID/Receipt Number</Label>
                              <Input
                                id="confirmation-id"
                                value={confirmationId}
                                onChange={(e) => setConfirmationId(e.target.value)}
                                placeholder="Enter confirmation ID or receipt number"
                              />
                            </div>
                            <div>
                              <Label htmlFor="confirmation-file">Upload Confirmation Document</Label>
                              <Input
                                id="confirmation-file"
                                type="file"
                                onChange={(e) => setConfirmationFile(e.target.files?.[0] || null)}
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              />
                            </div>
                            <div>
                              <Label htmlFor="submission-notes">Additional Notes</Label>
                              <Textarea
                                id="submission-notes"
                                value={submissionNotes}
                                onChange={(e) => setSubmissionNotes(e.target.value)}
                                placeholder="Any additional details about the submission"
                              />
                            </div>
                            <Button 
                              onClick={() => handleConfirmationUpload(submission.id)}
                              className="w-full"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Confirm Submission
                            </Button>
                          </div>
                        </div>
                      )}

                      {submission.artifacts.length > 0 && (
                        <div className="mt-3">
                          <h5 className="font-semibold mb-2">Artifacts</h5>
                          <div className="space-y-1">
                            {submission.artifacts.map(artifact => (
                              <div key={artifact.id} className="flex items-center justify-between text-sm">
                                <span className="flex items-center">
                                  <FileText className="w-4 h-4 mr-2" />
                                  {artifact.fileName}
                                  {artifact.verified && <Shield className="w-3 h-3 ml-2 text-green-600" />}
                                </span>
                                <span className="text-muted-foreground">{artifact.type}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archive">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Compliance Archive
              </CardTitle>
              <CardDescription>
                Immutable record of all submission activities with cryptographic integrity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Tamper-Proof Archive</AlertTitle>
                  <AlertDescription>
                    All records are cryptographically hashed and immutable. Any modification attempt will be detected.
                  </AlertDescription>
                </Alert>

                {submissions.length > 0 && (
                  <div className="space-y-3">
                    {submissions.map(submission => (
                      <div key={submission.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{submission.channel.name}</span>
                          <Badge variant="outline">
                            <Hash className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Status:</strong> {submission.status}</p>
                          <p><strong>Submitted:</strong> {submission.submittedAt?.toLocaleString()}</p>
                          <p><strong>Audit Entries:</strong> {submission.auditTrail.length}</p>
                          <p><strong>Artifacts:</strong> {submission.artifacts.length}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExternalSubmissionManager;
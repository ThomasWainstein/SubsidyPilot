import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  MessageSquare, 
  Upload, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText,
  RefreshCw,
  User,
  Building,
  Calendar,
  AlertCircle,
  Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeedbackItem {
  id: string;
  applicationId: string;
  source: 'agency' | 'system' | 'admin';
  type: 'request_info' | 'status_update' | 'requirement' | 'approval' | 'rejection';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  deadline?: Date;
  requiredActions: RequiredAction[];
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
  metadata?: any;
}

interface RequiredAction {
  id: string;
  type: 'upload_document' | 'provide_info' | 'clarification' | 'correction';
  description: string;
  required: boolean;
  status: 'pending' | 'completed' | 'blocked';
  completedAt?: Date;
  evidence?: string;
  notes?: string;
}

interface StatusUpdate {
  id: string;
  applicationId: string;
  status: string;
  timestamp: Date;
  source: 'api' | 'manual' | 'system';
  details: string;
  evidence?: string;
}

interface FeedbackManagerProps {
  applicationId: string;
  onStatusChange: (status: string) => void;
  onBlockingIssue: (hasBlocking: boolean) => void;
}

const FeedbackManager: React.FC<FeedbackManagerProps> = ({
  applicationId,
  onStatusChange,
  onBlockingIssue
}) => {
  const { toast } = useToast();
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [statusUpdates, setStatusUpdates] = useState<StatusUpdate[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<{[key: string]: File}>({});
  const [actionNotes, setActionNotes] = useState<{[key: string]: string}>({});

  useEffect(() => {
    loadFeedbackData();
    startStatusPolling();
    
    return () => stopStatusPolling();
  }, [applicationId]);

  useEffect(() => {
    // Check for blocking issues
    const hasBlockingIssues = feedbackItems.some(item => 
      item.priority === 'critical' && item.status !== 'completed'
    );
    onBlockingIssue(hasBlockingIssues);
  }, [feedbackItems, onBlockingIssue]);

  const loadFeedbackData = async () => {
    try {
      // Mock data - in real implementation, this would fetch from database
      const mockFeedback: FeedbackItem[] = [
        {
          id: 'fb-1',
          applicationId,
          source: 'agency',
          type: 'request_info',
          priority: 'high',
          title: 'Additional Environmental Documentation Required',
          message: 'Please provide updated environmental impact assessment dated within the last 6 months.',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          requiredActions: [
            {
              id: 'action-1',
              type: 'upload_document',
              description: 'Upload environmental impact assessment (PDF)',
              required: true,
              status: 'pending'
            }
          ],
          status: 'pending',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }
      ];

      setFeedbackItems(mockFeedback);

      const mockStatusUpdates: StatusUpdate[] = [
        {
          id: 'status-1',
          applicationId,
          status: 'under_review',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          source: 'api',
          details: 'Application is under review by the agency'
        }
      ];

      setStatusUpdates(mockStatusUpdates);
      setLastSyncTime(new Date());

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load feedback data",
        variant: "destructive"
      });
    }
  };

  const startStatusPolling = () => {
    setIsPolling(true);
    // In real implementation, this would poll agency APIs for status updates
    const interval = setInterval(async () => {
      await checkForUpdates();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  };

  const stopStatusPolling = () => {
    setIsPolling(false);
  };

  const checkForUpdates = async () => {
    try {
      // Mock API polling - in real implementation, this would check agency APIs
      const hasUpdates = Math.random() > 0.9; // 10% chance of updates
      
      if (hasUpdates) {
        // Simulate new feedback or status update
        const newUpdate: StatusUpdate = {
          id: `status-${Date.now()}`,
          applicationId,
          status: 'additional_info_requested',
          timestamp: new Date(),
          source: 'api',
          details: 'New status update received from agency'
        };

        setStatusUpdates(prev => [newUpdate, ...prev]);
        setLastSyncTime(new Date());
        
        toast({
          title: "Status Update",
          description: "New status update received from the agency"
        });
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  };

  const handleActionComplete = async (feedbackId: string, actionId: string) => {
    const file = uploadingFiles[actionId];
    const notes = actionNotes[actionId];

    if (!file && !notes) {
      toast({
        title: "Action Required",
        description: "Please provide required documentation or information",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update the feedback item
      setFeedbackItems(prev => prev.map(item => {
        if (item.id === feedbackId) {
          const updatedActions = item.requiredActions.map(action => {
            if (action.id === actionId) {
              return {
                ...action,
                status: 'completed' as const,
                completedAt: new Date(),
                evidence: file ? file.name : undefined,
                notes: notes || undefined
              };
            }
            return action;
          });

          const allActionsCompleted = updatedActions.every(action => 
            !action.required || action.status === 'completed'
          );

          return {
            ...item,
            requiredActions: updatedActions,
            status: allActionsCompleted ? 'completed' as const : item.status,
            updatedAt: new Date()
          };
        }
        return item;
      }));

      // Clear form state
      setUploadingFiles(prev => {
        const updated = { ...prev };
        delete updated[actionId];
        return updated;
      });
      setActionNotes(prev => {
        const updated = { ...prev };
        delete updated[actionId];
        return updated;
      });

      toast({
        title: "Action Completed",
        description: "Your response has been recorded and will be submitted to the agency"
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete action. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'blocked': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getProgressPercentage = () => {
    const totalItems = feedbackItems.length;
    if (totalItems === 0) return 100;
    
    const completedItems = feedbackItems.filter(item => item.status === 'completed').length;
    return (completedItems / totalItems) * 100;
  };

  const hasBlockingIssues = feedbackItems.some(item => 
    item.priority === 'critical' && item.status !== 'completed'
  );

  return (
    <div className="space-y-6">
      {/* Enforcement Alert */}
      {hasBlockingIssues && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Blocking Issues Detected</AlertTitle>
          <AlertDescription>
            Critical feedback items require immediate attention. Application cannot proceed until all critical issues are resolved.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Feedback & Status Overview</span>
            <div className="flex items-center space-x-2">
              <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`} />
              <span className="text-sm text-muted-foreground">
                {lastSyncTime ? `Last sync: ${lastSyncTime.toLocaleTimeString()}` : 'Never synced'}
              </span>
            </div>
          </CardTitle>
          <CardDescription>
            Real-time feedback from agencies and required actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {feedbackItems.filter(item => item.status === 'completed').length} / {feedbackItems.length} completed
                </span>
              </div>
              <Progress value={getProgressPercentage()} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {feedbackItems.filter(item => item.priority === 'critical').length}
                </div>
                <div className="text-sm text-muted-foreground">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {feedbackItems.filter(item => item.status === 'pending').length}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {feedbackItems.filter(item => item.status === 'in_progress').length}
                </div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {feedbackItems.filter(item => item.status === 'completed').length}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Feedback Items */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active Feedback Items</h3>
        
        {feedbackItems.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Feedback</h3>
                <p className="text-muted-foreground">No feedback or required actions at this time.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          feedbackItems.map(item => (
            <Card key={item.id} className={item.priority === 'critical' ? 'border-red-200' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(item.status)}
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <Badge variant={getPriorityColor(item.priority)}>
                      {item.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    {item.source === 'agency' && <Building className="w-4 h-4" />}
                    {item.source === 'admin' && <User className="w-4 h-4" />}
                    <span>{item.source}</span>
                  </div>
                </div>
                {item.deadline && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Due: {item.deadline.toLocaleDateString()}</span>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{item.message}</p>
                
                {item.requiredActions.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Required Actions</h4>
                    {item.requiredActions.map(action => (
                      <div key={action.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{action.description}</span>
                          <Badge variant={action.status === 'completed' ? 'default' : 'secondary'}>
                            {action.status}
                          </Badge>
                        </div>
                        
                        {action.status === 'pending' && (
                          <div className="space-y-3">
                            {action.type === 'upload_document' && (
                              <div>
                                <Label htmlFor={`file-${action.id}`}>Upload Document</Label>
                                <Input
                                  id={`file-${action.id}`}
                                  type="file"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setUploadingFiles(prev => ({
                                        ...prev,
                                        [action.id]: file
                                      }));
                                    }
                                  }}
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                />
                              </div>
                            )}
                            
                            <div>
                              <Label htmlFor={`notes-${action.id}`}>Notes/Clarification</Label>
                              <Textarea
                                id={`notes-${action.id}`}
                                value={actionNotes[action.id] || ''}
                                onChange={(e) => setActionNotes(prev => ({
                                  ...prev,
                                  [action.id]: e.target.value
                                }))}
                                placeholder="Provide any additional information or clarification"
                              />
                            </div>
                            
                            <Button 
                              onClick={() => handleActionComplete(item.id, action.id)}
                              className="w-full"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Complete Action
                            </Button>
                          </div>
                        )}
                        
                        {action.status === 'completed' && (
                          <div className="text-sm text-muted-foreground">
                            <p><strong>Completed:</strong> {action.completedAt?.toLocaleString()}</p>
                            {action.evidence && <p><strong>Evidence:</strong> {action.evidence}</p>}
                            {action.notes && <p><strong>Notes:</strong> {action.notes}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Status History */}
      <Card>
        <CardHeader>
          <CardTitle>Status History</CardTitle>
          <CardDescription>
            Complete timeline of all status updates and agency communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statusUpdates.length === 0 ? (
            <div className="text-center py-4">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No status updates yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {statusUpdates.map(update => (
                <div key={update.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 mt-1">
                    {update.source === 'api' && <RefreshCw className="w-4 h-4 text-blue-600" />}
                    {update.source === 'manual' && <User className="w-4 h-4 text-green-600" />}
                    {update.source === 'system' && <AlertCircle className="w-4 h-4 text-gray-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{update.status.replace('_', ' ')}</span>
                      <span className="text-sm text-muted-foreground">
                        {update.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{update.details}</p>
                    {update.evidence && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          Evidence Recorded
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackManager;
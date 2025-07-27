import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Play, 
  Pause, 
  Database, 
  Archive,
  AlertTriangle,
  CheckCircle,
  Clock,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BatchOperation {
  id: string;
  type: 'reprocess' | 'quarantine' | 'bulk_update' | 'cleanup';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  total_records: number;
  processed_records: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

interface BatchOperationsProps {
  onRefresh: () => void;
}

const BatchOperations: React.FC<BatchOperationsProps> = ({ onRefresh }) => {
  const { toast } = useToast();
  const [operations, setOperations] = useState<BatchOperation[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<{
    type: string;
    description: string;
    action: () => void;
  } | null>(null);

  const handleBatchReprocess = async () => {
    try {
      // In a real implementation, this would trigger the batch reprocessing
      toast({
        title: "Batch Reprocessing Started",
        description: "Processing all failed extractions...",
      });
      
      // Simulate adding a new operation
      const newOperation: BatchOperation = {
        id: `reprocess_${Date.now()}`,
        type: 'reprocess',
        status: 'running',
        progress: 0,
        total_records: 150,
        processed_records: 0,
        started_at: new Date().toISOString(),
      };
      
      setOperations(prev => [newOperation, ...prev]);
      onRefresh();
    } catch (error) {
      toast({
        title: "Failed to Start Batch Reprocessing",
        description: "An error occurred while starting the batch operation.",
        variant: "destructive",
      });
    }
  };

  const handleQuarantineRecords = async () => {
    try {
      toast({
        title: "Quarantine Started",
        description: "Moving problematic records to quarantine...",
      });
      
      const newOperation: BatchOperation = {
        id: `quarantine_${Date.now()}`,
        type: 'quarantine',
        status: 'running',
        progress: 0,
        total_records: 25,
        processed_records: 0,
        started_at: new Date().toISOString(),
      };
      
      setOperations(prev => [newOperation, ...prev]);
      onRefresh();
    } catch (error) {
      toast({
        title: "Failed to Start Quarantine",
        description: "An error occurred while starting quarantine operation.",
        variant: "destructive",
      });
    }
  };

  const handleBulkUpdate = async () => {
    try {
      toast({
        title: "Bulk Update Started",
        description: "Updating subsidy statuses...",
      });
      
      const newOperation: BatchOperation = {
        id: `bulk_update_${Date.now()}`,
        type: 'bulk_update',
        status: 'running',
        progress: 0,
        total_records: 500,
        processed_records: 0,
        started_at: new Date().toISOString(),
      };
      
      setOperations(prev => [newOperation, ...prev]);
      onRefresh();
    } catch (error) {
      toast({
        title: "Failed to Start Bulk Update",
        description: "An error occurred while starting bulk update.",
        variant: "destructive",
      });
    }
  };

  const confirmAndExecute = (type: string, description: string, action: () => void) => {
    setPendingOperation({ type, description, action });
    setShowConfirmDialog(true);
  };

  const executeOperation = () => {
    if (pendingOperation) {
      pendingOperation.action();
      setPendingOperation(null);
      setShowConfirmDialog(false);
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'reprocess': return RefreshCw;
      case 'quarantine': return Archive;
      case 'bulk_update': return Database;
      case 'cleanup': return RotateCcw;
      default: return Database;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'running': return Play;
      case 'completed': return CheckCircle;
      case 'failed': return AlertTriangle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'running': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm">
              <RefreshCw className="w-4 h-4 mr-2 text-blue-600" />
              Reprocess Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              size="sm"
              onClick={() => confirmAndExecute(
                'reprocess',
                'This will reprocess all failed extraction logs. This operation may take several minutes.',
                handleBatchReprocess
              )}
            >
              Start Reprocessing
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm">
              <Archive className="w-4 h-4 mr-2 text-orange-600" />
              Quarantine Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full" 
              size="sm"
              onClick={() => confirmAndExecute(
                'quarantine',
                'This will move problematic records to quarantine for manual review.',
                handleQuarantineRecords
              )}
            >
              Start Quarantine
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm">
              <Database className="w-4 h-4 mr-2 text-green-600" />
              Bulk Status Update
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full" 
              size="sm"
              onClick={() => confirmAndExecute(
                'bulk_update',
                'This will update the status of all pending subsidies.',
                handleBulkUpdate
              )}
            >
              Update Statuses
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-sm">
              <RotateCcw className="w-4 h-4 mr-2 text-purple-600" />
              Data Cleanup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full" 
              size="sm"
              disabled
            >
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Active Operations</CardTitle>
          <CardDescription>
            Monitor the progress of running batch operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No active operations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {operations.map((operation) => {
                const OperationIcon = getOperationIcon(operation.type);
                const StatusIcon = getStatusIcon(operation.status);
                const statusColor = getStatusColor(operation.status);
                
                return (
                  <div key={operation.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <OperationIcon className="w-5 h-5 text-primary" />
                        <div>
                          <h4 className="font-medium capitalize">
                            {operation.type.replace('_', ' ')}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {operation.processed_records} / {operation.total_records} records
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                        <Badge variant="outline" className="capitalize">
                          {operation.status}
                        </Badge>
                      </div>
                    </div>
                    
                    {operation.status === 'running' && (
                      <div className="space-y-2">
                        <Progress value={operation.progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {operation.progress}% complete
                        </p>
                      </div>
                    )}
                    
                    {operation.error_message && (
                      <Alert className="mt-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {operation.error_message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Batch Operation</DialogTitle>
            <DialogDescription>
              {pendingOperation?.description}
            </DialogDescription>
          </DialogHeader>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This operation cannot be undone. Please ensure you want to proceed.
            </AlertDescription>
          </Alert>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={executeOperation}>
              Confirm & Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchOperations;
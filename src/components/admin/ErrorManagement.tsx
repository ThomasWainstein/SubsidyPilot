import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertTriangle, 
  Edit, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  Filter,
  MessageSquare,
  User,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  created_at: string;
  metadata: any;
  raw_log_id?: string;
  stack_trace?: string;
  status?: 'pending' | 'in_progress' | 'resolved';
  assigned_to?: string;
  resolution_notes?: string;
}

interface ErrorManagementProps {
  errors: ErrorLog[];
  onRefresh: () => void;
}

const ErrorManagement: React.FC<ErrorManagementProps> = ({ errors, onRefresh }) => {
  const { toast } = useToast();
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingError, setEditingError] = useState<ErrorLog | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const filteredErrors = errors.filter(error => {
    const matchesSearch = error.error_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         error.error_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || error.error_type === filterType;
    const matchesStatus = filterStatus === 'all' || (error.status || 'pending') === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleUpdateError = async (errorId: string, updates: Partial<ErrorLog>) => {
    try {
      // In a real implementation, this would update the database
      toast({
        title: "Error Updated",
        description: "Error log has been updated successfully.",
      });
      setEditingError(null);
      onRefresh();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update error log.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string = 'pending') => {
    const configs = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      in_progress: { variant: 'default' as const, icon: AlertTriangle, color: 'text-blue-600' },
      resolved: { variant: 'secondary' as const, icon: CheckCircle, color: 'text-green-600' },
    };
    
    const config = configs[status as keyof typeof configs] || configs.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className={`w-3 h-3 ${config.color}`} />
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search errors by message or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="extraction">Extraction</SelectItem>
            <SelectItem value="validation">Validation</SelectItem>
            <SelectItem value="database">Database</SelectItem>
            <SelectItem value="api">API</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Error Logs ({filteredErrors.length})</span>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <Filter className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredErrors.map((error) => (
                <TableRow key={error.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {error.error_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate" title={error.error_message}>
                      {error.error_message}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(error.status)}</TableCell>
                  <TableCell>
                    {error.assigned_to ? (
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span className="text-sm">{error.assigned_to}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(error.created_at).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedError(error)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingError(error)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Error Detail Dialog */}
      <Dialog open={!!selectedError} onOpenChange={() => setSelectedError(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Error Details</DialogTitle>
            <DialogDescription>
              {selectedError?.error_type} - {selectedError?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedError && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-semibold">Error Type</Label>
                  <p className="text-sm">{selectedError.error_type}</p>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedError.status)}</div>
                </div>
              </div>
              
              <div>
                <Label className="font-semibold">Error Message</Label>
                <p className="text-sm bg-muted p-3 rounded mt-2">{selectedError.error_message}</p>
              </div>
              
              {selectedError.stack_trace && (
                <div>
                  <Label className="font-semibold">Stack Trace</Label>
                  <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-auto max-h-48">
                    {selectedError.stack_trace}
                  </pre>
                </div>
              )}
              
              {selectedError.metadata && (
                <div>
                  <Label className="font-semibold">Metadata</Label>
                  <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-auto max-h-32">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Error Dialog */}
      <Dialog open={!!editingError} onOpenChange={() => setEditingError(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Error</DialogTitle>
            <DialogDescription>
              Update the status and assignment of this error log
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select defaultValue={editingError?.status || 'pending'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="assigned_to">Assign To</Label>
              <Input
                placeholder="Employee email or name"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Resolution Notes</Label>
              <Textarea
                placeholder="Add notes about the resolution..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingError(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editingError) {
                  handleUpdateError(editingError.id, {
                    assigned_to: assignedTo,
                    resolution_notes: resolutionNotes
                  });
                }
              }}
            >
              Update Error
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ErrorManagement;
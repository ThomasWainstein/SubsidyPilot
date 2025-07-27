import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  MessageSquare, 
  Plus, 
  Edit, 
  Eye, 
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Tag,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  subsidy_id?: string;
  error_log_id?: string;
  tags: string[];
  comments: TicketComment[];
}

interface TicketComment {
  id: string;
  ticket_id: string;
  author: string;
  content: string;
  created_at: string;
}

interface TicketingSystemProps {
  onRefresh: () => void;
}

const TicketingSystem: React.FC<TicketingSystemProps> = ({ onRefresh }) => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: 'ticket_1',
      title: 'Extraction failure for subsidy EU-2024-001',
      description: 'AI extraction is failing consistently for this subsidy document',
      status: 'open',
      priority: 'high',
      created_by: 'system@agritool.com',
      created_at: '2024-01-27T10:00:00Z',
      updated_at: '2024-01-27T10:00:00Z',
      subsidy_id: 'subsidy_123',
      tags: ['extraction', 'ai', 'urgent'],
      comments: []
    }
  ]);
  
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigned_to: '',
    tags: '',
  });

  const [newComment, setNewComment] = useState('');

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateTicket = async () => {
    try {
      const ticket: Ticket = {
        id: `ticket_${Date.now()}`,
        title: newTicket.title,
        description: newTicket.description,
        status: 'open',
        priority: newTicket.priority as any,
        assigned_to: newTicket.assigned_to || undefined,
        created_by: 'current_user@agritool.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: newTicket.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        comments: []
      };
      
      setTickets(prev => [ticket, ...prev]);
      setNewTicket({ title: '', description: '', priority: 'medium', assigned_to: '', tags: '' });
      setShowCreateDialog(false);
      
      toast({
        title: "Ticket Created",
        description: "Support ticket has been created successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to Create Ticket",
        description: "An error occurred while creating the ticket.",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async () => {
    if (!selectedTicket || !newComment.trim()) return;
    
    try {
      const comment: TicketComment = {
        id: `comment_${Date.now()}`,
        ticket_id: selectedTicket.id,
        author: 'current_user@agritool.com',
        content: newComment,
        created_at: new Date().toISOString(),
      };
      
      setTickets(prev => prev.map(ticket => 
        ticket.id === selectedTicket.id 
          ? { ...ticket, comments: [...ticket.comments, comment] }
          : ticket
      ));
      
      setNewComment('');
      
      toast({
        title: "Comment Added",
        description: "Your comment has been added to the ticket.",
      });
    } catch (error) {
      toast({
        title: "Failed to Add Comment",
        description: "An error occurred while adding the comment.",
        variant: "destructive",
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    const configs = {
      low: { variant: 'secondary' as const, color: 'text-green-600' },
      medium: { variant: 'secondary' as const, color: 'text-yellow-600' },
      high: { variant: 'default' as const, color: 'text-orange-600' },
      urgent: { variant: 'destructive' as const, color: 'text-red-600' },
    };
    
    const config = configs[priority as keyof typeof configs] || configs.medium;
    
    return (
      <Badge variant={config.variant} className="capitalize">
        {priority}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      open: { variant: 'secondary' as const, icon: AlertTriangle },
      in_progress: { variant: 'default' as const, icon: Clock },
      resolved: { variant: 'secondary' as const, icon: CheckCircle },
      closed: { variant: 'outline' as const, icon: CheckCircle },
    };
    
    const config = configs[status as keyof typeof configs] || configs.open;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <Icon className="w-3 h-3" />
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Support Tickets</h3>
          <p className="text-sm text-muted-foreground">
            Manage and track support tickets and issues
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <div className="font-medium">{ticket.title}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        {ticket.description}
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        {ticket.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="w-2 h-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                  <TableCell>
                    {ticket.assigned_to ? (
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span className="text-sm">{ticket.assigned_to}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Handle edit
                        }}
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

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Create a new support ticket for tracking issues and tasks
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                placeholder="Brief description of the issue"
                value={newTicket.title}
                onChange={(e) => setNewTicket(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                placeholder="Detailed description of the issue..."
                value={newTicket.description}
                onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={newTicket.priority} 
                  onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="assigned_to">Assign To</Label>
                <Input
                  placeholder="Employee email"
                  value={newTicket.assigned_to}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, assigned_to: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input
                placeholder="Comma-separated tags (e.g., extraction, urgent, database)"
                value={newTicket.tags}
                onChange={(e) => setNewTicket(prev => ({ ...prev, tags: e.target.value }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicket}>
              Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.title}</DialogTitle>
            <DialogDescription>
              Ticket #{selectedTicket?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <Tabs defaultValue="details" className="w-full">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="comments">
                  Comments ({selectedTicket.comments.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedTicket.status)}</div>
                  </div>
                  <div>
                    <Label className="font-semibold">Priority</Label>
                    <div className="mt-1">{getPriorityBadge(selectedTicket.priority)}</div>
                  </div>
                </div>
                
                <div>
                  <Label className="font-semibold">Description</Label>
                  <p className="text-sm bg-muted p-3 rounded mt-2">{selectedTicket.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Created By</Label>
                    <p className="text-sm">{selectedTicket.created_by}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Assigned To</Label>
                    <p className="text-sm">{selectedTicket.assigned_to || 'Unassigned'}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="comments" className="space-y-4">
                <div className="space-y-4 max-h-60 overflow-y-auto">
                  {selectedTicket.comments.map((comment) => (
                    <div key={comment.id} className="border rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <Label>Add Comment</Label>
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Add Comment
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketingSystem;
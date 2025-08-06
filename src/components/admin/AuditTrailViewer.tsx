import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Search, Filter, Download } from 'lucide-react';

interface UserAction {
  id: string;
  user_id?: string | null;
  session_id?: string | null;
  action_type: string;
  resource_type: string;
  resource_id?: string | null;
  action_data: any;
  triggered_by: string;
  ip_address?: string | null;
  created_at: string;
}

export const AuditTrailViewer = () => {
  const [actions, setActions] = useState<UserAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchAuditTrail();
  }, []);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActions(data || []);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActions = actions.filter(action => {
    const matchesSearch = searchTerm === '' || 
      action.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.user_id && action.user_id.includes(searchTerm));
    
    const matchesFilter = filterType === 'all' || action.resource_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const getActionTypeColor = (actionType: string) => {
    if (actionType.includes('error') || actionType.includes('failed')) return 'destructive';
    if (actionType.includes('success') || actionType.includes('completed')) return 'default';
    if (actionType.includes('review') || actionType.includes('manual')) return 'secondary';
    return 'outline';
  };

  const getTriggeredByColor = (triggeredBy: string) => {
    switch (triggeredBy) {
      case 'user': return 'default';
      case 'system': return 'secondary';
      case 'scheduler': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Audit Trail
        </CardTitle>
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <Input
              placeholder="Search actions, users, or resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="all">All Resources</option>
            <option value="pipeline">Pipeline</option>
            <option value="document">Documents</option>
            <option value="subsidy">Subsidies</option>
            <option value="extraction">Extractions</option>
            <option value="database">Database</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>User/Session</TableHead>
                <TableHead>Triggered By</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActions.map((action) => (
                <TableRow key={action.id}>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(action.created_at), 'MMM dd, HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionTypeColor(action.action_type)}>
                      {action.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{action.resource_type}</span>
                      {action.resource_id && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {action.resource_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {action.user_id ? (
                        <span className="font-mono text-xs">
                          {action.user_id.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                      {action.session_id && (
                        <span className="text-xs text-muted-foreground">
                          {action.session_id.slice(0, 12)}...
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTriggeredByColor(action.triggered_by)}>
                      {action.triggered_by}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {Object.keys(action.action_data).length > 0 ? (
                        <details className="cursor-pointer">
                          <summary className="text-sm text-muted-foreground">
                            View details
                          </summary>
                          <pre className="text-xs mt-1 bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(action.action_data, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-muted-foreground text-sm">No details</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {filteredActions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No audit trail entries found matching your criteria.
          </div>
        )}
        
        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredActions.length} of {actions.length} total actions
        </div>
      </CardContent>
    </Card>
  );
};
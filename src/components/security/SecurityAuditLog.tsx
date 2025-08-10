import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdmin } from '@/contexts/AdminContext';
import { format } from 'date-fns';

interface SecurityEvent {
  id: string;
  event_type: string;
  user_id: string;
  target_user_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  event_data: any;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

const SecurityAuditLog: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    eventType: '',
    riskLevel: '',
    userId: ''
  });

  useEffect(() => {
    if (isAdmin && !adminLoading) {
      fetchSecurityEvents();
    }
  }, [isAdmin, adminLoading, filter]);

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter.eventType) {
        query = query.eq('event_type', filter.eventType);
      }
      if (filter.riskLevel) {
        query = query.eq('risk_level', filter.riskLevel);
      }
      if (filter.userId) {
        query = query.eq('user_id', filter.userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEvents((data || []) as SecurityEvent[]);
    } catch (error) {
      console.error('Error fetching security events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
      default:
        return 'outline';
    }
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Audit Log</CardTitle>
        <div className="flex gap-4 mt-4">
          <Input
            placeholder="Filter by user ID"
            value={filter.userId}
            onChange={(e) => setFilter({ ...filter, userId: e.target.value })}
            className="w-48"
          />
          <Select
            value={filter.eventType}
            onValueChange={(value) => setFilter({ ...filter, eventType: value })}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All events</SelectItem>
              <SelectItem value="user_login">User Login</SelectItem>
              <SelectItem value="user_logout">User Logout</SelectItem>
              <SelectItem value="role_assigned">Role Assigned</SelectItem>
              <SelectItem value="role_revoked">Role Revoked</SelectItem>
              <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filter.riskLevel}
            onValueChange={(value) => setFilter({ ...filter, riskLevel: value })}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All levels</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchSecurityEvents} variant="outline">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No security events found</p>
            ) : (
              events.map(event => (
                <div key={event.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{event.event_type}</span>
                      <Badge variant={getRiskLevelColor(event.risk_level)}>
                        {event.risk_level}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(event.created_at), 'PPpp')}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>User ID: {event.user_id}</p>
                      {event.target_user_id && <p>Target: {event.target_user_id}</p>}
                      {event.ip_address && <p>IP: {event.ip_address}</p>}
                    </div>
                    {event.event_data && Object.keys(event.event_data).length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-primary">
                          View details
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(event.event_data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityAuditLog;
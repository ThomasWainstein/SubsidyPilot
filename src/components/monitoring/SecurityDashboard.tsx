import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle, CheckCircle, Eye, Lock, Database, Server } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  event_type: string;
  user_id?: string;
  event_data: any;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  resolvedEvents: number;
  recentEvents: SecurityEvent[];
}

export const SecurityDashboard: React.FC = () => {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const loadSecurityMetrics = async () => {
    try {
      setLoading(true);

      // Get security events from the last 24 hours
      const { data: events, error: eventsError } = await supabase
        .from('security_events')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;

      const totalEvents = events?.length || 0;
      const criticalEvents = events?.filter(e => e.risk_level === 'critical').length || 0;
      const highEvents = events?.filter(e => e.risk_level === 'high').length || 0;
      const resolvedEvents = events?.filter(e => e.resolved_at).length || 0;

      setSecurityMetrics({
        totalEvents,
        criticalEvents,
        highEvents,
        resolvedEvents,
        recentEvents: (events?.slice(0, 10) || []) as SecurityEvent[]
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading security metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load security metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const logSecurityEvent = async (eventType: string, riskLevel: 'low' | 'medium' | 'high' | 'critical', eventData: any = {}) => {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          event_type: eventType,
          risk_level: riskLevel,
          event_data: eventData
        });

      if (error) throw error;

      // Refresh metrics after logging
      await loadSecurityMetrics();
      
      toast({
        title: "Security Event Logged",
        description: `${eventType} event has been recorded`,
      });
    } catch (error) {
      console.error('Error logging security event:', error);
      toast({
        title: "Error",
        description: "Failed to log security event",
        variant: "destructive",
      });
    }
  };

  const resolveSecurityEvent = async (eventId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('security_events')
        .update({
          resolved_at: new Date().toISOString(),
          resolution_notes: notes
        })
        .eq('id', eventId);

      if (error) throw error;

      await loadSecurityMetrics();
      
      toast({
        title: "Event Resolved",
        description: "Security event has been marked as resolved",
      });
    } catch (error) {
      console.error('Error resolving security event:', error);
      toast({
        title: "Error",
        description: "Failed to resolve security event",
        variant: "destructive",
      });
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
      case 'high':
        return AlertTriangle;
      case 'medium':
        return Eye;
      case 'low':
        return CheckCircle;
      default:
        return Shield;
    }
  };

  useEffect(() => {
    loadSecurityMetrics();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadSecurityMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading && !securityMetrics) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const resolutionRate = securityMetrics 
    ? Math.round((securityMetrics.resolvedEvents / Math.max(securityMetrics.totalEvents, 1)) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
        </div>
        <div className="flex items-center space-x-2">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={loadSecurityMetrics} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events (24h)</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityMetrics?.totalEvents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{securityMetrics?.criticalEvents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{securityMetrics?.highEvents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolutionRate}%</div>
            <Progress value={resolutionRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Security Actions</CardTitle>
          <CardDescription>Common security operations and monitoring tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              onClick={() => logSecurityEvent('manual_security_audit', 'low', { trigger: 'admin_dashboard' })}
              className="h-auto flex-col space-y-2 py-4"
            >
              <Eye className="h-6 w-6" />
              <span>Security Audit</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => logSecurityEvent('access_review', 'medium', { trigger: 'admin_review' })}
              className="h-auto flex-col space-y-2 py-4"
            >
              <Lock className="h-6 w-6" />
              <span>Access Review</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => logSecurityEvent('system_health_check', 'low', { trigger: 'manual_check' })}
              className="h-auto flex-col space-y-2 py-4"
            >
              <Server className="h-6 w-6" />
              <span>Health Check</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => logSecurityEvent('backup_verification', 'low', { trigger: 'manual_backup' })}
              className="h-auto flex-col space-y-2 py-4"
            >
              <Database className="h-6 w-6" />
              <span>Backup Check</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
          <CardDescription>Latest security-related activities and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {securityMetrics?.recentEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No security events in the last 24 hours</p>
              <p className="text-sm">This is good news - your system is secure!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {securityMetrics?.recentEvents.map((event) => {
                const RiskIcon = getRiskLevelIcon(event.risk_level);
                return (
                  <div key={event.id} className="flex items-start space-x-3 p-4 border rounded-lg">
                    <RiskIcon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{event.event_type.replace(/_/g, ' ').toUpperCase()}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getRiskLevelColor(event.risk_level) as any}>
                            {event.risk_level}
                          </Badge>
                          {event.resolved_at && (
                            <Badge variant="outline">Resolved</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                      {event.event_data && Object.keys(event.event_data).length > 0 && (
                        <div className="mt-2 text-sm">
                          <details className="cursor-pointer">
                            <summary>Event Details</summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(event.event_data, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                      {event.resolution_notes && (
                        <Alert className="mt-2">
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Resolution:</strong> {event.resolution_notes}
                          </AlertDescription>
                        </Alert>
                      )}
                      {!event.resolved_at && (event.risk_level === 'critical' || event.risk_level === 'high') && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mt-2"
                          onClick={() => {
                            const notes = prompt('Enter resolution notes:');
                            if (notes) {
                              resolveSecurityEvent(event.id, notes);
                            }
                          }}
                        >
                          Mark as Resolved
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
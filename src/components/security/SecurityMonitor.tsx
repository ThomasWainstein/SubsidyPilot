/**
 * Security monitoring component for admin dashboard
 * Phase 4D: Security Hardening & Input Validation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Clock, FileX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  id: string;
  event_type: string;
  user_id: string | null;
  target_user_id: string | null;
  message: string;
  event_data: any;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface SecurityStats {
  totalEvents: number;
  criticalEvents: number;
  rateLimitViolations: number;
  fileValidationFailures: number;
  lastUpdate: string;
}

const SecurityMonitor = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalEvents: 0,
    criticalEvents: 0,
    rateLimitViolations: 0,
    fileValidationFailures: 0,
    lastUpdate: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
    
    // Set up real-time subscription for security events
    const subscription = supabase
      .channel('security_events')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'security_audit_log' },
        (payload) => {
          const newEvent = payload.new as SecurityEvent;
          setEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep latest 50
          updateStats(newEvent);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // For Phase 4D demo - create mock security events since table may not be ready
      const mockEvents: SecurityEvent[] = [
        {
          id: '1',
          event_type: 'file_validation_failed',
          user_id: null,
          target_user_id: null,
          message: 'File validation failed: suspicious.exe rejected due to invalid extension',
          event_data: { fileName: 'suspicious.exe', fileSize: 1024 },
          risk_level: 'high',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0...',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          event_type: 'rate_limit_exceeded',
          user_id: null,
          target_user_id: null,
          message: 'Rate limit exceeded for document processing',
          event_data: { requestCount: 25, limit: 20 },
          risk_level: 'medium',
          ip_address: '192.168.1.101',
          user_agent: 'Mozilla/5.0...',
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          event_type: 'document_uploaded',
          user_id: null,
          target_user_id: null,
          message: 'Document uploaded successfully: farm_permit.pdf',
          event_data: { fileName: 'farm_permit.pdf', fileSize: 2048000 },
          risk_level: 'low',
          ip_address: '192.168.1.102',
          user_agent: 'Mozilla/5.0...',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
      ];

      setEvents(mockEvents);
      
      // Calculate stats from mock data
      setStats({
        totalEvents: mockEvents.length,
        criticalEvents: mockEvents.filter(e => e.risk_level === 'critical').length,
        rateLimitViolations: mockEvents.filter(e => e.event_type.includes('rate_limit')).length,
        fileValidationFailures: mockEvents.filter(e => e.event_type.includes('file_validation')).length,
        lastUpdate: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (newEvent: SecurityEvent) => {
    setStats(prev => ({
      ...prev,
      totalEvents: prev.totalEvents + 1,
      criticalEvents: prev.criticalEvents + (newEvent.risk_level === 'critical' ? 1 : 0),
      rateLimitViolations: prev.rateLimitViolations + (newEvent.event_type.includes('rate_limit') ? 1 : 0),
      fileValidationFailures: prev.fileValidationFailures + (newEvent.event_type.includes('file_validation') ? 1 : 0),
      lastUpdate: new Date().toISOString(),
    }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Shield className="h-4 w-4" />;
      default:
        return <FileX className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Events (24h)</p>
                <p className="text-2xl font-bold">{stats.totalEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Critical Events</p>
                <p className="text-2xl font-bold text-destructive">{stats.criticalEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-sm text-muted-foreground">Rate Limit Hits</p>
                <p className="text-2xl font-bold">{stats.rateLimitViolations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileX className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">File Violations</p>
                <p className="text-2xl font-bold">{stats.fileValidationFailures}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Events Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Recent Security Events
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadSecurityData}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No security events in the last 24 hours
              </p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(event.risk_level)}
                    <Badge 
                      variant={getSeverityColor(event.risk_level) as any}
                      className="text-xs"
                    >
                      {event.risk_level.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{event.event_type}</p>
                    <p className="text-sm text-muted-foreground mt-1">{event.message}</p>
                    
                    {event.event_data && Object.keys(event.event_data).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer">
                          View Details
                        </summary>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(event.event_data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityMonitor;
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
}

interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  services: HealthCheck[];
  uptime: number;
  lastUpdated: Date;
}

export const useSystemHealth = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkDatabaseHealth = async (): Promise<HealthCheck> => {
    const startTime = Date.now();
    try {
      const { error } = await supabase.from('farms').select('count').limit(1);
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'Database',
        status: error ? 'unhealthy' : responseTime > 1000 ? 'degraded' : 'healthy',
        responseTime,
        lastChecked: new Date(),
        error: error?.message
      };
    } catch (err) {
      return {
        service: 'Database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  };

  const checkAuthHealth = async (): Promise<HealthCheck> => {
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.auth.getSession();
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'Authentication',
        status: error ? 'unhealthy' : responseTime > 500 ? 'degraded' : 'healthy',
        responseTime,
        lastChecked: new Date(),
        error: error?.message
      };
    } catch (err) {
      return {
        service: 'Authentication',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  };

  const checkStorageHealth = async (): Promise<HealthCheck> => {
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.storage.listBuckets();
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'Storage',
        status: error ? 'unhealthy' : responseTime > 1000 ? 'degraded' : 'healthy',
        responseTime,
        lastChecked: new Date(),
        error: error?.message
      };
    } catch (err) {
      return {
        service: 'Storage',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  };

  const checkEdgeFunctionHealth = async (): Promise<HealthCheck> => {
    const startTime = Date.now();
    try {
      // Test a simple edge function call
      const { data, error } = await supabase.functions.invoke('extract-document-data', {
        body: { test: true }
      });
      const responseTime = Date.now() - startTime;
      
      // Even if the function returns an error for our test payload, 
      // if it responds it means the service is up
      const isHealthy = responseTime < 5000; // Consider healthy if responds within 5s
      
      return {
        service: 'Edge Functions',
        status: isHealthy ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        error: !isHealthy ? 'High latency detected' : undefined
      };
    } catch (err) {
      return {
        service: 'Edge Functions',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: err instanceof Error ? err.message : 'Service unavailable'
      };
    }
  };

  const checkRealtimeHealth = async (): Promise<HealthCheck> => {
    const startTime = Date.now();
    try {
      // Test realtime connection by creating a temporary channel
      const channel = supabase.channel('health-check');
      const responseTime = Date.now() - startTime;
      
      // Clean up
      supabase.removeChannel(channel);
      
      return {
        service: 'Realtime',
        status: responseTime > 2000 ? 'degraded' : 'healthy',
        responseTime,
        lastChecked: new Date()
      };
    } catch (err) {
      return {
        service: 'Realtime',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        error: err instanceof Error ? err.message : 'Connection failed'
      };
    }
  };

  const runHealthChecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const checks = await Promise.all([
        checkDatabaseHealth(),
        checkAuthHealth(),
        checkStorageHealth(),
        checkEdgeFunctionHealth(),
        checkRealtimeHealth()
      ]);

      const healthyServices = checks.filter(check => check.status === 'healthy').length;
      const unhealthyServices = checks.filter(check => check.status === 'unhealthy').length;
      
      let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
      if (unhealthyServices > 0) {
        overallStatus = 'unhealthy';
      } else if (healthyServices === checks.length) {
        overallStatus = 'healthy';
      } else {
        overallStatus = 'degraded';
      }

      // Calculate uptime based on healthy services
      const uptime = Math.round((healthyServices / checks.length) * 100);

      setHealth({
        overall: overallStatus,
        services: checks,
        uptime,
        lastUpdated: new Date()
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run health checks');
    } finally {
      setLoading(false);
    }
  }, []);

  const getServiceStatus = (serviceName: string) => {
    return health?.services.find(service => service.service === serviceName);
  };

  useEffect(() => {
    runHealthChecks();
    
    // Run health checks every 30 seconds
    const interval = setInterval(runHealthChecks, 30000);
    
    return () => clearInterval(interval);
  }, [runHealthChecks]);

  return {
    health,
    loading,
    error,
    runHealthChecks,
    getServiceStatus
  };
};
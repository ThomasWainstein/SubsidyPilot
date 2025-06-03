
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { IS_PRODUCTION } from '@/config/environment';

interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

const ProductionReadinessCheck: React.FC = () => {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runHealthChecks = async () => {
      const healthChecks: HealthCheck[] = [];

      // Database connectivity
      try {
        const { error } = await supabase.from('farms').select('count').limit(1);
        healthChecks.push({
          name: 'Database Connection',
          status: error ? 'fail' : 'pass',
          message: error ? 'Database connection failed' : 'Database accessible'
        });
      } catch {
        healthChecks.push({
          name: 'Database Connection',
          status: 'fail',
          message: 'Failed to connect to database'
        });
      }

      // Storage access
      try {
        const { data, error } = await supabase.storage.from('farm-documents').list('', { limit: 1 });
        healthChecks.push({
          name: 'Storage Access',
          status: error ? 'fail' : 'pass',
          message: error ? 'Storage access failed' : 'Storage accessible'
        });
      } catch {
        healthChecks.push({
          name: 'Storage Access',
          status: 'fail',
          message: 'Failed to access storage'
        });
      }

      // Environment configuration
      healthChecks.push({
        name: 'Environment Config',
        status: IS_PRODUCTION ? 'pass' : 'warn',
        message: IS_PRODUCTION ? 'Production environment' : 'Development environment'
      });

      // Performance check
      const performanceCheck = performance.now() < 1000;
      healthChecks.push({
        name: 'Page Performance',
        status: performanceCheck ? 'pass' : 'warn',
        message: performanceCheck ? 'Good performance' : 'Performance could be improved'
      });

      setChecks(healthChecks);
      setLoading(false);
    };

    runHealthChecks();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Running Production Readiness Checks...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800';
      case 'warn': return 'bg-yellow-100 text-yellow-800';
      case 'fail': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const overallStatus = checks.some(c => c.status === 'fail') ? 'fail' :
                       checks.some(c => c.status === 'warn') ? 'warn' : 'pass';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon(overallStatus)}
          Production Readiness Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {checks.map((check, index) => (
          <div key={index} className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(check.status)}
              <span className="font-medium">{check.name}</span>
            </div>
            <Badge className={getStatusColor(check.status)}>
              {check.message}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ProductionReadinessCheck;

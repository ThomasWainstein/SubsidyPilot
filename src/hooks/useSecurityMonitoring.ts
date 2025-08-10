import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Security monitoring hook to track and log security-relevant events
 */
export const useSecurityMonitoring = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Log successful login
    const logSecurityEvent = async (eventType: string, riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low', eventData: any = {}) => {
      try {
        await supabase.rpc('log_security_event', {
          _event_type: eventType,
          _event_data: eventData,
          _risk_level: riskLevel
        });
      } catch (error) {
        console.error('Failed to log security event:', error);
      }
    };

    // Log login event
    logSecurityEvent('user_login', 'low', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer
    });

    // Monitor for suspicious activity patterns
    const monitorActivity = () => {
      // Track rapid page changes (potential automation)
      let pageChangeCount = 0;
      const pageChangeTimer = setInterval(() => {
        pageChangeCount = 0;
      }, 60000); // Reset every minute

      const handleVisibilityChange = () => {
        pageChangeCount++;
        if (pageChangeCount > 10) {
          logSecurityEvent('suspicious_activity', 'medium', {
            type: 'rapid_page_changes',
            count: pageChangeCount,
            timestamp: new Date().toISOString()
          });
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Track failed API calls (potential enumeration attacks)
      let apiFailureCount = 0;
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const response = await originalFetch(...args);
        
        if (!response.ok && response.status >= 400 && response.status < 500) {
          apiFailureCount++;
          if (apiFailureCount > 5) {
            logSecurityEvent('suspicious_activity', 'high', {
              type: 'repeated_api_failures',
              count: apiFailureCount,
              status: response.status,
              url: response.url,
              timestamp: new Date().toISOString()
            });
          }
        }

        return response;
      };

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(pageChangeTimer);
        window.fetch = originalFetch;
      };
    };

    const cleanup = monitorActivity();

    return () => {
      // Log logout event
      logSecurityEvent('user_logout', 'low', {
        sessionDuration: Date.now() - (user?.created_at ? new Date(user.created_at).getTime() : Date.now()),
        timestamp: new Date().toISOString()
      });
      
      cleanup();
    };
  }, [user]);

  return null;
};
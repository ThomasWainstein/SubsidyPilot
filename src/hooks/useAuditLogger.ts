import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Simple hook that gets user from Supabase auth
const useAuth = () => {
  // In a real implementation, this would come from your auth context
  // For now, we'll get it directly from Supabase
  return { user: null }; // This should be replaced with actual auth context
};

export interface UserAction {
  actionType: string;
  resourceType: string;
  resourceId?: string;
  actionData?: Record<string, any>;
  triggeredBy?: 'user' | 'system' | 'scheduler' | 'webhook';
}

export const useAuditLogger = () => {
  const { user } = useAuth();

  const logAction = useCallback(async (action: UserAction) => {
    try {
      // Generate session ID if not provided
      const sessionId = sessionStorage.getItem('session_id') || `session-${Date.now()}`;
      if (!sessionStorage.getItem('session_id')) {
        sessionStorage.setItem('session_id', sessionId);
      }

      const { error } = await supabase.from('user_actions').insert({
        user_id: user?.id || null,
        session_id: sessionId,
        action_type: action.actionType,
        resource_type: action.resourceType,
        resource_id: action.resourceId,
        action_data: action.actionData || {},
        triggered_by: action.triggeredBy || 'user',
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent
      });

      if (error) {
        console.error('Failed to log user action:', error);
      }
    } catch (error) {
      console.error('Error logging user action:', error);
    }
  }, [user?.id]);

  const logPipelineAction = useCallback((
    actionType: string,
    resourceId?: string,
    additionalData?: Record<string, any>
  ) => {
    return logAction({
      actionType,
      resourceType: 'pipeline',
      resourceId,
      actionData: additionalData,
      triggeredBy: 'user'
    });
  }, [logAction]);

  const logDocumentAction = useCallback((
    actionType: string,
    documentId: string,
    additionalData?: Record<string, any>
  ) => {
    return logAction({
      actionType,
      resourceType: 'document',
      resourceId: documentId,
      actionData: additionalData,
      triggeredBy: 'user'
    });
  }, [logAction]);

  const logSubsidyAction = useCallback((
    actionType: string,
    subsidyId: string,
    additionalData?: Record<string, any>
  ) => {
    return logAction({
      actionType,
      resourceType: 'subsidy',
      resourceId: subsidyId,
      actionData: additionalData,
      triggeredBy: 'user'
    });
  }, [logAction]);

  return {
    logAction,
    logPipelineAction,
    logDocumentAction,
    logSubsidyAction
  };
};

async function getClientIP(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
}
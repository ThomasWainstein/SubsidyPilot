import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Secure authentication hook that provides safe access to user data and roles
 * Replaces deprecated getIsAdmin function with database-driven role checking
 */
export const useSecureAuth = () => {
  const { user, session, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading, userRoles } = useAdmin();

  const loading = authLoading || adminLoading;

  /**
   * Check if user has a specific role using database RPC
   */
  const hasRole = async (role: 'user' | 'admin' | 'moderator' | 'qa_reviewer'): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: role
      });
      
      if (error) {
        console.error('Error checking user role:', error);
        return false;
      }
      
      return data || false;
    } catch (error) {
      console.error('Error in hasRole check:', error);
      return false;
    }
  };

  /**
   * Check if current user is admin using secure database function
   */
  const checkIsAdmin = async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data, error } = await supabase.rpc('is_current_user_admin');
      
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      
      return data || false;
    } catch (error) {
      console.error('Error in admin check:', error);
      return false;
    }
  };

  return {
    user,
    session,
    loading,
    isAdmin,
    userRoles,
    hasRole,
    checkIsAdmin,
    isAuthenticated: !!user && !!session,
  };
};
import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminState {
  isAdmin: boolean;
  loading: boolean;
  userRoles: string[];
  checkingRole: boolean;
}

interface AdminContextType extends AdminState {
  checkAdminStatus: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider = ({ children }: AdminProviderProps) => {
  const [state, setState] = useState<AdminState>({
    isAdmin: false,
    loading: true,
    userRoles: [],
    checkingRole: false
  });

  const checkAdminStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, checkingRole: true }));
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setState(prev => ({ 
          ...prev, 
          isAdmin: false, 
          userRoles: [], 
          loading: false,
          checkingRole: false 
        }));
        return;
      }

      // Check user roles using the new server-side function
      const { data: isAdminResult, error: adminError } = await supabase
        .rpc('is_admin', { _user_id: user.id });

      if (adminError) {
        console.error('Error checking admin status:', adminError);
        setState(prev => ({ 
          ...prev, 
          isAdmin: false, 
          userRoles: [], 
          loading: false,
          checkingRole: false 
        }));
        return;
      }

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const roles = rolesError ? [] : userRoles.map(r => r.role);

      setState(prev => ({
        ...prev,
        isAdmin: isAdminResult || false,
        userRoles: roles,
        loading: false,
        checkingRole: false
      }));

    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
      setState(prev => ({ 
        ...prev, 
        isAdmin: false, 
        userRoles: [], 
        loading: false,
        checkingRole: false 
      }));
    }
  }, []);

  const refreshRoles = useCallback(async () => {
    await checkAdminStatus();
  }, [checkAdminStatus]);

  useEffect(() => {
    // Initial check
    checkAdminStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // Defer the check to avoid potential auth deadlocks
        setTimeout(() => {
          checkAdminStatus();
        }, 100);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  const contextValue: AdminContextType = {
    ...state,
    checkAdminStatus,
    refreshRoles
  };

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

// Higher-order component for admin-only routes
export const withAdminAuth = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const WrappedComponent = (props: P) => {
    const { isAdmin, loading } = useAdmin();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You need admin privileges to access this area.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withAdminAuth(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};
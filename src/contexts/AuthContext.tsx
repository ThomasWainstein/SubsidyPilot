
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { prodLogger } from '@/utils/productionLogger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    prodLogger.debug('AuthProvider: Setting up auth state listener');
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        prodLogger.debug('AuthProvider: Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      prodLogger.debug('AuthProvider: Initial session:', session?.user?.email, error);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Fallback timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      prodLogger.debug('AuthProvider: Timeout reached, setting loading to false');
      setLoading(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signOut = async () => {
    try {
      prodLogger.debug('AuthProvider: Signing out');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      prodLogger.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  prodLogger.debug('AuthProvider: Rendering with state:', { hasUser: !!user, loading });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

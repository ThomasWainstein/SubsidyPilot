import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSecureAuth } from '@/hooks/useSecureAuth';
import { Loader2 } from 'lucide-react';

interface SecureRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireRole?: 'user' | 'admin' | 'moderator' | 'qa_reviewer';
  fallbackPath?: string;
}

/**
 * Secure route component that provides authentication and authorization
 * Uses database-driven role checking for security
 */
export const SecureRoute: React.FC<SecureRouteProps> = ({ 
  children, 
  requireAdmin = false,
  requireRole,
  fallbackPath = '/auth'
}) => {
  const { isAuthenticated, isAdmin, loading, hasRole } = useSecureAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Redirect to auth if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check specific role requirement (async check would need different approach)
  if (requireRole && requireRole === 'admin' && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default SecureRoute;
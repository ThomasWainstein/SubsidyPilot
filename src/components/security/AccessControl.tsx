
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';

interface AccessControlProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'consultant' | 'farmer';
  farmId?: string;
  fallback?: React.ReactNode;
}

const AccessControl: React.FC<AccessControlProps> = ({ 
  children, 
  requiredRole, 
  farmId, 
  fallback = null 
}) => {
  const { user } = useAuth();
  const { isAdmin, loading } = useAdmin();
  
  if (!user || loading) {
    return <>{fallback}</>;
  }

  // Admin access - use secure AdminContext
  if (requiredRole === 'admin' && !isAdmin) {
    return <>{fallback}</>;
  }

  // Role-based access using database-driven roles
  // All authenticated users have basic access unless restricted by admin requirement
  
  return <>{children}</>;
};

export default AccessControl;

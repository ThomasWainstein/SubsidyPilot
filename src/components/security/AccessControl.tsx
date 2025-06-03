
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getIsAdmin } from '@/config/environment';

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
  
  if (!user) {
    return <>{fallback}</>;
  }

  // Admin access
  if (requiredRole === 'admin' && !getIsAdmin(user)) {
    return <>{fallback}</>;
  }

  // Role-based access will be extended when user roles are implemented
  // For now, all authenticated users have farmer access
  
  return <>{children}</>;
};

export default AccessControl;

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { prodLogger } from '@/utils/productionLogger';

export type UserRole = 'farmer' | 'consultant' | 'organization' | 'admin';

interface RoleContextType {
  currentRole: UserRole;
  switchRole: (role: UserRole) => void;
  isRoleSwitchingEnabled: boolean;
  availableRoles: UserRole[];
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

interface RoleProviderProps {
  children: ReactNode;
}

export const RoleProvider: React.FC<RoleProviderProps> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('farmer');
  
  // In beta/testing: all roles available. In production: based on user permissions
  const isRoleSwitchingEnabled = true; // TODO: Make this configurable
  const availableRoles: UserRole[] = ['farmer', 'consultant', 'organization', 'admin'];

  // Load saved role from localStorage on mount
  useEffect(() => {
    const savedRole = localStorage.getItem('agritool-current-role');
    if (savedRole && availableRoles.includes(savedRole as UserRole)) {
      setCurrentRole(savedRole as UserRole);
    }
  }, []);

  const switchRole = (role: UserRole) => {
    if (!availableRoles.includes(role)) {
      prodLogger.warn(`Role ${role} not available for current user`);
      return;
    }

    setCurrentRole(role);
    localStorage.setItem('agritool-current-role', role);
    
    // Log role switch for beta/testing
    prodLogger.debug(`Role switched to: ${role}`);
    
    // Trigger any additional role change effects here
    // e.g., analytics tracking, state reset, etc.
  };

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        switchRole,
        isRoleSwitchingEnabled,
        availableRoles,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};
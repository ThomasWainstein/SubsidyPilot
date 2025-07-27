import React from 'react';
import { useRole, UserRole } from '@/contexts/RoleContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, User, Users, Building2, Shield } from 'lucide-react';

const roleConfig = {
  farmer: {
    label: 'Farmer',
    icon: User,
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  consultant: {
    label: 'Consultant',
    icon: Users,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  organization: {
    label: 'Organization',
    icon: Building2,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'bg-red-100 text-red-800 border-red-200',
  },
};

const RoleSwitcher = () => {
  const { currentRole, switchRole, isRoleSwitchingEnabled, availableRoles } = useRole();

  if (!isRoleSwitchingEnabled) {
    return null;
  }

  const currentConfig = roleConfig[currentRole];
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="secondary" className={`${currentConfig.color} font-medium`}>
        <CurrentIcon className="w-3 h-3 mr-1" />
        {currentConfig.label} Mode
      </Badge>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs">
            Switch Role
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {availableRoles.map((role) => {
            const config = roleConfig[role];
            const Icon = config.icon;
            const isActive = role === currentRole;
            
            return (
              <DropdownMenuItem
                key={role}
                onClick={() => switchRole(role)}
                className={`cursor-pointer ${isActive ? 'bg-muted' : ''}`}
              >
                <Icon className="w-4 h-4 mr-2" />
                <span className="flex-1">{config.label}</span>
                {isActive && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Active
                  </Badge>
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default RoleSwitcher;
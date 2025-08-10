import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';

interface UserWithRoles {
  id: string;
  email: string;
  roles: string[];
}

const UserRoleManager: React.FC = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningRole, setAssigningRole] = useState<string | null>(null);

  // Available roles from the database enum
  const availableRoles = ['admin', 'moderator', 'user', 'qa_reviewer'] as const;

  useEffect(() => {
    if (isAdmin && !adminLoading) {
      fetchUsersWithRoles();
    }
  }, [isAdmin, adminLoading]);

  const fetchUsersWithRoles = async () => {
    try {
      setLoading(true);
      
      // Get all user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email');

      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles = profiles?.map(profile => ({
        id: profile.id,
        email: profile.email,
        roles: userRoles?.filter(role => role.user_id === profile.id).map(role => role.role) || []
      })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users and roles');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async (userId: string, role: string) => {
    try {
      setAssigningRole(`${userId}-${role}`);
      
      const { error } = await supabase.rpc('assign_user_role', {
        _user_id: userId,
        _role: role as 'admin' | 'moderator' | 'user' | 'qa_reviewer'
      });

      if (error) throw error;

      toast.success(`Role ${role} assigned successfully`);
      await fetchUsersWithRoles();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast.error(error.message || 'Failed to assign role');
    } finally {
      setAssigningRole(null);
    }
  };

  const handleRevokeRole = async (userId: string, role: string) => {
    try {
      setAssigningRole(`${userId}-${role}-revoke`);
      
      const { error } = await supabase.rpc('revoke_user_role', {
        _user_id: userId,
        _role: role as 'admin' | 'moderator' | 'user' | 'qa_reviewer'
      });

      if (error) throw error;

      toast.success(`Role ${role} revoked successfully`);
      await fetchUsersWithRoles();
    } catch (error: any) {
      console.error('Error revoking role:', error);
      toast.error(error.message || 'Failed to revoke role');
    } finally {
      setAssigningRole(null);
    }
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Access denied. Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Role Management</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{user.email}</p>
                  <div className="flex gap-2 mt-1">
                    {user.roles.map(role => (
                      <span
                        key={role}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                      >
                        {role}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleRevokeRole(user.id, role)}
                          disabled={assigningRole === `${user.id}-${role}-revoke`}
                        >
                          ×
                        </Button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select onValueChange={(role) => handleAssignRole(user.id, role)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Add role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles
                        .filter(role => !user.roles.includes(role))
                        .map(role => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserRoleManager;
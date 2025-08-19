import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/contexts/AdminContext';
import { useRole } from '@/contexts/RoleContext';
import { Settings } from 'lucide-react';

const AdminPanelLink: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const { currentRole } = useRole();

  if (loading || !isAdmin || currentRole !== 'admin') {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigate('/admin')}
      className="flex items-center gap-2"
    >
      <Settings className="h-4 w-4" />
      Admin Dashboard
    </Button>
  );
};

export default AdminPanelLink;
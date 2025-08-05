import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useRole } from '@/contexts/RoleContext';
import { Settings } from 'lucide-react';

const AdminPanelLink: React.FC = () => {
  const navigate = useNavigate();
  const { currentRole } = useRole();

  if (currentRole !== 'admin') {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigate('/admin-panel')}
      className="flex items-center gap-2"
    >
      <Settings className="h-4 w-4" />
      Admin Tools
    </Button>
  );
};

export default AdminPanelLink;
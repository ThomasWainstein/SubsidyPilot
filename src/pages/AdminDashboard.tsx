import React from 'react';
import { ApiSyncDashboard } from '@/components/admin/ApiSyncDashboard';

export const AdminDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <ApiSyncDashboard />
      </div>
    </div>
  );
};

export default AdminDashboard;

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import Navbar from '@/components/Navbar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatusDashboard } from '@/components/admin/StatusDashboard';
import EnhancedSubsidyManagement from '@/components/admin/EnhancedSubsidyManagement';
import EnhancedImportManagement from '@/components/admin/EnhancedImportManagement';
import SubsidyTitleImprover from '@/components/admin/SubsidyTitleImprover';
import CanonicalValidationDashboard from '@/components/admin/CanonicalValidationDashboard';
import EnhancedDualPipelineManager from '@/components/admin/EnhancedDualPipelineManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FEATURES, IS_PRODUCTION } from '@/config/environment';

const AdminPage = () => {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const isAdmin = currentRole === 'admin';

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p>You must be logged in to access the admin panel.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p>You don't have permission to access the admin panel.</p>
              <p className="text-sm text-gray-500 mt-2">
                Switch to Admin role using the "Switch Role" button in the top navigation.
              </p>
              <p className="text-xs text-blue-500 mt-2">
                Current role: {currentRole}. Required role: admin.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <AdminHeader 
        title="Admin Dashboard"
        subtitle="Manage subsidies, farms, and system settings with enhanced tools and monitoring"
      />
      <main className="flex-grow py-6 px-4">
        <div className="container mx-auto space-y-6">
          
          {/* Development Environment Notice */}
          {!IS_PRODUCTION && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="font-medium">Development Environment</span>
                  <span className="text-sm">Additional features and debugging tools enabled</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Status Dashboard */}
          <StatusDashboard />

          {/* Main Admin Tabs */}
          <Tabs defaultValue="pipeline" className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-12">
              <TabsTrigger value="pipeline" className="flex items-center gap-2">
                🔄 Pipeline
              </TabsTrigger>
              <TabsTrigger value="subsidies" className="flex items-center gap-2">
                📋 Subsidies
              </TabsTrigger>
              <TabsTrigger value="validation" className="flex items-center gap-2">
                ✅ Validation
              </TabsTrigger>
              <TabsTrigger value="quality" className="flex items-center gap-2">
                🔧 Quality
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-2">
                📤 Import
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pipeline" className="mt-6">
              <EnhancedDualPipelineManager />
            </TabsContent>
            
            <TabsContent value="subsidies" className="mt-6">
              <EnhancedSubsidyManagement />
            </TabsContent>
            
            <TabsContent value="validation" className="mt-6">
              <CanonicalValidationDashboard />
            </TabsContent>
            
            <TabsContent value="quality" className="mt-6">
              <div className="space-y-6">
                <SubsidyTitleImprover />
              </div>
            </TabsContent>
            
            <TabsContent value="import" className="mt-6">
              <EnhancedImportManagement />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;

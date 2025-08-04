
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import SubsidyManagement from '@/components/admin/SubsidyManagement';
import ImportManagement from '@/components/admin/ImportManagement';
import SubsidyTitleImprover from '@/components/admin/SubsidyTitleImprover';
import CanonicalValidationDashboard from '@/components/admin/CanonicalValidationDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getIsAdmin, FEATURES, IS_PRODUCTION } from '@/config/environment';

const AdminPage = () => {
  const { user } = useAuth();
  const isAdmin = getIsAdmin(user);

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
                Only administrators can access this section.
              </p>
              {!IS_PRODUCTION && (
                <p className="text-xs text-blue-500 mt-2">
                  Development mode: Admin access is restricted to configured emails.
                </p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-grow py-6 px-4">
        <div className="container mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage subsidies, farms, and system settings
            </p>
            {!IS_PRODUCTION && (
              <div className="mt-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 px-3 py-2 rounded">
                Development Environment - Additional features enabled
              </div>
            )}
          </div>
          <Tabs defaultValue="subsidies" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="subsidies">Subsidy Management</TabsTrigger>
              <TabsTrigger value="validation">Canonical Validation</TabsTrigger>
              <TabsTrigger value="improve">Data Quality</TabsTrigger>
              <TabsTrigger value="import">Data Import</TabsTrigger>
            </TabsList>
            <TabsContent value="subsidies">
              <SubsidyManagement />
            </TabsContent>
            <TabsContent value="validation">
              <CanonicalValidationDashboard />
            </TabsContent>
            <TabsContent value="improve">
              <div className="space-y-6">
                <SubsidyTitleImprover />
              </div>
            </TabsContent>
            <TabsContent value="import">
              <ImportManagement />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;

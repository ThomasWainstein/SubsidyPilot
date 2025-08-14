import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin, AdminProvider } from '@/contexts/AdminContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AlertTriangle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatusDashboard } from '@/components/admin/StatusDashboard';
import ProductionReadinessCheck from '@/components/production/ProductionReadinessCheck';
import { UniversalHarvesterTest } from '@/components/scraper/UniversalHarvesterTest';
import EnhancedSubsidyManagement from '@/components/admin/EnhancedSubsidyManagement';
import EnhancedImportManagement from '@/components/admin/EnhancedImportManagement';
import CanonicalValidationDashboard from '@/components/admin/CanonicalValidationDashboard';
import EnhancedDualPipelineManager from '@/components/admin/EnhancedDualPipelineManager';
import { AdvancedPipelineConfig } from '@/components/admin/AdvancedPipelineConfig';
import RealTimePipelineMonitor from '@/components/admin/RealTimePipelineMonitor';
import { SystemHealthDashboard } from '@/components/admin/SystemHealthDashboard';
import { AuditTrailViewer } from '@/components/admin/AuditTrailViewer';
import { ManualPipelineDebugger } from '@/components/admin/ManualPipelineDebugger';
import { AITestingControl } from '@/components/admin/AITestingControl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FEATURES, IS_PRODUCTION } from '@/config/environment';

const AdminPageContent = () => {
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                <h2 className="mt-4 text-xl font-bold">Access Denied</h2>
                <p className="mt-2 text-muted-foreground">
                  You must be logged in to access the admin area.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                <h2 className="mt-4 text-xl font-bold">Access Denied</h2>
                <p className="mt-2 text-muted-foreground">
                  You need admin privileges to access this area.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Contact your administrator to request admin access.
                </p>
              </div>
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
          <ErrorBoundary>
            <StatusDashboard />
          </ErrorBoundary>

          {/* Main Admin Tabs */}
          <Tabs defaultValue="health" className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="grid w-full grid-cols-11 h-12 min-w-max">
                <TabsTrigger value="system" className="flex items-center gap-2">
                  🚀 System
                </TabsTrigger>
                <TabsTrigger value="health" className="flex items-center gap-2">
                  🏥 Health
                </TabsTrigger>
                <TabsTrigger value="pipeline" className="flex items-center gap-2">
                  🔄 Pipeline
                </TabsTrigger>
                <TabsTrigger value="debug" className="flex items-center gap-2">
                  🐛 Debug
                </TabsTrigger>
                <TabsTrigger value="config" className="flex items-center gap-2">
                  ⚙️ Config
                </TabsTrigger>
                <TabsTrigger value="monitoring" className="flex items-center gap-2">
                  📊 Monitor
                </TabsTrigger>
                <TabsTrigger value="ai-control" className="flex items-center gap-2">
                  🤖 AI Control
                </TabsTrigger>
                <TabsTrigger value="subsidies" className="flex items-center gap-2">
                  📋 Subsidies
                </TabsTrigger>
                <TabsTrigger value="validation" className="flex items-center gap-2">
                  ✅ Validation
                </TabsTrigger>
                <TabsTrigger value="audit" className="flex items-center gap-2">
                  🔍 Audit
                </TabsTrigger>
                <TabsTrigger value="import" className="flex items-center gap-2">
                  📤 Import
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="system" className="mt-6">
              <div className="space-y-6">
                <ErrorBoundary>
                  <ProductionReadinessCheck />
                </ErrorBoundary>
                <ErrorBoundary>
                  <UniversalHarvesterTest />
                </ErrorBoundary>
              </div>
            </TabsContent>
            
            <TabsContent value="health" className="mt-6">
              <ErrorBoundary>
                <SystemHealthDashboard />
              </ErrorBoundary>
            </TabsContent>
            
            <TabsContent value="pipeline" className="mt-6">
              <ErrorBoundary>
                <EnhancedDualPipelineManager />
              </ErrorBoundary>
            </TabsContent>
            
            <TabsContent value="debug" className="mt-6">
              <ErrorBoundary>
                <ManualPipelineDebugger />
              </ErrorBoundary>
            </TabsContent>
            
            <TabsContent value="config" className="mt-6">
              <ErrorBoundary>
                <AdvancedPipelineConfig />
              </ErrorBoundary>
            </TabsContent>
            
            <TabsContent value="monitoring" className="mt-6">
              <ErrorBoundary>
                <RealTimePipelineMonitor />
              </ErrorBoundary>
            </TabsContent>
            
            <TabsContent value="ai-control" className="mt-6">
              <ErrorBoundary>
                <AITestingControl />
              </ErrorBoundary>
            </TabsContent>
            
            <TabsContent value="subsidies" className="mt-6">
              <ErrorBoundary>
                <EnhancedSubsidyManagement />
              </ErrorBoundary>
            </TabsContent>
            
            <TabsContent value="validation" className="mt-6">
              <ErrorBoundary>
                <CanonicalValidationDashboard />
              </ErrorBoundary>
            </TabsContent>
            
            <TabsContent value="audit" className="mt-6">
              <ErrorBoundary>
                <AuditTrailViewer />
              </ErrorBoundary>
            </TabsContent>
            
            <TabsContent value="import" className="mt-6">
              <ErrorBoundary>
                <EnhancedImportManagement />
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

const AdminPage = () => {
  return (
    <AdminProvider>
      <ErrorBoundary>
        <AdminPageContent />
      </ErrorBoundary>
    </AdminProvider>
  );
};

export default AdminPage;
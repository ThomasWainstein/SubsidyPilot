import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin, AdminProvider } from '@/contexts/AdminContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AlertTriangle, Database, Activity, Settings, Shield, Users, FileText, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatusDashboard } from '@/components/admin/StatusDashboard';
import ProductionReadinessCheck from '@/components/production/ProductionReadinessCheck';
import { UniversalHarvesterTest } from '@/components/scraper/UniversalHarvesterTest';
import EnhancedSubsidyManagement from '@/components/admin/EnhancedSubsidyManagement';
import EnhancedImportManagement from '@/components/admin/EnhancedImportManagement';
import CanonicalValidationDashboard from '@/components/admin/CanonicalValidationDashboard';
import EnhancedDualPipelineManager from '@/components/admin/EnhancedDualPipelineManager';
import { SystemHealthDashboard } from '@/components/admin/SystemHealthDashboard';
import { AuditTrailViewer } from '@/components/admin/AuditTrailViewer';
import UserRoleManager from '@/components/admin/UserRoleManager';
import SecurityAuditLog from '@/components/security/SecurityAuditLog';
import DocumentProcessingDemo from '@/components/test/DocumentProcessingDemo';
import SchemaExtractionDemo from '@/components/test/SchemaExtractionDemo';
import AIPrefillDemo from '@/components/test/AIPrefillDemo';
import { QuickSchemaTest } from '@/components/test/QuickSchemaTest';
import { FrenchScraperManager } from '@/components/admin/FrenchScraperManager';
import { ApiSyncDashboard } from '@/components/admin/ApiSyncDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IS_PRODUCTION } from '@/config/environment';

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
          <Tabs defaultValue="overview" className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="grid w-full grid-cols-7 h-12">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="api-sync" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  API Sync
                </TabsTrigger>
                <TabsTrigger value="data" className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Data Management
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="testing" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Testing
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  System
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="overview" className="mt-6">
              <div className="space-y-6">
                <ErrorBoundary>
                  <SystemHealthDashboard />
                </ErrorBoundary>
                <ErrorBoundary>
                  <ProductionReadinessCheck />
                </ErrorBoundary>
              </div>
            </TabsContent>

            <TabsContent value="api-sync" className="mt-6">
              <ErrorBoundary>
                <ApiSyncDashboard />
              </ErrorBoundary>
            </TabsContent>
            
            <TabsContent value="data" className="mt-6">
              <div className="space-y-6">
                <ErrorBoundary>
                  <EnhancedSubsidyManagement />
                </ErrorBoundary>
                <ErrorBoundary>
                  <EnhancedDualPipelineManager />
                </ErrorBoundary>
                <ErrorBoundary>
                  <FrenchScraperManager />
                </ErrorBoundary>
                <ErrorBoundary>
                  <CanonicalValidationDashboard />
                </ErrorBoundary>
                <ErrorBoundary>
                  <EnhancedImportManagement />
                </ErrorBoundary>
              </div>
            </TabsContent>
            
            <TabsContent value="security" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Audit Log</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Monitor security events and potential threats
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ErrorBoundary>
                      <SecurityAuditLog />
                    </ErrorBoundary>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Audit Trail</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Track system changes and user activities
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ErrorBoundary>
                      <AuditTrailViewer />
                    </ErrorBoundary>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Role Management</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Manage user roles and permissions securely
                  </p>
                </CardHeader>
                <CardContent>
                  <ErrorBoundary>
                    <UserRoleManager />
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="testing" className="mt-6">
              <div className="space-y-6">
                <QuickSchemaTest />
                <Card>
                  <CardHeader>
                    <CardTitle>Document Processing Pipeline</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Test document download, processing, and database operations
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ErrorBoundary>
                      <DocumentProcessingDemo />
                    </ErrorBoundary>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Schema Extraction Testing</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Extract and generate JSON schemas from form documents
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ErrorBoundary>
                      <SchemaExtractionDemo />
                    </ErrorBoundary>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>AI Form Prefill Testing</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Test AI-powered form prefilling with user profile data
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ErrorBoundary>
                      <AIPrefillDemo />
                    </ErrorBoundary>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="system" className="mt-6">
              <div className="space-y-6">
                <ErrorBoundary>
                  <UniversalHarvesterTest />
                </ErrorBoundary>
              </div>
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
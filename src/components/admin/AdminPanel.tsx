import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DocumentProcessingDemo from '@/components/test/DocumentProcessingDemo';
import SchemaExtractionDemo from '@/components/test/SchemaExtractionDemo';
import AIPrefillDemo from '@/components/test/AIPrefillDemo';
import { QuickSchemaTest } from '@/components/test/QuickSchemaTest';
import UserRoleManager from '@/components/admin/UserRoleManager';
import SecurityAuditLog from '@/components/security/SecurityAuditLog';
import { withAdminAuth } from '@/contexts/AdminContext';
import { Settings, Database, Bot, FileText, Shield, Users } from 'lucide-react';

const AdminPanel: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">
            Development and testing tools for AgriTool administrators
          </p>
        </div>
      </div>

      <Tabs defaultValue="security" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="processing" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Document Processing
          </TabsTrigger>
          <TabsTrigger value="schemas" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Schema Extraction
          </TabsTrigger>
          <TabsTrigger value="prefill" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Prefill
          </TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Audit Log</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor security events and potential threats
              </p>
            </CardHeader>
            <CardContent>
              <SecurityAuditLog />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Role Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage user roles and permissions securely
              </p>
            </CardHeader>
            <CardContent>
              <UserRoleManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Processing Pipeline</CardTitle>
              <p className="text-sm text-muted-foreground">
                Test document download, processing, and database operations
              </p>
            </CardHeader>
            <CardContent>
              <DocumentProcessingDemo />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schemas" className="space-y-4">
          <QuickSchemaTest />
          <Card>
            <CardHeader>
              <CardTitle>Schema Extraction Testing</CardTitle>
              <p className="text-sm text-muted-foreground">
                Extract and generate JSON schemas from form documents
              </p>
            </CardHeader>
            <CardContent>
              <SchemaExtractionDemo />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prefill" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Form Prefill Testing</CardTitle>
              <p className="text-sm text-muted-foreground">
                Test AI-powered form prefilling with user profile data
              </p>
            </CardHeader>
            <CardContent>
              <AIPrefillDemo />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default withAdminAuth(AdminPanel);
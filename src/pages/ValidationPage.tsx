import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RealDocumentTesting } from '@/components/RealDocumentTesting';
import { ProductionHealthDashboard } from '@/components/ProductionHealthDashboard';
import { LesAidesDocumentTester } from '@/components/LesAidesDocumentTester';
import { AlternativeDocumentStrategy } from '@/components/AlternativeDocumentStrategy';
import { EnhancedSystemValidationSummary } from '@/components/EnhancedSystemValidationSummary';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';

export default function ValidationPage() {
  const phase1AStatus = {
    google_cloud_api: 'configured',
    real_documents: 'in_progress', 
    ground_truth: 'pending',
    accuracy_target: 'pending'
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'configured':
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Complete</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200"><AlertTriangle className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Phase 1A Validation Dashboard</h1>
        <p className="text-muted-foreground">
          Real document testing with Google Cloud Vision API and ground truth validation
        </p>
      </div>

      {/* Phase 1A Status Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Phase 1A Progress</CardTitle>
          <CardDescription>
            Current status of production readiness validation components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Google Cloud API</p>
              {getStatusBadge(phase1AStatus.google_cloud_api)}
              <p className="text-xs text-muted-foreground">Vision API key configured</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Real Documents</p>
              {getStatusBadge(phase1AStatus.real_documents)}
              <p className="text-xs text-muted-foreground">French subsidy forms collection</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Ground Truth</p>
              {getStatusBadge(phase1AStatus.ground_truth)}
              <p className="text-xs text-muted-foreground">Manual annotation needed</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">85% Accuracy Target</p>
              {getStatusBadge(phase1AStatus.accuracy_target)}
              <p className="text-xs text-muted-foreground">Requires testing completion</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="real-docs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="real-docs">Real French Documents</TabsTrigger>
          <TabsTrigger value="testing">Manual Testing</TabsTrigger>
          <TabsTrigger value="health">Production Health</TabsTrigger>
          <TabsTrigger value="validation">System Validation</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
        </TabsList>

        <TabsContent value="real-docs">
          <AlternativeDocumentStrategy />
        </TabsContent>

        <TabsContent value="testing">
          <RealDocumentTesting />
        </TabsContent>

        <TabsContent value="health">
          <ProductionHealthDashboard />
        </TabsContent>

        <TabsContent value="validation">
          <EnhancedSystemValidationSummary />
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Phase 1A Test Results</CardTitle>
              <CardDescription>
                Real accuracy measurements and validation outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Test Results Yet</h3>
                <p>Upload real documents in the "Real Document Testing" tab to generate accuracy results.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
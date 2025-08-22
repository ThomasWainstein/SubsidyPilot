/**
 * Universal Cloud Run Test Page
 * Supports both Client Onboarding and Subsidy Intelligence use cases
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  FileSearch, 
  Cloud, 
  CheckCircle, 
  AlertCircle, 
  Building, 
  User, 
  Landmark, 
  Heart,
  Tractor,
  FileText,
  FormInput,
  Database,
  Zap
} from 'lucide-react';
import { DocumentUploadCloudRun } from '@/components/DocumentUploadCloudRun';
import { useCloudRunProcessing } from '@/hooks/useCloudRunProcessing';
import Navbar from '@/components/Navbar';

type ProcessingMode = 'client-onboarding' | 'subsidy-intelligence';
type ClientType = 'individual' | 'business' | 'ngo' | 'municipality' | 'farm';
type SubsidyType = 'eu' | 'national' | 'regional' | 'local';

export const UniversalCloudRunTestPage = () => {
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('client-onboarding');
  const [selectedClientType, setSelectedClientType] = useState<ClientType>('individual');
  const [selectedSubsidyType, setSelectedSubsidyType] = useState<SubsidyType>('eu');
  const [extractionResults, setExtractionResults] = useState<any>(null);
  const [serviceHealth, setServiceHealth] = useState<any>(null);
  const [serviceInfo, setServiceInfo] = useState<any>(null);

  const { checkServiceHealth, getServiceInfo } = useCloudRunProcessing({
    onComplete: () => {},
    onError: () => {}
  });

  useEffect(() => {
    handleHealthCheck();
    handleGetServiceInfo();
  }, []);

  const handleHealthCheck = async () => {
    const health = await checkServiceHealth();
    setServiceHealth(health);
  };

  const handleGetServiceInfo = async () => {
    const info = await getServiceInfo();
    setServiceInfo(info);
  };

  const handleExtractionComplete = (data: any) => {
    setExtractionResults(data);
  };

  const handleExtractionError = (error: string) => {
    console.error('Extraction failed:', error);
    setExtractionResults({ error });
  };

  const getClientTypeIcon = (type: ClientType) => {
    const icons = {
      individual: User,
      business: Building,
      ngo: Heart,
      municipality: Landmark,
      farm: Tractor
    };
    return icons[type];
  };

  const getClientTypeLabel = (type: ClientType) => {
    const labels = {
      individual: 'Individual/Entrepreneur',
      business: 'Business/Company',
      ngo: 'NGO/Association',
      municipality: 'Municipality/Public Entity',
      farm: 'Farm/Agricultural Enterprise'
    };
    return labels[type];
  };

  const getSubsidyTypeLabel = (type: SubsidyType) => {
    const labels = {
      eu: 'EU/European Programs',
      national: 'National Government',
      regional: 'Regional/State Level',
      local: 'Local/Municipal'
    };
    return labels[type];
  };

  const getCurrentDocumentType = () => {
    if (processingMode === 'client-onboarding') {
      return `${selectedClientType}_documents`;
    } else {
      return `${selectedSubsidyType}_subsidy`;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Cloud className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Universal Cloud Run Document Processing</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Test the Google Cloud Run subsidypilot-form-parser service for both client onboarding 
              and subsidy intelligence across all applicant types
            </p>
          </div>

          {/* Service Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Service Status
                </CardTitle>
                <Button onClick={handleHealthCheck} variant="outline" size="sm">
                  Check Health
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {serviceHealth?.healthy ? (
                      <><CheckCircle className="h-4 w-4 text-green-500" /><span>Service available</span></>
                    ) : (
                      <><AlertCircle className="h-4 w-4 text-red-500" /><span>Service unavailable</span></>
                    )}
                  </div>
                  {serviceHealth?.responseTime && (
                    <p className="text-sm text-muted-foreground">
                      Response time: {serviceHealth.responseTime}ms
                    </p>
                  )}
                  {serviceHealth?.error && (
                    <p className="text-sm text-red-600">
                      {serviceHealth.error}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <strong>Proxy Endpoint:</strong> https://gvfgvbztagafjykncwto.supabase.co/functions/v1/cloud-run-proxy
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Target Service:</strong> https://subsidypilot-form-parser-838836299668.europe-west1.run.app
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Region:</strong> europe-west1 (Belgium) • <strong>Timeout:</strong> 5 minutes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Testing Interface */}
          <Tabs value={processingMode} onValueChange={(value) => setProcessingMode(value as ProcessingMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="client-onboarding" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Client Onboarding
              </TabsTrigger>
              <TabsTrigger value="subsidy-intelligence" className="flex items-center gap-2">
                <FileSearch className="h-4 w-4" />
                Subsidy Intelligence
              </TabsTrigger>
            </TabsList>

            {/* Client Onboarding Tab */}
            <TabsContent value="client-onboarding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Client Document Processing
                    <Badge variant="secondary">Profile Building</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Upload client documents to extract profile information and build comprehensive client profiles
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Client Type</label>
                    <Select value={selectedClientType} onValueChange={(value) => setSelectedClientType(value as ClientType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['individual', 'business', 'ngo', 'municipality', 'farm'] as ClientType[]).map((type) => {
                          const Icon = getClientTypeIcon(type);
                          return (
                            <SelectItem key={type} value={type}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {getClientTypeLabel(type)}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Expected Documents:</strong> {selectedClientType === 'individual' ? 'ID cards, passports, business registration' : 
                      selectedClientType === 'business' ? 'Business registration, tax certificates, incorporation docs' :
                      selectedClientType === 'ngo' ? 'Non-profit registration, statutes, board member lists' :
                      selectedClientType === 'municipality' ? 'Official letterhead, municipal registration, budget docs' :
                      'Agricultural registration, land certificates, production records'}
                    </AlertDescription>
                  </Alert>

                  <DocumentUploadCloudRun
                    documentType={getCurrentDocumentType()}
                    onComplete={handleExtractionComplete}
                    onError={handleExtractionError}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subsidy Intelligence Tab */}
            <TabsContent value="subsidy-intelligence" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5" />
                    Subsidy Document Processing
                    <Badge variant="secondary">Form Generation</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Upload subsidy documents to extract requirements and generate application forms
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subsidy Level</label>
                    <Select value={selectedSubsidyType} onValueChange={(value) => setSelectedSubsidyType(value as SubsidyType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['eu', 'national', 'regional', 'local'] as SubsidyType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {getSubsidyTypeLabel(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert>
                    <FormInput className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Expected Output:</strong> Extracted requirements, deadlines, eligibility criteria, 
                      and auto-generated application form structure based on subsidy guidelines.
                    </AlertDescription>
                  </Alert>

                  <DocumentUploadCloudRun
                    documentType={getCurrentDocumentType()}
                    onComplete={handleExtractionComplete}
                    onError={handleExtractionError}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Results Display */}
          {extractionResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Processing Results
                  <Badge variant={extractionResults.error ? "destructive" : "default"}>
                    {processingMode === 'client-onboarding' ? 'Client Profile Data' : 'Subsidy Intelligence'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {extractionResults.error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{extractionResults.error}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-2">Extracted Fields</h3>
                        <div className="bg-muted p-3 rounded-lg">
                          <pre className="text-xs overflow-auto max-h-64">
                            {JSON.stringify(extractionResults, null, 2)}
                          </pre>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-medium mb-2">Processing Summary</h3>
                          <div className="space-y-2 text-sm">
                            <p><strong>Use Case:</strong> {processingMode}</p>
                            <p><strong>Document Type:</strong> {getCurrentDocumentType()}</p>
                            <p><strong>Fields Extracted:</strong> {Object.keys(extractionResults || {}).length}</p>
                            <p><strong>Processing Mode:</strong> Cloud Run Advanced AI</p>
                          </div>
                        </div>
                        {processingMode === 'client-onboarding' && (
                          <Alert>
                            <Users className="h-4 w-4" />
                            <AlertDescription>
                              This data would be used to populate a {getClientTypeLabel(selectedClientType)} profile
                            </AlertDescription>
                          </Alert>
                        )}
                        {processingMode === 'subsidy-intelligence' && (
                          <Alert>
                            <FormInput className="h-4 w-4" />
                            <AlertDescription>
                              This data would be used to generate application forms for {getSubsidyTypeLabel(selectedSubsidyType)} subsidies
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Testing Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Testing Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Client Onboarding Documents</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Individual: ID cards, passports, tax returns</li>
                    <li>• Business: Registration docs, VAT certificates</li>
                    <li>• NGO: Articles of association, member lists</li>
                    <li>• Municipality: Official letterhead, budgets</li>
                    <li>• Farm: Agricultural certificates, land deeds</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Subsidy Intelligence Documents</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• EU: European Commission funding guidelines</li>
                    <li>• National: Government subsidy programs</li>
                    <li>• Regional: State/provincial funding schemes</li>
                    <li>• Local: Municipal grant applications</li>
                    <li>• Processing extracts requirements & generates forms</li>
                  </ul>
                </div>
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">
                <strong>Pro Tip:</strong> The system automatically adapts processing based on the selected mode and type. 
                Client documents focus on profile building, while subsidy documents focus on form generation.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
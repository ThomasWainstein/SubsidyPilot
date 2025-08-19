import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Euro,
  Target,
  Shield
} from 'lucide-react';
import DocumentListTable from './DocumentListTable';
import EnhancedDocumentUpload from './EnhancedDocumentUpload';
import { useFarmDocuments } from '@/hooks/useFarmDocuments';

interface SimplifiedDocumentsTabProps {
  farmId: string;
}

const DocumentCategoryCard = ({ 
  title, 
  description, 
  documentsNeeded, 
  documentsUploaded, 
  fundingUnlocked,
  urgency = 'normal'
}: {
  title: string;
  description: string;
  documentsNeeded: number;
  documentsUploaded: number;
  fundingUnlocked?: number;
  urgency?: 'urgent' | 'important' | 'normal';
}) => {
  const completionRate = documentsNeeded > 0 ? (documentsUploaded / documentsNeeded) * 100 : 0;
  
  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return {
          border: 'border-l-red-500',
          bg: 'bg-red-50 dark:bg-red-950',
          icon: <AlertTriangle className="h-5 w-5 text-red-600" />
        };
      case 'important':
        return {
          border: 'border-l-orange-500',
          bg: 'bg-orange-50 dark:bg-orange-950',
          icon: <Clock className="h-5 w-5 text-orange-600" />
        };
      default:
        return {
          border: 'border-l-blue-500',
          bg: 'bg-blue-50 dark:bg-blue-950',
          icon: <Target className="h-5 w-5 text-blue-600" />
        };
    }
  };

  const config = getUrgencyConfig(urgency);

  return (
    <Card className={`${config.border} border-l-4`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {config.icon}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Badge variant={completionRate === 100 ? "default" : "secondary"}>
            {documentsUploaded}/{documentsNeeded}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Completion</span>
            <span className="font-medium">{Math.round(completionRate)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div 
              className={`h-2 rounded-full transition-all ${
                completionRate === 100 ? 'bg-green-600' : 
                completionRate > 50 ? 'bg-blue-600' : 'bg-orange-600'
              }`}
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
        </div>

        {/* Funding Information */}
        {fundingUnlocked && (
          <div className={`p-3 rounded-lg ${config.bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Euro className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Unlocks Funding</span>
            </div>
            <div className="text-lg font-bold text-green-600">
              Up to €{fundingUnlocked.toLocaleString()}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button 
          variant={completionRate === 100 ? "outline" : "default"}
          className="w-full"
          disabled={completionRate === 100}
        >
          {completionRate === 100 ? (
            <><CheckCircle className="h-4 w-4 mr-2" />Complete</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" />Upload Documents</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

const SimplifiedDocumentsTab: React.FC<SimplifiedDocumentsTabProps> = ({ farmId }) => {
  const { data: documents } = useFarmDocuments(farmId);
  
  // Sample document categories based on common farming requirements
  const documentCategories = [
    {
      title: 'Basic Farm Registration',
      description: 'Essential documents for farm operations and legal compliance',
      documentsNeeded: 3,
      documentsUploaded: documents?.filter(d => 
        ['land_registry', 'farm_registration', 'tax_documents'].includes(d.category)
      ).length || 0,
      fundingUnlocked: 25000,
      urgency: 'urgent' as const
    },
    {
      title: 'Organic Certification',
      description: 'Required for organic farming subsidies and premium programs',
      documentsNeeded: 2,
      documentsUploaded: documents?.filter(d => 
        ['organic_certificate', 'soil_analysis'].includes(d.category)
      ).length || 0,
      fundingUnlocked: 45000,
      urgency: 'important' as const
    },
    {
      title: 'Equipment & Insurance',
      description: 'Documentation for equipment grants and operational coverage',
      documentsNeeded: 2,
      documentsUploaded: documents?.filter(d => 
        ['insurance_certificate', 'equipment_list'].includes(d.category)
      ).length || 0,
      fundingUnlocked: 35000,
      urgency: 'normal' as const
    },
    {
      title: 'Environmental Compliance',
      description: 'Environmental permits and sustainability certifications',
      documentsNeeded: 2,
      documentsUploaded: documents?.filter(d => 
        ['environmental_permit', 'sustainability_report'].includes(d.category)
      ).length || 0,
      fundingUnlocked: 20000,
      urgency: 'normal' as const
    }
  ];

  const totalDocumentsNeeded = documentCategories.reduce((sum, cat) => sum + cat.documentsNeeded, 0);
  const totalDocumentsUploaded = documentCategories.reduce((sum, cat) => sum + cat.documentsUploaded, 0);
  const overallCompletion = totalDocumentsNeeded > 0 ? (totalDocumentsUploaded / totalDocumentsNeeded) * 100 : 0;
  const totalFundingPotential = documentCategories.reduce((sum, cat) => sum + (cat.fundingUnlocked || 0), 0);

  return (
    <div className="space-y-6">
      {/* Document Overview */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Document Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(overallCompletion)}%
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Overall Complete</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {totalDocumentsUploaded}/{totalDocumentsNeeded}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">Documents Ready</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 flex items-center justify-center">
                <Euro className="h-5 w-5 mr-1" />
                {Math.round(totalFundingPotential / 1000)}K
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Funding Potential</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            By Category
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload & Manage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {documentCategories.map((category, index) => (
              <DocumentCategoryCard
                key={index}
                title={category.title}
                description={category.description}
                documentsNeeded={category.documentsNeeded}
                documentsUploaded={category.documentsUploaded}
                fundingUnlocked={category.fundingUnlocked}
                urgency={category.urgency}
              />
            ))}
          </div>

          {/* Completion Progress */}
          {overallCompletion < 100 && (
            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="h-6 w-6 text-orange-600" />
                  <div>
                    <h3 className="font-semibold">Complete Your Documentation</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload {totalDocumentsNeeded - totalDocumentsUploaded} more documents to unlock €{totalFundingPotential.toLocaleString()} in funding opportunities
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                  <div 
                    className="h-3 bg-gradient-to-r from-orange-500 to-green-500 rounded-full transition-all"
                    style={{ width: `${overallCompletion}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          {/* Simplified upload interface */}
          <EnhancedDocumentUpload
            farmId={farmId}
            onProfileUpdated={() => {
              // Could trigger refresh or show success message
            }}
          />
          
          {/* Document history */}
          <DocumentListTable farmId={farmId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SimplifiedDocumentsTab;
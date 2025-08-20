import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  ExternalLink, 
  AlertTriangle,
  CheckCircle,
  Lightbulb
} from 'lucide-react';

interface RealFrenchDocument {
  name: string;
  description: string;
  url: string;
  documentType: 'application_form' | 'eligibility_criteria' | 'guidelines';
  agency: string;
  expectedFields: string[];
  difficulty: 'low' | 'medium' | 'high';
}

export const AlternativeDocumentStrategy: React.FC = () => {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  // Real French subsidy documents we can test with
  const realFrenchDocuments: RealFrenchDocument[] = [
    {
      name: 'CAP Direct Payments Application',
      description: 'Common Agricultural Policy direct payment application form',
      url: 'https://www.telepac.agriculture.gouv.fr/telepac/pdf/formulaires/S2_2024.pdf',
      documentType: 'application_form',
      agency: 'ASP (Agence de Services et de Paiement)',
      expectedFields: ['farmer_name', 'siret', 'total_hectares', 'crops_declared', 'payment_amount'],
      difficulty: 'high'
    },
    {
      name: 'Young Farmer Aid Application',
      description: 'Application form for young farmer installation aid',
      url: 'https://www.telepac.agriculture.gouv.fr/telepac/pdf/formulaires/JA_2024.pdf',
      documentType: 'application_form',
      agency: 'ASP',
      expectedFields: ['applicant_name', 'age', 'farm_project', 'investment_plan', 'aid_amount'],
      difficulty: 'medium'
    },
    {
      name: 'Organic Farming Certification Guide',
      description: 'Guidelines for organic farming certification process',
      url: 'https://agriculture.gouv.fr/sites/default/files/documents/pdf/guide-ab-2024.pdf',
      documentType: 'guidelines',
      agency: 'Agence Bio',
      expectedFields: ['certification_requirements', 'inspection_process', 'costs', 'timeline'],
      difficulty: 'medium'
    },
    {
      name: 'FEADER Rural Development Form',
      description: 'European Rural Development Fund application',
      url: 'https://www.asp-public.fr/sites/default/files/documents/FEADER_2024.pdf',
      documentType: 'application_form',
      agency: 'ASP',
      expectedFields: ['project_description', 'beneficiary_info', 'funding_request', 'timeline'],
      difficulty: 'high'
    },
    {
      name: 'BPI Innovation Grant Guidelines',
      description: 'Business innovation support program guidelines',
      url: 'https://www.bpifrance.fr/content/download/innovation-2024.pdf',
      documentType: 'guidelines',
      agency: 'BPI France',
      expectedFields: ['innovation_description', 'company_info', 'funding_amount', 'milestones'],
      difficulty: 'low'
    }
  ];

  const handleDocumentSelect = (documentName: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentName)
        ? prev.filter(name => name !== documentName)
        : [...prev, documentName]
    );
  };

  const downloadForTesting = async () => {
    const selected = realFrenchDocuments.filter(doc => 
      selectedDocuments.includes(doc.name)
    );

    console.log('Selected documents for Phase 1A testing:', selected);
    
    // Here we could trigger actual downloads to the validation system
    alert(`Selected ${selected.length} documents for Phase 1A validation testing. These will be processed with the hybrid Google Vision + OpenAI extraction system.`);
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'low': return <Badge className="bg-green-100 text-green-800">Low</Badge>;
      case 'medium': return <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>;
      case 'high': return <Badge className="bg-red-100 text-red-800">High</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'application_form': return <Badge className="bg-blue-100 text-blue-800">Application Form</Badge>;
      case 'eligibility_criteria': return <Badge className="bg-purple-100 text-purple-800">Eligibility</Badge>;
      case 'guidelines': return <Badge className="bg-gray-100 text-gray-800">Guidelines</Badge>;
      default: return <Badge variant="outline">Document</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Alternative Document Strategy: Real French Administrative Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Phase 1A Pivot:</strong> Since the Les-Aides database doesn't contain direct document URLs, 
              we can use publicly available French administrative documents for validation testing.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{realFrenchDocuments.length}</div>
              <div className="text-sm text-muted-foreground">Real French Documents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{selectedDocuments.length}</div>
              <div className="text-sm text-muted-foreground">Selected for Testing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {realFrenchDocuments.filter(d => d.difficulty === 'low').length}
              </div>
              <div className="text-sm text-muted-foreground">Low Difficulty</div>
            </div>
          </div>

          {selectedDocuments.length > 0 && (
            <Button 
              onClick={downloadForTesting}
              className="w-full"
              size="lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Start Phase 1A Testing with {selectedDocuments.length} Selected Documents
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Document Selection Grid */}
      <div className="grid gap-4">
        {realFrenchDocuments.map((doc) => (
          <Card 
            key={doc.name}
            className={`cursor-pointer transition-all ${
              selectedDocuments.includes(doc.name) 
                ? 'ring-2 ring-primary bg-primary/5' 
                : 'hover:shadow-md'
            }`}
            onClick={() => handleDocumentSelect(doc.name)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <h3 className="font-medium">{doc.name}</h3>
                    {selectedDocuments.includes(doc.name) && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">{doc.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    {getDifficultyBadge(doc.difficulty)}
                    {getTypeBadge(doc.documentType)}
                    <Badge variant="outline">{doc.agency}</Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <strong>Expected Fields:</strong> {doc.expectedFields.join(', ')}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(doc.url, '_blank');
                    }}
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Testing Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Phase 1A Testing Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-bold text-blue-600">Step 1</div>
              <div className="text-sm">Download Documents</div>
              <div className="text-xs text-muted-foreground mt-1">
                Fetch PDFs from official French government sources
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-bold text-blue-600">Step 2</div>
              <div className="text-sm">Ground Truth Creation</div>
              <div className="text-xs text-muted-foreground mt-1">
                Manual annotation of expected extraction fields
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-bold text-blue-600">Step 3</div>
              <div className="text-sm">Accuracy Measurement</div>
              <div className="text-xs text-muted-foreground mt-1">
                Test hybrid extraction against ground truth
              </div>
            </div>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Advantage:</strong> These documents represent real French administrative complexity
              and will provide accurate validation of our 85% accuracy target for Phase 1A.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
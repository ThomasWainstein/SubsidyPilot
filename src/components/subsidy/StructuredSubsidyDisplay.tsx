import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

interface StructuredSection {
  type: 'heading' | 'paragraph' | 'list' | 'numbered_list' | 'table' | 'document_link';
  level?: number;
  content: string;
  children?: StructuredSection[];
  metadata?: {
    tag?: string;
    className?: string;
    id?: string;
    href?: string;
    fileType?: string;
    fileSize?: string;
  };
}

interface DocumentInfo {
  name: string;
  url: string;
  type: string;
  size?: string;
  description?: string;
  isRequired?: boolean;
}

interface SubsidyData {
  title: string;
  url: string;
  sections: StructuredSection[];
  documents: DocumentInfo[];
  eligibility: StructuredSection[];
  applicationSteps: StructuredSection[];
  evaluationCriteria: StructuredSection[];
  deadlines: StructuredSection[];
  amounts: StructuredSection[];
  completeness: {
    hasStructuredContent: boolean;
    hasDocuments: boolean;
    hasEligibility: boolean;
    hasApplicationSteps: boolean;
    missingFields: string[];
    warnings: string[];
  };
}

interface StructuredSubsidyDisplayProps {
  data: SubsidyData;
}

const SectionRenderer: React.FC<{ section: StructuredSection; depth?: number }> = ({ section, depth = 0 }) => {
  const indentClass = depth > 0 ? `ml-${Math.min(depth * 4, 16)}` : '';
  
  switch (section.type) {
    case 'heading':
      const HeadingTag = `h${Math.min(section.level || 1, 6)}` as keyof JSX.IntrinsicElements;
      return (
        <div className={indentClass}>
          <HeadingTag className={`font-semibold text-foreground ${
            section.level === 1 ? 'text-2xl' : 
            section.level === 2 ? 'text-xl' : 
            section.level === 3 ? 'text-lg' : 'text-base'
          } mb-2`}>
            {section.content}
          </HeadingTag>
          {section.children?.map((child, index) => (
            <SectionRenderer key={index} section={child} depth={depth} />
          ))}
        </div>
      );
    
    case 'list':
      return (
        <div className={indentClass}>
          <ul className="list-disc list-inside space-y-1 text-foreground/80">
            <li>{section.content}</li>
            {section.children?.map((child, index) => (
              <div key={index} className="ml-4">
                <SectionRenderer section={child} depth={depth + 1} />
              </div>
            ))}
          </ul>
        </div>
      );
    
    case 'numbered_list':
      return (
        <div className={indentClass}>
          <ol className="list-decimal list-inside space-y-1 text-foreground/80">
            <li>{section.content}</li>
            {section.children?.map((child, index) => (
              <div key={index} className="ml-4">
                <SectionRenderer section={child} depth={depth + 1} />
              </div>
            ))}
          </ol>
        </div>
      );
    
    case 'document_link':
      return (
        <div className={`${indentClass} flex items-center gap-2 p-2 bg-accent/10 rounded-md border border-accent/20`}>
          <FileText className="h-4 w-4 text-accent" />
          <a 
            href={section.metadata?.href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-accent hover:text-accent/80 underline"
          >
            {section.content}
          </a>
          {section.metadata?.fileType && (
            <Badge variant="outline" className="text-xs">
              {section.metadata.fileType.toUpperCase()}
            </Badge>
          )}
          {section.metadata?.fileSize && (
            <span className="text-xs text-muted-foreground">
              ({section.metadata.fileSize})
            </span>
          )}
        </div>
      );
    
    default:
      return (
        <div className={indentClass}>
          <p className="text-foreground/80 mb-2 leading-relaxed">
            {section.content}
          </p>
          {section.children?.map((child, index) => (
            <SectionRenderer key={index} section={child} depth={depth} />
          ))}
        </div>
      );
  }
};

const DocumentsPane: React.FC<{ documents: DocumentInfo[] }> = ({ documents }) => {
  if (documents.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Aucun document associé trouvé. Cela peut indiquer une extraction incomplète.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc, index) => (
        <Card key={index} className="border border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-accent" />
                  <span className="font-medium text-foreground">{doc.name}</span>
                  <Badge variant={doc.isRequired ? "destructive" : "secondary"}>
                    {doc.isRequired ? "Obligatoire" : "Optionnel"}
                  </Badge>
                </div>
                {doc.description && (
                  <p className="text-sm text-muted-foreground mb-2">{doc.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Type: {doc.type.toUpperCase()}</span>
                  {doc.size && <span>Taille: {doc.size}</span>}
                </div>
              </div>
              <Button size="sm" variant="outline" asChild>
                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const CompletenessIndicator: React.FC<{ completeness: SubsidyData['completeness'] }> = ({ completeness }) => {
  const totalChecks = 4;
  const passedChecks = [
    completeness.hasStructuredContent,
    completeness.hasDocuments,
    completeness.hasEligibility,
    completeness.hasApplicationSteps
  ].filter(Boolean).length;

  const completionPercentage = (passedChecks / totalChecks) * 100;

  return (
    <Card className="border-l-4 border-l-accent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium">Complétude de l'extraction</span>
          <Badge variant={completionPercentage === 100 ? "default" : "secondary"}>
            {Math.round(completionPercentage)}%
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {completeness.hasStructuredContent ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            <span>Contenu structuré</span>
          </div>
          <div className="flex items-center gap-2">
            {completeness.hasDocuments ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            <span>Documents associés</span>
          </div>
          <div className="flex items-center gap-2">
            {completeness.hasEligibility ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            <span>Critères d'éligibilité</span>
          </div>
          <div className="flex items-center gap-2">
            {completeness.hasApplicationSteps ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            <span>Procédure de demande</span>
          </div>
        </div>

        {completeness.warnings.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm font-medium text-yellow-600 mb-1">Avertissements:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {completeness.warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const StructuredSubsidyDisplay: React.FC<StructuredSubsidyDisplayProps> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{data.title}</h1>
        <CompletenessIndicator completeness={data.completeness} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Eligibility */}
          {data.eligibility.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Pour qui ?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.eligibility.map((section, index) => (
                  <SectionRenderer key={index} section={section} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Application Steps */}
          {data.applicationSteps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Comment postuler ?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.applicationSteps.map((section, index) => (
                  <SectionRenderer key={index} section={section} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Evaluation Criteria */}
          {data.evaluationCriteria.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Critères d'évaluation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.evaluationCriteria.map((section, index) => (
                  <SectionRenderer key={index} section={section} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Amounts */}
          {data.amounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Montants et financement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.amounts.map((section, index) => (
                  <SectionRenderer key={index} section={section} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* General Sections */}
          {data.sections.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Informations détaillées</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.sections.map((section, index) => (
                  <SectionRenderer key={index} section={section} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Deadlines */}
          {data.deadlines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Dates importantes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.deadlines.map((section, index) => (
                  <SectionRenderer key={index} section={section} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Documents associés</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentsPane documents={data.documents} />
            </CardContent>
          </Card>

          {/* Source Link */}
          <Card>
            <CardContent className="p-4">
              <Button variant="outline" className="w-full" asChild>
                <a href={data.url} target="_blank" rel="noopener noreferrer">
                  Voir la page officielle
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
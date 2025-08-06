import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, 
  FileText, 
  Euro, 
  MapPin, 
  CheckCircle 
} from 'lucide-react';
import { ModernDocumentTable } from './ModernDocumentTable';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { EnhancedExtractionTrigger } from '@/components/admin/EnhancedExtractionTrigger';

interface SimpleSubsidyDisplayProps {
  subsidy: any;
}

export const SimpleSubsidyDisplay: React.FC<SimpleSubsidyDisplayProps> = ({ subsidy }) => {
  const formatAmount = (amount: any) => {
    if (Array.isArray(amount) && amount.length > 0) {
      return amount.join(', ');
    }
    if (typeof amount === 'string') return amount;
    return 'Not specified';
  };

  const formatRegions = (regions: any) => {
    if (Array.isArray(regions) && regions.length > 0) {
      return regions.join(', ');
    }
    return 'All regions';
  };

  // Check if this looks like incomplete data (especially FranceAgriMer pages)
  const isDataIncomplete = () => {
    // Check if this is a FranceAgriMer subsidy with minimal data
    const isFranceAgriMer = subsidy.agency === 'FranceAgriMer' || subsidy.url?.includes('franceagrimer.fr');
    const hasMinimalData = !subsidy.application_method && !subsidy.documents?.length && 
                          !subsidy.requirements_markdown && !subsidy.funding_markdown;
    
    return isFranceAgriMer && hasMinimalData;
  };

  const shouldShowEnhancedExtraction = isDataIncomplete();

  // Check if we have structured content from enhanced extraction
  const hasStructuredContent = subsidy.presentation || subsidy.application_process || 
                               subsidy.deadlines || subsidy.amounts || 
                               subsidy.extracted_documents?.length > 0;

  return (
    <div className="space-y-6">
      {/* Enhanced Extraction Trigger - Show when data appears incomplete */}
      {shouldShowEnhancedExtraction && subsidy.url && (
        <EnhancedExtractionTrigger 
          subsidyUrl={subsidy.url}
          subsidyTitle={subsidy.title}
          onSuccess={() => window.location.reload()}
        />
      )}
      {/* Header Information */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{subsidy.title}</CardTitle>
              {subsidy.agency && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {subsidy.agency}
                </Badge>
              )}
            </div>
            {subsidy.url && (
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={subsidy.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Original
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {subsidy.amount && subsidy.amount.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Euro className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Amount:</span>
                <span>{formatAmount(subsidy.amount)}</span>
              </div>
            )}
            {subsidy.region && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Regions:</span>
                <span>{formatRegions(subsidy.region)}</span>
              </div>
            )}
            {subsidy.sector && subsidy.sector.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Sectors:</span>
                <span>{subsidy.sector.join(', ')}</span>
              </div>
            )}
          </div>
          
          {/* Render markdown description if available, fallback to plain text */}
          {(subsidy.description_markdown || subsidy.description) && (
            <div className="text-sm text-muted-foreground">
              {subsidy.description_markdown ? (
                <MarkdownRenderer content={subsidy.description_markdown} />
              ) : (
                subsidy.description
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eligibility Section */}
      {(subsidy.eligibility_markdown || subsidy.eligibility) && (
        <Card>
          <CardHeader>
            <CardTitle>Eligibility Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            {subsidy.eligibility_markdown ? (
              <MarkdownRenderer content={subsidy.eligibility_markdown} />
            ) : (
              <p className="text-sm">{subsidy.eligibility}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Requirements Section */}
      {(subsidy.requirements_markdown || subsidy.reporting_requirements) && (
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            {subsidy.requirements_markdown ? (
              <MarkdownRenderer content={subsidy.requirements_markdown} />
            ) : (
              <p className="text-sm">{subsidy.reporting_requirements}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Application Method Section */}
      {(subsidy.application_method_markdown || subsidy.application_method) && (
        <Card>
          <CardHeader>
            <CardTitle>Application Method</CardTitle>
          </CardHeader>
          <CardContent>
            {subsidy.application_method_markdown ? (
              <MarkdownRenderer content={subsidy.application_method_markdown} />
            ) : (
              <p className="text-sm">{subsidy.application_method}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Funding Information Section */}
      {(subsidy.funding_markdown || subsidy.payment_terms) && (
        <Card>
          <CardHeader>
            <CardTitle>Funding Information</CardTitle>
          </CardHeader>
          <CardContent>
            {subsidy.funding_markdown ? (
              <MarkdownRenderer content={subsidy.funding_markdown} />
            ) : (
              <p className="text-sm">{subsidy.payment_terms}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Complete Program Information - Enhanced Structured Content */}
      {hasStructuredContent && (
        <Card>
          <CardHeader>
            <CardTitle>Complete Program Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Presentation Section */}
            {subsidy.presentation && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary">Program Overview</h3>
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={subsidy.presentation} />
                </div>
              </div>
            )}

            {/* Application Process */}
            {subsidy.application_process && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary">Application Process</h3>
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={subsidy.application_process} />
                </div>
              </div>
            )}

            {/* Deadlines */}
            {subsidy.deadlines && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary">Important Dates</h3>
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={subsidy.deadlines} />
                </div>
              </div>
            )}

            {/* Funding Information */}
            {subsidy.amounts && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary">Funding Details</h3>
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={subsidy.amounts} />
                </div>
              </div>
            )}

            {/* Extracted Documents */}
            {subsidy.extracted_documents && subsidy.extracted_documents.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-primary">Related Documents</h3>
                <div className="grid gap-2">
                  {subsidy.extracted_documents.map((docUrl: string, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <a 
                        href={docUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm flex-1"
                      >
                        {docUrl.split('/').pop() || `Document ${index + 1}`}
                      </a>
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extraction Quality Info */}
            {subsidy.audit?.extraction_timestamp && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Enhanced extraction completed</span>
                  <span>{new Date(subsidy.audit.extraction_timestamp).toLocaleDateString()}</span>
                </div>
                {subsidy.audit.documents_found > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    📎 Found {subsidy.audit.documents_found} document(s)
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fallback Documents Section for legacy data */}
      {!hasStructuredContent && subsidy.documents && subsidy.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <ModernDocumentTable 
              documents={subsidy.documents} 
              showTitle={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
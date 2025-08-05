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

  return (
    <div className="space-y-6">
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

      {/* Documents Section */}
      {subsidy.documents && subsidy.documents.length > 0 && (
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
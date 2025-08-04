import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, FileText, Calendar, Euro, MapPin } from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

interface HierarchicalSubsidyDisplayProps {
  subsidy: any;
  extractedData?: any;
  currentLanguage?: string;
}

export const HierarchicalSubsidyDisplay: React.FC<HierarchicalSubsidyDisplayProps> = ({
  subsidy,
  extractedData,
  currentLanguage = 'en'
}) => {
  // Extract markdown content from audit data
  const getMarkdownContent = (section: string) => {
    if (subsidy.audit?.structured_sections?.[section]) {
      return subsidy.audit.structured_sections[section];
    }
    if (subsidy.audit?.content_markdown) {
      // Try to extract section from full markdown
      const lines = subsidy.audit.content_markdown.split('\n');
      const sectionStart = lines.findIndex(line => 
        line.toLowerCase().includes(section.toLowerCase())
      );
      if (sectionStart !== -1) {
        // Find the next major section or end
        const nextSectionStart = lines.findIndex((line, i) => 
          i > sectionStart && line.startsWith('## ')
        );
        const sectionLines = nextSectionStart === -1 
          ? lines.slice(sectionStart)
          : lines.slice(sectionStart, nextSectionStart);
        return sectionLines.join('\n');
      }
    }
    return null;
  };

  const eligibilityMarkdown = getMarkdownContent('eligibility') || subsidy.eligibility;
  const applicationMarkdown = getMarkdownContent('application') || subsidy.application_method;
  const evaluationMarkdown = getMarkdownContent('evaluation') || subsidy.evaluation_criteria;
  const deadlinesMarkdown = getMarkdownContent('deadlines');
  const amountsMarkdown = getMarkdownContent('amounts');
  const fullContentMarkdown = subsidy.audit?.content_markdown;

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
            {subsidy.amount && (
              <div className="flex items-center gap-2 text-sm">
                <Euro className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Amount:</span>
                <span>{formatAmount(subsidy.amount)}</span>
              </div>
            )}
            {subsidy.deadline && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Deadline:</span>
                <span>{new Date(subsidy.deadline).toLocaleDateString()}</span>
              </div>
            )}
            {subsidy.region && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Regions:</span>
                <span>{formatRegions(subsidy.region)}</span>
              </div>
            )}
          </div>
          
          {subsidy.description && (
            <div className="text-sm text-muted-foreground">
              {subsidy.description}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Structured Content Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Program Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="eligibility" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
              <TabsTrigger value="application">Application</TabsTrigger>
              <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
              <TabsTrigger value="funding">Funding</TabsTrigger>
              <TabsTrigger value="full">Full Content</TabsTrigger>
            </TabsList>

            <TabsContent value="eligibility" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Eligibility Requirements</h3>
                {eligibilityMarkdown ? (
                  <MarkdownRenderer content={eligibilityMarkdown} />
                ) : (
                  <p className="text-muted-foreground">No eligibility information available</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="application" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Application Process</h3>
                {applicationMarkdown ? (
                  <MarkdownRenderer content={applicationMarkdown} />
                ) : (
                  <p className="text-muted-foreground">No application information available</p>
                )}
                
                {/* Documents Section */}
                {subsidy.documents && Array.isArray(subsidy.documents) && subsidy.documents.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold mb-3">Required Documents</h4>
                    <div className="space-y-2">
                      {subsidy.documents.map((doc: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{doc.name || doc.markdown_link?.match(/\[([^\]]+)\]/)?.[1] || 'Document'}</span>
                            {doc.type && (
                              <Badge variant="outline" className="text-xs">
                                {doc.type.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          {doc.url && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Download
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="evaluation" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Evaluation Criteria</h3>
                {evaluationMarkdown ? (
                  <MarkdownRenderer content={evaluationMarkdown} />
                ) : (
                  <p className="text-muted-foreground">No evaluation criteria available</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="funding" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Funding Information</h3>
                {amountsMarkdown ? (
                  <MarkdownRenderer content={amountsMarkdown} />
                ) : (
                  <div className="space-y-2">
                    {subsidy.amount && (
                      <div>
                        <span className="font-medium">Grant Amount: </span>
                        {formatAmount(subsidy.amount)}
                      </div>
                    )}
                    {subsidy.co_financing_rate && (
                      <div>
                        <span className="font-medium">Co-financing Rate: </span>
                        {subsidy.co_financing_rate}%
                      </div>
                    )}
                  </div>
                )}
                
                {deadlinesMarkdown && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold mb-3">Important Dates</h4>
                    <MarkdownRenderer content={deadlinesMarkdown} />
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="full" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Complete Program Information</h3>
                {fullContentMarkdown ? (
                  <MarkdownRenderer content={fullContentMarkdown} className="max-h-96 overflow-y-auto" />
                ) : (
                  <p className="text-muted-foreground">Full content not available in structured format</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Extraction Quality Information */}
      {subsidy.audit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Extraction Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {subsidy.audit.markdown_quality && (
                <div>
                  <span className="font-medium">Markdown Quality:</span>
                  <span className="ml-1">{subsidy.audit.markdown_quality}%</span>
                </div>
              )}
              {subsidy.audit.structure_integrity && (
                <div>
                  <span className="font-medium">Structure Integrity:</span>
                  <span className="ml-1">{subsidy.audit.structure_integrity}%</span>
                </div>
              )}
              {subsidy.audit.extraction_method && (
                <div>
                  <span className="font-medium">Method:</span>
                  <span className="ml-1">{subsidy.audit.extraction_method}</span>
                </div>
              )}
              {subsidy.audit.extraction_timestamp && (
                <div>
                  <span className="font-medium">Extracted:</span>
                  <span className="ml-1">{new Date(subsidy.audit.extraction_timestamp).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
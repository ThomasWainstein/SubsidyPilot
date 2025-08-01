import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  ExternalLink, 
  FileText, 
  Mail, 
  Phone, 
  Calendar,
  Clock,
  Euro,
  Building,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { DocumentContent } from '@/utils/documentParser';
import { formatFundingDisplay, getDeadlineInfo, cleanContent } from '@/utils/contentFormatting';

interface ComprehensiveSubsidyDisplayProps {
  subsidy: any;
  extractedData?: Partial<DocumentContent>;
}

export const ComprehensiveSubsidyDisplay = ({ 
  subsidy, 
  extractedData = {} 
}: ComprehensiveSubsidyDisplayProps) => {
  
  const renderSection = (title: string, content: string | string[] | null | undefined, icon?: React.ReactNode) => {
    if (!content || (Array.isArray(content) && content.length === 0)) return null;
    
    const cleanedContent = Array.isArray(content) 
      ? content.map(item => cleanContent(item)).filter(Boolean)
      : cleanContent(content);
    
    if (!cleanedContent || (Array.isArray(cleanedContent) && cleanedContent.length === 0)) return null;

    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Array.isArray(cleanedContent) ? (
            <ul className="space-y-2">
              {cleanedContent.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{cleanedContent}</div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderDocumentSection = (
    title: string, 
    documents: Array<{name: string; type: string; size?: string; url?: string; mandatory?: boolean; description?: string}> = [],
    icon?: React.ReactNode
  ) => {
    if (!documents || documents.length === 0) return null;

    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documents.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">{doc.name}</div>
                    {doc.description && (
                      <div className="text-xs text-muted-foreground">{doc.description}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {doc.type.toUpperCase()}
                      </Badge>
                      {doc.size && (
                        <span className="text-xs text-muted-foreground">{doc.size}</span>
                      )}
                      {doc.mandatory && (
                        <Badge variant="destructive" className="text-xs">
                          Mandatory
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {doc.url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const deadlineInfo = getDeadlineInfo(subsidy.deadline || extractedData.deadline);
  const fundingDisplay = formatFundingDisplay(subsidy.amount || extractedData.fundingAmount);

  return (
    <div className="space-y-6">
      {/* Program Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {extractedData.programName || subsidy.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Building className="w-4 h-4" />
                  {extractedData.agency || subsidy.agency || "FranceAgriMer"}
                </div>
                <div className="flex items-center gap-1">
                  <Euro className="w-4 h-4" />
                  {fundingDisplay}
                </div>
                <div className={`flex items-center gap-1 ${deadlineInfo.urgent ? 'text-destructive' : ''}`}>
                  <Calendar className="w-4 h-4" />
                  {deadlineInfo.text}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button>
                Start Application
              </Button>
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-1" />
                Official Page
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description & Objectives */}
      {renderSection(
        "Description & Objectives", 
        extractedData.description || extractedData.objectives || subsidy.description,
        <FileText className="w-5 h-5" />
      )}

      {/* Eligibility */}
      {renderSection(
        "Who Can Apply", 
        extractedData.eligibility || subsidy.eligibility,
        <Users className="w-5 h-5" />
      )}

      {/* Beneficiary Types */}
      {renderSection(
        "Eligible Entity Types", 
        extractedData.beneficiaryTypes || subsidy.beneficiaryTypes,
        <Building className="w-5 h-5" />
      )}

      {/* Financial Information */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Euro className="w-5 h-5" />
            Financial Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {extractedData.coFinancingRate && (
            <div>
              <div className="font-medium text-sm mb-1">Co-financing Rate</div>
              <div className="text-sm text-muted-foreground">{extractedData.coFinancingRate}</div>
            </div>
          )}
          {extractedData.maxGrantAmount && (
            <div>
              <div className="font-medium text-sm mb-1">Maximum Grant Amount</div>
              <div className="text-sm text-muted-foreground">{extractedData.maxGrantAmount}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eligible & Excluded Expenses */}
      {extractedData.eligibleExpenses && renderSection(
        "Eligible Expenses", 
        extractedData.eligibleExpenses,
        <CheckCircle className="w-5 h-5 text-green-600" />
      )}

      {extractedData.excludedExpenses && renderSection(
        "Excluded Expenses", 
        extractedData.excludedExpenses,
        <XCircle className="w-5 h-5 text-red-600" />
      )}

      {/* Application Process */}
      {renderSection(
        "How to Apply", 
        extractedData.applicationProcess || subsidy.applicationProcess,
        <AlertCircle className="w-5 h-5" />
      )}

      {/* Evaluation Criteria */}
      {renderSection(
        "Evaluation Criteria", 
        extractedData.evaluationCriteria,
        <CheckCircle className="w-5 h-5" />
      )}

      {/* Key Dates */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            Key Dates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {extractedData.applicationOpens && (
            <div className="flex justify-between">
              <span className="font-medium text-sm">Application Opens</span>
              <span className="text-sm text-muted-foreground">{extractedData.applicationOpens}</span>
            </div>
          )}
          {(extractedData.deadline || subsidy.deadline) && (
            <div className="flex justify-between">
              <span className="font-medium text-sm">Application Deadline</span>
              <span className={`text-sm ${deadlineInfo.urgent ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {deadlineInfo.text}
              </span>
            </div>
          )}
          {extractedData.projectDuration && (
            <div className="flex justify-between">
              <span className="font-medium text-sm">Project Duration</span>
              <span className="text-sm text-muted-foreground">{extractedData.projectDuration}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Required Documents */}
      {renderDocumentSection(
        "Required Documents", 
        extractedData.requiredDocuments,
        <FileText className="w-5 h-5" />
      )}

      {/* Associated Documents */}
      {renderDocumentSection(
        "Associated Documents & Resources", 
        extractedData.associatedDocuments,
        <Download className="w-5 h-5" />
      )}

      {/* Legal Framework */}
      {renderSection(
        "Legal & Regulatory Framework", 
        extractedData.legalReferences || subsidy.legalReferences,
        <FileText className="w-5 h-5" />
      )}

      {/* Contact Information */}
      {(extractedData.contactInfo || extractedData.contactEmail || extractedData.contactPhone) && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="w-5 h-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {extractedData.contactInfo && (
              <div className="text-sm">{cleanContent(extractedData.contactInfo)}</div>
            )}
            {extractedData.contactEmail && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${extractedData.contactEmail}`} className="text-primary hover:underline text-sm">
                  {extractedData.contactEmail}
                </a>
              </div>
            )}
            {extractedData.contactPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <a href={`tel:${extractedData.contactPhone}`} className="text-primary hover:underline text-sm">
                  {extractedData.contactPhone}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reporting Obligations */}
      {renderSection(
        "Reporting Obligations", 
        extractedData.reportingObligations,
        <Clock className="w-5 h-5" />
      )}

      {/* Legal Disclaimer */}
      {extractedData.legalDisclaimer && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground leading-relaxed">
              <strong>Legal Disclaimer:</strong> {cleanContent(extractedData.legalDisclaimer)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
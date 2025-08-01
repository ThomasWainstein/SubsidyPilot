import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
  AlertCircle,
  MapPin,
  Target,
  FileCheck,
  Scale,
  Link,
  BookOpen,
  HelpCircle,
  Shield
} from 'lucide-react';
import { DocumentContent } from '@/utils/documentParser';
import { formatFundingDisplay, getDeadlineInfo, cleanContent } from '@/utils/contentFormatting';
import { TranslatedField } from './TranslatedField';
import { Language } from '@/contexts/language/types';

interface ComprehensiveSubsidyDisplayProps {
  subsidy: any;
  extractedData?: Partial<DocumentContent>;
  currentLanguage?: Language;
}

export const ComprehensiveSubsidyDisplay = ({ 
  subsidy, 
  extractedData = {},
  currentLanguage = 'en'
}: ComprehensiveSubsidyDisplayProps) => {
  
  const renderCleanSection = (
    title: string, 
    content: string | string[] | null | undefined, 
    icon?: React.ReactNode,
    useTranslation: boolean = true
  ) => {
    if (!content || (Array.isArray(content) && content.length === 0)) return null;
    
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {useTranslation ? (
            <TranslatedField
              content={content}
              fieldKey={title.toLowerCase()}
              currentLanguage={currentLanguage}
            >
              {({ text }) => (
                <div className="prose max-w-none">
                  {Array.isArray(content) ? (
                    <ul className="space-y-2">
                      {(content as string[]).map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm leading-relaxed">{cleanContent(item)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {text.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className="mb-3">{paragraph}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TranslatedField>
          ) : (
            <div className="text-sm leading-relaxed">
              {Array.isArray(content) ? (
                <ul className="space-y-2">
                  {content.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>{cleanContent(item)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="whitespace-pre-wrap">{cleanContent(content)}</div>
              )}
            </div>
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
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">{doc.name}</div>
                    {doc.description && (
                      <div className="text-xs text-muted-foreground mt-1">{doc.description}</div>
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
                          Required
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

  const renderInfoGrid = (items: Array<{label: string; value: string; icon?: React.ReactNode; urgent?: boolean}>) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="text-muted-foreground font-medium text-xs uppercase tracking-wide">
              {item.label}
            </div>
            <div className={`font-semibold text-sm flex items-center gap-1 ${item.urgent ? 'text-destructive' : 'text-foreground'}`}>
              {item.icon}
              {item.value}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Process data using new interface structure
  const deadlineInfo = getDeadlineInfo(
    extractedData?.timeline?.applicationPeriod?.end || subsidy.deadline
  );
  const fundingDisplay = formatFundingDisplay(
    extractedData?.funding?.fundingDetails || subsidy.amount
  );
  const programName = extractedData?.programName || subsidy.title || subsidy.program;
  const managingAgency = extractedData?.agency || subsidy.agency || "Managing Agency";

  // Create navigation sections
  const navigationSections = [
    { id: 'overview', label: 'Overview' },
    { id: 'description', label: 'Description & Objectives' },
    { id: 'eligibility', label: 'Eligibility Conditions' },
    { id: 'application', label: 'How to Apply' },
    { id: 'evaluation', label: 'Evaluation Criteria' },
    { id: 'documents', label: 'Associated Documents' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'contact', label: 'Contact & Support' }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Navigation */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            {navigationSections.map((section) => (
              <Button
                key={section.id}
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                className="text-xs"
              >
                {section.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Program Header */}
      <Card id="overview" className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="pt-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">{programName}</h1>
            <p className="text-muted-foreground">Managed by {managingAgency}</p>
          </div>

          {/* Key Information Grid */}
          {renderInfoGrid([
            {
              label: "Funding Program",
              value: subsidy.funding_type || subsidy.program || "Public Aid",
              icon: <Target className="w-4 h-4" />
            },
            {
              label: "Managing Agency", 
              value: managingAgency,
              icon: <Building className="w-4 h-4" />
            },
            {
              label: "Available Funding",
              value: fundingDisplay,
              icon: <Euro className="w-4 h-4" />
            },
            {
              label: "Who Can Apply?",
              value: extractedData?.eligibility?.eligibleEntities?.slice(0, 2).join(', ') + 
                (extractedData?.eligibility?.eligibleEntities && extractedData.eligibility.eligibleEntities.length > 2 ? '...' : '') ||
                Array.isArray(subsidy.legal_entity_type) ? 
                subsidy.legal_entity_type.slice(0, 2).join(', ') + (subsidy.legal_entity_type.length > 2 ? '...' : '') :
                "See conditions",
              icon: <Users className="w-4 h-4" />
            },
            {
              label: "Application Deadline",
              value: deadlineInfo.text,
              icon: <Calendar className="w-4 h-4" />,
              urgent: deadlineInfo.urgent
            },
            {
              label: "Geographic Coverage",
              value: extractedData?.geography?.regions?.join(', ') ||
                (Array.isArray(subsidy.region) ? subsidy.region.join(', ') : "Entire territory"),
              icon: <MapPin className="w-4 h-4" />
            },
            {
              label: "Project Duration",
              value: extractedData?.timeline?.projectDuration || subsidy.project_duration || "Not specified",
              icon: <Clock className="w-4 h-4" />
            },
            {
              label: "Co-financing Rate",
              value: extractedData?.funding?.coFinancingRate || 
                (subsidy.co_financing_rate ? `${subsidy.co_financing_rate}%` : "See details"),
              icon: <FileCheck className="w-4 h-4" />
            }
          ])}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
            <Button size="lg" className="min-w-[160px]">
              Start Application
            </Button>
            
            {(subsidy.url || subsidy.source_url) && (
              <Button variant="outline" size="lg" asChild>
                <a href={subsidy.url || subsidy.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Official Page
                </a>
              </Button>
            )}
            
            <Button variant="outline" size="lg">
              <Download className="w-4 h-4 mr-2" />
              Download Application Guide
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Description & Objectives */}
      <div id="description">
        {renderCleanSection(
          "Description & Objectives", 
          extractedData?.description || subsidy.description,
          <FileText className="w-5 h-5" />
        )}
        
        {/* Program Objectives */}
        {(subsidy.objectives || extractedData?.objectives) && renderCleanSection(
          "Program Objectives",
          subsidy.objectives || extractedData.objectives,
          <Target className="w-5 h-5" />,
          false
        )}
      </div>

      {/* Eligibility Section */}
      <div id="eligibility">
        {renderCleanSection(
          "Eligibility Conditions", 
          extractedData?.eligibility?.generalCriteria || subsidy.eligibility,
          <Users className="w-5 h-5" />
        )}

        {/* Detailed Eligibility Grid */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="w-5 h-5" />
              Eligibility Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-sm mb-2">Legal Entity Types</h4>
                <div className="flex flex-wrap gap-1">
                  {extractedData?.eligibility?.legalEntityTypes && extractedData.eligibility.legalEntityTypes.length > 0 ? 
                    extractedData.eligibility.legalEntityTypes.map((type, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{type}</Badge>
                    )) : 
                    <span className="text-sm text-muted-foreground">Not specified</span>
                  }
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-2">Eligible Entities</h4>
                <div className="flex flex-wrap gap-1">
                  {extractedData?.eligibility?.eligibleEntities && extractedData.eligibility.eligibleEntities.length > 0 ? 
                    extractedData.eligibility.eligibleEntities.map((type, index) => (
                      <Badge key={index} variant="outline" className="text-xs">{type}</Badge>
                    )) : 
                    <span className="text-sm text-muted-foreground">Not specified</span>
                  }
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-2">Eligible Expenses</h4>
                <div className="flex flex-wrap gap-1">
                  {extractedData?.funding?.eligibleExpenses && extractedData.funding.eligibleExpenses.length > 0 ? 
                    extractedData.funding.eligibleExpenses.map((expense, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">{expense}</Badge>
                    )) : 
                    <span className="text-sm text-muted-foreground">Not specified</span>
                  }
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-2">Excluded Expenses</h4>
                <div className="flex flex-wrap gap-1">
                  {extractedData?.funding?.excludedExpenses && extractedData.funding.excludedExpenses.length > 0 ? 
                    extractedData.funding.excludedExpenses.map((expense, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">{expense}</Badge>
                    )) : 
                    <span className="text-sm text-muted-foreground">Not specified</span>
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Application Process */}
      <div id="application">
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck className="w-5 h-5" />
              How to Apply
            </CardTitle>
          </CardHeader>
          <CardContent>
            {extractedData?.applicationProcess?.steps && extractedData.applicationProcess.steps.length > 0 ? (
              <ol className="space-y-3">
                {extractedData.applicationProcess.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="text-sm">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Application process details not available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Evaluation Criteria */}
      <div id="evaluation">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Evaluation & Selection Process
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Evaluation Criteria</h4>
                {extractedData?.applicationProcess?.evaluationCriteria && extractedData.applicationProcess.evaluationCriteria.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {extractedData.applicationProcess.evaluationCriteria.map((criteria, index) => (
                      <li key={index}>{criteria}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No evaluation criteria specified</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Required Documents */}
      <div id="documents">
        {renderDocumentSection(
          "Required Documents", 
          extractedData?.documents?.required || [],
          <FileText className="w-5 h-5 text-red-600" />
        )}

        {/* Associated Documents */}
        {renderDocumentSection(
          "Associated Documents & Resources", 
          extractedData?.documents?.associated || [],
          <Download className="w-5 h-5" />
        )}
      </div>

      {/* Timeline */}
      <div id="timeline">
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              Timeline and Key Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Application Period</h4>
                <div className="space-y-2 text-sm">
                  {extractedData?.timeline?.applicationPeriod?.start && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Opens:</span>
                      <span>{new Date(extractedData.timeline.applicationPeriod.start).toLocaleDateString()}</span>
                    </div>
                  )}
                  {extractedData?.timeline?.applicationPeriod?.end && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deadline:</span>
                      <span className="font-medium text-destructive">{new Date(extractedData.timeline.applicationPeriod.end).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Project Details</h4>
                <div className="space-y-2 text-sm">
                  {extractedData?.timeline?.projectDuration && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span>{extractedData.timeline.projectDuration}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Information & Support */}
      <div id="contact">
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="w-5 h-5" />
              Contact & Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Legal References</h4>
                {extractedData?.legal?.legalBasis && extractedData.legal.legalBasis.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {extractedData.legal.legalBasis.map((ref, index) => (
                      <li key={index}>{ref}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No legal references specified</p>
                )}
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  {(extractedData?.contact?.primaryEmail || extractedData?.contact?.secondaryEmail) && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span className="font-medium">Email Support</span>
                      </div>
                      {extractedData?.contact?.primaryEmail && (
                        <div className="pl-6">
                          <a href={`mailto:${extractedData.contact.primaryEmail}`} className="text-primary hover:underline">
                            {extractedData.contact.primaryEmail}
                          </a>
                        </div>
                      )}
                      {extractedData?.contact?.secondaryEmail && (
                        <div className="pl-6">
                          <a href={`mailto:${extractedData.contact.secondaryEmail}`} className="text-primary hover:underline">
                            {extractedData.contact.secondaryEmail}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {extractedData?.contact?.phone && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span className="font-medium">Phone Support</span>
                      </div>
                      <div className="pl-6">
                        <a href={`tel:${extractedData.contact.phone}`} className="text-primary hover:underline">
                          {extractedData.contact.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Frequently Asked Questions</h4>
                {extractedData?.faq && extractedData.faq.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {extractedData.faq.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left text-sm">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-sm text-muted-foreground">No FAQs available</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legal Disclaimer & Compliance */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Legal Disclaimer & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {extractedData?.legal?.compliance && extractedData.legal.compliance.length > 0 ? (
            <div className="bg-muted/50 p-4 rounded-lg">
              <ul className="space-y-1">
                {extractedData.legal.compliance.map((item, index) => (
                  <li key={index} className="text-sm text-muted-foreground">{item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No legal disclaimer provided</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
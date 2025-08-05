import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  ExternalLink, 
  FileText, 
  Calendar, 
  Euro, 
  MapPin, 
  Download,
  Mail,
  Phone,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { ModernDocumentTable } from './ModernDocumentTable';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';
import { SimpleSubsidyDisplay } from './SimpleSubsidyDisplay';

interface NewComprehensiveSubsidyDisplayProps {
  subsidy: any;
  currentLanguage?: string;
}

interface SubsidySection {
  name: string;
  content_html?: string;
  deadlines?: Array<{
    label: string;
    date: string;
    notes?: string;
  }>;
  application_steps?: Array<{
    step_number: number;
    title: string;
    instructions_html: string;
  }>;
  documents?: Array<{
    label: string;
    url: string;
    type: string;
    size?: string;
    required?: boolean;
    notes?: string;
  }>;
  emails?: string[];
  phones?: string[];
  links?: string[];
}

export const NewComprehensiveSubsidyDisplay: React.FC<NewComprehensiveSubsidyDisplayProps> = ({
  subsidy,
  currentLanguage = 'en'
}) => {
  const [activeTab, setActiveTab] = useState('presentation');

  // Get comprehensive sections from audit data
  const comprehensiveSections: SubsidySection[] = subsidy.audit?.comprehensive_sections || [];
  
  // Fallback to existing structure if comprehensive sections not available
  if (comprehensiveSections.length === 0) {
    return <SimpleSubsidyDisplay subsidy={subsidy} />;
  }

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

  const renderDeadlines = (deadlines: any[]) => {
    if (!deadlines || deadlines.length === 0) return null;

    return (
      <div className="space-y-3 mt-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Important Dates
        </h4>
        <div className="space-y-2">
          {deadlines.map((deadline, index) => {
            const deadlineDate = new Date(deadline.date);
            const isUpcoming = deadlineDate > new Date();
            
            return (
              <div key={index} className={`p-3 rounded-lg border ${isUpcoming ? 'bg-orange-50 border-orange-200' : 'bg-muted'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isUpcoming ? (
                      <Clock className="w-4 h-4 text-orange-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{deadline.label}</span>
                  </div>
                  <Badge variant={isUpcoming ? "destructive" : "secondary"}>
                    {deadlineDate.toLocaleDateString()}
                  </Badge>
                </div>
                {deadline.notes && (
                  <p className="text-sm text-muted-foreground mt-1">{deadline.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderApplicationSteps = (steps: any[]) => {
    if (!steps || steps.length === 0) return null;

    return (
      <div className="space-y-3 mt-4">
        <h4 className="font-semibold">Application Steps</h4>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-3 p-3 border rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {step.step_number}
                </div>
              </div>
              <div className="flex-1">
                <h5 className="font-medium mb-1">{step.title}</h5>
                <div 
                  className="text-sm text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: step.instructions_html }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContactInfo = (section: SubsidySection) => {
    const hasContacts = section.emails?.length || section.phones?.length || section.links?.length;
    if (!hasContacts) return null;

    return (
      <div className="space-y-4">
        {section.emails && section.emails.length > 0 && (
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4" />
              Email Contacts
            </h4>
            <div className="space-y-1">
              {section.emails.map((email, index) => (
                <Button key={index} variant="outline" size="sm" asChild>
                  <a href={`mailto:${email}`}>
                    <Mail className="w-3 h-3 mr-1" />
                    {email}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        )}

        {section.phones && section.phones.length > 0 && (
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4" />
              Phone Numbers
            </h4>
            <div className="space-y-1">
              {section.phones.map((phone, index) => (
                <Button key={index} variant="outline" size="sm" asChild>
                  <a href={`tel:${phone}`}>
                    <Phone className="w-3 h-3 mr-1" />
                    {phone}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        )}

        {section.links && section.links.length > 0 && (
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-2">
              <ExternalLink className="w-4 h-4" />
              Useful Links
            </h4>
            <div className="space-y-1">
              {section.links.map((link, index) => (
                <Button key={index} variant="outline" size="sm" asChild>
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Visit Portal
                  </a>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getTabValue = (sectionName: string) => {
    return sectionName.toLowerCase().replace(/[^a-z0-9]/g, '');
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
              {subsidy.audit?.program && (
                <Badge variant="outline">
                  {subsidy.audit.program}
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
          
          {/* Display documents if available */}
          {subsidy.documents && subsidy.documents.length > 0 && (
            <div className="mt-4">
              <ModernDocumentTable 
                documents={subsidy.documents} 
                title="Related Documents"
                showTitle={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comprehensive Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Program Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              {comprehensiveSections.slice(0, 6).map((section) => (
                <TabsTrigger 
                  key={getTabValue(section.name)} 
                  value={getTabValue(section.name)}
                  className="text-xs"
                >
                  {section.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {comprehensiveSections.map((section) => (
              <TabsContent key={getTabValue(section.name)} value={getTabValue(section.name)} className="mt-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{section.name}</h3>
                  
                  {/* Main content - check for markdown fields first */}
                  {subsidy[`${section.name.toLowerCase()}_markdown`] ? (
                    <MarkdownRenderer content={subsidy[`${section.name.toLowerCase()}_markdown`]} />
                  ) : section.content_html ? (
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: section.content_html }}
                    />
                  ) : null}
                  
                  {/* Special sections */}
                  {section.deadlines && renderDeadlines(section.deadlines)}
                  {section.application_steps && renderApplicationSteps(section.application_steps)}
                  {section.documents && (
                    <ModernDocumentTable 
                      documents={section.documents} 
                      title="Documents"
                      showTitle={false}
                    />
                  )}
                  {section.name === 'Contact' && renderContactInfo(section)}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Extraction Quality Information */}
      {subsidy.audit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Extraction Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="font-medium">Sections:</span>
                <span className="ml-1">{comprehensiveSections.length}</span>
              </div>
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
              {subsidy.audit.extraction_date && (
                <div>
                  <span className="font-medium">Source Date:</span>
                  <span className="ml-1">{subsidy.audit.extraction_date}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, Calendar, MapPin, Euro, Building2, FileText, ExternalLink, 
  AlertCircle, CheckCircle, Users, Clock, FileDown, Globe, Download, 
  Anchor, Phone, Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/language';
import { TranslatedField } from '@/components/subsidy/TranslatedField';
import { SubsidyDataQuality } from '@/utils/subsidyDataQuality';
import { 
  getCleanLocalizedContent, 
  formatFundingDisplay, 
  formatArrayForDisplay,
  getDeadlineInfo 
} from '@/utils/contentFormatting';
import { parseDocumentContent, getDocumentType } from '@/utils/documentParser';

const SubsidyDetailPage = () => {
  const { subsidyId } = useParams<{ subsidyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isApplying, setIsApplying] = useState(false);
  const [documentContent, setDocumentContent] = useState<any>(null);

  const { data: subsidy, isLoading, error } = useQuery({
    queryKey: ['subsidy', subsidyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subsidies_structured')
        .select('*')
        .eq('id', subsidyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!subsidyId
  });

  // Parse documents if available
  useEffect(() => {
    if (subsidy?.url) {
      parseDocumentContent(subsidy.url).then(content => {
        if (content) {
          setDocumentContent(content);
        }
      });
    }
  }, [subsidy?.url]);

  // Check data quality when subsidy loads
  useEffect(() => {
    if (subsidy) {
      SubsidyDataQuality.checkSubsidyQuality(subsidy);
    }
  }, [subsidy]);

  const handleApply = () => {
    if (!subsidy) return;
    
    setIsApplying(true);
    
    toast({
      title: "Application Started",
      description: "This feature will be implemented soon. You'll be able to apply for subsidies directly.",
    });
    
    setIsApplying(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow py-6 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-center mt-2 text-muted-foreground">Loading subsidy details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !subsidy) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow py-6 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">Subsidy Not Found</h2>
              <p className="text-muted-foreground mb-4">The requested subsidy could not be found.</p>
              <Button onClick={() => navigate('/search')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Search
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Navigation sections
  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'description', label: 'Description' },
    { id: 'eligibility', label: 'Eligibility' },
    { id: 'application', label: 'How to Apply' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'resources', label: 'Resources' }
  ];

  const deadlineInfo = getDeadlineInfo(subsidy.deadline);
  
  // Clean and format all content
  const cleanTitle = getCleanLocalizedContent(subsidy.title, language) || subsidy.program || 'Agricultural Grant Program';
  const cleanDescription = getCleanLocalizedContent(subsidy.description, language);
  const cleanEligibility = getCleanLocalizedContent(subsidy.eligibility, language);
  const cleanApplicationMethod = getCleanLocalizedContent(subsidy.application_method, language);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto max-w-5xl px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/search')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>

            {/* Quick Navigation */}
            <div className="flex items-center gap-2 mb-6 pb-4 border-b overflow-x-auto">
              {sections.map((section) => (
                <Button
                  key={section.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                  className="whitespace-nowrap"
                >
                  <Anchor className="w-3 h-3 mr-1" />
                  {section.label}
                </Button>
              ))}
            </div>

            {/* Title */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                {cleanTitle}
              </h1>
              {subsidy.agency && (
                <p className="text-lg text-muted-foreground">
                  Managed by {subsidy.agency}
                </p>
              )}
            </div>

            {/* Info Bar */}
            <div id="overview" className="bg-card border rounded-lg p-6 mb-8">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground font-medium">Program</div>
                  <div className="font-semibold">{subsidy.program || subsidy.funding_type || 'Grant Program'}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-muted-foreground font-medium">Agency</div>
                  <div className="font-semibold">{subsidy.agency || 'Not specified'}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-muted-foreground font-medium">Funding</div>
                  <div className="font-semibold text-green-600">{formatFundingDisplay(subsidy.amount)}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-muted-foreground font-medium">Eligible Entities</div>
                  <div className="font-semibold">
                    {formatArrayForDisplay(subsidy.legal_entity_type, 'All entities')}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-muted-foreground font-medium">Deadline</div>
                  <div className={`font-semibold flex items-center gap-1 ${deadlineInfo.urgent ? 'text-red-600' : 'text-foreground'}`}>
                    {deadlineInfo.icon === 'calendar' && <Calendar className="w-3 h-3" />}
                    {deadlineInfo.icon === 'clock' && <Clock className="w-3 h-3" />}
                    {deadlineInfo.icon === 'alert-circle' && <AlertCircle className="w-3 h-3" />}
                    {deadlineInfo.text}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-muted-foreground font-medium">Region</div>
                  <div className="font-semibold">{formatArrayForDisplay(subsidy.region, 'All regions')}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-muted-foreground font-medium">Duration</div>
                  <div className="font-semibold">{subsidy.project_duration || 'Not specified'}</div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
                <Button 
                  onClick={handleApply}
                  disabled={isApplying}
                  size="lg"
                  className="min-w-[160px]"
                >
                  {isApplying ? 'Processing...' : 'Start Application'}
                </Button>
                
                {subsidy.url && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(subsidy.url, '_blank')}
                    size="lg"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Official Page
                  </Button>
                )}
                
                <Button variant="outline" size="lg">
                  <Download className="w-4 h-4 mr-2" />
                  Download Factsheet
                </Button>
              </div>
            </div>

            {/* Categories and Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {subsidy.sector && Array.isArray(subsidy.sector) && 
                subsidy.sector.map((sector, idx) => (
                  <Badge key={idx} variant="secondary">{sector}</Badge>
                ))
              }
              {subsidy.funding_type && (
                <Badge variant="outline">{subsidy.funding_type}</Badge>
              )}
              {subsidy.objectives && Array.isArray(subsidy.objectives) && 
                subsidy.objectives.slice(0, 3).map((obj, idx) => (
                  <Badge key={idx} variant="default">{obj}</Badge>
                ))
              }
            </div>
          </div>

          {/* Description Section */}
          <section id="description" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Description & Objectives
            </h2>
            
            <div className="space-y-6">
              {cleanDescription && (
                <div className="prose max-w-none">
                  <TranslatedField 
                    content={subsidy.description}
                    fieldKey="description"
                    currentLanguage={language}
                  >
                    {({ text }) => (
                      <div className="text-lg leading-relaxed">
                        {text.split('\n\n').map((paragraph, idx) => (
                          <p key={idx} className="mb-4">{paragraph}</p>
                        ))}
                      </div>
                    )}
                  </TranslatedField>
                </div>
              )}

              {/* Document extracted content */}
              {documentContent?.description && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">From Official Documentation:</h4>
                  <p className="text-sm">{documentContent.description}</p>
                </div>
              )}

              {subsidy.objectives && Array.isArray(subsidy.objectives) && subsidy.objectives.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Program Objectives</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {subsidy.objectives.map((obj, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Eligible Actions */}
              {subsidy.eligible_actions && Array.isArray(subsidy.eligible_actions) && subsidy.eligible_actions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Eligible Actions & Investments
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {subsidy.eligible_actions.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ineligible Actions */}
              {subsidy.ineligible_actions && Array.isArray(subsidy.ineligible_actions) && subsidy.ineligible_actions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Excluded Actions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {subsidy.ineligible_actions.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                        <span className="text-sm">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <Separator className="my-8" />

          {/* Eligibility Section */}
          <section id="eligibility" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Eligibility Criteria
            </h2>

            <div className="space-y-6">
              {cleanEligibility && (
                <div>
                  <h3 className="font-semibold mb-3">General Requirements</h3>
                  <TranslatedField 
                    content={subsidy.eligibility}
                    fieldKey="eligibility"
                    currentLanguage={language}
                  >
                    {({ text }) => (
                      <div className="prose max-w-none">
                        {text.split('\n\n').map((paragraph, idx) => (
                          <p key={idx} className="mb-2">{paragraph}</p>
                        ))}
                      </div>
                    )}
                  </TranslatedField>
                </div>
              )}

              {/* Document extracted eligibility */}
              {documentContent?.eligibility && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">From Official Documentation:</h4>
                  <p className="text-sm">{documentContent.eligibility}</p>
                </div>
              )}

              {/* Beneficiary Types */}
              {subsidy.beneficiary_types && Array.isArray(subsidy.beneficiary_types) && subsidy.beneficiary_types.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Eligible Beneficiaries</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {subsidy.beneficiary_types.map((type, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal Entity Types */}
              {subsidy.legal_entity_type && Array.isArray(subsidy.legal_entity_type) && subsidy.legal_entity_type.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Legal Entity Types</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {subsidy.legal_entity_type.map((type, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <span className="text-sm">{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority Groups */}
              {subsidy.priority_groups && Array.isArray(subsidy.priority_groups) && subsidy.priority_groups.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Priority Groups</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {subsidy.priority_groups.map((group, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">{typeof group === 'string' ? group : JSON.stringify(group)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <Separator className="my-8" />

          {/* Application Section */}
          <section id="application" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              How to Apply
            </h2>

            <div className="space-y-6">
              {/* Application Method */}
              {cleanApplicationMethod && (
                <div>
                  <h3 className="font-semibold mb-3">Application Process</h3>
                  <TranslatedField 
                    content={subsidy.application_method}
                    fieldKey="application_method"
                    currentLanguage={language}
                  >
                    {({ text }) => (
                      <div className="prose max-w-none">
                        {text.split('\n\n').map((paragraph, idx) => (
                          <p key={idx} className="mb-2">{paragraph}</p>
                        ))}
                      </div>
                    )}
                  </TranslatedField>
                </div>
              )}

              {/* Document extracted application process */}
              {documentContent?.applicationProcess && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">From Official Documentation:</h4>
                  <ol className="text-sm space-y-1">
                    {documentContent.applicationProcess.map((step: string, idx: number) => (
                      <li key={idx}>{idx + 1}. {step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Document Requirements */}
              {subsidy.documents && Array.isArray(subsidy.documents) && subsidy.documents.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Required Documents</h3>
                  <div className="space-y-2">
                    {subsidy.documents.map((doc: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-muted/30 rounded">
                        <FileText className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-sm">
                            {typeof doc === 'string' ? doc : doc.name || `Document ${idx + 1}`}
                          </div>
                          {typeof doc === 'object' && doc.description && (
                            <div className="text-xs text-muted-foreground mt-1">{doc.description}</div>
                          )}
                          {typeof doc === 'object' && doc.mandatory !== undefined && (
                            <Badge 
                              variant={doc.mandatory ? "default" : "outline"} 
                              className="text-xs mt-1"
                            >
                              {doc.mandatory ? "Mandatory" : "Optional"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evaluation Criteria */}
              {subsidy.evaluation_criteria && (
                <div>
                  <h3 className="font-semibold mb-3">Evaluation Criteria</h3>
                  <TranslatedField 
                    content={subsidy.evaluation_criteria}
                    fieldKey="evaluation_criteria"
                    currentLanguage={language}
                  >
                    {({ text }) => (
                      <div className="prose max-w-none">
                        {text.split('\n\n').map((paragraph, idx) => (
                          <p key={idx} className="mb-2">{paragraph}</p>
                        ))}
                      </div>
                    )}
                  </TranslatedField>
                </div>
              )}
            </div>
          </section>

          <Separator className="my-8" />

          {/* Timeline Section */}
          <section id="timeline" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Timeline & Key Dates
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium">Application Period</h3>
                
                {subsidy.application_window_start && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="font-medium">Opens</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(subsidy.application_window_start).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {subsidy.deadline && (
                  <div className="flex items-center gap-3">
                    <Calendar className={`w-5 h-5 ${deadlineInfo.urgent ? 'text-red-500' : 'text-orange-500'}`} />
                    <div>
                      <div className="font-medium">Deadline</div>
                      <div className={`text-sm ${deadlineInfo.urgent ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        {new Date(subsidy.deadline).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })} - {deadlineInfo.text}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Project Details</h3>
                
                {subsidy.project_duration && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="font-medium">Project Duration</div>
                      <div className="text-sm text-muted-foreground">{subsidy.project_duration}</div>
                    </div>
                  </div>
                )}

                {subsidy.co_financing_rate && (
                  <div className="flex items-center gap-3">
                    <Euro className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="font-medium">Co-financing Rate</div>
                      <div className="text-sm text-muted-foreground">{subsidy.co_financing_rate}%</div>
                    </div>
                  </div>
                )}

                {subsidy.funding_source && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-purple-500" />
                    <div>
                      <div className="font-medium">Funding Source</div>
                      <div className="text-sm text-muted-foreground">{subsidy.funding_source}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <Separator className="my-8" />

          {/* Resources Section */}
          <section id="resources" className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <ExternalLink className="w-6 h-6" />
              Resources & Links
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subsidy.url && (
                <Button 
                  variant="outline" 
                  className="justify-start h-auto p-4" 
                  onClick={() => window.open(subsidy.url, '_blank')}
                >
                  <Globe className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Official Program Page</div>
                    <div className="text-sm text-muted-foreground">View complete details and application forms</div>
                  </div>
                </Button>
              )}

              {subsidy.agency && (
                <Button variant="outline" className="justify-start h-auto p-4">
                  <Building2 className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Contact {subsidy.agency}</div>
                    <div className="text-sm text-muted-foreground">Get support and ask questions</div>
                  </div>
                </Button>
              )}

              <Button variant="outline" className="justify-start h-auto p-4">
                <FileDown className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Download Application Guide</div>
                  <div className="text-sm text-muted-foreground">Step-by-step application instructions</div>
                </div>
              </Button>

              <Button variant="outline" className="justify-start h-auto p-4">
                <FileText className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">Legal Framework</div>
                  <div className="text-sm text-muted-foreground">View regulations and applicable laws</div>
                </div>
              </Button>
            </div>

            {/* Contact Information */}
            {documentContent?.contactInfo && (
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contact Information
                </h4>
                <p className="text-sm">{documentContent.contactInfo}</p>
              </div>
            )}

            {/* Legal Disclaimer */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                This information is for guidance only. Always refer to the official program documentation 
                for complete and up-to-date requirements. Some content may have been translated or summarized.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default SubsidyDetailPage;
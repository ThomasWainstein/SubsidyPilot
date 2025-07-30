import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, MapPin, Euro, Building2, FileText, ExternalLink, AlertCircle, CheckCircle, Users, Clock, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatFundingAmount, getSubsidyTitle, getSubsidyDescription, getRegionDisplay, getSectorDisplay } from '@/utils/subsidyFormatting';
import { getRequirementLabel } from '@/utils/requirementLabels';
import { SubsidyDataQuality } from '@/utils/subsidyDataQuality';
import { 
  cleanMarkdownFormatting, 
  parseEligibilityData, 
  formatDocuments, 
  hasContent,
  formatArrayAsText,
  cleanSubsidyDescription,
  formatLanguages
} from '@/utils/subsidyDataCleaning';

const SubsidyDetailPage = () => {
  const { subsidyId } = useParams<{ subsidyId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isApplying, setIsApplying] = useState(false);

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

  // Check data quality when subsidy loads
  React.useEffect(() => {
    if (subsidy) {
      SubsidyDataQuality.checkSubsidyQuality(subsidy);
    }
  }, [subsidy]);

  const handleApply = () => {
    if (!subsidy) return;
    
    setIsApplying(true);
    
    // TODO: Implement application logic here
    toast({
      title: "Application Started",
      description: "This feature will be implemented soon. You'll be able to apply for subsidies directly.",
    });
    
    setIsApplying(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow py-6 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-center mt-2 text-gray-500">Loading subsidy details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !subsidy) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow py-6 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">Subsidy Not Found</h2>
              <p className="text-gray-500 mb-4">The requested subsidy could not be found.</p>
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-grow py-6 px-4">
        <div className="container mx-auto max-w-6xl">
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
            
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-4">
                  {getSubsidyTitle(subsidy)}
                </h1>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {getSectorDisplay(subsidy.sector).map((sector, idx) => (
                    <Badge key={idx} variant="secondary">{sector}</Badge>
                  ))}
                  {subsidy.funding_type && (
                    <Badge variant="outline">{subsidy.funding_type}</Badge>
                  )}
                  {subsidy.objectives && Array.isArray(subsidy.objectives) && 
                    subsidy.objectives.slice(0, 3).map((obj, idx) => (
                      <Badge key={idx} variant="default">{obj}</Badge>
                    ))
                  }
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  {subsidy.deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-500" />
                      <div>
                        <div className="font-medium">Deadline</div>
                        <div className="text-gray-600">{new Date(subsidy.deadline).toLocaleDateString()}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="font-medium">Region</div>
                      <div className="text-gray-600">{getRegionDisplay(subsidy.region)}</div>
                    </div>
                  </div>
                  
                  {formatFundingAmount(subsidy.amount) && (
                    <div className="flex items-center gap-2">
                      <Euro className="w-4 h-4 text-green-500" />
                      <div>
                        <div className="font-medium">Funding</div>
                        <div className="text-gray-600">{formatFundingAmount(subsidy.amount)}</div>
                      </div>
                    </div>
                  )}
                  
                  {subsidy.agency && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-500" />
                      <div>
                        <div className="font-medium">Agency</div>
                        <div className="text-gray-600">{subsidy.agency}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
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
                    className="min-w-[160px]"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Official Page
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Single Continuous Section */}
          <div className="space-y-8">
            {/* Description & Objectives */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-primary">Présentation</h2>
              <div className="prose prose-gray max-w-none">
                <div className="text-base leading-relaxed whitespace-pre-line">
                  {cleanSubsidyDescription(subsidy.description) || getSubsidyDescription(subsidy)}
                </div>
              </div>
              
              {subsidy.objectives && Array.isArray(subsidy.objectives) && subsidy.objectives.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Thematic Objectives</h3>
                  <div className="flex flex-wrap gap-2">
                    {subsidy.objectives.map((obj, idx) => (
                      <Badge key={idx} variant="outline">{obj}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Eligible Actions */}
              {subsidy.eligible_actions && Array.isArray(subsidy.eligible_actions) && subsidy.eligible_actions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Eligible Actions</h3>
                  <ul className="space-y-2">
                    {subsidy.eligible_actions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ineligible Actions */}
              {subsidy.ineligible_actions && Array.isArray(subsidy.ineligible_actions) && subsidy.ineligible_actions.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Excluded Actions</h3>
                  <ul className="space-y-2">
                    {subsidy.ineligible_actions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Eligibility Section */}
            <div className="space-y-4 border-t pt-8">
              <h2 className="text-2xl font-semibold text-primary">Pour qui ?</h2>
              
              {/* Parse and display eligibility data */}
              {(() => {
                const eligibilityList = parseEligibilityData(subsidy.eligibility);
                const hasEligibilityText = subsidy.eligibility && 
                  typeof subsidy.eligibility === 'string' && 
                  !subsidy.eligibility.startsWith('[');
                  
                return (
                  <>
                    {hasEligibilityText && (
                      <div className="prose prose-gray max-w-none">
                        <div className="text-base leading-relaxed whitespace-pre-line">
                          {cleanMarkdownFormatting(subsidy.eligibility)}
                        </div>
                      </div>
                    )}
                    
                    {eligibilityList.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-3">Eligible Organizations</h3>
                        <ul className="space-y-2">
                          {eligibilityList.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                );
              })()}

              {subsidy.beneficiary_types && Array.isArray(subsidy.beneficiary_types) && subsidy.beneficiary_types.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Eligible Beneficiary Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {subsidy.beneficiary_types.map((type, idx) => (
                      <Badge key={idx} variant="outline">{type}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {subsidy.legal_entity_type && Array.isArray(subsidy.legal_entity_type) && subsidy.legal_entity_type.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Legal Entity Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {subsidy.legal_entity_type.map((type, idx) => (
                      <Badge key={idx} variant="secondary">{type}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {subsidy.priority_groups && Array.isArray(subsidy.priority_groups) && subsidy.priority_groups.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Priority Groups</h3>
                  <div className="space-y-2">
                    {subsidy.priority_groups.map((group, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>{typeof group === 'string' ? group : JSON.stringify(group)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasContent(subsidy.conditional_eligibility) && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Special Cases & Conditions</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600">
                      {typeof subsidy.conditional_eligibility === 'object' ? 
                        Object.entries(subsidy.conditional_eligibility).map(([key, value]) => (
                          <div key={key} className="mb-2">
                            <strong>{key}:</strong> {String(value)}
                          </div>
                        )) :
                        String(subsidy.conditional_eligibility)
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Timing Section */}
            <div className="space-y-4 border-t pt-8">
              <h2 className="text-2xl font-semibold text-primary">Quand ?</h2>
              
              <div className="space-y-3">
                {subsidy.deadline && (
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <div>
                      <span className="text-lg font-medium">Application deadline: </span>
                      <span className="text-lg">{new Date(subsidy.deadline).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                  </div>
                )}

                {subsidy.application_window_start && (
                  <div className="mt-4">
                    <span className="font-medium">Application Opens: </span>
                    <span>{new Date(subsidy.application_window_start).toLocaleDateString()}</span>
                  </div>
                )}

                {subsidy.application_window_end && (
                  <div>
                    <span className="font-medium">Application Closes: </span>
                    <span>{new Date(subsidy.application_window_end).toLocaleDateString()}</span>
                  </div>
                )}


                {subsidy.project_duration && (
                  <div>
                    <span className="font-medium">Project Duration: </span>
                    <span>{subsidy.project_duration}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Application Process Section */}
            <div className="space-y-4 border-t pt-8">
              <h2 className="text-2xl font-semibold text-primary">Comment ?</h2>
              
              {/* Application Requirements */}
              {subsidy.application_requirements && (
                <div className="space-y-4">
                  {Array.isArray(subsidy.application_requirements) ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Application Steps</h3>
                      <div className="space-y-4">
                        {subsidy.application_requirements.map((req: any, index: number) => (
                          <div key={index} className="border-l-4 border-primary/30 pl-6 py-2">
                            <div className="flex items-start space-x-3">
                              <Badge variant="outline" className="mt-1">
                                Step {index + 1}
                              </Badge>
                              <div className="flex-1 space-y-2">
                                <p className="text-base">{req.step_description || req}</p>
                                {req.required_files && Array.isArray(req.required_files) && req.required_files.length > 0 && (
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Required Files:</p>
                                    <div className="flex flex-wrap gap-2">
                                       {req.required_files.map((file: any, fileIndex: number) => (
                                         <Badge key={fileIndex} variant="secondary" className="text-sm">
                                           {getRequirementLabel(file)}
                                         </Badge>
                                       ))}
                                    </div>
                                  </div>
                                )}
                                {req.web_portal && (
                                  <div>
                                    <Button variant="link" size="sm" asChild className="p-0 h-auto">
                                      <a href={req.web_portal} target="_blank" rel="noopener noreferrer">
                                        Access Application Portal →
                                      </a>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-gray max-w-none">
                      <p className="text-base leading-relaxed whitespace-pre-line">
                        {typeof subsidy.application_requirements === 'string' 
                          ? subsidy.application_requirements 
                          : JSON.stringify(subsidy.application_requirements, null, 2)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Required Documents */}
              {(() => {
                const formattedDocs = formatDocuments(subsidy.documents);
                return formattedDocs.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">Required Documents</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {formattedDocs.map((doc, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div className="flex-1">
                            {doc.url ? (
                              <a 
                                href={doc.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                {doc.text}
                              </a>
                            ) : (
                              <span className="text-sm">{doc.text}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}


            </div>

            {/* Program Information */}
            <div className="space-y-4 border-t pt-8">
              <h2 className="text-2xl font-semibold text-primary">Program Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-base">
                {subsidy.program && (
                  <div>
                    <span className="font-medium text-gray-700">Program: </span>
                    <span>{subsidy.program}</span>
                  </div>
                )}
                
                {subsidy.funding_source && (
                  <div>
                    <span className="font-medium text-gray-700">Funding Source: </span>
                    <span>{subsidy.funding_source}</span>
                  </div>
                )}

                {subsidy.co_financing_rate && (
                  <div>
                    <span className="font-medium text-gray-700">Co-financing Rate: </span>
                    <span>{subsidy.co_financing_rate}%</span>
                  </div>
                )}

                {subsidy.agency && (
                  <div>
                    <span className="font-medium text-gray-700">Managing Agency: </span>
                    <span>{subsidy.agency}</span>
                  </div>
                )}

                {subsidy.language && (
                  <div>
                    <span className="font-medium text-gray-700">Language: </span>
                    <span>{formatLanguages(subsidy.language)}</span>
                  </div>
                )}
              </div>

              {/* Investment Types */}
              {subsidy.investment_types && Array.isArray(subsidy.investment_types) && subsidy.investment_types.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Investment Types</h3>
                  <div className="flex flex-wrap gap-2">
                    {subsidy.investment_types.map((type, idx) => (
                      <Badge key={idx} variant="secondary">{type}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sector Information */}
              {subsidy.sector && getSectorDisplay(subsidy.sector).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-3">Sectors</h3>
                  <div className="flex flex-wrap gap-2">
                    {getSectorDisplay(subsidy.sector).map((sector: string, index: number) => (
                      <Badge key={index} variant="outline">{sector}</Badge>
                    ))}
                  </div>
                </div>
              )}


            </div>

            {/* Extraction Metadata */}
            {subsidy.audit && typeof subsidy.audit === 'object' && subsidy.audit !== null && (
              <div className="mt-12 pt-6 border-t border-dashed">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Extraction Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium">Extracted:</span>
                    <p>{new Date(subsidy.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="font-medium">Method:</span>
                    <p>AI</p>
                  </div>
                  <div>
                    <span className="font-medium">Source:</span>
                    <p>Web scraping</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p>Processed</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubsidyDetailPage;
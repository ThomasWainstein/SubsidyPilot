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

          {/* Tabbed Content */}
          <Tabs defaultValue="presentation" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="presentation">Présentation</TabsTrigger>
              <TabsTrigger value="eligibility">Pour qui ?</TabsTrigger>
              <TabsTrigger value="timing">Quand ?</TabsTrigger>
              <TabsTrigger value="application">Comment ?</TabsTrigger>
            </TabsList>

            <TabsContent value="presentation" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Description & Objectives
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                        {getSubsidyDescription(subsidy)}
                      </p>
                      
                      {subsidy.objectives && Array.isArray(subsidy.objectives) && subsidy.objectives.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Thematic Objectives:</h4>
                          <div className="flex flex-wrap gap-2">
                            {subsidy.objectives.map((obj, idx) => (
                              <Badge key={idx} variant="outline">{obj}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Eligible Actions */}
                  {subsidy.eligible_actions && Array.isArray(subsidy.eligible_actions) && subsidy.eligible_actions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          Eligible Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {subsidy.eligible_actions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Ineligible Actions */}
                  {subsidy.ineligible_actions && Array.isArray(subsidy.ineligible_actions) && subsidy.ineligible_actions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-red-500" />
                          Excluded Actions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {subsidy.ineligible_actions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Program Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {subsidy.program && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Program</dt>
                          <dd className="text-sm">{subsidy.program}</dd>
                        </div>
                      )}
                      
                      {subsidy.funding_source && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Funding Source</dt>
                          <dd className="text-sm">{subsidy.funding_source}</dd>
                        </div>
                      )}

                      {subsidy.co_financing_rate && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Co-financing Rate</dt>
                          <dd className="text-sm">{subsidy.co_financing_rate}%</dd>
                        </div>
                      )}

                      {subsidy.project_duration && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Project Duration</dt>
                          <dd className="text-sm">{subsidy.project_duration}</dd>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Investment Types */}
                  {subsidy.investment_types && Array.isArray(subsidy.investment_types) && subsidy.investment_types.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Investment Types</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {subsidy.investment_types.map((type, idx) => (
                            <Badge key={idx} variant="secondary" className="mr-2">{type}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="eligibility" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Eligibility Criteria
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                      {subsidy.eligibility || 'No specific eligibility criteria provided.'}
                    </p>

                    {subsidy.beneficiary_types && Array.isArray(subsidy.beneficiary_types) && subsidy.beneficiary_types.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Eligible Beneficiary Types:</h4>
                        <div className="flex flex-wrap gap-2">
                          {subsidy.beneficiary_types.map((type, idx) => (
                            <Badge key={idx} variant="outline">{type}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {subsidy.legal_entity_type && Array.isArray(subsidy.legal_entity_type) && subsidy.legal_entity_type.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Legal Entity Types:</h4>
                        <div className="flex flex-wrap gap-2">
                          {subsidy.legal_entity_type.map((type, idx) => (
                            <Badge key={idx} variant="secondary">{type}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Special Cases */}
                {subsidy.conditional_eligibility && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Special Cases & Conditions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(subsidy.conditional_eligibility, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {/* Priority Groups */}
                {subsidy.priority_groups && Array.isArray(subsidy.priority_groups) && subsidy.priority_groups.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Priority Groups</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {subsidy.priority_groups.map((group, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>{typeof group === 'string' ? group : JSON.stringify(group)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="timing" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Application Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {subsidy.application_window_start && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Application Opens</dt>
                        <dd className="text-sm">{new Date(subsidy.application_window_start).toLocaleDateString()}</dd>
                      </div>
                    )}

                    {subsidy.application_window_end && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Application Closes</dt>
                        <dd className="text-sm">{new Date(subsidy.application_window_end).toLocaleDateString()}</dd>
                      </div>
                    )}

                    {subsidy.deadline && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Final Deadline</dt>
                        <dd className="text-sm font-semibold text-orange-600">
                          {new Date(subsidy.deadline).toLocaleDateString()}
                        </dd>
                      </div>
                    )}

                    {subsidy.submission_conditions && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Submission Conditions</dt>
                        <dd className="text-sm">{subsidy.submission_conditions}</dd>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment & Duration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {subsidy.payment_terms && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Payment Terms</dt>
                        <dd className="text-sm">{subsidy.payment_terms}</dd>
                      </div>
                    )}

                    {subsidy.project_duration && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Project Duration</dt>
                        <dd className="text-sm">{subsidy.project_duration}</dd>
                      </div>
                    )}

                    {subsidy.reporting_requirements && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Reporting Requirements</dt>
                        <dd className="text-sm">{subsidy.reporting_requirements}</dd>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="application" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Application Process
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subsidy.application_method && (
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Application Method:</h4>
                        <p className="text-sm text-gray-600">{subsidy.application_method}</p>
                      </div>
                    )}

                    {subsidy.questionnaire_steps && Array.isArray(subsidy.questionnaire_steps) && subsidy.questionnaire_steps.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Application Steps:</h4>
                        <ol className="space-y-3">
                          {subsidy.questionnaire_steps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                                {idx + 1}
                              </span>
                              <span className="text-sm">
                                {typeof step === 'string' ? step : JSON.stringify(step)}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileDown className="w-5 h-5" />
                      Required Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subsidy.application_requirements && Array.isArray(subsidy.application_requirements) && subsidy.application_requirements.length > 0 ? (
                      <ul className="space-y-3">
                        {subsidy.application_requirements.map((req, idx) => {
                          const key =
                            typeof req === 'string'
                              ? req
                              : req && typeof req === 'object' && 'requirement' in req
                              ? String(req.requirement)
                              : String(req);
                          return (
                            <li key={idx} className="flex items-start gap-2">
                              <FileText className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                              <span className="text-sm">{getRequirementLabel(key)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : subsidy.documents && Array.isArray(subsidy.documents) && subsidy.documents.length > 0 ? (
                      <ul className="space-y-3">
                        {subsidy.documents.map((doc, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <FileText className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                            <span className="text-sm">
                              {typeof doc === 'string' ? doc : (doc && typeof doc === 'object' && 'name' in doc ? String(doc.name) : `Document ${idx + 1}`)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No specific document requirements listed.</p>
                    )}

                    {subsidy.evaluation_criteria && (
                      <div className="mt-6 pt-4 border-t">
                        <h4 className="font-medium mb-2">Evaluation Criteria:</h4>
                        <p className="text-sm text-gray-600">{subsidy.evaluation_criteria}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default SubsidyDetailPage;
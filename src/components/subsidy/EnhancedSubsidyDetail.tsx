import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Clock, MapPin, Euro, Users, AlertCircle, Wand2 } from 'lucide-react';
import { formatFundingAmount, getSubsidyTitle, getSubsidyDescription, getRegionDisplay, getDeadlineStatus } from '@/utils/subsidyFormatting';
import { getRequirementLabel } from '@/utils/requirementLabels';
import useSubsidyFormGeneration, { SubsidyFormSchema } from '@/hooks/useSubsidyFormGeneration';
import DynamicSubsidyForm from './DynamicSubsidyForm';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface EnhancedSubsidyDetailProps {
  subsidy: any;
  farmId?: string;
  onApply?: (subsidyId: string) => void;
}

export const EnhancedSubsidyDetail: React.FC<EnhancedSubsidyDetailProps> = ({
  subsidy,
  farmId,
  onApply
}) => {
  const { toast } = useToast();
  const { 
    forms, 
    loading, 
    error, 
    generateFormFromSubsidy, 
    submitForm 
  } = useSubsidyFormGeneration();
  
  const [currentForm, setCurrentForm] = useState<SubsidyFormSchema | null>(null);
  const [showForm, setShowForm] = useState(false);

  const title = getSubsidyTitle(subsidy);
  const description = getSubsidyDescription(subsidy);
  const fundingAmount = formatFundingAmount(subsidy.amount);
  const regionDisplay = getRegionDisplay(subsidy.region);
  const deadlineStatus = getDeadlineStatus(subsidy.deadline);

  // Generate application form
  const handleGenerateForm = async () => {
    logger.debug('Generating application form for subsidy', { subsidyId: subsidy.id });
    
    try {
      const generatedForm = await generateFormFromSubsidy(subsidy.id);
      if (generatedForm) {
        setCurrentForm(generatedForm);
        setShowForm(true);
      }
    } catch (error) {
      logger.error('Error generating form:', error instanceof Error ? error : new Error(String(error)), { subsidyId: subsidy.id });
      
      toast({
        title: 'Form Generation Failed',
        description: 'Unable to generate application form. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle form submission
  const handleFormSubmit = async (formData: any) => {
    if (!currentForm) return;
    
    logger.debug('Submitting subsidy application', { formId: currentForm.id, farmId });
    
    try {
      const result = await submitForm(currentForm.id, formData, farmId);
      if (result) {
        setShowForm(false);
        onApply?.(subsidy.id);
      }
    } catch (error) {
      logger.error('Error submitting application:', error instanceof Error ? error : new Error(String(error)), { formId: currentForm.id });
    }
  };

  // Display form if generated
  if (showForm && currentForm) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Application Form</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => setShowForm(false)}
              >
                Back to Details
              </Button>
            </div>
          </CardHeader>
        </Card>
        
        <DynamicSubsidyForm
          schema={currentForm}
          onSubmit={handleFormSubmit}
          farmId={farmId}
          loading={loading}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Subsidy Information */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-xl">{title}</CardTitle>
              <p className="text-muted-foreground">{description}</p>
              
              {/* Key metrics */}
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center space-x-1">
                  <Euro className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{fundingAmount}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">{regionDisplay}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Clock className={`h-4 w-4 ${deadlineStatus.urgent ? 'text-red-500' : 'text-gray-500'}`} />
                  <span className={`text-sm ${deadlineStatus.urgent ? 'text-red-500 font-medium' : ''}`}>
                    {deadlineStatus.status}
                  </span>
                  {deadlineStatus.urgent && (
                    <Badge variant="destructive" className="text-xs">Urgent</Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col space-y-2 ml-4">
              <Button 
                onClick={handleGenerateForm}
                disabled={loading}
                className="flex items-center space-x-2"
              >
                <Wand2 className="h-4 w-4" />
                <span>{loading ? 'Generating...' : 'Generate Application'}</span>
              </Button>
              
              {subsidy.url && (
                <Button variant="outline" asChild>
                  <a href={subsidy.url} target="_blank" rel="noopener noreferrer">
                    View Official Page
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Eligibility & Requirements */}
      {(subsidy.eligibility || subsidy.legal_entity_type) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Eligibility Requirements</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subsidy.eligibility && (
              <div>
                <h4 className="font-medium mb-2">General Eligibility</h4>
                <p className="text-sm text-muted-foreground">{subsidy.eligibility}</p>
              </div>
            )}
            
            {subsidy.legal_entity_type && subsidy.legal_entity_type.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Eligible Entity Types</h4>
                <div className="flex flex-wrap gap-2">
                  {subsidy.legal_entity_type.map((type: string, index: number) => (
                    <Badge key={index} variant="secondary">{type}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Application Process */}
      {(subsidy.application_requirements || subsidy.documents) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Application Requirements</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Application Steps */}
            {subsidy.application_requirements && Array.isArray(subsidy.application_requirements) && (
              <div>
                <h4 className="font-medium mb-3">Application Steps</h4>
                <div className="space-y-3">
                  {subsidy.application_requirements.map((req: any, index: number) => (
                    <div key={index} className="border-l-2 border-blue-200 pl-4 py-2">
                      <div className="flex items-start space-x-2">
                        <Badge variant="outline" className="mt-0.5">
                          Step {index + 1}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm">{req.step_description}</p>
                          {req.required_files && Array.isArray(req.required_files) && req.required_files.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Required Files:</p>
                              <div className="flex flex-wrap gap-1">
                                {req.required_files.map((file: string, fileIndex: number) => (
                                  <Badge key={fileIndex} variant="secondary" className="text-xs">
                                    {getRequirementLabel(file)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {req.web_portal && (
                            <div className="mt-2">
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
            )}

            {subsidy.application_requirements && subsidy.documents && <Separator />}

            {/* Required Documents */}
            {subsidy.documents && Array.isArray(subsidy.documents) && subsidy.documents.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Required Documents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {subsidy.documents.map((doc: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{getRequirementLabel(doc)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sectors & Objectives */}
        {(subsidy.sector || subsidy.objectives) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Focus Areas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subsidy.sector && subsidy.sector.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Sectors</h4>
                  <div className="flex flex-wrap gap-1">
                    {subsidy.sector.map((sector: string, index: number) => (
                      <Badge key={index} variant="outline">{sector}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {subsidy.objectives && subsidy.objectives.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Objectives</h4>
                  <div className="space-y-1">
                    {subsidy.objectives.map((objective: string, index: number) => (
                      <p key={index} className="text-sm text-muted-foreground">• {objective}</p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact & Agency Information */}
        {subsidy.agency && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Program Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium">Managing Agency</h4>
                <p className="text-sm text-muted-foreground">{subsidy.agency}</p>
              </div>
              
              {subsidy.program && (
                <div>
                  <h4 className="font-medium">Program</h4>
                  <p className="text-sm text-muted-foreground">{subsidy.program}</p>
                </div>
              )}
              
              {subsidy.language && (
                <div>
                  <h4 className="font-medium">Language</h4>
                  <Badge variant="secondary">{subsidy.language.toUpperCase()}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Extraction Metadata */}
      {subsidy.audit && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Extraction Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Extracted:</span>
                <p>{new Date(subsidy.audit.extracted_at || subsidy.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="font-medium">Method:</span>
                <p>{subsidy.audit.extraction_method || 'AI'}</p>
              </div>
              <div>
                <span className="font-medium">Source:</span>
                <p>{subsidy.audit.source_file || 'Web scraping'}</p>
              </div>
              {subsidy.audit.confidence_scores && (
                <div>
                  <span className="font-medium">Confidence:</span>
                  <p>{(() => {
                    const scores = Object.values(subsidy.audit.confidence_scores) as number[];
                    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100);
                  })()}%</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedSubsidyDetail;
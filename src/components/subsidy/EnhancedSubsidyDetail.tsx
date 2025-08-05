import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Clock, MapPin, Euro, Users, AlertCircle, Wand2 } from 'lucide-react';
import { formatFundingAmount, getSubsidyTitle, getSubsidyDescription, getRegionDisplay, getDeadlineStatus, getSectorDisplay, formatFilterLabel } from '@/utils/subsidyFormatting';
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
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      {/* Header with title and action button */}
      <div className="flex items-start justify-between border-b pb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-4">{title}</h1>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Euro className="h-4 w-4 text-green-600" />
              <span className="font-medium">{fundingAmount}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span>{regionDisplay}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className={`h-4 w-4 ${deadlineStatus.urgent ? 'text-red-500' : 'text-gray-500'}`} />
              <span className={deadlineStatus.urgent ? 'text-red-500 font-medium' : ''}>
                {deadlineStatus.status}
              </span>
              {deadlineStatus.urgent && (
                <Badge variant="destructive" className="text-xs ml-2">Urgent</Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col space-y-2">
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

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Presentation Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-primary">Presentation</h2>
        <div className="prose prose-gray max-w-none">
          <div className="text-base leading-relaxed whitespace-pre-line">
            {subsidy.description || description}
          </div>
        </div>
      </div>

      <Separator className="my-8" />

      {/* For Who Section */}
      {(subsidy.eligibility || subsidy.legal_entity_type) && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-primary">For Who</h2>
          <div className="space-y-4">
            {subsidy.eligibility && (
              <div className="prose prose-gray max-w-none">
                <div className="text-base leading-relaxed whitespace-pre-line">
                  {subsidy.eligibility}
                </div>
              </div>
            )}
            
            {subsidy.legal_entity_type && subsidy.legal_entity_type.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 text-lg">Eligible Entity Types:</h3>
                <div className="flex flex-wrap gap-2">
                  {subsidy.legal_entity_type.map((type: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-sm">{type}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(subsidy.eligibility || subsidy.legal_entity_type) && <Separator className="my-8" />}

      {/* When Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-primary">When</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Clock className={`h-5 w-5 ${deadlineStatus.urgent ? 'text-red-500' : 'text-gray-500'}`} />
            <span className={`text-lg ${deadlineStatus.urgent ? 'text-red-500 font-medium' : ''}`}>
              Application deadline: {deadlineStatus.status}
            </span>
            {deadlineStatus.urgent && (
              <Badge variant="destructive">Urgent</Badge>
            )}
          </div>
          {subsidy.deadline && (
            <p className="text-muted-foreground">
              Submit your application before {new Date(subsidy.deadline).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {/* How Section */}
      {(subsidy.application_requirements || subsidy.documents) && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-primary">How to Apply</h2>
          
          {/* Application Requirements */}
          {subsidy.application_requirements && (
            <div className="space-y-4">
              {Array.isArray(subsidy.application_requirements) ? (
                <div className="space-y-6">
                  <h3 className="font-medium text-lg">Application Steps:</h3>
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
                                  {req.required_files.map((file: string, fileIndex: number) => (
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
                  <div className="text-base leading-relaxed whitespace-pre-line">
                    {subsidy.application_requirements}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Required Documents */}
          {subsidy.documents && Array.isArray(subsidy.documents) && subsidy.documents.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Required Documents:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {subsidy.documents.map((doc: string, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="text-sm">{getRequirementLabel(doc)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Context Information */}
      {(subsidy.sector || subsidy.objectives || subsidy.agency) && (
        <>
          <Separator className="my-8" />
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-primary">Additional Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Sectors & Objectives */}
              {(subsidy.sector || subsidy.objectives) && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Focus Areas</h3>
                  {subsidy.sector && getSectorDisplay(subsidy.sector).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Sectors:</h4>
                      <div className="flex flex-wrap gap-2">
                        {getSectorDisplay(subsidy.sector).map((sector: string, index: number) => (
                          <Badge key={index} variant="outline">{sector}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {subsidy.objectives && subsidy.objectives.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Objectives:</h4>
                      <div className="space-y-1">
                        {subsidy.objectives.map((objective: string, index: number) => (
                          <p key={index} className="text-sm text-muted-foreground">• {objective}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Program Information */}
              {subsidy.agency && (
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Program Information</h3>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">Managing Agency:</h4>
                      <p className="text-muted-foreground">{subsidy.agency}</p>
                    </div>
                    
                    {subsidy.program && (
                      <div>
                        <h4 className="font-medium">Program:</h4>
                        <p className="text-muted-foreground">{subsidy.program}</p>
                      </div>
                    )}
                    
                    {subsidy.language && (
                      <div>
                        <h4 className="font-medium">Language:</h4>
                        <Badge variant="secondary">{subsidy.language.toUpperCase()}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Extraction Metadata */}
      {subsidy.audit && (
        <div className="mt-12 pt-6 border-t border-dashed">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Extraction Information</h3>
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
        </div>
      )}
    </div>
  );
};

export default EnhancedSubsidyDetail;
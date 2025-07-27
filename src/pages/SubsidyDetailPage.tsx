import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, MapPin, Euro, Building2, FileText, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const handleApply = () => {
    if (!subsidy) return;
    
    setIsApplying(true);
    
    // TODO: Implement application logic here
    // For now, just show a toast
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
          <div className="container mx-auto max-w-4xl">
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
          <div className="container mx-auto max-w-4xl">
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
        <div className="container mx-auto max-w-4xl">
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
            
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  {subsidy.title === 'Subsidy Page' || !subsidy.title 
                    ? `${subsidy.agency || 'Agricultural'} Funding Program` + (subsidy.sector ? ` - ${subsidy.sector}` : '')
                    : subsidy.title
                  }
                </h1>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {subsidy.sector && (
                    <Badge variant="secondary">{subsidy.sector}</Badge>
                  )}
                  {subsidy.funding_type && (
                    <Badge variant="outline">{subsidy.funding_type}</Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  {subsidy.deadline && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Deadline: {new Date(subsidy.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  {subsidy.region && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{Array.isArray(subsidy.region) ? subsidy.region.join(', ') : subsidy.region}</span>
                    </div>
                  )}
                  {subsidy.amount && (
                    <div className="flex items-center gap-1">
                      <Euro className="w-4 h-4" />
                      <span>€{subsidy.amount.toLocaleString()}</span>
                    </div>
                  )}
                  {subsidy.agency && (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      <span>{subsidy.agency}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleApply}
                  disabled={isApplying}
                  className="min-w-[120px]"
                >
                  {isApplying ? 'Applying...' : 'Apply Now'}
                </Button>
                
                {subsidy.url && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(subsidy.url, '_blank')}
                    className="min-w-[120px]"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Source
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {subsidy.description || 'No description available.'}
                  </p>
                </CardContent>
              </Card>

              {/* Eligibility */}
              {subsidy.eligibility && (
                <Card>
                  <CardHeader>
                    <CardTitle>Eligibility Criteria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {subsidy.eligibility}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Application Requirements */}
              {subsidy.application_requirements && Array.isArray(subsidy.application_requirements) && subsidy.application_requirements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Application Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {subsidy.application_requirements.map((req: any, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {typeof req === 'string' ? req : req.requirement || 'Requirement'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Key Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subsidy.program && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Program</dt>
                      <dd className="text-sm">{subsidy.program}</dd>
                    </div>
                  )}
                  
                  {subsidy.funding_source && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Funding Source</dt>
                      <dd className="text-sm">{subsidy.funding_source}</dd>
                    </div>
                  )}

                  {subsidy.project_duration && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Project Duration</dt>
                      <dd className="text-sm">{subsidy.project_duration}</dd>
                    </div>
                  )}

                  {subsidy.co_financing_rate && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Co-financing Rate</dt>
                      <dd className="text-sm">{subsidy.co_financing_rate}%</dd>
                    </div>
                  )}

                  {subsidy.application_method && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Application Method</dt>
                      <dd className="text-sm">{subsidy.application_method}</dd>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Documents */}
              {subsidy.documents && Array.isArray(subsidy.documents) && subsidy.documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Related Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {subsidy.documents.map((doc: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {typeof doc === 'string' ? doc : doc.name || `Document ${index + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubsidyDetailPage;
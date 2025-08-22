import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClientTypeSelector, ClientType } from '@/components/client-types/ClientTypeSelector';
import { SubsidyMatchList } from '@/components/matching/SubsidyMatchList';
import { EligibilityIndicator } from '@/components/matching/EligibilityIndicator';
import { useSubsidyMatching } from '@/hooks/useSubsidyMatching';
import { Loader2, Search, ArrowRight, FileText } from 'lucide-react';

const ClientTypePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedClientType, setSelectedClientType] = useState<ClientType | undefined>();
  const [step, setStep] = useState<'select' | 'matching' | 'results'>('select');
  
  // Get URL parameters for auto-detection
  const detectedType = searchParams.get('detectedType') as ClientType;
  const detectionConfidence = Number(searchParams.get('confidence')) || 0;
  const documentId = searchParams.get('documentId');
  
  const { 
    matches, 
    isMatching, 
    error, 
    totalMatches,
    eligibleCount,
    findMatches,
    clearMatches 
  } = useSubsidyMatching();

  useEffect(() => {
    // If we have auto-detected type with high confidence, pre-select it
    if (detectedType && detectionConfidence > 70) {
      setSelectedClientType(detectedType);
    }
  }, [detectedType, detectionConfidence]);

  const handleTypeSelect = (type: ClientType) => {
    setSelectedClientType(type);
  };

  const handleFindMatches = async () => {
    if (!selectedClientType) return;
    
    setStep('matching');
    const results = await findMatches(undefined, selectedClientType);
    
    if (results.length > 0) {
      setStep('results');
    }
  };

  const handleStartOver = () => {
    setStep('select');
    setSelectedClientType(undefined);
    clearMatches();
  };

  const handleViewDetails = (subsidyId: string) => {
    navigate(`/subsidies/${subsidyId}`);
  };

  const handleStartApplication = (subsidyId: string) => {
    navigate(`/application/form?subsidyId=${subsidyId}&clientType=${selectedClientType}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Find Your Perfect Subsidies
          </h1>
          <p className="text-lg text-gray-600">
            Tell us about your organization to discover matching funding opportunities
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              step === 'select' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}>
              <FileText className="w-4 h-4" />
              Select Type
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              step === 'matching' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}>
              <Search className="w-4 h-4" />
              Find Matches
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              step === 'results' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}>
              <ArrowRight className="w-4 h-4" />
              View Results
            </div>
          </div>
        </div>

        {/* Content based on current step */}
        {step === 'select' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                What type of organization are you?
              </CardTitle>
              <CardDescription>
                Choose your organization type to get personalized subsidy recommendations.
                {detectedType && detectionConfidence > 60 && (
                  <span className="block mt-2 text-blue-600">
                    We detected this might be a <strong>{detectedType}</strong> profile based on your document.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientTypeSelector
                selectedType={selectedClientType}
                onTypeSelect={handleTypeSelect}
                detectedType={detectedType}
                detectionConfidence={detectionConfidence}
              />
              
              {selectedClientType && (
                <div className="flex justify-center mt-6">
                  <Button 
                    onClick={handleFindMatches}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Find Matching Subsidies
                    <Search className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 'matching' && (
          <Card className="mb-6">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Finding Your Matches</h3>
              <p className="text-gray-600 text-center max-w-md">
                We're analyzing thousands of subsidies to find the best matches for your{' '}
                <span className="font-medium">{selectedClientType}</span> profile...
              </p>
            </CardContent>
          </Card>
        )}

        {step === 'results' && (
          <div className="space-y-6">
            {/* Results Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="w-5 h-5" />
                      Matching Results
                    </CardTitle>
                    <CardDescription>
                      Found {totalMatches} subsidies for <strong>{selectedClientType}</strong> organizations
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={handleStartOver}>
                    Start Over
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {eligibleCount > 0 && (
                  <Alert className="mb-4">
                    <AlertDescription>
                      🎉 Great news! You're eligible for {eligibleCount} subsidies. 
                      Start with the highest-matching ones for the best chance of success.
                    </AlertDescription>
                  </Alert>
                )}
                
                {matches.length > 0 && matches[0].matchScore >= 70 && (
                  <EligibilityIndicator
                    matchScore={matches[0].matchScore}
                    eligibilityStatus={matches[0].eligibilityStatus}
                    matchDetails={matches[0].matchDetails}
                    missingRequirements={matches[0].missingRequirements}
                    className="mb-4"
                  />
                )}
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Match Results */}
            <SubsidyMatchList
              matches={matches}
              isLoading={isMatching}
              onViewDetails={handleViewDetails}
              onStartApplication={handleStartApplication}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientTypePage;
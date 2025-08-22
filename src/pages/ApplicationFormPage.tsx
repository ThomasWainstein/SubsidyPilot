import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DynamicFormRenderer } from '@/components/forms/DynamicFormRenderer';
import { useFormGeneration } from '@/hooks/useFormGeneration';
import { Loader2, FileText, Sparkles, ArrowLeft, Save, Send } from 'lucide-react';

const ApplicationFormPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<'loading' | 'generating' | 'prefilling' | 'form' | 'submitting'>('loading');
  
  const subsidyId = searchParams.get('subsidyId');
  const clientType = searchParams.get('clientType');
  const clientProfileId = searchParams.get('clientProfileId');
  
  const {
    formSchema,
    formData,
    statistics,
    isGenerating,
    isPreFilling,
    error,
    generateForm,
    preFillForm,
    updateFormData,
    validateForm
  } = useFormGeneration();

  useEffect(() => {
    const initializeForm = async () => {
      if (!subsidyId || !clientType) {
        navigate('/client-types');
        return;
      }

      try {
        setStep('generating');
        const schema = await generateForm(subsidyId, clientType, clientProfileId);
        if (!schema) return;

        if (clientProfileId) {
          setStep('prefilling');
          await preFillForm(schema, clientProfileId, 'comprehensive');
        }

        setStep('form');
      } catch (err) {
        console.error('Form initialization failed:', err);
        setStep('form');
      }
    };

    initializeForm();
  }, [subsidyId, clientType, clientProfileId, generateForm, preFillForm, navigate]);

  const handleFieldChange = (fieldId: string, value: any) => {
    updateFormData(fieldId, value);
  };

  const handleSubmitApplication = async () => {
    setStep('submitting');
    const validation = validateForm();
    if (!validation.isValid) {
      setStep('form');
      return;
    }

    try {
      console.log('Submitting application...', formData);
      await new Promise(resolve => setTimeout(resolve, 2000));
      navigate(`/application/success?subsidyId=${subsidyId}`);
    } catch (err) {
      console.error('Application submission failed:', err);
      setStep('form');
    }
  };

  const validation = validateForm();

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/client-types')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Client Types
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/client-types')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Application Form</h1>
              <p className="text-gray-600">Complete your subsidy application</p>
            </div>
          </div>
        </div>

        {step !== 'form' && (
          <Card className="mb-6">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              {step === 'generating' && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Generating Your Form</h3>
                  <p className="text-gray-600 text-center max-w-md">
                    Creating a personalized application form...
                  </p>
                </>
              )}
              {step === 'prefilling' && (
                <>
                  <h3 className="text-lg font-semibold mb-2">Smart Pre-filling</h3>
                  <p className="text-gray-600 text-center max-w-md">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    Automatically completing fields...
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {statistics && step === 'form' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Smart Pre-fill Results
              </CardTitle>
              <CardDescription>
                We've automatically completed {statistics.completionPercentage}% of your form
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{statistics.completionPercentage}%</div>
                  <div className="text-sm text-gray-600">Pre-filled</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{statistics.directMappings}</div>
                  <div className="text-sm text-gray-600">Direct matches</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{statistics.aiGeneratedCount || 0}</div>
                  <div className="text-sm text-gray-600">AI generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{statistics.totalFields}</div>
                  <div className="text-sm text-gray-600">Total fields</div>
                </div>
              </div>
              <Progress value={statistics.completionPercentage} className="mt-4" />
            </CardContent>
          </Card>
        )}

        {step === 'form' && formSchema && (
          <DynamicFormRenderer
            formSchema={formSchema}
            formData={formData}
            preFilledFields={statistics?.mappedFields || []}
            errors={validation.errors}
            onChange={handleFieldChange}
            onSubmit={handleSubmitApplication}
            isSubmitting={false}
          />
        )}

        {step === 'submitting' && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Submitting Application</h3>
              <p className="text-gray-600 text-center max-w-md">
                Processing your subsidy application...
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ApplicationFormPage;
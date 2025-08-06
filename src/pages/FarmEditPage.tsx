import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form } from '@/components/ui/form';
import { Save, Upload, ArrowLeft, AlertCircle } from 'lucide-react';
import { useFarmProfileUpdate } from '@/hooks/useFarmProfileUpdate';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import FarmCreationFormSections from '@/components/farm/FarmCreationFormSections';
import EnhancedDocumentUpload from '@/components/farm/EnhancedDocumentUpload';

const FarmEditPage: React.FC = () => {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [prefillApplied, setPrefillApplied] = useState(false);

  if (!farmId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Farm Not Found</h1>
          <p className="text-muted-foreground mb-4">The farm ID is missing or invalid.</p>
          <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  const {
    form,
    farm,
    farmLoading,
    isExtracting,
    pendingExtractions,
    saveFarmProfile,
    applyExtractionToForm
  } = useFarmProfileUpdate({
    farmId,
    enableAutoExtraction: true,
    mergeStrategy: 'merge'
  });

  // Handle prefill from URL parameters
  useEffect(() => {
    const shouldPrefill = searchParams.get('prefill') === 'true';
    const extractionId = searchParams.get('extractionId');
    
    if (shouldPrefill && extractionId && !prefillApplied && !farmLoading) {
      console.log('🔄 Applying prefill for extraction:', extractionId);
      
      // Apply the extraction data
      applyExtractionToForm(extractionId, 'merge')
        .then(() => {
          setPrefillApplied(true);
          setHasUnsavedChanges(true);
          toast.success('Farm profile prefilled with extracted data');
          
          // Clean up URL parameters
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('prefill');
          newSearchParams.delete('extractionId');
          setSearchParams(newSearchParams, { replace: true });
        })
        .catch((error) => {
          console.error('Failed to apply prefill:', error);
          toast.error('Failed to apply extracted data');
        });
    }
  }, [searchParams, prefillApplied, farmLoading, applyExtractionToForm, setSearchParams]);

  // Track form changes
  React.useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleSave = async () => {
    try {
      const formData = form.getValues();
      await saveFarmProfile(formData);
      setHasUnsavedChanges(false);
      toast.success('Farm profile saved successfully');
    } catch (error) {
      toast.error('Failed to save farm profile');
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate(`/farm/${farmId}`);
      }
    } else {
      navigate(`/farm/${farmId}`);
    }
  };

  const handleProfileUpdated = () => {
    setHasUnsavedChanges(false);
    toast.success('Farm profile updated with extracted data');
  };

  if (farmLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading farm data...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Profile
                  </Button>
                </div>
                <h1 className="text-2xl font-bold">Edit Farm Profile</h1>
                <p className="text-muted-foreground">{farm?.name}</p>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>

            <div className="flex gap-4 mt-4">
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">You have unsaved changes</span>
                </div>
              )}
              
              {isExtracting && (
                <div className="flex items-center gap-2 text-blue-600">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm">Processing document extractions...</span>
                </div>
              )}
              
              {pendingExtractions.length > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">{pendingExtractions.length} pending extraction(s)</span>
                </div>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Farm Profile</TabsTrigger>
              <TabsTrigger value="documents">Documents & Extraction</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Farm Information</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Update your farm profile information. Changes will be saved when you submit.
                  </p>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                      <FarmCreationFormSections form={form} />
                      
                      <div className="flex justify-end gap-4 pt-6 border-t">
                        <Button type="button" variant="outline" onClick={handleCancel}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={!hasUnsavedChanges}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <EnhancedDocumentUpload
                farmId={farmId}
                onProfileUpdated={handleProfileUpdated}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default FarmEditPage;
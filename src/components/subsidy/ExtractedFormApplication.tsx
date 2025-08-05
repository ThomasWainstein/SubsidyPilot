import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, AlertCircle, CheckCircle, Clock, Users } from 'lucide-react';
import DynamicSubsidyForm from './DynamicSubsidyForm';
import { useExtractedFormSchema } from '@/hooks/useExtractedFormSchema';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface ExtractedFormApplicationProps {
  subsidyId: string;
  subsidyTitle: string;
  farmId?: string;
}

export const ExtractedFormApplication: React.FC<ExtractedFormApplicationProps> = ({
  subsidyId,
  subsidyTitle,
  farmId
}) => {
  const [user, setUser] = useState<any>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);
  const { schema, loading, error, fetchExtractedSchema, submitApplication, saveAsDraft } = useExtractedFormSchema();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  // Fetch schema when component mounts or when dialog opens
  useEffect(() => {
    if (!hasAttemptedFetch) {
      fetchExtractedSchema(subsidyId);
      setHasAttemptedFetch(true);
    }
  }, [subsidyId, fetchExtractedSchema, hasAttemptedFetch]);

  const handleFormSubmit = async (formData: any) => {
    try {
      logger.debug('Submitting extracted form application', { subsidyId, farmId });
      
      const applicationId = await submitApplication(formData, farmId);
      
      if (applicationId) {
        setIsDialogOpen(false);
        logger.debug('Application submitted successfully', { applicationId });
      }
    } catch (err) {
      logger.error('Error submitting application:', err instanceof Error ? err : new Error(String(err)));
    }
  };

  // Loading state
  if (loading && !hasAttemptedFetch) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Application Form</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Loading form schema...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state or no schema available
  if (error || !schema) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Application Form</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'No application form available for this subsidy. The form schema may not have been extracted yet.'}
            </AlertDescription>
          </Alert>
          
          {!user && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Please sign in to access application forms</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const totalFields = schema.sections.reduce((total, section) => total + section.fields.length, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Application Form</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {schema.sections.length} sections
            </Badge>
            <Badge variant="outline">
              {totalFields} fields
            </Badge>
            {schema.metadata.confidenceScore && (
              <Badge variant="secondary">
                {Math.round(schema.metadata.confidenceScore * 100)}% confidence
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Dynamic application form extracted from official documents</p>
          <p className="mt-1">
            Form generated: {new Date(schema.metadata.generatedAt).toLocaleDateString()}
            {schema.metadata.version && ` • Version ${schema.metadata.version}`}
          </p>
        </div>

        {/* Form sections preview */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Form Sections:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {schema.sections.map((section) => (
              <div key={section.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                <span>{section.title}</span>
                <Badge variant="outline" className="text-xs">
                  {section.fields.length} fields
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Authentication check */}
        {!user ? (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              Please sign in to start your application. You'll be able to save drafts and submit when ready.
            </AlertDescription>
          </Alert>
        ) : !farmId ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please create a farm profile first to apply for subsidies. This helps us pre-fill relevant information.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Ready to apply • Auto-save enabled</span>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" size="lg">
                  <FileText className="h-4 w-4 mr-2" />
                  Start Application
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>{schema.title}</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto max-h-[80vh] pr-6">
                  <DynamicSubsidyForm
                    schema={schema}
                    onSubmit={handleFormSubmit}
                    farmId={farmId}
                    loading={loading}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Additional features */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Auto-save drafts</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">PDF export ready</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Real-time validation</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExtractedFormApplication;
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
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Application Form</h3>
        </div>

        {/* Loading Message */}
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">Loading form schema...</span>
        </div>
      </div>
    );
  }

  // Error state or no schema available
  if (error || !schema) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Application Form</h3>
        </div>

        {/* Info Message */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            No application form available for this subsidy. The form schema may not have been extracted yet.
          </p>
        </div>

        {/* Authentication Message */}
        {!user && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Please sign in to access application forms</span>
          </div>
        )}
      </div>
    );
  }

  const totalFields = schema.sections.reduce((total, section) => total + section.fields.length, 0);

  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Application Form</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {schema.sections.length} sections
          </Badge>
          <Badge variant="outline" className="text-xs">
            {totalFields} fields
          </Badge>
          {schema.metadata.confidenceScore && (
            <Badge variant="secondary" className="text-xs">
              {Math.round(schema.metadata.confidenceScore * 100)}% confidence
            </Badge>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>Dynamic application form extracted from official documents</p>
        <p>
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
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Please sign in to start your application. You'll be able to save drafts and submit when ready.
          </p>
        </div>
      ) : !farmId ? (
        <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-orange-700 dark:text-orange-300">
            Please create a farm profile first to apply for subsidies. This helps us pre-fill relevant information.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Ready to apply • Auto-save enabled</span>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg">
                <FileText className="w-4 h-4 mr-2" />
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
      <div className="pt-4 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Auto-save drafts</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">PDF export ready</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Real-time validation</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtractedFormApplication;
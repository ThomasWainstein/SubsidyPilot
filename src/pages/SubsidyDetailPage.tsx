import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/language';
import { useHybridExtraction } from '@/hooks/useHybridExtraction';
import { DetailedSubsidyDisplay } from '@/components/subsidy/DetailedSubsidyDisplay';
import ExtractedFormApplication from '@/components/subsidy/ExtractedFormApplication';
import { EnhancedExtractionTrigger } from '@/components/admin/EnhancedExtractionTrigger';
import { SchemaExtractionStatus } from '@/components/subsidy/SchemaExtractionStatus';
import { parseDocumentContent, extractStructuredData, DocumentContent } from '@/utils/documentParser';
import { extractSubsidyData, ExtractedSubsidyData } from '@/lib/extraction/source-extractors';
import { RichContentDisplay } from '@/components/subsidy/RichContentDisplay';
import { EnhancedSubsidy, isEnhancedSubsidy } from '@/types/enhanced-subsidy';
import { mapLegacyToEnhanced } from '@/utils/subsidyDataMapper';
import { toast } from 'sonner';

const SubsidyDetailPage = () => {
  const { subsidyId } = useParams<{ subsidyId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [extractedData, setExtractedData] = useState<Partial<DocumentContent>>({});
  const [richExtractedData, setRichExtractedData] = useState<ExtractedSubsidyData | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userFarms, setUserFarms] = useState<any[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  // Get current user and their farms
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user) {
        const { data: farms, error } = await supabase
          .from('farms')
          .select('*')
          .eq('user_id', user.id);
        
        if (!error && farms) {
          setUserFarms(farms);
        }
      }
    };

    getCurrentUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user || null);
      if (!session?.user) {
        setUserFarms([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: subsidy, isLoading, error } = useQuery({
    queryKey: ['subsidy', subsidyId],
    queryFn: async () => {
      // First try subsidies_structured table
      const { data: structuredData, error: structuredError } = await supabase
        .from('subsidies_structured')
        .select('*')
        .eq('id', subsidyId)
        .maybeSingle();

      if (structuredData) return structuredData;

      // If not found, try the subsidies table (API-sourced subsidies)
      const { data: subsidyData, error: subsidyError } = await supabase
        .from('subsidies')
        .select('*')
        .eq('id', subsidyId)
        .maybeSingle();

      if (subsidyData) return subsidyData;

      // If not found in either table, throw error
      throw new Error('Subsidy not found');
    },
    enabled: !!subsidyId
  });

  // Enhanced document extraction with AI
  useEffect(() => {
    const performExtraction = async () => {
      if (!subsidy) return;
      
      setIsExtracting(true);
      try {
        // Use source-aware extraction instead of mock data
        const richData = extractSubsidyData(subsidy);
        setRichExtractedData(richData);
        
        // Legacy extraction for backward compatibility (now safely returns empty)
        const legacyData = await extractStructuredData('');
        setExtractedData(legacyData);
        
        toast.success('Subsidy data processed', {
          description: `Loaded ${richData.agency} subsidy information`
        });
      } catch (error) {
        console.error('Extraction failed:', error);
        toast.error('Data processing failed', {
          description: 'Could not process subsidy information'
        });
      } finally {
        setIsExtracting(false);
      }
    };

    performExtraction();
  }, [subsidy]);

  if (isLoading || isExtracting) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow py-6 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-center mt-2 text-muted-foreground">
              {isLoading ? 'Loading subsidy details...' : 'Analyzing document for comprehensive details...'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !subsidy) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow py-6 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">Subsidy Not Found</h2>
              <p className="text-muted-foreground mb-4">The requested subsidy could not be found.</p>
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
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow">
        {/* Use the DetailedSubsidyDisplay for all subsidy formats */}
        <DetailedSubsidyDisplay 
          subsidy={subsidy} 
          onBack={() => navigate('/search')}
        />
        
        {/* Additional content sections - positioned below the detailed display */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Rich Content Display for Les Aides data */}
              {richExtractedData && (
                <RichContentDisplay 
                  extractedData={richExtractedData} 
                  originalData={subsidy}
                />
              )}
              
              {/* Schema Extraction Status */}
              <SchemaExtractionStatus
                subsidyId={subsidyId!}
                title="Application Form Schema"
                autoRefresh={true}
                showDetails={true}
              />
              
              {/* Enhanced Data Extraction */}
              {((subsidy as any).url || (subsidy as any).application_url) && (
                <EnhancedExtractionTrigger 
                  subsidyUrl={(subsidy as any).url || (subsidy as any).application_url}
                  subsidyTitle={(subsidy as any).title || 'Subsidy Program'}
                  onSuccess={() => navigate(0)}
                />
              )}
              
              {/* Application Form Section */}
              <ExtractedFormApplication
                subsidyId={subsidyId!}
                subsidyTitle={(subsidy as any).title || 'Subsidy Program'}
                farmId={userFarms.length > 0 ? userFarms[0].id : undefined}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SubsidyDetailPage;
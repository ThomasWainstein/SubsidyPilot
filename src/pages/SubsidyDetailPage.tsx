import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { DetailedSubsidyDisplay } from '@/components/subsidy/DetailedSubsidyDisplay';
import { extractSubsidyData, ExtractedSubsidyData } from '@/lib/extraction/source-extractors';
import { RichContentDisplay } from '@/components/subsidy/RichContentDisplay';
import { toast } from 'sonner';

const SubsidyDetailPage = () => {
  const { subsidyId } = useParams<{ subsidyId: string }>();
  const navigate = useNavigate();
  const [richExtractedData, setRichExtractedData] = useState<ExtractedSubsidyData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

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

  // Enhanced document extraction
  useEffect(() => {
    const performExtraction = async () => {
      if (!subsidy) return;
      
      setIsExtracting(true);
      try {
        // Use source-aware extraction for rich content
        const richData = extractSubsidyData(subsidy);
        setRichExtractedData(richData);
        
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
        
        {/* Pass rich extracted data to DetailedSubsidyDisplay for integrated display */}
        {richExtractedData && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <RichContentDisplay 
              extractedData={richExtractedData} 
              originalData={subsidy}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default SubsidyDetailPage;
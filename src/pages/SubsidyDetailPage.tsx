import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { DetailedSubsidyDisplay } from '@/components/subsidy/DetailedSubsidyDisplay';
import SubsidyDetailErrorBoundary from '@/components/error/SubsidyDetailErrorBoundary';
import { SubsidyDetailSkeleton } from '@/components/ui/SubsidyLoadingSkeleton';

const SubsidyDetailPage = () => {
  const { subsidyId } = useParams<{ subsidyId: string }>();
  const navigate = useNavigate();

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <SubsidyDetailSkeleton />
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
    <SubsidyDetailErrorBoundary subsidyId={subsidyId}>
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow">
          <DetailedSubsidyDisplay 
            subsidy={subsidy} 
            onBack={() => navigate('/search')}
          />
        </main>
      </div>
    </SubsidyDetailErrorBoundary>
  );
};

export default SubsidyDetailPage;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CompleteSubsidyDisplay } from '@/components/subsidy/CompleteSubsidyDisplay';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RawSubsidyContent {
  id: string;
  source_url: string;
  raw_text: string;
  raw_html?: string;
  combined_content_markdown?: string;
  sections_jsonb?: any;
  attachments_jsonb?: any;
  scrape_date: string;
  status: string;
}

const SubsidyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [subsidyData, setSubsidyData] = useState<RawSubsidyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('ID de subvention manquant');
      setLoading(false);
      return;
    }

    fetchSubsidyData(id);
  }, [id]);

  const fetchSubsidyData = async (subsidyId: string) => {
    try {
      setLoading(true);
      setError(null);

      // First try to get from raw_scraped_pages
      const { data: rawData, error: rawError } = await supabase
        .from('raw_scraped_pages')
        .select(`
          id,
          source_url,
          raw_text,
          raw_html,
          combined_content_markdown,
          sections_jsonb,
          attachments_jsonb,
          scrape_date,
          status
        `)
        .eq('id', subsidyId)
        .single();

      if (rawError) {
        throw new Error(`Erreur lors de la récupération des données: ${rawError.message}`);
      }

      if (!rawData) {
        throw new Error('Aucune donnée trouvée pour cet ID');
      }

      setSubsidyData(rawData);
    } catch (err) {
      console.error('Error fetching subsidy data:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Chargement des données...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l'administration
        </Button>
        
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-destructive mb-2">Erreur</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => id && fetchSubsidyData(id)}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!subsidyData) {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l'administration
        </Button>
        
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Aucune donnée</h2>
          <p className="text-muted-foreground">Aucune information trouvée pour cette subvention.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l'administration
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Dernière mise à jour: {new Date(subsidyData.scrape_date).toLocaleString('fr-FR')}
        </div>
      </div>

      {/* Complete Subsidy Display */}
      <CompleteSubsidyDisplay data={subsidyData} />
    </div>
  );
};

export default SubsidyDetail;
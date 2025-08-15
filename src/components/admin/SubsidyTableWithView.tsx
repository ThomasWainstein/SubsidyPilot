import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, ExternalLink, Calendar, FileText, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface RawSubsidyData {
  id: string;
  source_url: string;
  scrape_date: string;
  status: string;
  raw_text: string;
  source_site: string;
}

export const SubsidyTableWithView: React.FC = () => {
  const [subsidies, setSubsidies] = useState<RawSubsidyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubsidies();
  }, []);

  const fetchSubsidies = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('raw_scraped_pages')
        .select('id, source_url, scrape_date, status, raw_text, source_site')
        .order('scrape_date', { ascending: false })
        .limit(100);

      if (fetchError) {
        throw new Error(`Erreur lors de la récupération: ${fetchError.message}`);
      }

      setSubsidies(data || []);
    } catch (err) {
      console.error('Error fetching subsidies:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      toast.error('Erreur lors du chargement des subventions');
    } finally {
      setLoading(false);
    }
  };

  const extractTitle = (rawText: string) => {
    // Extract title from raw text
    const lines = rawText.split('\n').filter(line => line.trim());
    for (const line of lines.slice(0, 10)) {
      if (line.length > 20 && line.length < 200 && !line.includes('|')) {
        return line.trim();
      }
    }
    return 'Titre non détecté';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scraped': return 'default';
      case 'processing': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const handleViewSubsidy = (subsidyId: string) => {
    navigate(`/admin/subsidy/${subsidyId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Chargement des subventions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <h3 className="text-lg font-semibold text-destructive mb-2">Erreur</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchSubsidies}>Réessayer</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Subventions complètes ({subsidies.length})
          </CardTitle>
          <Button variant="outline" onClick={fetchSubsidies}>
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {subsidies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucune subvention trouvée</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subsidies.map((subsidy) => (
                  <TableRow key={subsidy.id}>
                    <TableCell className="max-w-md">
                      <div>
                        <div className="font-medium line-clamp-2">
                          {extractTitle(subsidy.raw_text)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {Math.round(subsidy.raw_text.length / 1024)}KB • ID: {subsidy.id.slice(0, 8)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-xs">
                          {subsidy.source_site || 'FranceAgriMer'}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          <a 
                            href={subsidy.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Voir l'original
                          </a>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(subsidy.status)}>
                        {subsidy.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(subsidy.scrape_date).toLocaleDateString('fr-FR')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewSubsidy(subsidy.id)}
                        className="gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        Voir complet
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
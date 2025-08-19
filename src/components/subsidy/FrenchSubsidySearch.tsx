import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FrenchSubsidyCard } from "./FrenchSubsidyCard";
import { toast } from "sonner";

interface FrenchSubsidy {
  id: string;
  title: string;
  description: string;
  amount: number[] | null;
  deadline: string | null;
  region: string[] | null;
  sector: string[] | null;
  agency: string;
  eligibility: string;
  program: string;
  funding_type: string;
  application_method: string;
  documents: any[] | null;
  url: string;
  language: string;
}

interface SearchFilters {
  searchTerm: string;
  fundingType: string;
  sector: string;
  region: string;
  amountMin: string;
  amountMax: string;
}

export function FrenchSubsidySearch() {
  const navigate = useNavigate();
  const [subsidies, setSubsidies] = useState<FrenchSubsidy[]>([]);
  const [filteredSubsidies, setFilteredSubsidies] = useState<FrenchSubsidy[]>([]);
  const [loading, setLoading] = useState(false);
  const [scraperRunning, setScraperRunning] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    fundingType: '',
    sector: '',
    region: '',
    amountMin: '',
    amountMax: ''
  });

  // Available options for filters
  const [availableFilters, setAvailableFilters] = useState({
    fundingTypes: [] as string[],
    sectors: [] as string[],
    regions: [] as string[]
  });

  useEffect(() => {
    loadSubsidies();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [subsidies, filters]);

  const loadSubsidies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subsidies')
        .select('*')
        .eq('api_source', 'les-aides-fr')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedSubsidies = (data || []).map(item => {
        const eligibilityCriteria = item.eligibility_criteria as any;
        return {
          id: item.id,
          title: String(item.title || 'Titre non disponible'),
          description: String(item.description || 'Description non disponible'),
          amount: item.amount_min && item.amount_max ? [Number(item.amount_min), Number(item.amount_max)] : null,
          deadline: item.deadline,
          region: eligibilityCriteria?.regions || [],
          sector: eligibilityCriteria?.domaines?.map((d: any) => `Domain ${d}`) || [],
          agency: String(eligibilityCriteria?.organisme || 'Les-Aides.fr'),
          eligibility: String(eligibilityCriteria?.conditions || ''),
          program: String(item.code || ''),
          funding_type: String(item.funding_type || 'aide'),
          application_method: item.application_url ? 'En ligne' : 'Contact direct',
          documents: Array.isArray(item.application_docs) ? item.application_docs : [],
          url: String(item.application_url || ''),
          language: 'fr'
        };
      });

      setSubsidies(formattedSubsidies);

      // Extract unique values for filters
      const fundingTypes = [...new Set(formattedSubsidies.map(s => s.funding_type).filter(Boolean))];
      const sectors = [...new Set(formattedSubsidies.flatMap(s => s.sector || []))];
      const regions = [...new Set(formattedSubsidies.flatMap(s => s.region || []))];

      setAvailableFilters({ fundingTypes, sectors, regions });

    } catch (error) {
      console.error('Error loading subsidies:', error);
      toast.error('Erreur lors du chargement des aides');
    } finally {
      setLoading(false);
    }
  };

  const runScraper = async () => {
    setScraperRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('franceagrimer-scraper', {
        body: { maxPages: 20, dryRun: false }
      });

      if (error) throw error;

      toast.success(`Scraping terminé: ${data.processed} aides traitées`);
      await loadSubsidies(); // Reload after scraping

    } catch (error) {
      console.error('Scraper error:', error);
      toast.error('Erreur lors du scraping');
    } finally {
      setScraperRunning(false);
    }
  };

  const purgeData = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les données d\'aides ? Cette action ne peut pas être annulée.')) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('data-purge');

      if (error) throw error;

      toast.success('Données purgées avec succès');
      await loadSubsidies(); // Reload after purging

    } catch (error) {
      console.error('Purge error:', error);
      toast.error('Erreur lors de la purge des données');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...subsidies];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term) ||
        s.agency.toLowerCase().includes(term)
      );
    }

    if (filters.fundingType) {
      filtered = filtered.filter(s => s.funding_type === filters.fundingType);
    }

    if (filters.sector) {
      filtered = filtered.filter(s => s.sector?.includes(filters.sector));
    }

    if (filters.region) {
      filtered = filtered.filter(s => s.region?.includes(filters.region));
    }

    if (filters.amountMin) {
      const minAmount = parseFloat(filters.amountMin);
      filtered = filtered.filter(s => {
        if (!s.amount || s.amount.length === 0) return false;
        const subsidyMin = Math.min(...s.amount);
        return subsidyMin >= minAmount;
      });
    }

    if (filters.amountMax) {
      const maxAmount = parseFloat(filters.amountMax);
      filtered = filtered.filter(s => {
        if (!s.amount || s.amount.length === 0) return false;
        const subsidyMax = Math.max(...s.amount);
        return subsidyMax <= maxAmount;
      });
    }

    setFilteredSubsidies(filtered);
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      fundingType: '',
      sector: '',
      region: '',
      amountMin: '',
      amountMax: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Aides Agricoles Françaises</h1>
          <p className="text-muted-foreground">
            Recherchez et découvrez les aides de FranceAgriMer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={purgeData} 
            disabled={loading}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Purger les données
          </Button>
          <Button 
            onClick={runScraper} 
            disabled={scraperRunning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${scraperRunning ? 'animate-spin' : ''}`} />
            {scraperRunning ? 'Mise à jour...' : 'Actualiser les données'}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres de recherche
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre, description ou agence..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* Filter controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select value={filters.fundingType} onValueChange={(value) => setFilters(prev => ({ ...prev, fundingType: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Type d'aide" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les types</SelectItem>
                {availableFilters.fundingTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.sector} onValueChange={(value) => setFilters(prev => ({ ...prev, sector: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Secteur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les secteurs</SelectItem>
                {availableFilters.sectors.map(sector => (
                  <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.region} onValueChange={(value) => setFilters(prev => ({ ...prev, region: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Région" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les régions</SelectItem>
                {availableFilters.regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Montant min (€)"
              type="number"
              value={filters.amountMin}
              onChange={(e) => setFilters(prev => ({ ...prev, amountMin: e.target.value }))}
            />

            <Input
              placeholder="Montant max (€)"
              type="number"
              value={filters.amountMax}
              onChange={(e) => setFilters(prev => ({ ...prev, amountMax: e.target.value }))}
            />
          </div>

          {/* Active filters and clear button */}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, value]) => {
                if (!value) return null;
                return (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {value}
                  </Badge>
                );
              })}
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Effacer les filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {loading ? 'Chargement...' : `${filteredSubsidies.length} aide(s) trouvée(s)`}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-64 animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredSubsidies.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Aucune aide trouvée. Essayez de modifier vos critères de recherche.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubsidies.map(subsidy => (
              <FrenchSubsidyCard
                key={subsidy.id}
                subsidy={subsidy}
                onViewDetails={(id) => navigate(`/subsidies/${id}`)}
                onApply={(id) => navigate(`/subsidies/${id}/apply`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Euro, Filter, Zap, Pin, Search, X } from 'lucide-react';
import { getLocalizedContent } from '@/utils/language';
import MatchConfidenceBadge from '@/components/MatchConfidenceBadge';
import { farms } from '@/data/farms';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import AttachSubsidyModal from '@/components/subsidy/AttachSubsidyModal';
import { attachSubsidyToFarm, updateSubsidiesWithAttachmentInfo } from '@/utils/subsidyAttachment';
import { supabase } from '@/integrations/supabase/client';
import { Subsidy } from '@/types/subsidy';
import SubsidyFilters from '@/components/subsidy/SubsidyFilters';
import SavedFilterSets, { FilterSet } from '@/components/subsidy/SavedFilterSets';
import { uuidv4 } from '@/lib/utils';

interface DatabaseSubsidy {
  id: string;
  code: string;
  title: any;
  description: any;
  amount_min?: number;
  amount_max?: number;
  deadline?: string;
  region?: string[];
  categories?: string[];
  funding_type?: string;
  status?: string;
  eligibility_criteria?: any;
  tags?: string[];
  language?: string[];
  legal_entities?: string[];
}

const SubsidySearchPage = () => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedSubsidy, setSelectedSubsidy] = useState<Subsidy | null>(null);
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [savedFilterSets, setSavedFilterSets] = useState<FilterSet[]>([]);
  const [subsidies, setSubsidies] = useState<Subsidy[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availableFundingTypes, setAvailableFundingTypes] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const [filters, setFilters] = useState({
    confidenceFilter: [0],
    regions: [] as string[],
    eligibleCountry: '',
    farmingTypes: [] as string[],
    fundingSources: [] as string[],
    fundingInstruments: [] as string[],
    documentsRequired: [] as string[],
    applicationFormats: [] as string[],
    sustainabilityGoals: [] as string[],
    deadlineStatuses: [] as string[],
  });

  // Fetch subsidies from database
  useEffect(() => {
    const fetchSubsidies = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('subsidies')
          .select('*');

        if (error) {
          console.error('Error fetching subsidies:', error);
          toast({
            title: t('common.error'),
            description: 'Failed to fetch subsidies',
            variant: 'destructive',
          });
          return;
        }

        // Transform database subsidies to match our Subsidy type
        const transformedSubsidies: Subsidy[] = (data || []).map((dbSubsidy: DatabaseSubsidy) => ({
          id: dbSubsidy.id,
          code: dbSubsidy.code,
          name: dbSubsidy.title,
          description: dbSubsidy.description,
          grant: dbSubsidy.amount_max 
            ? `€${dbSubsidy.amount_min || 0} - €${dbSubsidy.amount_max}`
            : `€${dbSubsidy.amount_min || 0}`,
          region: dbSubsidy.region || [],
          matchConfidence: Math.floor(Math.random() * 30) + 70, // Random confidence for now
          deadline: dbSubsidy.deadline || '2025-12-31',
          fundingType: dbSubsidy.funding_type as 'public' | 'private' | 'mixed',
          status: dbSubsidy.status,
          agriculturalSector: dbSubsidy.categories,
          countryEligibility: dbSubsidy.region,
          source: 'static' as const,
        }));

        setSubsidies(transformedSubsidies);

        // Extract unique values for dynamic filters
        const regions = new Set<string>();
        const countries = new Set<string>();
        const fundingTypes = new Set<string>();
        const categories = new Set<string>();

        transformedSubsidies.forEach(subsidy => {
          // Extract regions
          if (Array.isArray(subsidy.region)) {
            subsidy.region.forEach(r => regions.add(r));
          } else if (subsidy.region) {
            regions.add(subsidy.region);
          }

          // Extract countries (from region data)
          if (Array.isArray(subsidy.countryEligibility)) {
            subsidy.countryEligibility.forEach(c => countries.add(c));
          } else if (subsidy.countryEligibility) {
            countries.add(subsidy.countryEligibility);
          }

          // Extract funding types
          if (subsidy.fundingType) {
            fundingTypes.add(subsidy.fundingType);
          }

          // Extract categories
          if (Array.isArray(subsidy.agriculturalSector)) {
            subsidy.agriculturalSector.forEach(c => categories.add(c));
          }
        });

        setAvailableRegions(Array.from(regions).sort());
        setAvailableCountries(Array.from(countries).sort());
        setAvailableFundingTypes(Array.from(fundingTypes).sort());
        setAvailableCategories(Array.from(categories).sort());

      } catch (error) {
        console.error('Error in fetchSubsidies:', error);
        toast({
          title: t('common.error'),
          description: 'Failed to fetch subsidies',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubsidies();
  }, [t]);

  const clearFilters = () => {
    setFilters({
      confidenceFilter: [0],
      regions: [],
      eligibleCountry: '',
      farmingTypes: [],
      fundingSources: [],
      fundingInstruments: [],
      documentsRequired: [],
      applicationFormats: [],
      sustainabilityGoals: [],
      deadlineStatuses: [],
    });
  };

  const filteredSubsidies = subsidies.filter(subsidy => {
    const nameMatches = getLocalizedContent(subsidy.name, language).toLowerCase().includes(searchQuery.toLowerCase());
    const descriptionMatches = getLocalizedContent(subsidy.description, language).toLowerCase().includes(searchQuery.toLowerCase());
    const searchMatches = searchQuery === '' || nameMatches || descriptionMatches;

    const confidenceMatches = subsidy.matchConfidence >= filters.confidenceFilter[0];

    const regionMatches = filters.regions.length === 0 || 
      (Array.isArray(subsidy.region) 
        ? subsidy.region.some(r => filters.regions.includes(r))
        : filters.regions.includes(subsidy.region as string));

    const countryMatches = !filters.eligibleCountry ||
      (subsidy.countryEligibility && 
        (Array.isArray(subsidy.countryEligibility)
          ? subsidy.countryEligibility.some(c => c.toLowerCase().includes(filters.eligibleCountry.toLowerCase()))
          : String(subsidy.countryEligibility).toLowerCase().includes(filters.eligibleCountry.toLowerCase())));

    const farmingTypeMatches = filters.farmingTypes.length === 0 ||
      (subsidy.agriculturalSector &&
        (Array.isArray(subsidy.agriculturalSector)
          ? subsidy.agriculturalSector.some(s => filters.farmingTypes.includes(s))
          : filters.farmingTypes.includes(String(subsidy.agriculturalSector))));

    const fundingSourceMatches = filters.fundingSources.length === 0 ||
      (subsidy.fundingType && filters.fundingSources.includes(subsidy.fundingType));

    return searchMatches && 
           confidenceMatches && 
           regionMatches && 
           countryMatches && 
           farmingTypeMatches && 
           fundingSourceMatches;
  });

  const handleAttachToFarm = (subsidyId: string) => {
    const subsidy = subsidies.find(s => s.id === subsidyId);
    if (subsidy) {
      setSelectedSubsidy(subsidy);
      setAttachDialogOpen(true);
    }
  };

  const handleConfirmAttach = (subsidyId: string, farmId: string) => {
    attachSubsidyToFarm(subsidyId, farmId);
    toast({
      title: t('common.success'),
      description: 'Subsidy attached to farm successfully',
    });
  };

  const saveCurrentFilterSet = (name: string) => {
    const newSet: FilterSet = {
      id: uuidv4(),
      name,
      filters: { ...filters }
    };

    setSavedFilterSets([...savedFilterSets, newSet]);
    toast({
      title: t('common.saved'),
      description: `${name} ${t('search.filters.saveFilterSet')}`,
    });
  };

  const applyFilterSet = (set: FilterSet) => {
    setFilters(set.filters);
    toast({
      title: t('common.applied'),
      description: `${set.name} ${t('search.filters.saveFilterSet')}`,
    });
  };

  const removeFilterSet = (id: string) => {
    setSavedFilterSets(savedFilterSets.filter(set => set.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow py-6 px-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="flex-grow py-6 px-4">
        <div className="container mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('subsidies.searchEngine')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('subsidies.findAvailableSubsidies')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {showFilters && (
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader className="py-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{t('subsidies.filters')}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <SavedFilterSets 
                      filterSets={savedFilterSets}
                      onApplyFilterSet={applyFilterSet}
                      onRemoveFilterSet={removeFilterSet}
                      currentFilters={filters}
                      onSaveCurrentFilters={saveCurrentFilterSet}
                    />

                    <SubsidyFilters 
                      filters={{
                        regions: filters.regions,
                        eligibleCountry: filters.eligibleCountry,
                        farmingTypes: filters.farmingTypes,
                        fundingSources: filters.fundingSources,
                        fundingInstruments: filters.fundingInstruments,
                        documentsRequired: filters.documentsRequired,
                        applicationFormats: filters.applicationFormats,
                        sustainabilityGoals: filters.sustainabilityGoals,
                        deadlineStatuses: filters.deadlineStatuses,
                      }}
                      setFilters={setFilters}
                      onClearFilters={clearFilters}
                      availableRegions={availableRegions}
                      availableCountries={availableCountries}
                      availableFundingTypes={availableFundingTypes}
                      availableCategories={availableCategories}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            <div className={`${showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
              <Card>
                <CardHeader className="py-4">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-96">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder={t('subsidies.searchSubsidies')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                      />
                      {searchQuery && (
                        <button 
                          className="absolute right-2.5 top-2.5 text-gray-500 hover:text-gray-700"
                          onClick={() => setSearchQuery('')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {showFilters ? t('common.hideFilters') : t('common.showFilters')}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <h2 className="text-xl font-semibold mb-4">{t('subsidies.searchResults')}</h2>

                  {filteredSubsidies.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredSubsidies.map(subsidy => (
                        <Card key={subsidy.id} className="border border-gray-200 dark:border-gray-700 h-full">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{getLocalizedContent(subsidy.name, language)}</CardTitle>
                              <MatchConfidenceBadge confidence={subsidy.matchConfidence} />
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <div className="flex items-center text-sm text-gray-500">
                                <Euro className="h-4 w-4 mr-1" /> {subsidy.grant}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <p className="text-sm text-gray-500 line-clamp-3">
                              {getLocalizedContent(subsidy.description, language)}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                {subsidy.code}
                              </Badge>
                              {subsidy.fundingType && (
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                                  {t(`subsidies.fundingType.${subsidy.fundingType}`)}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                {Array.isArray(subsidy.region) ? subsidy.region.join(', ') : subsidy.region}
                              </Badge>
                            </div>
                          </CardContent>
                          <div className="flex justify-between p-4 pt-0">
                            <Button variant="outline" size="sm">
                              {t('subsidies.viewDetails')}
                            </Button>
                            <Button 
                              variant="default"
                              size="sm" 
                              onClick={() => handleAttachToFarm(subsidy.id)}
                            >
                              {t('subsidies.attachToFarm')}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <h3 className="text-lg font-medium mb-2">{t('search.noResults')}</h3>
                      <p className="text-gray-500">{t('search.filters.noMatches')}</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={clearFilters}
                      >
                        {t('common.clear')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <AttachSubsidyModal 
        isOpen={attachDialogOpen}
        onClose={() => setAttachDialogOpen(false)}
        subsidy={selectedSubsidy}
        onAttach={handleConfirmAttach}
      />
    </div>
  );
};

export default SubsidySearchPage;

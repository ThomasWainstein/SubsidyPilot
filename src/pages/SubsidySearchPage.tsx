
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Euro, Filter, Search, X } from 'lucide-react';
import { getLocalizedContent } from '@/utils/language';
import MatchConfidenceBadge from '@/components/MatchConfidenceBadge';
import { farms } from '@/data/farms';
import { subsidies } from '@/data/subsidies';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SubsidyFilters from '@/components/subsidy/SubsidyFilters';
import SavedFilterSets, { FilterSet } from '@/components/subsidy/SavedFilterSets';
import { uuidv4 } from '@/lib/utils'; // Fixed import to use the renamed function

const SubsidySearchPage = () => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [selectedSubsidy, setSelectedSubsidy] = useState<typeof subsidies[0] | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [savedFilterSets, setSavedFilterSets] = useState<FilterSet[]>([]);
  
  // New expanded filters
  const [filters, setFilters] = useState({
    confidenceFilter: [0], // Keep existing confidence filter
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
  
  // Modified filter logic to work with the expanded filters
  const filteredSubsidies = subsidies.filter(subsidy => {
    // Name and description search
    const nameMatches = getLocalizedContent(subsidy.name, language).toLowerCase().includes(searchQuery.toLowerCase());
    const descriptionMatches = getLocalizedContent(subsidy.description, language).toLowerCase().includes(searchQuery.toLowerCase());
    const searchMatches = searchQuery === '' || nameMatches || descriptionMatches;
    
    // Confidence filter
    const confidenceMatches = subsidy.matchConfidence >= filters.confidenceFilter[0] / 100;
    
    // Region filter
    const regionMatches = filters.regions.length === 0 || 
      (Array.isArray(subsidy.region) 
        ? subsidy.region.some(r => filters.regions.includes(r))
        : filters.regions.includes(subsidy.region as string));
    
    // Country eligibility filter - handling properly with optional chaining
    const countryMatches = !filters.eligibleCountry ||
      (subsidy.countryEligibility && 
        (Array.isArray(subsidy.countryEligibility)
          ? subsidy.countryEligibility.some(c => c.toLowerCase().includes(filters.eligibleCountry.toLowerCase()))
          : String(subsidy.countryEligibility).toLowerCase().includes(filters.eligibleCountry.toLowerCase())));
    
    // Farming type filter - handling properly with optional chaining
    const farmingTypeMatches = filters.farmingTypes.length === 0 ||
      (subsidy.agriculturalSector &&
        (Array.isArray(subsidy.agriculturalSector)
          ? subsidy.agriculturalSector.some(s => filters.farmingTypes.includes(s))
          : filters.farmingTypes.includes(String(subsidy.agriculturalSector))));
    
    // Funding source filter (type)
    const fundingSourceMatches = filters.fundingSources.length === 0 ||
      (subsidy.fundingType && filters.fundingSources.includes(subsidy.fundingType));
    
    // We don't have detailed data for all filters in the demo data, so some will just return true
    // In a real app, these would check against actual subsidy properties
    const fundingInstrumentMatches = filters.fundingInstruments.length === 0;
    const documentsRequiredMatches = filters.documentsRequired.length === 0;
    const applicationFormatMatches = filters.applicationFormats.length === 0;
    const sustainabilityGoalsMatches = filters.sustainabilityGoals.length === 0;
    
    // Deadline status filter - handling properly with optional chaining
    const deadlineStatusMatches = filters.deadlineStatuses.length === 0 ||
      (subsidy.status && filters.deadlineStatuses.includes(subsidy.status));
    
    return searchMatches && 
           confidenceMatches && 
           regionMatches && 
           countryMatches && 
           farmingTypeMatches && 
           fundingSourceMatches &&
           fundingInstrumentMatches &&
           documentsRequiredMatches &&
           applicationFormatMatches &&
           sustainabilityGoalsMatches &&
           deadlineStatusMatches;
  });
  
  const handleAttachToFarm = (subsidyId: string) => {
    const subsidy = subsidies.find(s => s.id === subsidyId);
    if (subsidy) {
      setSelectedSubsidy(subsidy);
      setAttachDialogOpen(true);
    }
  };
  
  const confirmAttachToFarm = () => {
    if (selectedSubsidy && selectedFarmId) {
      toast({
        title: t('messages.subsidyAttached'),
        description: t('messages.subsidyAttachedDesc'),
        variant: "default",
      });
      setAttachDialogOpen(false);
      setSelectedFarmId('');
    }
  };
  
  // Save current filter set
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
  
  // Apply a saved filter set
  const applyFilterSet = (set: FilterSet) => {
    setFilters(set.filters);
    toast({
      title: t('common.applied'),
      description: `${set.name} ${t('search.filters.saveFilterSet')}`,
    });
  };
  
  // Remove a saved filter set
  const removeFilterSet = (id: string) => {
    setSavedFilterSets(savedFilterSets.filter(set => set.id !== id));
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('subsidies.searchEngine')}</h1>
          </div>
          
          <div className="grid grid-cols-12 gap-6">
            
            {/* Filters Sidebar */}
            {showFilters && (
              <div className="col-span-12 lg:col-span-3 space-y-6">
                <Card>
                  <CardHeader className="py-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{t('subsidies.filters')}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Saved Filter Sets */}
                    <SavedFilterSets 
                      filterSets={savedFilterSets}
                      onApplyFilterSet={applyFilterSet}
                      onRemoveFilterSet={removeFilterSet}
                      currentFilters={filters}
                      onSaveCurrentFilters={saveCurrentFilterSet}
                    />
                    
                    {/* Filter Components */}
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
                    />
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Main Content */}
            <div className={`col-span-12 ${showFilters ? 'lg:col-span-9' : 'lg:col-span-12'}`}>
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
                            <CardTitle className="text-lg">{getLocalizedContent(subsidy.name, language)}</CardTitle>
                            <div className="flex justify-between items-center mt-1">
                              <MatchConfidenceBadge confidence={subsidy.matchConfidence} />
                              <div className="flex items-center text-sm text-gray-500">
                                <Euro className="h-4 w-4 mr-1" /> {subsidy.grant}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-2">
                            <p className="text-sm text-gray-500 line-clamp-3">
                              {getLocalizedContent(subsidy.description, language)}
                            </p>
                          </CardContent>
                          <div className="flex justify-between p-4 pt-0">
                            <Button variant="outline" size="sm">
                              {t('subsidies.viewDetails')}
                            </Button>
                            <Button variant="default" size="sm" onClick={() => handleAttachToFarm(subsidy.id)}>
                              {t('subsidies.attachToFarm')}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <h3 className="text-lg font-medium mb-2">{t('subsidies.noSubsidiesFound')}</h3>
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
      
      {/* Attach to Farm Dialog */}
      <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('subsidies.selectFarm')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="farm-select">{t('common.select')}</Label>
            <Select value={selectedFarmId} onValueChange={setSelectedFarmId}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.selectFarm')} />
              </SelectTrigger>
              <SelectContent>
                {farms.map(farm => (
                  <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button disabled={!selectedFarmId} onClick={confirmAttachToFarm}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubsidySearchPage;

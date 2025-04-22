
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import Navbar from '@/components/Navbar';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Slider 
} from '@/components/ui/slider';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion';
import { 
  ChevronDown, 
  ChevronUp, 
  Euro, 
  Filter, 
  Search, 
  Sliders, 
  X 
} from 'lucide-react';
import { getLocalizedContent } from '@/utils/language';
import MatchConfidenceBadge from '@/components/MatchConfidenceBadge';
import { farms } from '@/data/farms';
import { subsidies } from '@/data/subsidies';
import { toast } from '@/components/ui/use-toast';

const SubsidySearchPage = () => {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState([0]);
  const [showFilters, setShowFilters] = useState(true);
  const [fundingTypeFilter, setFundingTypeFilter] = useState<string[]>([]);
  const [selectedSubsidy, setSelectedSubsidy] = useState<typeof subsidies[0] | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('');
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  
  const filteredSubsidies = subsidies.filter(subsidy => {
    const nameMatches = getLocalizedContent(subsidy.name, language).toLowerCase().includes(searchQuery.toLowerCase());
    const descriptionMatches = getLocalizedContent(subsidy.description, language).toLowerCase().includes(searchQuery.toLowerCase());
    const searchMatches = searchQuery === '' || nameMatches || descriptionMatches;
    
    const confidenceMatches = subsidy.matchConfidence >= confidenceFilter[0] / 100;
    
    const fundingTypeMatches = fundingTypeFilter.length === 0 || 
      (subsidy.fundingType && fundingTypeFilter.includes(subsidy.fundingType));
    
    return searchMatches && confidenceMatches && fundingTypeMatches;
  });
  
  const toggleFundingTypeFilter = (type: string) => {
    if (fundingTypeFilter.includes(type)) {
      setFundingTypeFilter(fundingTypeFilter.filter(t => t !== type));
    } else {
      setFundingTypeFilter([...fundingTypeFilter, type]);
    }
  };
  
  const clearFilters = () => {
    setConfidenceFilter([0]);
    setFundingTypeFilter([]);
  };
  
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
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearFilters}
                      >
                        {t('common.clear')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* Funding Type Filter */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">{t('subsidies.fundingType')}</h3>
                      <div className="space-y-1">
                        {['public', 'private', 'mixed'].map(type => (
                          <div key={type} className="flex items-center">
                            <Button
                              variant={fundingTypeFilter.includes(type) ? "default" : "outline"}
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => toggleFundingTypeFilter(type)}
                            >
                              {t(`subsidies.fundingType.${type}`)}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Match Confidence Filter */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-medium">{t('subsidies.matchConfidence')}</h3>
                        <span className="text-sm text-gray-500">{confidenceFilter[0]}%</span>
                      </div>
                      <Slider
                        defaultValue={[0]}
                        value={confidenceFilter}
                        max={100}
                        step={5}
                        onValueChange={setConfidenceFilter}
                      />
                    </div>
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
                          <CardFooter className="flex justify-between pt-2">
                            <Button variant="outline" size="sm">
                              {t('subsidies.viewDetails')}
                            </Button>
                            <Button variant="default" size="sm" onClick={() => handleAttachToFarm(subsidy.id)}>
                              {t('subsidies.attachToFarm')}
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <h3 className="text-lg font-medium mb-2">{t('subsidies.noSubsidiesFound')}</h3>
                      <p className="text-gray-500">{t('subsidies.noSubsidiesFoundDesc')}</p>
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

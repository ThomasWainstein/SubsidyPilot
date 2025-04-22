import { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchIcon, SlidersHorizontal, Calendar, Link, ExternalLink } from 'lucide-react';
import { subsidies as allSubsidies, Subsidy } from '@/data/subsidies';
import MatchConfidenceBadge from '@/components/MatchConfidenceBadge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { farms } from '@/data/farms';
import { useToast } from '@/hooks/use-toast';

const agriculturalSectors = [
  'Crop Production',
  'Livestock',
  'Dairy',
  'Organic Farming',
  'Horticulture',
  'Viticulture',
  'Agroforestry',
  'Aquaculture',
];

const countries = [
  'France',
  'Spain',
  'Romania',
  'Italy',
  'Germany',
  'Poland',
  'EU-wide',
];

const fundingTypes = [
  'public',
  'private',
  'mixed',
];

const SubsidySearchPage = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [matchConfidence, setMatchConfidence] = useState([60]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedFundingTypes, setSelectedFundingTypes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedSubsidy, setSelectedSubsidy] = useState<Subsidy | null>(null);
  const [isAttachDialogOpen, setIsAttachDialogOpen] = useState(false);

  const filteredSubsidies = allSubsidies.filter(subsidy => {
    const matchesSearch = 
      subsidy.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      subsidy.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subsidy.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesConfidence = subsidy.matchConfidence >= matchConfidence[0];
    
    const matchesCountry = selectedCountries.length === 0 || 
      selectedCountries.some(country => {
        if (typeof subsidy.region === 'string') {
          return subsidy.region === country || (country === 'EU-wide' && subsidy.region === 'EU-wide');
        } else {
          return subsidy.region.includes(country) || (country === 'EU-wide' && subsidy.region.includes('EU-wide'));
        }
      });
    
    const subsidyFundingType = ['public', 'private', 'mixed'][subsidy.id.charCodeAt(1) % 3];
    const matchesFundingType = selectedFundingTypes.length === 0 || 
      selectedFundingTypes.includes(subsidyFundingType);
    
    const subsidySector = agriculturalSectors[subsidy.id.charCodeAt(2) % agriculturalSectors.length];
    const matchesSector = selectedSectors.length === 0 || 
      selectedSectors.includes(subsidySector);
    
    return matchesSearch && matchesConfidence && matchesCountry && matchesFundingType && matchesSector;
  });

  const tabFilteredSubsidies = filteredSubsidies.filter(subsidy => {
    if (activeTab === 'all') return true;
    const fundingType = ['public', 'private', 'mixed'][subsidy.id.charCodeAt(1) % 3];
    return fundingType === activeTab;
  });

  const handleAttachToFarm = (subsidy: Subsidy) => {
    setSelectedSubsidy(subsidy);
    setIsAttachDialogOpen(true);
  };

  const handleConfirmAttach = (farmId: string) => {
    if (selectedSubsidy) {
      const farm = farms.find(f => f.id === farmId);
      toast({
        title: t('messages.subsidyAttached'),
        description: `${selectedSubsidy.name} ${t('messages.subsidyAttachedDesc')} "${farm?.name}"`,
      });
    }
    setIsAttachDialogOpen(false);
    setSelectedSubsidy(null);
  };

  const toggleSector = (sector: string) => {
    if (selectedSectors.includes(sector)) {
      setSelectedSectors(selectedSectors.filter(s => s !== sector));
    } else {
      setSelectedSectors([...selectedSectors, sector]);
    }
  };

  const toggleCountry = (country: string) => {
    if (selectedCountries.includes(country)) {
      setSelectedCountries(selectedCountries.filter(c => c !== country));
    } else {
      setSelectedCountries([...selectedCountries, country]);
    }
  };

  const toggleFundingType = (type: string) => {
    if (selectedFundingTypes.includes(type)) {
      setSelectedFundingTypes(selectedFundingTypes.filter(t => t !== type));
    } else {
      setSelectedFundingTypes([...selectedFundingTypes, type]);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setMatchConfidence([60]);
    setSelectedSectors([]);
    setSelectedCountries([]);
    setSelectedFundingTypes([]);
    setActiveTab('all');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-8 bg-gray-50">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('subsidies.searchEngine')}</h1>
            <p className="text-gray-600">{t('subsidies.subtitle')}</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {t('subsidies.filters')}
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      {t('common.clear')}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>{t('subsidies.matchConfidenceSlider')}: {matchConfidence[0]}%</Label>
                    <Slider
                      value={matchConfidence}
                      onValueChange={setMatchConfidence}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('subsidies.countryEligibility')}</Label>
                    <div className="space-y-2">
                      {countries.map(country => (
                        <div key={country} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`country-${country}`} 
                            checked={selectedCountries.includes(country)}
                            onCheckedChange={() => toggleCountry(country)}
                          />
                          <Label htmlFor={`country-${country}`} className="cursor-pointer text-sm">
                            {country}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('subsidies.fundingType')}</Label>
                    <div className="space-y-2">
                      {fundingTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`funding-${type}`} 
                            checked={selectedFundingTypes.includes(type)}
                            onCheckedChange={() => toggleFundingType(type)}
                          />
                          <Label htmlFor={`funding-${type}`} className="cursor-pointer text-sm">
                            {t(`subsidies.fundingType.${type}`)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>{t('subsidies.agriculturalSector')}</Label>
                    <div className="space-y-2">
                      {agriculturalSectors.map(sector => (
                        <div key={sector} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`sector-${sector}`} 
                            checked={selectedSectors.includes(sector)}
                            onCheckedChange={() => toggleSector(sector)}
                          />
                          <Label htmlFor={`sector-${sector}`} className="cursor-pointer text-sm">
                            {sector}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-3">
              <div className="mb-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-grow">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <Input
                    placeholder={t('common.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button 
                  variant="outline" 
                  className="lg:hidden flex items-center" 
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal size={16} className="mr-2" />
                  {showFilters ? t('common.hideFilters') : t('common.showFilters')}
                </Button>
              </div>
              
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <TabsList className="grid grid-cols-4 mb-4">
                  <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
                  <TabsTrigger value="public">{t('subsidies.fundingTypePublic')}</TabsTrigger>
                  <TabsTrigger value="private">{t('subsidies.fundingTypePrivate')}</TabsTrigger>
                  <TabsTrigger value="mixed">{t('subsidies.fundingTypeMixed')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-0">
                  <div className="mb-4">
                    <Badge variant="outline" className="bg-blue-50 mr-2">
                      {tabFilteredSubsidies.length} {t('subsidies.resultsFound')}
                    </Badge>
                  </div>
                  
                  {tabFilteredSubsidies.length > 0 ? (
                    <div className="space-y-4">
                      {tabFilteredSubsidies.map((subsidy) => (
                        <Card key={subsidy.id}>
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle>{subsidy.name}</CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  {subsidy.code}
                                </CardDescription>
                              </div>
                              <MatchConfidenceBadge confidence={subsidy.matchConfidence} />
                            </div>
                          </CardHeader>
                          <CardContent className="py-2">
                            <p className="text-sm text-gray-600 mb-4">{subsidy.description}</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="bg-blue-50 flex items-center gap-1">
                                <Calendar size={14} />
                                {new Date(subsidy.deadline).toLocaleDateString()}
                              </Badge>
                              <Badge variant="outline" className="bg-green-50">
                                {subsidy.grant}
                              </Badge>
                              <Badge variant="outline" className="bg-purple-50">
                                {typeof subsidy.region === 'string' ? subsidy.region : subsidy.region.join(', ')}
                              </Badge>
                              <Badge variant="outline" className="bg-yellow-50">
                                {agriculturalSectors[subsidy.id.charCodeAt(2) % agriculturalSectors.length]}
                              </Badge>
                              <Badge variant="outline" className="bg-red-50">
                                {fundingTypes[subsidy.id.charCodeAt(1) % 3] === 'public' ? 
                                  t('subsidies.fundingTypePublic') :
                                  fundingTypes[subsidy.id.charCodeAt(1) % 3] === 'private' ?
                                  t('subsidies.fundingTypePrivate') :
                                  t('subsidies.fundingTypeMixed')
                                }
                              </Badge>
                            </div>
                          </CardContent>
                          <CardFooter className="flex justify-between pt-2">
                            <Button variant="outline" size="sm">
                              <ExternalLink size={14} className="mr-1" />
                              {t('subsidies.viewDetails')}
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleAttachToFarm(subsidy)}
                              className="flex items-center"
                            >
                              <Link size={14} className="mr-1" />
                              {t('subsidies.attachToFarm')}
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="bg-gray-50 border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <SearchIcon size={48} className="text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">{t('subsidies.noSubsidiesFound')}</h3>
                        <p className="text-gray-500 text-center max-w-md">{t('subsidies.noSubsidiesFoundDesc')}</p>
                        <Button variant="outline" className="mt-4" onClick={clearFilters}>
                          {t('common.clear')}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="public" className="mt-0">
                  {/* Same structure as "all" tab */}
                </TabsContent>
                <TabsContent value="private" className="mt-0">
                  {/* Same structure as "all" tab */}
                </TabsContent>
                <TabsContent value="mixed" className="mt-0">
                  {/* Same structure as "all" tab */}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      
      <Dialog open={isAttachDialogOpen} onOpenChange={setIsAttachDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('subsidies.selectFarm')}</DialogTitle>
            <DialogDescription>
              {selectedSubsidy?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select onValueChange={handleConfirmAttach}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.select')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {farms.map((farm) => (
                    <SelectItem key={farm.id} value={farm.id}>
                      {farm.name} - {farm.region}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttachDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubsidySearchPage;

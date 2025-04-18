import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language';
import Navbar from '@/components/Navbar';
import { 
  Filter, Search, Sliders, ChevronDown, ChevronUp, 
  MapPin, Calendar, DollarSign, Award, Percent, X, Check 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { farms } from '@/data/farms';
import { getRandomSubsidies } from '@/data/subsidies';
import { Subsidy } from '@/types/subsidy';
import { useToast } from '@/hooks/use-toast';

// Mock subsidy data for search engine
const SEARCH_SUBSIDIES: Subsidy[] = [
  {
    id: "EU-WATER-2201",
    name: {
      en: "Water Efficiency Upgrade Grant",
      fr: "Subvention pour l'efficacité hydrique",
      es: "Subvención para eficiencia hídrica",
      ro: "Subvenție pentru eficiența apei"
    },
    description: {
      en: "Financial assistance for implementing water-saving irrigation systems in arid regions.",
      fr: "Aide financière pour la mise en œuvre de systèmes d'irrigation économes en eau dans les régions arides.",
      es: "Ayuda financiera para implementar sistemas de riego que ahorran agua en regiones áridas.",
      ro: "Asistență financiară pentru implementarea sistemelor de irigații cu economie de apă în regiunile aride."
    },
    matchConfidence: 87,
    deadline: "2025-09-30",
    region: ["France", "Spain", "Italy"],
    code: "EU-WATER-2201",
    grant: "€75,000",
    fundingType: "public",
    countryEligibility: ["France", "Spain", "Italy", "Greece"],
    agriculturalSector: ["Viticulture", "Olive cultivation", "Fruit orchards"],
    farmingMethod: ["Conventional", "Organic"],
    certifications: ["Organic", "HVE"],
    source: "search"
  },
  {
    id: "FR-LIVE-5532",
    name: {
      en: "Smart Livestock Monitoring Subsidy",
      fr: "Subvention pour la surveillance intelligente du bétail",
      es: "Subsidio para monitoreo inteligente de ganado",
      ro: "Subvenție pentru monitorizarea inteligentă a animalelor"
    },
    description: {
      en: "Support for implementing IoT technology to monitor and improve livestock health and production efficiency.",
      fr: "Soutien à la mise en œuvre de technologies IoT pour surveiller et améliorer la santé du bétail et l'efficacité de la production.",
      es: "Apoyo para implementar tecnología IoT para monitorear y mejorar la salud del ganado y la eficiencia de producción.",
      ro: "Sprijin pentru implementarea tehnologiei IoT pentru monitorizarea și îmbunătățirea sănătății animalelor și a eficienței producției."
    },
    matchConfidence: 75,
    deadline: "2025-08-15",
    region: ["France"],
    code: "FR-LIVE-5532",
    grant: "€45,000",
    fundingType: "mixed",
    countryEligibility: ["France"],
    agriculturalSector: ["Livestock", "Dairy"],
    farmingMethod: ["Conventional", "Organic", "Free-range"],
    certifications: ["HVE", "Label Rouge"],
    source: "search"
  },
  {
    id: "EU-REGEN-3301",
    name: {
      en: "Regenerative Agriculture Transition Fund",
      fr: "Fonds de transition vers l'agriculture régénérative",
      es: "Fondo de transición a agricultura regenerativa",
      ro: "Fond de tranziție pentru agricultură regenerativă"
    },
    description: {
      en: "Financial support for farmers transitioning to regenerative agricultural practices to improve soil health.",
      fr: "Soutien financier aux agriculteurs en transition vers des pratiques agricoles régénératives pour améliorer la santé des sols.",
      es: "Apoyo financiero para agricultores en transición a prácticas agrícolas regenerativas para mejorar la salud del suelo.",
      ro: "Sprijin financiar pentru fermierii care trec la practici agricole regenerative pentru îmbunătățirea sănătății solului."
    },
    matchConfidence: 92,
    deadline: "2025-12-31",
    region: ["EU-wide"],
    code: "EU-REGEN-3301",
    grant: "€60,000",
    fundingType: "public",
    countryEligibility: ["All EU Countries"],
    agriculturalSector: ["Arable farming", "Mixed farming"],
    farmingMethod: ["Regenerative", "Organic"],
    certifications: ["Organic", "Demeter", "HVE"],
    source: "search"
  },
  {
    id: "DE-TECH-7701",
    name: {
      en: "Digital Farming Technology Grant",
      fr: "Subvention pour la technologie agricole numérique",
      es: "Subvención para tecnología agrícola digital",
      ro: "Grant pentru tehnologie agricolă digitală"
    },
    description: {
      en: "Funding for implementation of precision agriculture technologies including sensors, drones, and farm management software.",
      fr: "Financement pour la mise en œuvre de technologies d'agriculture de précision, y compris capteurs, drones et logiciels de gestion agricole.",
      es: "Financiación para la implementación de tecnologías de agricultura de precisión, incluyendo sensores, drones y software de gestión agrícola.",
      ro: "Finanțare pentru implementarea tehnologiilor de agricultură de precizie, inclusiv senzori, drone și software de management agricol."
    },
    matchConfidence: 83,
    deadline: "2025-07-15",
    region: ["Germany", "Austria", "Romania"],
    code: "DE-TECH-7701",
    grant: "€55,000",
    fundingType: "mixed",
    countryEligibility: ["Germany", "Austria", "Romania", "Poland"],
    agriculturalSector: ["All sectors"],
    farmingMethod: ["All methods"],
    certifications: [],
    source: "search"
  },
  {
    id: "IT-SOLAR-4420",
    name: {
      en: "Agrivoltaic Installation Support",
      fr: "Soutien à l'installation agrivoltaïque",
      es: "Apoyo para instalación agrivoltaica",
      ro: "Sprijin pentru instalații agrivoltaice"
    },
    description: {
      en: "Funding for dual-use solar installations that allow for continued agricultural production under solar panels.",
      fr: "Financement d'installations solaires à double usage permettant de poursuivre la production agricole sous les panneaux solaires.",
      es: "Financiación para instalaciones solares de uso dual que permiten la producción agrícola continua bajo paneles solares.",
      ro: "Finanțare pentru instalații solare cu utilizare duală care permit continuarea producției agricole sub panourile solare."
    },
    matchConfidence: 79,
    deadline: "2026-03-31",
    region: ["Italy", "Spain", "Greece", "Romania"],
    code: "IT-SOLAR-4420",
    grant: "€100,000",
    fundingType: "public",
    countryEligibility: ["Italy", "Spain", "Greece", "Portugal", "Romania", "Croatia"],
    agriculturalSector: ["Viticulture", "Olive cultivation", "Arable farming"],
    farmingMethod: ["All methods"],
    certifications: [],
    source: "search"
  },
];

// Filter types
interface FilterState {
  fundingType: string[];
  countries: string[];
  agricSector: string[];
  farmingMethod: string[];
  certifications: string[];
  minGrant: number;
  maxGrant: number;
  minConfidence: number;
  searchTerm: string;
}

const SubsidySearchPage = () => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [subsidies, setSubsidies] = useState<Subsidy[]>(SEARCH_SUBSIDIES);
  const [filteredSubsidies, setFilteredSubsidies] = useState<Subsidy[]>(SEARCH_SUBSIDIES);
  const [showAttachDialog, setShowAttachDialog] = useState(false);
  const [selectedSubsidy, setSelectedSubsidy] = useState<Subsidy | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    fundingType: [],
    countries: [],
    agricSector: [],
    farmingMethod: [],
    certifications: [],
    minGrant: 0,
    maxGrant: 100000,
    minConfidence: 0,
    searchTerm: "",
  });

  // Helper function to get translated content
  const getLocalizedContent = (content: string | Record<string, string>): string => {
    if (typeof content === 'string') return content;
    return content[language] || content['en'] || '';
  };

  // Parse grant value to number for filtering
  const parseGrantValue = (grantString: string): number => {
    const numStr = grantString.replace(/[^0-9]/g, '');
    return numStr ? parseInt(numStr, 10) : 0;
  };

  // Apply filters to subsidies
  useEffect(() => {
    let result = [...subsidies];
    
    // Search term filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      result = result.filter(subsidy => 
        getLocalizedContent(subsidy.name).toLowerCase().includes(searchLower) ||
        getLocalizedContent(subsidy.description).toLowerCase().includes(searchLower) ||
        subsidy.code.toLowerCase().includes(searchLower)
      );
    }
    
    // Funding type filter
    if (filters.fundingType.length > 0) {
      result = result.filter(subsidy => 
        subsidy.fundingType && filters.fundingType.includes(subsidy.fundingType)
      );
    }
    
    // Countries filter
    if (filters.countries.length > 0) {
      result = result.filter(subsidy => {
        if (Array.isArray(subsidy.countryEligibility)) {
          return subsidy.countryEligibility.some(country => 
            filters.countries.includes(country) || country === "All EU Countries"
          );
        } else if (subsidy.countryEligibility === "All EU Countries") {
          return true;
        }
        return filters.countries.includes(subsidy.countryEligibility || "");
      });
    }
    
    // Agricultural sector filter
    if (filters.agricSector.length > 0) {
      result = result.filter(subsidy => {
        if (Array.isArray(subsidy.agriculturalSector)) {
          return subsidy.agriculturalSector.some(sector => 
            filters.agricSector.includes(sector) || sector === "All sectors"
          );
        } else if (subsidy.agriculturalSector === "All sectors") {
          return true;
        }
        return filters.agricSector.includes(subsidy.agriculturalSector || "");
      });
    }
    
    // Farming method filter
    if (filters.farmingMethod.length > 0) {
      result = result.filter(subsidy => {
        if (Array.isArray(subsidy.farmingMethod)) {
          return subsidy.farmingMethod.some(method => 
            filters.farmingMethod.includes(method) || method === "All methods"
          );
        } else if (subsidy.farmingMethod === "All methods") {
          return true;
        }
        return filters.farmingMethod.includes(subsidy.farmingMethod || "");
      });
    }
    
    // Certifications filter
    if (filters.certifications.length > 0) {
      result = result.filter(subsidy => {
        if (!subsidy.certifications || subsidy.certifications.length === 0) return false;
        return subsidy.certifications.some(cert => filters.certifications.includes(cert));
      });
    }
    
    // Grant value filter
    result = result.filter(subsidy => {
      const grantValue = parseGrantValue(subsidy.grant);
      return grantValue >= filters.minGrant && grantValue <= filters.maxGrant;
    });
    
    // Match confidence filter
    result = result.filter(subsidy => subsidy.matchConfidence >= filters.minConfidence);
    
    setFilteredSubsidies(result);
  }, [subsidies, filters, language]);

  // Handle checkbox filter change
  const handleFilterChange = (filterType: keyof FilterState, value: string) => {
    setFilters(prev => {
      const currentValues = prev[filterType] as string[];
      
      if (currentValues.includes(value)) {
        return {
          ...prev,
          [filterType]: currentValues.filter(v => v !== value)
        };
      } else {
        return {
          ...prev,
          [filterType]: [...currentValues, value]
        };
      }
    });
  };

  const clearFilters = () => {
    setFilters({
      fundingType: [],
      countries: [],
      agricSector: [],
      farmingMethod: [],
      certifications: [],
      minGrant: 0,
      maxGrant: 100000,
      minConfidence: 0,
      searchTerm: "",
    });
  };

  // Open dialog to attach subsidy to farm
  const handleAttachToFarm = (subsidy: Subsidy) => {
    setSelectedSubsidy(subsidy);
    setShowAttachDialog(true);
  };

  // Attach subsidy to selected farm
  const attachSubsidyToFarm = (farmId: string) => {
    if (!selectedSubsidy) return;

    // In a real application, this would persist the data to a database.
    // For this demo, we're using localStorage to simulate persistence.
    const storageKey = `farm_${farmId}_custom_subsidies`;
    const existingSubsidies = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const attachedSubsidy = {
      ...selectedSubsidy,
      isManuallyAdded: true,
      source: 'search'
    };
    
    existingSubsidies.push(attachedSubsidy);
    localStorage.setItem(storageKey, JSON.stringify(existingSubsidies));
    
    toast({
      title: t('messages.subsidyAttached'),
      description: t('messages.subsidyAttachedDesc'),
    });
    
    setShowAttachDialog(false);
  };

  // All available countries from subsidies
  const allCountries = Array.from(new Set(
    SEARCH_SUBSIDIES.flatMap(s => 
      Array.isArray(s.countryEligibility) 
        ? s.countryEligibility 
        : [s.countryEligibility]
    ).filter(Boolean)
  ));

  // All available agricultural sectors from subsidies
  const allAgricSectors = Array.from(new Set(
    SEARCH_SUBSIDIES.flatMap(s => 
      Array.isArray(s.agriculturalSector) 
        ? s.agriculturalSector 
        : [s.agriculturalSector]
    ).filter(Boolean)
  ));

  // All available farming methods from subsidies
  const allFarmingMethods = Array.from(new Set(
    SEARCH_SUBSIDIES.flatMap(s => 
      Array.isArray(s.farmingMethod) 
        ? s.farmingMethod 
        : [s.farmingMethod]
    ).filter(Boolean)
  ));

  // All available certifications from subsidies
  const allCertifications = Array.from(new Set(
    SEARCH_SUBSIDIES.flatMap(s => s.certifications || []).filter(Boolean)
  ));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-8 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('subsidies.searchEngine')}</h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6">
            {/* Filter Sidebar - Desktop */}
            <div className={`md:w-80 flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow ${isFilterOpen ? 'block' : 'hidden md:block'}`}>
              <div className="p-4 border-b flex justify-between items-center">
                <div className="flex items-center">
                  <Filter className="mr-2 h-5 w-5 text-gray-500" />
                  <h2 className="font-medium">{t('dashboard.filterByStatus')}</h2>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={16} className="mr-1" />
                  Clear
                </Button>
                <button 
                  className="md:hidden text-gray-500"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  {isFilterOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>
              
              <div className="p-4 space-y-6">
                {/* Search */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
                    <Input 
                      placeholder={`${t('common.search')}...`}
                      className="pl-8" 
                      value={filters.searchTerm}
                      onChange={(e) => setFilters(prev => ({...prev, searchTerm: e.target.value}))}
                    />
                  </div>
                </div>
                
                {/* Funding Type Filter */}
                <Accordion type="single" collapsible defaultValue="funding">
                  <AccordionItem value="funding">
                    <AccordionTrigger>{t('subsidies.fundingType')}</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      {['public', 'private', 'mixed'].map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`funding-${type}`} 
                            checked={filters.fundingType.includes(type)}
                            onCheckedChange={() => handleFilterChange('fundingType', type)}
                          />
                          <Label htmlFor={`funding-${type}`}>
                            {t(`subsidies.fundingType.${type}` as TranslationKey)}
                          </Label>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                {/* Country Eligibility Filter */}
                <Accordion type="single" collapsible defaultValue="country">
                  <AccordionItem value="country">
                    <AccordionTrigger>{t('subsidies.countryEligibility')}</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      {allCountries.map(country => (
                        <div key={country} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`country-${country}`} 
                            checked={filters.countries.includes(country)}
                            onCheckedChange={() => handleFilterChange('countries', country)}
                          />
                          <Label htmlFor={`country-${country}`}>{country}</Label>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                {/* Agricultural Sector Filter */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="sector">
                    <AccordionTrigger>{t('subsidies.agriculturalSector')}</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      {allAgricSectors.map(sector => (
                        <div key={sector} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`sector-${sector}`} 
                            checked={filters.agricSector.includes(sector)}
                            onCheckedChange={() => handleFilterChange('agricSector', sector)}
                          />
                          <Label htmlFor={`sector-${sector}`}>{sector}</Label>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                {/* Farming Method Filter */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="method">
                    <AccordionTrigger>{t('subsidies.farmingMethod')}</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      {allFarmingMethods.map(method => (
                        <div key={method} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`method-${method}`} 
                            checked={filters.farmingMethod.includes(method)}
                            onCheckedChange={() => handleFilterChange('farmingMethod', method)}
                          />
                          <Label htmlFor={`method-${method}`}>{method}</Label>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                {/* Certifications Filter */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="cert">
                    <AccordionTrigger>{t('subsidies.certifications')}</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      {allCertifications.map(cert => (
                        <div key={cert} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`cert-${cert}`} 
                            checked={filters.certifications.includes(cert)}
                            onCheckedChange={() => handleFilterChange('certifications', cert)}
                          />
                          <Label htmlFor={`cert-${cert}`}>{cert}</Label>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                
                {/* Match Confidence Slider */}
                <div className="space-y-4">
                  <Label>{t('subsidies.matchConfidenceSlider')}</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[filters.minConfidence]}
                      onValueChange={(val) => setFilters(prev => ({...prev, minConfidence: val[0]}))}
                    />
                    <span className="min-w-[45px] text-center">{filters.minConfidence}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mobile Filter Toggle Button */}
            <div className="md:hidden mb-4 flex justify-between items-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center"
              >
                <Filter size={16} className="mr-2" />
                {t('dashboard.filterByStatus')}
                {isFilterOpen ? <ChevronUp className="ml-2" size={16} /> : <ChevronDown className="ml-2" size={16} />}
              </Button>
              <span className="text-sm text-gray-500">
                {filteredSubsidies.length} {t('subsidies.resultsFound')}
              </span>
            </div>
            
            {/* Results */}
            <div className="flex-grow">
              <div className="hidden md:flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{t('subsidies.title')}</h2>
                <span className="text-sm text-gray-500">
                  {filteredSubsidies.length} {t('subsidies.resultsFound')}
                </span>
              </div>
              
              {filteredSubsidies.length > 0 ? (
                <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredSubsidies.map((subsidy) => (
                    <Card key={subsidy.id} className="border-2 border-transparent hover:border-primary/20 transition-colors dark:bg-gray-800">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {subsidy.fundingType && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {t(`subsidies.${subsidy.fundingType}`)}
                            </Badge>
                          )}
                          {Array.isArray(subsidy.countryEligibility) ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {subsidy.countryEligibility.length > 2 
                                ? `${subsidy.countryEligibility[0]}, ${subsidy.countryEligibility[1]}...` 
                                : subsidy.countryEligibility.join(', ')}
                            </Badge>
                          ) : (
                            subsidy.countryEligibility && (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {subsidy.countryEligibility}
                              </Badge>
                            )
                          )}
                          {subsidy.certifications && subsidy.certifications.length > 0 && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {subsidy.certifications.join(', ')}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{getLocalizedContent(subsidy.name)}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {getLocalizedContent(subsidy.description)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center">
                            <Percent size={16} className="mr-2 text-gray-500" />
                            <span className="text-gray-700">{subsidy.matchConfidence}%</span>
                          </div>
                          <div className="flex items-center">
                            <Calendar size={16} className="mr-2 text-gray-500" />
                            <span className="text-gray-700">{subsidy.deadline}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin size={16} className="mr-2 text-gray-500" />
                            <span className="text-gray-700 truncate">
                              {Array.isArray(subsidy.region) 
                                ? subsidy.region.join(', ') 
                                : subsidy.region}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Award size={16} className="mr-2 text-gray-500" />
                            <span className="text-gray-700">{subsidy.code}</span>
                          </div>
                          <div className="flex items-center col-span-2">
                            <DollarSign size={16} className="mr-2 text-gray-500" />
                            <span className="text-gray-700">{subsidy.grant}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2 flex justify-end">
                        <Button onClick={() => handleAttachToFarm(subsidy)}>
                          {t('subsidies.attachToFarm')}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-lg shadow">
                  <Filter className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('subsidies.noMatchCriteria')}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Try adjusting your filters or search term to find more results.
                  </p>
                  <Button onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Attach to Farm Dialog */}
      <Dialog open={showAttachDialog} onOpenChange={setShowAttachDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('subsidies.selectFarm')}</DialogTitle>
            <DialogDescription>
              Choose which farm to attach this subsidy to.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4 max-h-[300px] overflow-y-auto">
            {farms.map(farm => (
              <Button
                key={farm.id}
                variant="outline"
                className="justify-start h-auto py-3 px-4"
                onClick={() => attachSubsidyToFarm(farm.id)}
              >
                <div className="flex items-center w-full">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-primary text-sm font-medium">{farm.name.substring(0, 1)}</span>
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{farm.name}</div>
                    <div className="text-sm text-gray-500">{farm.region}</div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttachDialog(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubsidySearchPage;

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Clock, Globe, Hash, DollarSign, Percent, Plus, Link, FileText, PenTool } from 'lucide-react';
import { Subsidy, getRandomSubsidies } from '@/data/subsidies';
import { farms } from '@/data/farms';
import { Progress } from '@/components/ui/progress';
import FarmCardApplyButton from '@/components/FarmCardApplyButton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { FormField, FormItem, FormLabel, FormControl, Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

interface SubsidiesTabContentProps {
  farmId: string;
}

interface RequiredDocument {
  id: string;
  name: string;
}

interface SubsidyFormValues {
  name: string;
  description: string;
  region: string;
  deadline: Date;
  grant: string;
  matchConfidence: number;
  code: string;
  requiredDocuments: RequiredDocument[];
}

const regions = [
  "EU-wide",
  "France",
  "Germany",
  "Spain",
  "Italy",
  "Romania",
  "Netherlands",
  "Belgium",
  "Austria",
  "Poland"
];

export const SubsidiesTabContent: React.FC<SubsidiesTabContentProps> = ({ farmId }) => {
  const { t } = useLanguage();
  const [farmSubsidies, setFarmSubsidies] = useState(getRandomSubsidies(farmId));
  const [isAddSubsidyOpen, setIsAddSubsidyOpen] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchedSubsidy, setFetchedSubsidy] = useState<any>(null);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([
    { id: uuidv4(), name: '' }
  ]);
  
  const form = useForm<SubsidyFormValues>({
    defaultValues: {
      name: '',
      description: '',
      region: '',
      deadline: new Date(),
      grant: '',
      matchConfidence: 85,
      code: `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
      requiredDocuments: [{ id: uuidv4(), name: '' }],
    },
  });
  
  const farm = farms.find(f => f.id === farmId);
  
  const getFarmCountry = () => {
    if (!farm?.region) return "France";
    if (farm.region.includes(',')) {
      const parts = farm.region.split(",");
      return parts.length > 1 ? parts[1].trim() : "France";
    }
    return "France";
  };
  
  let matchedSubsidies = farmSubsidies.filter(subsidy => {
    const farmCountry = getFarmCountry();
    
    if (Array.isArray(subsidy.region)) {
      return subsidy.region.some(r => r.includes(farmCountry));
    }
    
    return subsidy.region.includes(farmCountry) || subsidy.region === "EU-wide";
  });

  const handleFetchSubsidy = () => {
    if (!urlValue) return;
    
    setIsFetching(true);
    
    setTimeout(() => {
      const mockSubsidy = {
        id: uuidv4(),
        name: "Green Infrastructure Grant",
        description: "Financial support for implementing green infrastructure projects on farms to enhance sustainability and reduce environmental impact.",
        region: "France",
        deadline: "2025-06-30",
        grant: "Up to €75,000",
        matchConfidence: 92,
        code: `EU-GRN-${Math.floor(1000 + Math.random() * 9000)}`,
        documentsRequired: ["Sustainability Plan", "Financial Statement", "Farm Certification"],
        isManuallyAdded: true
      };
      
      setFetchedSubsidy(mockSubsidy);
      setIsFetching(false);
    }, 1500);
  };

  const addDocument = () => {
    setRequiredDocuments([...requiredDocuments, { id: uuidv4(), name: '' }]);
  };

  const updateDocument = (id: string, value: string) => {
    setRequiredDocuments(requiredDocuments.map(doc => 
      doc.id === id ? { ...doc, name: value } : doc
    ));
  };

  const removeDocument = (id: string) => {
    if (requiredDocuments.length > 1) {
      setRequiredDocuments(requiredDocuments.filter(doc => doc.id !== id));
    }
  };

  const handleSaveUrlSubsidy = () => {
    if (fetchedSubsidy) {
      const newSubsidy = {
        ...fetchedSubsidy,
        id: uuidv4(),
      };
      
      setFarmSubsidies([...farmSubsidies, newSubsidy]);
      setFetchedSubsidy(null);
      setUrlValue('');
      setIsAddSubsidyOpen(false);
    }
  };

  const onSubmitManualEntry = (data: SubsidyFormValues) => {
    const filteredDocs = requiredDocuments.filter(doc => doc.name.trim() !== '').map(doc => doc.name);
    
    const newSubsidy = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      region: data.region,
      deadline: format(data.deadline, 'yyyy-MM-dd'),
      grant: data.grant,
      matchConfidence: data.matchConfidence,
      code: data.code,
      documentsRequired: filteredDocs,
      isManuallyAdded: true
    };
    
    setFarmSubsidies([...farmSubsidies, newSubsidy]);
    form.reset();
    setRequiredDocuments([{ id: uuidv4(), name: '' }]);
    setIsAddSubsidyOpen(false);
  };

  React.useEffect(() => {
    matchedSubsidies = farmSubsidies.filter(subsidy => {
      const farmCountry = getFarmCountry();
      
      if (Array.isArray(subsidy.region)) {
        return subsidy.region.some(r => r.includes(farmCountry));
      }
      
      return subsidy.region.includes(farmCountry) || subsidy.region === "EU-wide";
    });
  }, [farmSubsidies]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('subsidies.title')}</CardTitle>
          <CardDescription>{t('subsidies.subtitle')}</CardDescription>
        </div>
        <Dialog open={isAddSubsidyOpen} onOpenChange={setIsAddSubsidyOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1">
              <Plus size={16} />
              {t('common.addSubsidy')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>{t('common.addSubsidy')}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="url" className="mt-4">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="url" className="flex items-center gap-1">
                  <Link size={14} />
                  {t('common.importViaUrl')}
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-1">
                  <PenTool size={14} />
                  {t('common.manualEntry')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="url" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subsidy-url">{t('common.subsidySourceUrl')}</Label>
                  <Input 
                    id="subsidy-url" 
                    placeholder="https://ec.europa.eu/subsidies/..." 
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                  />
                </div>
                
                <Button 
                  onClick={handleFetchSubsidy} 
                  disabled={isFetching || !urlValue}
                  className="gap-1"
                >
                  {isFetching ? t('common.fetchingSubsidyData') : t('common.fetchDetails')}
                </Button>
                
                {fetchedSubsidy && (
                  <div className="mt-4 border rounded-md p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{fetchedSubsidy.name}</h3>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                        {t('common.manuallyAdded')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{fetchedSubsidy.description}</p>
                    <div className="text-sm grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1">
                        <Globe size={14} className="text-gray-500" />
                        <span>{fetchedSubsidy.region}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={14} className="text-gray-500" />
                        <span>{fetchedSubsidy.deadline}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} className="text-gray-500" />
                        <span>{fetchedSubsidy.grant}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Hash size={14} className="text-gray-500" />
                        <span>{fetchedSubsidy.code}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">{t('common.documentsRequired')}:</p>
                      <ul className="text-sm list-disc pl-5">
                        {fetchedSubsidy.documentsRequired?.map((doc: string, index: number) => (
                          <li key={index}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <Button onClick={handleSaveUrlSubsidy} className="w-full mt-4">
                      {t('common.saveToFarm')}
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="manual">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitManualEntry)} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="subsidy-name">{t('common.subsidyName')}</Label>
                        <Input 
                          id="subsidy-name" 
                          {...form.register('name')}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="subsidy-description">Description</Label>
                        <Input 
                          id="subsidy-description" 
                          {...form.register('description')}
                          placeholder="Brief description of the subsidy"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="subsidy-region">{t('common.region')}</Label>
                          <Select 
                            onValueChange={(value) => form.setValue('region', value)}
                            defaultValue={form.getValues('region')}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                            <SelectContent>
                              {regions.map((region) => (
                                <SelectItem key={region} value={region}>
                                  {region}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>{t('subsidies.deadline')}</Label>
                          <FormField
                            control={form.control}
                            name="deadline"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) => date < new Date()}
                                      initialFocus
                                      className={cn("p-3 pointer-events-auto")}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="subsidy-grant">{t('common.grantAmount')}</Label>
                          <Input 
                            id="subsidy-grant" 
                            placeholder="e.g., Up to €75,000"
                            {...form.register('grant')}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="subsidy-code">{t('subsidies.grantCode')}</Label>
                          <Input 
                            id="subsidy-code" 
                            placeholder="e.g., EU-GRN-1234"
                            {...form.register('code')}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label htmlFor="match-confidence">{t('common.matchConfidence')}</Label>
                          <span className="text-sm">{form.watch('matchConfidence')}%</span>
                        </div>
                        <Slider
                          id="match-confidence"
                          min={0}
                          max={100}
                          step={1}
                          value={[form.watch('matchConfidence')]}
                          onValueChange={(values) => form.setValue('matchConfidence', values[0])}
                          className="py-2"
                        />
                      </div>
                      
                      <div className="space-y-3 border-t pt-3">
                        <div className="flex items-center justify-between">
                          <Label>{t('common.documentsRequired')}</Label>
                        </div>
                        
                        {requiredDocuments.map((doc, index) => (
                          <div key={doc.id} className="flex items-center gap-2">
                            <Input
                              placeholder={`${t('common.requiredDocument')} ${index + 1}`}
                              value={doc.name}
                              onChange={(e) => updateDocument(doc.id, e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(doc.id)}
                              disabled={requiredDocuments.length === 1}
                            >
                              &times;
                            </Button>
                          </div>
                        ))}
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addDocument}
                          className="mt-2"
                        >
                          + {t('common.addAnother')}
                        </Button>
                      </div>
                    </div>
                    
                    <Button type="submit" className="w-full mt-6">
                      {t('common.saveToFarm')}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {matchedSubsidies.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {matchedSubsidies.map((subsidy) => (
              <Card key={subsidy.id} className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-colors dark:bg-dark-card">
                <CardHeader className="bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg dark:text-white">{subsidy.name}</CardTitle>
                    {subsidy.isManuallyAdded && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                        {t('common.manuallyAdded')}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="dark:text-gray-300">{subsidy.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Percent size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 mr-2">{t('subsidies.matchConfidence')}:</span>
                      <div className="flex items-center gap-2 ml-auto">
                        <Progress value={subsidy.matchConfidence} className="h-2 w-24" />
                        <span className="text-sm font-medium dark:text-white">{subsidy.matchConfidence}%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Clock size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('subsidies.deadline')}:</span>
                      <span className="text-sm font-medium ml-auto dark:text-white">{subsidy.deadline}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Globe size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('subsidies.regionEligibility')}:</span>
                      <span className="text-sm font-medium ml-auto dark:text-white">
                        {Array.isArray(subsidy.region) ? subsidy.region.join(', ') : subsidy.region}
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <Hash size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('subsidies.grantCode')}:</span>
                      <span className="text-sm font-medium ml-auto dark:text-white">{subsidy.code}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <DollarSign size={16} className="mr-2 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t('subsidies.maxGrant')}:</span>
                      <span className="text-sm font-medium ml-auto dark:text-white">{subsidy.grant}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <FarmCardApplyButton farmId={farmId} subsidyId={subsidy.id}>
                      {t('common.applyNow')}
                    </FarmCardApplyButton>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-6 border rounded-lg border-dashed text-center bg-gray-50 dark:bg-gray-800">
            <AlertTriangle className="mx-auto mb-3 text-amber-500 h-8 w-8" />
            <h3 className="text-lg font-medium mb-2 dark:text-white">{t('common.noSubsidiesFound')}</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {t('common.noSubsidiesFoundDesc')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

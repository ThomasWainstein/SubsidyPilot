
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Building, Loader2 } from 'lucide-react';
import { Farm, farms } from '@/data/farms';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { toast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

interface AddFarmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type IdType = 'SIRET' | 'SIREN' | 'PACAGE';

interface FrenchRegistryForm {
  idType: IdType;
  registryId: string;
}

const AddFarmModal = ({ isOpen, onClose }: AddFarmModalProps) => {
  const { t } = useLanguage();
  const [isSearching, setIsSearching] = useState(false);
  const [foundFarm, setFoundFarm] = useState<Farm | null>(null);
  const [selectedIdType, setSelectedIdType] = useState<IdType>('SIRET');

  const form = useForm<FrenchRegistryForm>({
    defaultValues: {
      idType: 'SIRET',
      registryId: '',
    },
  });

  const validateRegistryId = (value: string, type: IdType): boolean => {
    switch (type) {
      case 'SIRET':
        return /^\d{14}$/.test(value);
      case 'SIREN':
      case 'PACAGE':
        return /^\d{9}$/.test(value);
      default:
        return false;
    }
  };

  const handleSearchFarm = () => {
    const idType = form.getValues('idType');
    const registryId = form.getValues('registryId');
    
    if (!validateRegistryId(registryId, idType)) {
      form.setError('registryId', { 
        type: 'manual', 
        message: t('addFarm.invalidFormat').replace('{{idType}}', idType) 
      });
      return;
    }

    setIsSearching(true);
    setFoundFarm(null);

    // Simulate API call with timeout
    setTimeout(() => {
      setIsSearching(false);
      
      // Mock data for the found farm
      if (registryId === '88234567890123' || registryId === '123456789') {
        const mockFarm: Farm = {
          id: uuidv4(),
          name: 'GAEC Le Soleil Vert',
          region: 'Bourgogne-Franche-Comté, France',
          status: 'Profile Complete',
          tags: ['Organic', 'Biodiversity', 'Wine'],
          updatedAt: new Date().toISOString().split('T')[0],
          size: '85 hectares',
          staff: 4,
          certifications: ['AB', 'EU Organic'],
          revenue: '€420,000',
          activities: ['Viticulture'],
          carbonScore: 91,
          irrigationMethod: 'Gravity-fed',
          software: ['Agrimap', 'Registre PAC'],
          idType: idType,
          registryId: registryId,
          isImportedFromRegistry: true
        };
        setFoundFarm(mockFarm);
      } else {
        toast({
          title: t('addFarm.noMatch'),
          description: t('addFarm.tryDifferentId'),
          variant: "destructive",
        });
      }
    }, 2000);
  };

  const handleImportFarm = () => {
    if (foundFarm) {
      // Add the found farm to the farms array
      // In a real app, this would be an API call
      farms.unshift(foundFarm);
      
      toast({
        title: t('addFarm.farmImported'),
        description: t('addFarm.farmImportedDesc'),
      });
      
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('common.addNewClientFarm')}</DialogTitle>
          <DialogDescription>
            {t('addFarm.chooseMethods')}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="manual" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual">{t('addFarm.manualEntry')}</TabsTrigger>
            <TabsTrigger value="document">{t('addFarm.documentUpload')}</TabsTrigger>
            <TabsTrigger value="french" className="flex items-center">
              <Building className="mr-2 h-4 w-4" />
              🇫🇷 {t('addFarm.frenchRegistry')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="farm-name">{t('form.farmName')}</Label>
              <Input id="farm-name" placeholder={t('addFarm.enterFarmName')} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="farm-region">{t('subsidies.region')}</Label>
              <Input id="farm-region" placeholder={t('addFarm.enterRegion')} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="farm-tags">{t('addFarm.tagsLabel')}</Label>
              <Input id="farm-tags" placeholder={t('addFarm.tagsPlaceholder')} />
            </div>
          </TabsContent>
          
          <TabsContent value="document" className="space-y-4 py-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">{t('addFarm.dragAndDrop')}</p>
              <p className="mt-1 text-xs text-gray-500">{t('addFarm.supportedDocuments')}</p>
              <Button variant="outline" className="mt-4">
                {t('addFarm.selectFiles')}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="french" className="space-y-4 py-4">
            <Form {...form}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="idType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('addFarm.selectIdType')}</FormLabel>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                        onChange={(e) => {
                          field.onChange(e);
                          setSelectedIdType(e.target.value as IdType);
                          form.resetField('registryId');
                          setFoundFarm(null);
                        }}
                        value={field.value}
                      >
                        <option value="SIRET">SIRET</option>
                        <option value="SIREN">SIREN</option>
                        <option value="PACAGE">PACAGE</option>
                      </select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{selectedIdType} {t('addFarm.number')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder={`${t('addFarm.enterValid')} ${selectedIdType}`}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setFoundFarm(null);
                          }}
                          disabled={isSearching}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('addFarm.registryHelp')}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="button" 
                  onClick={handleSearchFarm}
                  disabled={isSearching || !form.getValues('registryId')}
                  className="w-full"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('addFarm.searching')}
                    </>
                  ) : (
                    t('addFarm.searchFarm')
                  )}
                </Button>
              </div>
            </Form>

            {foundFarm && (
              <div className="mt-6 border rounded-md p-4 bg-muted/50 space-y-3 animate-fade-in">
                <h3 className="text-base font-medium">{t('addFarm.resultFound')}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('form.farmName')}:</span>
                    <span className="font-medium">{foundFarm.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('subsidies.region')}:</span>
                    <span>{foundFarm.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('addFarm.registryId')}:</span>
                    <span>{foundFarm.registryId}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {foundFarm.tags.map((tag, index) => (
                      <span key={index} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={handleImportFarm} 
                  className="w-full mt-4"
                >
                  {t('addFarm.importButton')}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          {!foundFarm && (
            <Button onClick={onClose}>
              {t('common.save')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddFarmModal;

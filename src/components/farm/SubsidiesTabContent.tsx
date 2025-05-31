
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Clock, Globe, Hash, DollarSign, Percent, Plus, Link, FileText, Zap, Pin } from 'lucide-react';
import { farms } from '@/data/farms';
import { Progress } from '@/components/ui/progress';
import FarmCardApplyButton from '@/components/FarmCardApplyButton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ManualSubsidyForm } from './ManualSubsidyForm';
import { ImportSubsidyForm } from './ImportSubsidyForm';
import { Subsidy } from '@/types/subsidy';
import { useToast } from '@/hooks/use-toast';
import { getSubsidiesForFarm } from '@/utils/subsidyAttachment';
import { getLocalizedContent } from '@/utils/language';
import { supabase } from '@/integrations/supabase/client';

interface SubsidiesTabContentProps {
  farmId: string;
}

export const SubsidiesTabContent: React.FC<SubsidiesTabContentProps> = ({ farmId }) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [allSubsidies, setAllSubsidies] = useState<Subsidy[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const farm = farms.find(f => f.id === farmId);
  
  // Fetch subsidies from database and combine with custom ones
  useEffect(() => {
    const fetchSubsidies = async () => {
      try {
        setLoading(true);
        
        // Fetch from database
        const { data: dbSubsidies, error } = await supabase
          .from('subsidies')
          .select('*');

        if (error) {
          console.error('Error fetching subsidies:', error);
          toast({
            title: t('common.error'),
            description: 'Failed to fetch subsidies from database',
            variant: 'destructive',
          });
        }

        // Transform database subsidies to match our Subsidy type
        const transformedSubsidies: Subsidy[] = (dbSubsidies || []).map((dbSubsidy: any) => ({
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
        
        // Get custom subsidies from localStorage
        const customSubsidiesKey = `farm_${farmId}_custom_subsidies`;
        const customSubsidiesStr = localStorage.getItem(customSubsidiesKey);
        const customSubsidies = customSubsidiesStr ? JSON.parse(customSubsidiesStr) : [];
        
        // Get subsidies attached from the search page
        const attachedSubsidyIds = getSubsidiesForFarm(farmId);
        const attachedSubsidies = transformedSubsidies.filter(subsidy => 
          attachedSubsidyIds.includes(subsidy.id)
        ).map(subsidy => ({
          ...subsidy,
          source: 'search',
          isManuallyAdded: true
        }));
        
        // Combine all subsidies (filter out duplicates)
        const allCombinedSubsidies = [...transformedSubsidies, ...customSubsidies, ...attachedSubsidies];
        const uniqueSubsidies = allCombinedSubsidies.filter((subsidy, index, self) => 
          index === self.findIndex(s => s.id === subsidy.id)
        );
        
        setAllSubsidies(uniqueSubsidies);
      } catch (error) {
        console.error('Error in fetchSubsidies:', error);
        toast({
          title: t('common.error'),
          description: 'Failed to load subsidies',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubsidies();
  }, [farmId, t, toast]);
  
  const getFarmCountry = () => {
    if (!farm?.region) return "France";
    // If region already contains country (e.g., "Bayern, Germany"), extract it
    if (farm.region.includes(',')) {
      const parts = farm.region.split(",");
      return parts.length > 1 ? parts[1].trim() : "France";
    }
    // Default to France for French regions without explicit country
    return "France";
  };
  
  const matchedSubsidies = allSubsidies.filter(subsidy => {
    const farmCountry = getFarmCountry();
    
    // For custom subsidies with source from search, always show them
    if (subsidy.source === 'search' && subsidy.isManuallyAdded) {
      return true;
    }
    
    // Handle both string and array region fields
    if (Array.isArray(subsidy.region)) {
      return subsidy.region.some(r => r.includes(farmCountry));
    }
    
    return typeof subsidy.region === 'string' && (subsidy.region.includes(farmCountry) || subsidy.region === "EU-wide");
  });

  const handleAddSubsidy = (newSubsidy: Subsidy) => {
    setAllSubsidies(prev => [...prev, newSubsidy]);
    setDialogOpen(false);
    toast({
      title: "Subsidy Added",
      description: `${newSubsidy.name} has been added successfully.`,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('subsidies.title')}</CardTitle>
          <CardDescription>{t('subsidies.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2">{t('common.loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('subsidies.title')}</CardTitle>
          <CardDescription>{t('subsidies.subtitle')}</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus size={16} />
              {t('common.addNewSubsidy')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t('common.addNewSubsidy')}</DialogTitle>
              <DialogDescription>
                Add a new subsidy opportunity for this farm either by importing from a URL or entering details manually.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="manual" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <FileText size={16} />
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="import" className="flex items-center gap-2">
                  <Link size={16} />
                  Import from URL
                </TabsTrigger>
              </TabsList>
              <TabsContent value="manual">
                <ManualSubsidyForm 
                  farmId={farmId} 
                  farmRegion={farm?.region || ''} 
                  onAddSubsidy={handleAddSubsidy} 
                />
              </TabsContent>
              <TabsContent value="import">
                <ImportSubsidyForm 
                  farmId={farmId}
                  farmRegion={farm?.region || ''}
                  onAddSubsidy={handleAddSubsidy}
                />
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">{t('farm.attachedSubsidies')}</h3>
          <div className="flex gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Zap size={14} />
              {t('farm.automaticallyMatched')}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Pin size={14} />
              {t('farm.manuallyAttached')}
            </Badge>
          </div>
        </div>

        {matchedSubsidies.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {matchedSubsidies.map((subsidy) => (
              <Card key={subsidy.id} className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-colors dark:bg-dark-card">
                <CardHeader className="bg-gray-50 dark:bg-gray-800">
                  <div className="flex items-center flex-wrap gap-2">
                    <CardTitle className="text-lg dark:text-white">
                      {getLocalizedContent(subsidy.name, language)}
                    </CardTitle>
                    {(subsidy.isManuallyAdded || subsidy.source === 'search') && (
                      <Badge variant="outline" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-200">
                        {subsidy.source === 'search' ? <Pin size={12} className="mr-1" /> : <Zap size={12} className="mr-1" />}
                        {subsidy.source === 'search' ? 'From Search' : 'Manual Entry'}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="dark:text-gray-300">
                    {getLocalizedContent(subsidy.description, language)}
                  </CardDescription>
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
                      <span className="text-sm font-medium ml-auto dark:text-white">{
                        Array.isArray(subsidy.region) 
                          ? subsidy.region.join(', ')
                          : subsidy.region
                      }</span>
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

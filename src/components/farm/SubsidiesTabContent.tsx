
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle, Plus } from 'lucide-react';
import { farms } from '@/data/farms';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManualSubsidyForm } from './ManualSubsidyForm';
import { ImportSubsidyForm } from './ImportSubsidyForm';
import { Subsidy } from '@/types/subsidy';
import { useToast } from '@/hooks/use-toast';
import { getSubsidiesForFarm } from '@/utils/subsidyAttachment';
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
        const allCombinedSubsidies = [...transformedSubsidies, ...customSubsidies];
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
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="import">Import from URL</TabsTrigger>
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
        <div className="p-6 border rounded-lg border-dashed text-center bg-gray-50 dark:bg-gray-800">
          <AlertTriangle className="mx-auto mb-3 text-amber-500 h-8 w-8" />
          <h3 className="text-lg font-medium mb-2 dark:text-white">{t('common.noSubsidiesFound')}</h3>
          <p className="text-gray-600 dark:text-gray-300">
            {t('common.noSubsidiesFoundDesc')}
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Click the "Add New Subsidy" button to add your first subsidy manually or import one from a URL.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

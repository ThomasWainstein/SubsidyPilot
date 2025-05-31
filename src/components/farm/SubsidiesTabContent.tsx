
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { farms } from '@/data/farms';
import { Subsidy } from '@/types/subsidy';
import { useToast } from '@/hooks/use-toast';
import { getSubsidiesForFarm } from '@/utils/subsidyAttachment';
import { supabase } from '@/integrations/supabase/client';
import SubsidyHeader from './subsidy/SubsidyHeader';
import SubsidyEmptyState from './subsidy/SubsidyEmptyState';
import SubsidyAddDialog from './subsidy/SubsidyAddDialog';
import SubsidyLoadingState from './subsidy/SubsidyLoadingState';

interface SubsidiesTabContentProps {
  farmId: string;
}

export const SubsidiesTabContent: React.FC<SubsidiesTabContentProps> = ({ farmId }) => {
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
            title: 'Error',
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
          matchConfidence: Math.floor(Math.random() * 30) + 70,
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
          title: 'Error',
          description: 'Failed to load subsidies',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubsidies();
  }, [farmId, toast]);
  
  const handleAddSubsidy = (newSubsidy: Subsidy) => {
    setAllSubsidies(prev => [...prev, newSubsidy]);
    setDialogOpen(false);
    toast({
      title: "Subsidy Added",
      description: `${newSubsidy.name} has been added successfully.`,
    });
  };

  if (loading) {
    return <SubsidyLoadingState />;
  }

  return (
    <Card>
      <SubsidyHeader onAddSubsidy={() => setDialogOpen(true)} />
      <CardContent>
        <SubsidyEmptyState />
      </CardContent>
      
      <SubsidyAddDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        farmId={farmId}
        farmRegion={farm?.region || ''}
        onAddSubsidy={handleAddSubsidy}
      />
    </Card>
  );
};

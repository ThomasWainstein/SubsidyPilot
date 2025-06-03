import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFarm } from '@/hooks/useFarms';
import Navbar from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { CalendarDays, Loader2, Edit } from 'lucide-react';
import { ProfileTabContent } from '@/components/farm/ProfileTabContent';
import DocumentsTabContent from '@/components/farm/DocumentsTabContent';
import { SubsidiesTabContent } from '@/components/farm/SubsidiesTabContent';
import { ApplicationsTabContent } from '@/components/farm/ApplicationsTabContent';
import { countries } from '@/schemas/farmValidation';

const FarmProfilePage = () => {
  const { farmId } = useParams<{ farmId: string }>();
  const { t } = useLanguage();
  const navigate = useNavigate();

  console.log('FarmProfilePage: farmId from params:', farmId);

  // Get farm from Supabase
  const { data: supabaseFarm, isLoading, error } = useFarm(farmId || '');
  
  console.log('FarmProfilePage: Supabase farm data:', supabaseFarm);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="animate-spin" />
            <span>Loading farm...</span>
          </div>
        </main>
      </div>
    );
  }

  if (error || !supabaseFarm) {
    console.error('FarmProfilePage: Error or no farm found:', error);
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Farm Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The farm with ID "{farmId}" could not be found.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Transform Supabase farm to match the expected format
  const transformedFarm = {
    id: supabaseFarm.id,
    name: supabaseFarm.name,
    region: supabaseFarm.country ? 
      `${supabaseFarm.department || 'Unknown'}, ${countries.find(c => c.code === supabaseFarm.country)?.name || supabaseFarm.country}` : 
      supabaseFarm.department || 'Unknown',
    status: 'Profile Complete' as const,
    updatedAt: supabaseFarm.updated_at ? new Date(supabaseFarm.updated_at).toLocaleDateString() : 
                supabaseFarm.created_at ? new Date(supabaseFarm.created_at).toLocaleDateString() : '',
    size: supabaseFarm.total_hectares ? `${supabaseFarm.total_hectares} ha` : 'Not specified',
    staff: supabaseFarm.staff_count || 0,
    tags: supabaseFarm.matching_tags || [],
    certifications: supabaseFarm.certifications || [],
    irrigationMethod: supabaseFarm.irrigation_method || 'Not specified',
    crops: supabaseFarm.land_use_types || [],
    revenue: supabaseFarm.revenue || 'Not specified',
    activities: supabaseFarm.land_use_types || [],
    carbonScore: 0, // This would need to be calculated
    software: supabaseFarm.software_used || [],
    address: supabaseFarm.address,
    yearEstablished: supabaseFarm.created_at ? new Date(supabaseFarm.created_at).getFullYear() : undefined,
    legalStatus: supabaseFarm.legal_status,
    cnpOrCui: supabaseFarm.cnp_or_cui,
    country: supabaseFarm.country,
    department: supabaseFarm.department,
    locality: supabaseFarm.locality,
    landOwnership: supabaseFarm.own_or_lease ? 'Own' : 'Lease',
    hasLivestock: supabaseFarm.livestock_present,
    livestock: supabaseFarm.livestock,
    environmentalPermits: supabaseFarm.environmental_permit,
    technicalDocs: supabaseFarm.tech_docs,
    subsidyInterests: supabaseFarm.subsidy_interest,
    phone: supabaseFarm.phone,
    preferredLanguage: supabaseFarm.preferred_language,
  };

  const handleEditFarm = () => {
    navigate(`/farm/${farmId}/edit`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{transformedFarm.name}</h1>
                <div className="flex items-center mt-2 gap-2">
                  <StatusBadge status={transformedFarm.status} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    <CalendarDays size={14} className="inline mr-1" />
                    {t('common.lastUpdated')}: {transformedFarm.updatedAt}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {transformedFarm.region}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleEditFarm} variant="outline" className="flex items-center gap-2">
                  <Edit size={16} />
                  Edit Farm
                </Button>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 md:grid-cols-4">
              <TabsTrigger value="profile">{t('common.profile')}</TabsTrigger>
              <TabsTrigger value="documents">{t('common.documents')}</TabsTrigger>
              <TabsTrigger value="subsidies">{t('common.subsidies')}</TabsTrigger>
              <TabsTrigger value="applications">{t('common.applications')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <ProfileTabContent farmId={transformedFarm.id} />
            </TabsContent>
            
            <TabsContent value="documents">
              <DocumentsTabContent farmId={transformedFarm.id} />
            </TabsContent>
            
            <TabsContent value="subsidies">
              <SubsidiesTabContent farmId={transformedFarm.id} />
            </TabsContent>
            
            <TabsContent value="applications">
              <ApplicationsTabContent farmId={transformedFarm.id} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default FarmProfilePage;

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
import PageErrorBoundary from '@/components/error/PageErrorBoundary';
import { handleApiError } from '@/utils/errorHandling';
import React from 'react';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

const FarmProfilePage = () => {
  const { farmId } = useParams<{ farmId: string }>();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { trackUserAction } = usePerformanceMonitoring('Farm Profile');

  // Get farm from Supabase
  const { data: supabaseFarm, isLoading, error } = useFarm(farmId || '');

  // Track page view
  React.useEffect(() => {
    if (farmId) {
      trackUserAction('farm_profile_viewed', { farmId });
    }
  }, [farmId, trackUserAction]);

  // Handle API errors
  if (error) {
    handleApiError(error, 'Farm Profile');
  }

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
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center px-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Farm Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm md:text-base">
              {error ? 'Unable to load farm data. Please try again.' : `The farm with ID "${farmId}" could not be found.`}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={() => navigate(0)} variant="outline" size="sm">
                Try Again
              </Button>
              <Button onClick={() => navigate('/dashboard')} size="sm">
                Return to Dashboard
              </Button>
            </div>
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
    trackUserAction('farm_edit_initiated', { farmId });
    navigate(`/farm/${farmId}/edit`);
  };

  return (
    <PageErrorBoundary pageName="Farm Profile">
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />
        
        <main className="flex-grow py-4 md:py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Mobile-first header */}
            <div className="mb-6 md:mb-8">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">
                      {transformedFarm.name}
                    </h1>
                    <div className="flex flex-col sm:flex-row sm:items-center mt-2 gap-2">
                      <StatusBadge status={transformedFarm.status} />
                      <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400 flex items-center">
                        <CalendarDays size={14} className="inline mr-1 flex-shrink-0" />
                        <span className="truncate">
                          {t('common.lastUpdated')}: {transformedFarm.updatedAt}
                        </span>
                      </span>
                    </div>
                    <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">
                      {transformedFarm.region}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Button 
                      onClick={handleEditFarm} 
                      variant="outline" 
                      className="w-full sm:w-auto flex items-center gap-2 min-h-[44px]"
                      size="sm"
                    >
                      <Edit size={16} />
                      <span className="hidden sm:inline">Edit Farm</span>
                      <span className="sm:hidden">Edit</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mobile-responsive tabs */}
            <Tabs defaultValue="profile" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                <TabsTrigger value="profile" className="text-xs md:text-sm py-2 md:py-3">
                  {t('common.profile')}
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs md:text-sm py-2 md:py-3">
                  {t('common.documents')}
                </TabsTrigger>
                <TabsTrigger value="subsidies" className="text-xs md:text-sm py-2 md:py-3">
                  {t('common.subsidies')}
                </TabsTrigger>
                <TabsTrigger value="applications" className="text-xs md:text-sm py-2 md:py-3">
                  {t('common.applications')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile" className="mt-4">
                <ProfileTabContent farmId={transformedFarm.id} />
              </TabsContent>
              
              <TabsContent value="documents" className="mt-4">
                <DocumentsTabContent farmId={transformedFarm.id} />
              </TabsContent>
              
              <TabsContent value="subsidies" className="mt-4">
                <SubsidiesTabContent farmId={transformedFarm.id} />
              </TabsContent>
              
              <TabsContent value="applications" className="mt-4">
                <ApplicationsTabContent farmId={transformedFarm.id} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </PageErrorBoundary>
  );
};

export default FarmProfilePage;

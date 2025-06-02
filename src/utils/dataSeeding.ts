
import { supabase } from '@/integrations/supabase/client';
import { FEATURES } from '@/config/environment';

// Sample farm data for seeding
const SAMPLE_FARMS = [
  {
    name: 'Green Valley Organic Farm',
    address: '123 Farm Road, Cluj County',
    department: 'Cluj',
    country: 'RO',
    locality: 'Cluj-Napoca',
    total_hectares: 45.5,
    legal_status: 'SRL',
    livestock_present: true,
    land_use_types: ['cereals', 'vegetables', 'pasture'],
    certifications: ['organic', 'bio'],
    irrigation_method: 'drip_irrigation',
    software_used: ['farm_management_pro'],
    matching_tags: ['cluj', 'organic', 'cereals', 'vegetables', 'livestock', 'medium_farm'],
  },
  {
    name: 'Mountain Ridge Livestock',
    address: '456 Mountain View, Brasov County',
    department: 'Brasov',
    country: 'RO',
    locality: 'Brasov',
    total_hectares: 120.0,
    legal_status: 'SA',
    livestock_present: true,
    land_use_types: ['pasture', 'hay'],
    certifications: ['sustainable'],
    irrigation_method: 'natural_rainfall',
    software_used: ['livestock_tracker'],
    matching_tags: ['brasov', 'livestock', 'pasture', 'sustainable', 'large_farm'],
  },
  {
    name: 'Tech Vineyard Solutions',
    address: '789 Wine Valley, Mures County',
    department: 'Mures',
    country: 'RO',
    locality: 'Targu Mures',
    total_hectares: 25.0,
    legal_status: 'PFA',
    livestock_present: false,
    land_use_types: ['vineyards', 'fruits'],
    certifications: ['iso_14001'],
    irrigation_method: 'smart_irrigation',
    software_used: ['precision_agriculture', 'weather_station'],
    matching_tags: ['mures', 'vineyards', 'fruits', 'precision_agriculture', 'medium_farm'],
  },
];

// Sample subsidy data for seeding
const SAMPLE_SUBSIDIES = [
  {
    title: {
      en: 'Organic Farming Transition Grant 2024',
      ro: 'Subventie pentru Tranzitia la Agricultura Ecologica 2024'
    },
    description: {
      en: 'Financial support for farmers transitioning to organic farming practices',
      ro: 'Sprijin financiar pentru fermierii care trec la practicile agricole ecologice'
    },
    code: 'ORG-TRANS-2024',
    region: ['cluj', 'brasov', 'mures'],
    categories: ['organic', 'sustainability'],
    funding_type: 'grant',
    amount_min: 5000,
    amount_max: 50000,
    deadline: '2024-12-31',
    matching_tags: ['organic', 'sustainability', 'cereals', 'vegetables'],
  },
  {
    title: {
      en: 'Smart Agriculture Technology Fund',
      ro: 'Fondul pentru Tehnologia Agricola Inteligenta'
    },
    description: {
      en: 'Support for implementing precision agriculture and smart farming technologies',
      ro: 'Sprijin pentru implementarea agriculturii de precizie si tehnologiilor agricole inteligente'
    },
    code: 'SMART-AG-2024',
    region: ['all'],
    categories: ['technology', 'digitalization'],
    funding_type: 'loan',
    amount_min: 10000,
    amount_max: 200000,
    deadline: '2024-11-30',
    matching_tags: ['precision_agriculture', 'technology', 'smart_irrigation', 'weather_station'],
  },
  {
    title: {
      en: 'Livestock Welfare Improvement Program',
      ro: 'Programul de Imbunatatire a Bunastarii Animalelor'
    },
    description: {
      en: 'Funding for improving livestock housing, feeding systems, and animal welfare',
      ro: 'Finantare pentru imbunatatirea adapostirii, sistemelor de hranire si bunastarii animalelor'
    },
    code: 'LIVESTOCK-2024',
    region: ['brasov', 'cluj'],
    categories: ['livestock', 'welfare'],
    funding_type: 'grant',
    amount_min: 8000,
    amount_max: 80000,
    deadline: '2024-10-15',
    matching_tags: ['livestock', 'pasture', 'animal_welfare'],
  },
];

export const seedSampleData = async (userId: string) => {
  if (!FEATURES.SEEDING) {
    console.warn('Data seeding is disabled in this environment');
    return { success: false, message: 'Seeding disabled' };
  }

  try {
    console.log('Starting data seeding for user:', userId);

    // Seed farms
    const farmPromises = SAMPLE_FARMS.map(farm => 
      supabase.from('farms').insert({ ...farm, user_id: userId })
    );

    const farmResults = await Promise.all(farmPromises);
    const farmErrors = farmResults.filter(result => result.error);
    
    if (farmErrors.length > 0) {
      console.error('Farm seeding errors:', farmErrors);
    }

    // Seed subsidies (admin only)
    const subsidyPromises = SAMPLE_SUBSIDIES.map(subsidy =>
      supabase.from('subsidies').insert(subsidy)
    );

    const subsidyResults = await Promise.all(subsidyPromises);
    const subsidyErrors = subsidyResults.filter(result => result.error);
    
    if (subsidyErrors.length > 0) {
      console.error('Subsidy seeding errors:', subsidyErrors);
    }

    return {
      success: true,
      message: `Seeded ${SAMPLE_FARMS.length} farms and ${SAMPLE_SUBSIDIES.length} subsidies`,
      farms: farmResults.length - farmErrors.length,
      subsidies: subsidyResults.length - subsidyErrors.length,
    };
  } catch (error) {
    console.error('Error seeding data:', error);
    return { success: false, message: 'Seeding failed', error };
  }
};

export const clearSampleData = async (userId: string) => {
  if (!FEATURES.SEEDING) {
    console.warn('Data clearing is disabled in this environment');
    return { success: false, message: 'Clearing disabled' };
  }

  try {
    // Delete user's farms
    const { error: farmError } = await supabase
      .from('farms')
      .delete()
      .eq('user_id', userId);

    if (farmError) {
      console.error('Error clearing farms:', farmError);
      return { success: false, message: 'Failed to clear farms', error: farmError };
    }

    return { success: true, message: 'Sample data cleared successfully' };
  } catch (error) {
    console.error('Error clearing data:', error);
    return { success: false, message: 'Clearing failed', error };
  }
};

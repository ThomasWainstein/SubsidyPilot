
// Shared tag normalization utilities
export const TAGS_MASTER_LIST = {
  // Geographic tags
  REGIONS: [
    'nord_vest', 'centru', 'nord_est', 'sud_est', 'sud_muntenia', 
    'bucuresti_ilfov', 'sud_vest_oltenia', 'vest'
  ],
  
  // Farm types
  FARM_TYPES: [
    'arable_crops', 'vineyards', 'livestock', 'aquaculture', 
    'mixed_farming', 'greenhouse', 'vertical_farming'
  ],
  
  // Certifications
  CERTIFICATIONS: [
    'organic', 'bio', 'global_gap', 'iso_14001', 'sustainable',
    'rainforest_alliance', 'fair_trade'
  ],
  
  // Land use
  LAND_USE: [
    'cereals', 'vegetables', 'fruits', 'pasture', 'forestry',
    'permanent_crops', 'fallow_land'
  ],
  
  // Farm size
  FARM_SIZE: [
    'small_farm', 'medium_farm', 'large_farm'
  ],
  
  // Technology
  TECHNOLOGY: [
    'precision_agriculture', 'irrigation', 'solar_energy',
    'carbon_sequestration', 'biodiversity', 'soil_health'
  ],
  
  // Funding focus
  FUNDING_FOCUS: [
    'sustainability', 'modernization', 'digitalization',
    'climate_adaptation', 'emission_reduction', 'water_efficiency'
  ]
} as const;

// Normalize tag strings
export const normalizeTag = (tag: string): string => {
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[ș]/g, 's')
    .replace(/[ț]/g, 't')
    .replace(/[ă]/g, 'a')
    .replace(/[î]/g, 'i')
    .replace(/[^a-z0-9_]/g, '');
};

// Generate farm tags from farm data
export const generateFarmTags = (farm: any): string[] => {
  const tags: string[] = [];
  
  // Geographic tags
  if (farm.department) {
    tags.push(normalizeTag(farm.department));
  }
  if (farm.country) {
    tags.push(normalizeTag(farm.country));
  }
  
  // Size category
  if (farm.total_hectares !== null && farm.total_hectares !== undefined) {
    if (farm.total_hectares < 10) {
      tags.push('small_farm');
    } else if (farm.total_hectares < 50) {
      tags.push('medium_farm');
    } else {
      tags.push('large_farm');
    }
  }
  
  // Land use types
  if (farm.land_use_types && Array.isArray(farm.land_use_types)) {
    farm.land_use_types.forEach((type: string) => {
      tags.push(normalizeTag(type));
    });
  }
  
  // Certifications
  if (farm.certifications && Array.isArray(farm.certifications)) {
    farm.certifications.forEach((cert: string) => {
      tags.push(normalizeTag(cert));
    });
  }
  
  // Livestock
  if (farm.livestock_present) {
    tags.push('livestock');
  }
  
  // Legal status
  if (farm.legal_status) {
    tags.push(normalizeTag(farm.legal_status));
  }
  
  // Software/technology
  if (farm.software_used && Array.isArray(farm.software_used)) {
    farm.software_used.forEach((software: string) => {
      tags.push(normalizeTag(software));
    });
  }
  
  // Irrigation
  if (farm.irrigation_method) {
    tags.push(normalizeTag(farm.irrigation_method));
  }
  
  return [...new Set(tags)]; // Remove duplicates
};

// Calculate match confidence between farm and subsidy tags
export const calculateMatchConfidence = (farmTags: string[], subsidyTags: string[]): number => {
  if (!farmTags?.length || !subsidyTags?.length) {
    return 0;
  }
  
  const normalizedFarmTags = farmTags.map(normalizeTag);
  const normalizedSubsidyTags = subsidyTags.map(normalizeTag);
  
  const matches = normalizedFarmTags.filter(tag => 
    normalizedSubsidyTags.includes(tag)
  ).length;
  
  // Base calculation: intersection / union approach
  const totalUniqueTags = new Set([...normalizedFarmTags, ...normalizedSubsidyTags]).size;
  const confidence = Math.round((matches / totalUniqueTags) * 100);
  
  return Math.min(confidence, 100);
};

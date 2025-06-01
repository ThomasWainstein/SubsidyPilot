
import { z } from 'zod';

export const subsidyCreationSchema = z.object({
  code: z.string().min(1, 'Subsidy code is required'),
  title: z.record(z.string()).refine(
    (titles) => Object.keys(titles).length > 0,
    'At least one title language is required'
  ),
  description: z.record(z.string()).refine(
    (descriptions) => Object.keys(descriptions).length > 0,
    'At least one description language is required'
  ),
  amount_min: z.number().min(0, 'Minimum amount must be positive').optional(),
  amount_max: z.number().min(0, 'Maximum amount must be positive').optional(),
  region: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  funding_type: z.enum(['public', 'private', 'mixed']).optional(),
  status: z.enum(['open', 'closed', 'upcoming']).default('open'),
  deadline: z.string().optional(),
  legal_entities: z.array(z.string()).default([]),
  eligibility_criteria: z.record(z.any()).optional(),
  language: z.array(z.string()).default(['en']),
});

export type SubsidyCreationData = z.infer<typeof subsidyCreationSchema>;

// Standard taxonomy for subsidy categories that align with farm land use types
export const standardSubsidyCategories = [
  'cereals',
  'vegetables',
  'vineyards',
  'fruit_orchards',
  'pasture_grassland',
  'greenhouse_protected',
  'industrial_crops',
  'aromatic_medicinal_plants',
  'livestock',
  'environmental',
  'organic_farming',
  'young_farmer',
  'modernization',
  'renewable_energy',
  'rural_development',
  'agritourism',
  'processing',
  'export_promotion',
  'training_advisory',
  'innovation',
  'climate_action',
  'biodiversity',
  'water_management',
  'soil_health',
] as const;

// Standard funding types
export const standardFundingTypes = [
  'public',
  'private',
  'mixed',
] as const;

// Standard legal entity types
export const standardLegalEntityTypes = [
  'individual',
  'srl',
  'sa',
  'cooperative',
  'association',
  'foundation',
  'other',
] as const;

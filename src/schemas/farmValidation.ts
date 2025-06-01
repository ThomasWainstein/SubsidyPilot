
import { z } from 'zod';

export const farmCreationSchema = z.object({
  // Section 1: Farm Identity
  farmName: z.string().min(2, 'Farm name must be at least 2 characters'),
  farmAddress: z.string().min(10, 'Please provide a complete address'),
  legalStatus: z.string().min(1, 'Legal status is required'),
  cnpOrCui: z.string().min(1, 'CNP or CUI is required'),
  
  // Section 2: Location
  department: z.string().optional(),
  locality: z.string().optional(),
  apiaRegions: z.array(z.string()).default([]),
  
  // Section 3: Land Info
  landOwnership: z.string().optional(),
  totalArea: z.string().optional(),
  landUseTypes: z.array(z.string()).default([]),
  otherLandUse: z.string().optional(),
  
  // Section 4: Livestock
  hasLivestock: z.boolean().default(false),
  animalTypes: z.record(z.string()).default({}),
  
  // Section 5: Environmental & Technical
  hasEnvironmentalPermits: z.boolean().default(false),
  hasTechnicalDocs: z.boolean().default(false),
  
  // Section 6: Subsidy Interests
  subsidyInterests: z.array(z.string()).default([]),
  otherSubsidyInterest: z.string().optional(),
  
  // Section 7: Contact & Consent
  mobileNumber: z.string().optional(),
  preferredLanguage: z.string().optional(),
  gdprConsent: z.boolean().refine(val => val === true, 'GDPR consent is required'),
  notificationConsent: z.boolean().default(false),
});

export type FarmCreationData = z.infer<typeof farmCreationSchema>;

// Standard taxonomy for land use types
export const standardLandUseTypes = [
  'cereals',
  'vegetables',
  'vineyards',
  'fruit_orchards',
  'pasture_grassland',
  'greenhouse_protected',
  'industrial_crops',
  'aromatic_medicinal_plants',
  'fallow_land',
  'mixed_use',
  'forestry_plots',
  'other',
] as const;

// Standard taxonomy for livestock types
export const standardLivestockTypes = [
  'cattle',
  'sheep',
  'goats',
  'swine',
  'poultry',
  'horses',
  'rabbits',
  'bees',
] as const;

// Standard taxonomy for regions/departments
export const standardRegions = [
  'alba',
  'arad',
  'arges',
  'bacau',
  'bihor',
  'bistrita-nasaud',
  'botosani',
  'brasov',
  'braila',
  'buzau',
  'caras-severin',
  'calarasi',
  'cluj',
  'constanta',
  'covasna',
  'dambovita',
  'dolj',
  'galati',
  'giurgiu',
  'gorj',
  'harghita',
  'hunedoara',
  'ialomita',
  'iasi',
  'ilfov',
  'maramures',
  'mehedinti',
  'mures',
  'neamt',
  'olt',
  'prahova',
  'satu-mare',
  'salaj',
  'sibiu',
  'suceava',
  'teleorman',
  'timis',
  'tulcea',
  'vaslui',
  'valcea',
  'vrancea',
  'bucharest',
] as const;

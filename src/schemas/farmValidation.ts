
import { z } from 'zod';

export const farmCreationSchema = z.object({
  // Section 1: Farm Identity
  farmName: z.string().min(2, 'Farm name must be at least 2 characters'),
  farmAddress: z.string().min(10, 'Please provide a complete address'),
  legalStatus: z.string().min(1, 'Legal status is required'),
  cnpOrCui: z.string().min(1, 'CNP or CUI is required'),
  
  // Section 2: International Location
  country: z.string().min(1, 'Country is required'),
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
  
  // Additional Profile Fields
  revenue: z.string().optional(),
  staff: z.string().optional(),
  certifications: z.array(z.string()).default([]),
  irrigationMethod: z.string().optional(),
  software: z.array(z.string()).default([]),
  
  // File Upload States
  uploadedFiles: z.record(z.object({
    filename: z.string(),
    uploaded: z.boolean(),
  })).default({}),
});

export type FarmCreationData = z.infer<typeof farmCreationSchema>;

// Country and region data
export const countries = [
  { code: 'RO', name: 'Romania' },
  { code: 'FR', name: 'France' },
  { code: 'PL', name: 'Poland' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'BE', name: 'Belgium' },
  { code: 'NL', name: 'Netherlands' },
] as const;

export const departmentsByCountry: Record<string, string[]> = {
  'RO': [
    'alba', 'arad', 'arges', 'bacau', 'bihor', 'bistrita-nasaud', 'botosani', 
    'brasov', 'braila', 'buzau', 'caras-severin', 'calarasi', 'cluj', 'constanta', 
    'covasna', 'dambovita', 'dolj', 'galati', 'giurgiu', 'gorj', 'harghita', 
    'hunedoara', 'ialomita', 'iasi', 'ilfov', 'maramures', 'mehedinti', 'mures', 
    'neamt', 'olt', 'prahova', 'satu-mare', 'salaj', 'sibiu', 'suceava', 
    'teleorman', 'timis', 'tulcea', 'vaslui', 'valcea', 'vrancea', 'bucharest'
  ],
  'FR': [
    'ain', 'aisne', 'allier', 'alpes-de-haute-provence', 'hautes-alpes', 'alpes-maritimes',
    'ardeche', 'ardennes', 'ariege', 'aube', 'aude', 'aveyron', 'bouches-du-rhone',
    'calvados', 'cantal', 'charente', 'charente-maritime', 'cher', 'correze', 'corse-du-sud',
    'haute-corse', 'cote-d-or', 'cotes-d-armor', 'creuse', 'dordogne', 'doubs', 'drome',
    'eure', 'eure-et-loir', 'finistere', 'gard', 'haute-garonne', 'gers', 'gironde',
    'herault', 'ille-et-vilaine', 'indre', 'indre-et-loire', 'isere', 'jura', 'landes',
    'loir-et-cher', 'loire', 'haute-loire', 'loire-atlantique', 'loiret', 'lot',
    'lot-et-garonne', 'lozere', 'maine-et-loire', 'manche', 'marne', 'haute-marne',
    'mayenne', 'meurthe-et-moselle', 'meuse', 'morbihan', 'moselle', 'nievre', 'nord',
    'oise', 'orne', 'pas-de-calais', 'puy-de-dome', 'pyrenees-atlantiques', 'hautes-pyrenees',
    'pyrenees-orientales', 'bas-rhin', 'haut-rhin', 'rhone', 'haute-saone', 'saone-et-loire',
    'sarthe', 'savoie', 'haute-savoie', 'paris', 'seine-maritime', 'seine-et-marne',
    'yvelines', 'deux-sevres', 'somme', 'tarn', 'tarn-et-garonne', 'var', 'vaucluse',
    'vendee', 'vienne', 'haute-vienne', 'vosges', 'yonne', 'territoire-de-belfort',
    'essonne', 'hauts-de-seine', 'seine-saint-denis', 'val-de-marne', 'val-d-oise'
  ],
  'PL': [
    'dolnoslaskie', 'kujawsko-pomorskie', 'lubelskie', 'lubuskie', 'lodzkie',
    'malopolskie', 'mazowieckie', 'opolskie', 'podkarpackie', 'podlaskie',
    'pomorskie', 'slaskie', 'swietokrzyskie', 'warminsko-mazurskie', 'wielkopolskie',
    'zachodniopomorskie'
  ],
  'DE': [
    'baden-wurttemberg', 'bayern', 'berlin', 'brandenburg', 'bremen', 'hamburg',
    'hessen', 'mecklenburg-vorpommern', 'niedersachsen', 'nordrhein-westfalen',
    'rheinland-pfalz', 'saarland', 'sachsen', 'sachsen-anhalt', 'schleswig-holstein',
    'thuringen'
  ],
  'ES': [
    'andalucia', 'aragon', 'asturias', 'islas-baleares', 'canarias', 'cantabria',
    'castilla-la-mancha', 'castilla-y-leon', 'cataluna', 'extremadura', 'galicia',
    'madrid', 'murcia', 'navarra', 'pais-vasco', 'la-rioja', 'valencia', 'ceuta', 'melilla'
  ],
  'IT': [
    'abruzzo', 'basilicata', 'calabria', 'campania', 'emilia-romagna', 'friuli-venezia-giulia',
    'lazio', 'liguria', 'lombardia', 'marche', 'molise', 'piemonte', 'puglia',
    'sardegna', 'sicilia', 'toscana', 'trentino-alto-adige', 'umbria', 'valle-d-aosta', 'veneto'
  ],
  'BE': [
    'antwerpen', 'limburg', 'oost-vlaanderen', 'vlaams-brabant', 'west-vlaanderen',
    'brussels', 'brabant-wallon', 'hainaut', 'liege', 'luxembourg', 'namur'
  ],
  'NL': [
    'drenthe', 'flevoland', 'friesland', 'gelderland', 'groningen', 'limburg',
    'noord-brabant', 'noord-holland', 'overijssel', 'utrecht', 'zeeland', 'zuid-holland'
  ],
};

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
  'alba', 'arad', 'arges', 'bacau', 'bihor', 'bistrita-nasaud', 'botosani',
  'brasov', 'braila', 'buzau', 'caras-severin', 'calarasi', 'cluj', 'constanta',
  'covasna', 'dambovita', 'dolj', 'galati', 'giurgiu', 'gorj', 'harghita',
  'hunedoara', 'ialomita', 'iasi', 'ilfov', 'maramures', 'mehedinti', 'mures',
  'neamt', 'olt', 'prahova', 'satu-mare', 'salaj', 'sibiu', 'suceava',
  'teleorman', 'timis', 'tulcea', 'vaslui', 'valcea', 'vrancea', 'bucharest',
] as const;


import { z } from 'zod';

export const countries = [
  { code: 'RO', name: 'Romania' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'PL', name: 'Poland' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'HU', name: 'Hungary' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'GR', name: 'Greece' },
  { code: 'IE', name: 'Ireland' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'PT', name: 'Portugal' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CY', name: 'Cyprus' },
] as const;

export const departmentsByCountry: Record<string, string[]> = {
  'RO': [
    'alba', 'arad', 'arges', 'bacau', 'bihor', 'bistrita-nasaud', 'botosani', 'brasov',
    'braila', 'buzau', 'caras-severin', 'calarasi', 'cluj', 'constanta', 'covasna',
    'dambovita', 'dolj', 'galati', 'giurgiu', 'gorj', 'harghita', 'hunedoara',
    'ialomita', 'iasi', 'ilfov', 'maramures', 'mehedinti', 'mures', 'neamt',
    'olt', 'prahova', 'satu-mare', 'salaj', 'sibiu', 'suceava', 'teleorman',
    'timis', 'tulcea', 'vaslui', 'valcea', 'vrancea', 'bucuresti'
  ],
  'FR': [
    'ain', 'aisne', 'allier', 'alpes-de-haute-provence', 'hautes-alpes', 'alpes-maritimes',
    'ardeche', 'ardennes', 'ariege', 'aube', 'aude', 'aveyron', 'bouches-du-rhone',
    'calvados', 'cantal', 'charente', 'charente-maritime', 'cher', 'correze',
    'corse-du-sud', 'haute-corse', 'cote-dor', 'cotes-darmor', 'creuse', 'dordogne',
    'doubs', 'drome', 'eure', 'eure-et-loir', 'finistere', 'gard', 'haute-garonne',
    'gers', 'gironde', 'herault', 'ille-et-vilaine', 'indre', 'indre-et-loire',
    'isere', 'jura', 'landes', 'loir-et-cher', 'loire', 'haute-loire', 'loire-atlantique',
    'loiret', 'lot', 'lot-et-garonne', 'lozere', 'maine-et-loire', 'manche', 'marne',
    'haute-marne', 'mayenne', 'meurthe-et-moselle', 'meuse', 'morbihan', 'moselle',
    'nievre', 'nord', 'oise', 'orne', 'pas-de-calais', 'puy-de-dome', 'pyrenees-atlantiques',
    'hautes-pyrenees', 'pyrenees-orientales', 'bas-rhin', 'haut-rhin', 'rhone',
    'haute-saone', 'saone-et-loire', 'sarthe', 'savoie', 'haute-savoie', 'paris',
    'seine-maritime', 'seine-et-marne', 'yvelines', 'deux-sevres', 'somme', 'tarn',
    'tarn-et-garonne', 'var', 'vaucluse', 'vendee', 'vienne', 'haute-vienne', 'vosges',
    'yonne', 'territoire-de-belfort', 'essonne', 'hauts-de-seine', 'seine-saint-denis',
    'val-de-marne', 'val-doise'
  ]
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateFile = (file: File, maxSize: number = 50 * 1024 * 1024): ValidationResult => {
  const errors: string[] = [];
  
  // Size validation
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`);
  }
  
  // Type validation
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push('File type not supported');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const farmCreationSchema = z.object({
  farmName: z.string().min(1, 'Farm name is required'),
  ownerName: z.string().optional(), // Add owner name field
  farmAddress: z.string().min(1, 'Farm address is required'),
  legalStatus: z.string().min(1, 'Legal status is required'),
  cnpOrCui: z.string().min(1, 'CNP or CUI is required'),
  country: z.string().min(1, 'Country is required'),
  department: z.string().optional(),
  locality: z.string().optional(),
  apiaRegions: z.array(z.string()).default([]),
  landOwnership: z.string().optional(),
  totalArea: z.string().optional(),
  landUseTypes: z.array(z.string()).min(1, 'At least one land use type is required'),
  otherLandUse: z.string().optional(),
  hasLivestock: z.boolean().default(false),
  animalTypes: z.record(z.string()).default({}),
  hasEnvironmentalPermits: z.boolean().default(false),
  certifications: z.array(z.string()).default([]),
  hasTechnicalDocs: z.boolean().default(false),
  subsidyInterests: z.array(z.string()).default([]),
  otherSubsidyInterest: z.string().optional(),
  mobileNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')), // Add email field
  preferredLanguage: z.string().optional(),
  gdprConsent: z.boolean().refine(val => val === true, 'GDPR consent is required'),
  notificationConsent: z.boolean().default(false),
  revenue: z.string().optional(),
  staff: z.string().optional(),
  irrigationMethod: z.string().optional(),
  software: z.array(z.string()).default([]),
  uploadedFiles: z.record(z.object({
    filename: z.string(),
    uploaded: z.boolean()
  })).default({}),
});

export type FarmCreationData = z.infer<typeof farmCreationSchema>;

export const farmEditSchema = z.object({
  name: z.string().min(1, 'Farm name is required'),
  address: z.string().min(1, 'Address is required'),
  legal_status: z.string().optional(),
  cnp_or_cui: z.string().optional(),
  country: z.string().optional(),
  department: z.string().optional(),
  locality: z.string().optional(),
  total_hectares: z.number().positive().optional(),
  own_or_lease: z.boolean().default(false),
  land_use_types: z.array(z.string()).default([]),
  livestock_present: z.boolean().default(false),
  livestock: z.record(z.any()).default({}),
  irrigation_method: z.string().optional(),
  certifications: z.array(z.string()).default([]),
  environmental_permit: z.boolean().default(false),
  tech_docs: z.boolean().default(false),
  subsidy_interest: z.array(z.string()).default([]),
  phone: z.string().optional(),
  preferred_language: z.string().default('en'),
  revenue: z.string().optional(),
  software_used: z.array(z.string()).default([]),
  staff_count: z.number().min(0).default(0),
});

export type FarmEditData = z.infer<typeof farmEditSchema>;

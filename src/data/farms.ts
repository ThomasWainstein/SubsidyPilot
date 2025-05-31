export interface Farm {
  id: string;
  name: string;
  region: string;
  status: 'Profile Complete' | 'Subsidy In Progress' | 'Needs Update' | 'In Review';
  tags: string[];
  updatedAt: string;
  size: string;
  staff: number;
  certifications: string[];
  revenue: string;
  activities: string[];
  carbonScore: number;
  irrigationMethod: string;
  software: string[];
  // New fields for French registry imports
  idType?: 'SIRET' | 'SIREN' | 'PACAGE';
  registryId?: string;
  isImportedFromRegistry?: boolean;
}

// Define fake farm data - keeping only one sample farm for demo
export const farms: Farm[] = [
  {
    id: '1',
    name: 'GreenFields Demo Farm',
    region: 'Nouvelle-Aquitaine',
    status: 'Profile Complete',
    tags: ['Organic', 'Biodiversity', 'Demo'],
    updatedAt: '2025-04-02',
    size: '350 hectares',
    staff: 12,
    certifications: ['Organic', 'EU Eco-Label'],
    revenue: '€1.2M',
    activities: ['Crop Production', 'Dairy', 'Agritourism'],
    carbonScore: 82,
    irrigationMethod: 'Drip with smart sensors',
    software: ['FarmTrack Pro', 'ClimateView'],
  },
];

export interface FarmDocument {
  id: string;
  name: string;
  type: string;
  tag: string;
  uploadedAt: string;
}

export const farmDocuments: Record<string, FarmDocument[]> = {
  '1': [
    { id: 'd1', name: 'GreenPlan2024.pdf', type: 'PDF', tag: 'Sustainability', uploadedAt: '2025-03-15' },
    { id: 'd2', name: 'OrganicCertification.pdf', type: 'PDF', tag: 'Certification', uploadedAt: '2025-02-20' },
    { id: 'd3', name: 'BiodiversityReport.docx', type: 'DOCX', tag: 'Biodiversity', uploadedAt: '2025-03-01' },
  ],
};

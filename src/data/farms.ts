
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
}

// Define fake farm data
export const farms: Farm[] = [
  {
    id: '1',
    name: 'GreenFields Coop',
    region: 'Nouvelle-Aquitaine',
    status: 'Profile Complete',
    tags: ['Organic', 'Biodiversity'],
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
  {
    id: '2',
    name: 'Domaine du Sureau',
    region: 'Bourgogne',
    status: 'Subsidy In Progress',
    tags: ['Vineyard', 'Organic'],
    updatedAt: '2025-03-28',
    size: '120 hectares',
    staff: 8,
    certifications: ['Organic', 'Biodynamic'],
    revenue: '€880K',
    activities: ['Viticulture', 'Wine Production'],
    carbonScore: 76,
    irrigationMethod: 'Micro-irrigation',
    software: ['VineManager', 'SoilAnalytics'],
  },
  {
    id: '3',
    name: 'Ferme TechAgro',
    region: 'Centre-Val de Loire',
    status: 'Needs Update',
    tags: ['Precision Ag', 'Carbon Score'],
    updatedAt: '2025-03-15',
    size: '520 hectares',
    staff: 17,
    certifications: ['ISO 14001', 'Carbon Trust'],
    revenue: '€2.1M',
    activities: ['Cereal Production', 'Oilseed'],
    carbonScore: 91,
    irrigationMethod: 'Precision sprinkler system',
    software: ['FieldView', 'PrecisionAI', 'DroneMapper'],
  },
  {
    id: '4',
    name: 'La Granja Andina',
    region: 'Navarra, Spain',
    status: 'Profile Complete',
    tags: ['Irrigation', 'Solar'],
    updatedAt: '2025-04-01',
    size: '280 hectares',
    staff: 9,
    certifications: ['Solar Powered', 'Water Efficient'],
    revenue: '€950K',
    activities: ['Vegetable Production', 'Fruit Orchards'],
    carbonScore: 88,
    irrigationMethod: 'Smart drip with zone control',
    software: ['AgroSmart', 'IrrigationControl'],
  },
  {
    id: '5',
    name: 'Ferma Valea Verde',
    region: 'Cluj, Romania',
    status: 'In Review',
    tags: ['Livestock', 'Rotation'],
    updatedAt: '2025-03-22',
    size: '190 hectares',
    staff: 11,
    certifications: ['Animal Welfare', 'Sustainable Grazing'],
    revenue: '€720K',
    activities: ['Cattle Rearing', 'Rotational Grazing', 'Hay Production'],
    carbonScore: 73,
    irrigationMethod: 'Natural water management',
    software: ['LivestockTracker', 'GrazingPlanner'],
  },
  {
    id: '6',
    name: 'Masía El Roble',
    region: 'Catalunya, Spain',
    status: 'Profile Complete',
    tags: ['Composting', 'Sustainability'],
    updatedAt: '2025-04-05',
    size: '150 hectares',
    staff: 7,
    certifications: ['Circular Economy', 'Eco-tourism'],
    revenue: '€680K',
    activities: ['Olive Groves', 'Agritourism', 'Composting'],
    carbonScore: 94,
    irrigationMethod: 'Traditional acequia with modern controls',
    software: ['OliveManager', 'CompostTracker', 'VisitorBooking'],
  },
  {
    id: '7',
    name: 'EcoHof Reinhardt',
    region: 'Bayern, Germany',
    status: 'Subsidy In Progress',
    tags: ['Organic', 'Soil Health'],
    updatedAt: '2025-03-25',
    size: '210 hectares',
    staff: 6,
    certifications: ['Demeter', 'Soil Conservation'],
    revenue: '€830K',
    activities: ['Vegetable Growing', 'Soil Regeneration', 'Seed Saving'],
    carbonScore: 89,
    irrigationMethod: 'Rainwater harvesting with gravity distribution',
    software: ['SoilHealth', 'BioTracker', 'SeedInventory'],
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
  '2': [
    { id: 'd4', name: 'VineyardMap.pdf', type: 'PDF', tag: 'Planning', uploadedAt: '2025-03-10' },
    { id: 'd5', name: 'OrganicWineCertification.pdf', type: 'PDF', tag: 'Certification', uploadedAt: '2025-01-15' },
  ],
  '3': [
    { id: 'd6', name: 'PrecisionAgReport.pdf', type: 'PDF', tag: 'Technology', uploadedAt: '2025-03-05' },
    { id: 'd7', name: 'CarbonFootprint2024.xlsx', type: 'XLSX', tag: 'Carbon', uploadedAt: '2025-02-28' },
    { id: 'd8', name: 'DroneMapping.zip', type: 'ZIP', tag: 'Analysis', uploadedAt: '2025-03-20' },
  ],
  '4': [
    { id: 'd9', name: 'IrrigationPlan.pdf', type: 'PDF', tag: 'Irrigation', uploadedAt: '2025-03-25' },
    { id: 'd10', name: 'SolarSystemOverview.pdf', type: 'PDF', tag: 'Energy', uploadedAt: '2025-02-10' },
  ],
  '5': [
    { id: 'd11', name: 'LivestockInventory.xlsx', type: 'XLSX', tag: 'Livestock', uploadedAt: '2025-03-18' },
    { id: 'd12', name: 'RotationPlan2024-2026.pdf', type: 'PDF', tag: 'Planning', uploadedAt: '2025-03-01' },
  ],
  '6': [
    { id: 'd13', name: 'CompostingSOP.pdf', type: 'PDF', tag: 'Sustainability', uploadedAt: '2025-03-22' },
    { id: 'd14', name: 'OliveGroveMap.pdf', type: 'PDF', tag: 'Planning', uploadedAt: '2025-02-15' },
  ],
  '7': [
    { id: 'd15', name: 'SoilHealthReport.pdf', type: 'PDF', tag: 'Analysis', uploadedAt: '2025-03-10' },
    { id: 'd16', name: 'OrganicCertification2025.pdf', type: 'PDF', tag: 'Certification', uploadedAt: '2025-01-20' },
    { id: 'd17', name: 'SeedInventory.xlsx', type: 'XLSX', tag: 'Inventory', uploadedAt: '2025-03-15' },
  ],
};

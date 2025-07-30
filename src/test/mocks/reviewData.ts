export const mockFieldData = [
  {
    key: 'farm_name',
    label: 'Farm Name',
    value: 'Green Valley Farm',
    confidence: 0.95,
    type: 'text' as const,
    category: 'basic',
    accepted: false,
    modified: false,
    placeholder: 'Enter farm name'
  },
  {
    key: 'owner_name',
    label: 'Owner Name',
    value: 'John Smith',
    confidence: 0.87,
    type: 'text' as const,
    category: 'basic',
    accepted: false,
    modified: false,
    placeholder: 'Enter owner name'
  },
  {
    key: 'established_date',
    label: 'Established Date',
    value: '2010-05-15',
    confidence: 0.65,
    type: 'date' as const,
    category: 'basic',
    accepted: false,
    modified: false,
    placeholder: 'Select date'
  },
  {
    key: 'organic_certified',
    label: 'Organic Certified',
    value: true,
    confidence: 0.45,
    type: 'boolean' as const,
    category: 'certifications',
    accepted: false,
    modified: false
  },
  {
    key: 'crops',
    label: 'Primary Crops',
    value: ['corn', 'soybeans', 'wheat'],
    confidence: 0.78,
    type: 'array' as const,
    category: 'operational',
    accepted: false,
    modified: false,
    placeholder: 'Add crop'
  },
  {
    key: 'total_acreage',
    label: 'Total Acreage',
    value: 1250,
    confidence: 0.92,
    type: 'number' as const,
    category: 'operational',
    accepted: false,
    modified: false,
    placeholder: 'Enter acreage'
  }
];

export const mockCategoryGroups = [
  {
    title: 'Basic Information',
    description: 'Fundamental farm details and identification',
    icon: '🏡',
    fields: mockFieldData.filter(f => f.category === 'basic')
  },
  {
    title: 'Operational Details',
    description: 'Farm operations, crops, and land use',
    icon: '🌾',
    fields: mockFieldData.filter(f => f.category === 'operational')
  },
  {
    title: 'Certifications',
    description: 'Certifications and compliance information',
    icon: '📋',
    fields: mockFieldData.filter(f => f.category === 'certifications')
  }
];
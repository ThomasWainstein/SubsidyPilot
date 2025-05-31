import { farms } from './farms';
import { Subsidy as SubsidyType, MultilingualText } from '@/types/subsidy';

export type Subsidy = SubsidyType;

// Remove hardcoded subsidies array - will be fetched from database
export const subsidies: Subsidy[] = [];

// Keep getRandomSubsidies for backward compatibility but return empty array
export const getRandomSubsidies = (farmId: string): Subsidy[] => {
  return [];
};

export interface Application {
  id: string;
  farmId: string;
  subsidyId: string;
  subsidyName: string;
  status: 'In Progress' | 'Submitted' | 'Approved';
  submittedDate: string;
  grantAmount: string;
}

// Keep applications for backward compatibility (can be migrated to database later)
export const applications: Record<string, Application[]> = {
  '1': [
    {
      id: 'a1',
      farmId: '1',
      subsidyId: 's1',
      subsidyName: 'Organic Transition Grant',
      status: 'Approved',
      submittedDate: '2025-02-10',
      grantAmount: '€28,500',
    },
    {
      id: 'a2',
      farmId: '1',
      subsidyId: 's3',
      subsidyName: 'Soil Health Innovation Fund',
      status: 'Submitted',
      submittedDate: '2025-03-20',
      grantAmount: '€12,000',
    },
  ],
  '2': [
    {
      id: 'a3',
      farmId: '2',
      subsidyId: 's1',
      subsidyName: 'Organic Transition Grant',
      status: 'In Progress',
      submittedDate: '2025-03-30',
      grantAmount: '€30,000',
    },
  ],
  '3': [
    {
      id: 'a4',
      farmId: '3',
      subsidyId: 's9',
      subsidyName: 'Digital Transition Voucher',
      status: 'Submitted',
      submittedDate: '2025-02-28',
      grantAmount: '€8,000',
    },
    {
      id: 'a5',
      farmId: '3',
      subsidyId: 's5',
      subsidyName: 'Carbon Credit Readiness Aid',
      status: 'In Progress',
      submittedDate: '2025-03-15',
      grantAmount: '€18,000',
    },
  ],
  '4': [
    {
      id: 'a6',
      farmId: '4',
      subsidyId: 's7',
      subsidyName: 'On-Farm Solar Grant',
      status: 'Approved',
      submittedDate: '2025-01-20',
      grantAmount: '€22,500',
    },
    {
      id: 'a7',
      farmId: '4',
      subsidyId: 's2',
      subsidyName: 'Smart Irrigation Upgrade',
      status: 'Submitted',
      submittedDate: '2025-03-05',
      grantAmount: '€15,000',
    },
  ],
  '5': [
    {
      id: 'a8',
      farmId: '5',
      subsidyId: 's6',
      subsidyName: 'Youth Agripreneur Subsidy',
      status: 'In Progress',
      submittedDate: '2025-03-25',
      grantAmount: '€20,000',
    },
  ],
  '6': [
    {
      id: 'a9',
      farmId: '6',
      subsidyId: 's4',
      subsidyName: 'Biodiversity Boost Grant',
      status: 'Submitted',
      submittedDate: '2025-02-15',
      grantAmount: '€9,500',
    },
    {
      id: 'a10',
      farmId: '6',
      subsidyId: 's12',
      subsidyName: 'Circular Waste Incentive',
      status: 'Approved',
      submittedDate: '2025-01-10',
      grantAmount: '€10,000',
    },
  ],
  '7': [
    {
      id: 'a11',
      farmId: '7',
      subsidyId: 's1',
      subsidyName: 'Organic Transition Grant',
      status: 'In Progress',
      submittedDate: '2025-03-10',
      grantAmount: '€30,000',
    },
    {
      id: 'a12',
      farmId: '7',
      subsidyId: 's3',
      subsidyName: 'Soil Health Innovation Fund',
      status: 'Submitted',
      submittedDate: '2025-02-28',
      grantAmount: '€11,500',
    },
  ],
};

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date';
  value: string;
  options?: string[];
}

export interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

// Helper function to get localized text
const getLocalizedText = (text: string | MultilingualText): string => {
  if (typeof text === 'string') {
    return text;
  }
  return text.en; // Default to English
};

// Keep getApplicationForm function for backward compatibility
export const getApplicationForm = (farmId: string, subsidyId: string): FormSection[] => {
  const farm = farms.find(f => f.id === farmId);

  return [
    {
      id: 'section1',
      title: 'Basic Information',
      fields: [
        {
          id: 'farmName',
          label: 'Farm Name',
          type: 'text',
          value: farm?.name || '',
        },
        {
          id: 'yearEstablished',
          label: 'Year Established',
          type: 'number',
          value: '2014',
        },
        {
          id: 'region',
          label: 'Region',
          type: 'text',
          value: farm?.region || '',
        },
        {
          id: 'legalStructure',
          label: 'Legal Structure',
          type: 'select',
          value: 'Cooperative',
          options: ['Sole Proprietorship', 'Partnership', 'Cooperative', 'Corporation', 'Limited Liability Company'],
        },
        {
          id: 'contactPerson',
          label: 'Contact Person',
          type: 'text',
          value: 'Jean Dupont',
        },
        {
          id: 'contactEmail',
          label: 'Contact Email',
          type: 'text',
          value: 'jean.dupont@example.com',
        },
        {
          id: 'contactPhone',
          label: 'Contact Phone',
          type: 'text',
          value: '+33 6 12 34 56 78',
        },
      ],
    },
    {
      id: 'section2',
      title: 'Farm Details',
      fields: [
        {
          id: 'farmSize',
          label: 'Farm Size (hectares)',
          type: 'text',
          value: farm?.size || '',
        },
        {
          id: 'mainActivities',
          label: 'Main Activities',
          type: 'textarea',
          value: farm?.activities.join(', ') || '',
        },
        {
          id: 'staffCount',
          label: 'Staff Count',
          type: 'number',
          value: farm?.staff.toString() || '',
        },
        {
          id: 'irrigationType',
          label: 'Irrigation Type',
          type: 'text',
          value: farm?.irrigationMethod || 'Drip with sensors',
        },
        {
          id: 'certifications',
          label: 'Certifications',
          type: 'textarea',
          value: farm?.certifications.join(', ') || '',
        },
        {
          id: 'annualRevenue',
          label: 'Annual Revenue',
          type: 'text',
          value: farm?.revenue || '',
        },
        {
          id: 'softwareUsed',
          label: 'Software Used',
          type: 'textarea',
          value: farm?.software.join(', ') || '',
        },
      ],
    },
    {
      id: 'section3',
      title: 'Project Information',
      fields: [
        {
          id: 'projectTitle',
          label: 'Project Title',
          type: 'text',
          value: 'Sustainable Farming Initiative',
        },
        {
          id: 'projectDescription',
          label: 'Project Description',
          type: 'textarea',
          value: 'Implementation of advanced sustainability measures to reduce environmental impact and improve farm efficiency.',
        },
        {
          id: 'startDate',
          label: 'Start Date',
          type: 'date',
          value: '2025-07-01',
        },
        {
          id: 'endDate',
          label: 'End Date',
          type: 'date',
          value: '2026-06-30',
        },
        {
          id: 'implementationPlan',
          label: 'Implementation Plan',
          type: 'textarea',
          value: 'Phase 1: Planning and assessment (2 months)\nPhase 2: Equipment acquisition (3 months)\nPhase 3: Installation and testing (3 months)\nPhase 4: Staff training (1 month)\nPhase 5: Full implementation (3 months)',
        },
        {
          id: 'expectedOutcomes',
          label: 'Expected Outcomes',
          type: 'textarea',
          value: '1. 30% reduction in water usage\n2. 25% reduction in energy consumption\n3. 20% increase in yield per hectare\n4. Improved soil health metrics\n5. Carbon footprint reduction of 15%',
        },
      ],
    },
    {
      id: 'section4',
      title: 'Financial Information',
      fields: [
        {
          id: 'requestedAmount',
          label: 'Requested Grant Amount',
          type: 'text',
          value: '€15,000',
        },
        {
          id: 'totalProjectCost',
          label: 'Total Project Cost',
          type: 'text',
          value: '€25,000',
        },
        {
          id: 'selfFinancing',
          label: 'Self-Financing Amount',
          type: 'text',
          value: '€10,000',
        },
        {
          id: 'budgetBreakdown',
          label: 'Budget Breakdown',
          type: 'textarea',
          value: 'Equipment: €12,000\nInstallation: €5,000\nTraining: €3,000\nMonitoring systems: €3,000\nConsultancy: €2,000',
        },
        {
          id: 'returnOnInvestment',
          label: 'Expected Return on Investment',
          type: 'textarea',
          value: 'The project is expected to provide a return on investment within 3 years through reduced operational costs and increased yields.',
        },
      ],
    },
    {
      id: 'section5',
      title: 'Sustainability',
      fields: [
        {
          id: 'sustainabilityStrategy',
          label: 'Sustainability Strategy',
          type: 'textarea',
          value: 'Closed-loop carbon-reduction approach focused on minimizing inputs, maximizing renewable energy usage, and implementing circular economy principles.',
        },
        {
          id: 'carbonReduction',
          label: 'Expected Carbon Reduction',
          type: 'text',
          value: '15 tonnes CO2e per year',
        },
        {
          id: 'waterConservation',
          label: 'Water Conservation Measures',
          type: 'textarea',
          value: 'Drip irrigation, rainwater harvesting, soil moisture monitoring, and precision application technologies.',
        },
        {
          id: 'biodiversityMeasures',
          label: 'Biodiversity Enhancement Measures',
          type: 'textarea',
          value: 'Hedgerow planting, wildlife corridors, reduced pesticide use, and flower strips for pollinators.',
        },
        {
          id: 'wasteReduction',
          label: 'Waste Reduction Approach',
          type: 'textarea',
          value: 'On-site composting, materials reuse program, packaging reduction, and biogas production from organic waste.',
        },
      ],
    },
    {
      id: 'section6',
      title: 'Additional Documents',
      fields: [
        {
          id: 'businessPlan',
          label: 'Business Plan',
          type: 'text',
          value: 'BusinessPlan2025.pdf',
        },
        {
          id: 'financialStatements',
          label: 'Financial Statements',
          type: 'text',
          value: 'FinancialReport2024.pdf',
        },
        {
          id: 'permitsCertificates',
          label: 'Permits and Certificates',
          type: 'text',
          value: 'PermitsCertificates.zip',
        },
        {
          id: 'technicalSpecifications',
          label: 'Technical Specifications',
          type: 'text',
          value: 'TechnicalSpecs.pdf',
        },
      ],
    },
  ];
};

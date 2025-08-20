/**
 * Document parser utility for extracting content from various document types
 */

/**
 * Comprehensive document content interface for 100% extraction completeness
 * Matches FranceAgriMer subsidy page structure and all linked documents
 */
export interface DocumentContent {
  // Core Information - MANDATORY
  title: string;
  programName: string;
  agency: string;
  description: string;
  objectives: string;
  
  // Categorization & Tags - MANDATORY
  sectors: string[];
  tags: string[];
  categories: string[];
  
  // Financial Details - COMPREHENSIVE
  funding: {
    amountMin?: string;
    amountMax?: string;
    coFinancingRate?: string;
    fundingDetails?: string;
    eligibleExpenses?: string[];
    excludedExpenses?: string[];
    budgetRequirements?: string[];
    paymentTerms?: string[];
  };
  
  // Eligibility - EXHAUSTIVE
  eligibility: {
    generalCriteria: string;
    eligibleEntities: string[];
    legalEntityTypes: string[];
    geographicScope: string[];
    sectorialRequirements?: string[];
    sizeRequirements?: string[];
    experienceRequirements?: string[];
    exclusionCriteria?: string[];
  };
  
  // Timeline & Deadlines - COMPLETE
  timeline: {
    applicationPeriod?: {
      start?: string;
      end?: string;
    };
    keyDeadlines?: { [key: string]: string };
    projectDuration?: string;
    implementationPeriod?: string;
    reportingDeadlines?: string[];
  };
  
  // Application Process - DETAILED
  applicationProcess: {
    steps: string[];
    submissionMethod?: string;
    applicationPlatform?: string;
    evaluationCriteria?: string[];
    selectionProcess?: string;
    decisionTimeline?: string;
    appealProcess?: string;
  };
  
  // Documents & Resources - ALL FILES
  documents: {
    required: Array<{
      name: string;
      type: string;
      size?: string;
      url?: string;
      description?: string;
      mandatory: boolean;
      downloadDate?: string;
    }>;
    associated: Array<{
      name: string;
      type: string;
      size?: string;
      url?: string;
      description?: string;
      category?: string;
      updateDate?: string;
    }>;
    templates?: Array<{
      name: string;
      type: string;
      url?: string;
      description?: string;
    }>;
  };
  
  // FAQ & Guidance - COMPLETE
  faq: Array<{
    question: string;
    answer: string;
    url?: string;
    category?: string;
  }>;
  
  // Contact Information - EXHAUSTIVE
  contact: {
    primaryEmail?: string;
    secondaryEmail?: string;
    phone?: string;
    helpdesk?: string;
    agency?: string;
    address?: string;
    website?: string;
    emergencyContact?: string;
  };
  
  // Legal & Regulatory - ALL REFERENCES
  legal: {
    legalBasis: string[];
    regulations: string[];
    decrees: string[];
    circulars: string[];
    guidelines: string[];
    compliance: string[];
    sanctions?: string[];
  };
  
  // Alerts & Updates - CURRENT
  alerts: Array<{
    type: string;
    message: string;
    date?: string;
    severity?: string;
    url?: string;
  }>;
  
  // Reporting & Obligations - DETAILED
  obligations: {
    reportingRequirements?: string[];
    monitoringRequirements?: string[];
    complianceChecks?: string[];
    auditRequirements?: string[];
    recordKeeping?: string[];
  };
  
  // Geographic & Regional - PRECISE
  geography: {
    regions: string[];
    departments?: string[];
    territories?: string[];
    exclusions?: string[];
    specialConditions?: string[];
  };
  
  // Technical Requirements - IF APPLICABLE
  technical: {
    technicalRequirements?: string[];
    certificationNeeded?: string[];
    standardsCompliance?: string[];
    equipmentRequirements?: string[];
  };
  
  // Meta Information - TRACKING
  meta: {
    sourceUrl: string;
    extractedText: string;
    extractionConfidence: number;
    extractionDate: string;
    lastUpdated?: string;
    publicationDate?: string;
    documentVersion?: string;
    language: string;
    extractionMethod: string;
  };
}

/**
 * Parse document content from URL - now source-aware
 * Only attempts actual document parsing for real document URLs
 */
export const parseDocumentContent = async (url: string): Promise<DocumentContent | null> => {
  try {
    // Check if this is actually a document URL vs a web page
    const documentExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    const isDocument = documentExtensions.some(ext => url.toLowerCase().includes(ext));
    
    if (!isDocument) {
      // This is a web page, not a document - don't attempt parsing
      console.log('URL is a web page, not a document. Skipping document parsing:', url);
      return null;
    }
    
    // For actual documents, this would be implemented with an edge function
    // that uses pdf-parse, mammoth.js, or similar libraries
    console.log('Document parsing not yet implemented for document:', url);
    return null;
  } catch (error) {
    console.error('Failed to parse document:', error);
    return null;
  }
};

/**
 * DEPRECATED - This function returned mock data and has been removed
 * Use the source-aware extraction system instead:
 * import { extractSubsidyData } from '@/lib/extraction/source-extractors';
 */
export const extractStructuredData = async (text: string): Promise<Partial<DocumentContent>> => {
  console.warn('extractStructuredData is deprecated - use source-aware extraction instead');
  return {};
};

/**
 * Get document type from URL
 */
export const getDocumentType = (url: string): 'pdf' | 'doc' | 'xls' | 'unknown' => {
  const extension = url.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'doc';
    case 'xls':
    case 'xlsx':
      return 'xls';
    default:
      return 'unknown';
  }
};
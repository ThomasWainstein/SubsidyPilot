/**
 * Configuration-driven field mapping for farm profile extraction data
 * Maps source extraction keys to target form fields with appropriate parsers
 */

import {
  parseNumber,
  parseIntNumber,
  parseDate,
  parseStringArray,
  parseString,
  validateEmail,
  validateUrl,
  parseGeolocation,
  parseBoolean,
  parseCertificationValidity,
  parsePhoneNumbers,
} from './parsers';

export interface FieldMapping {
  sourceKey: string;
  targetKey: string;
  parser?: (value: any) => any;
  description?: string;
}

/**
 * Comprehensive field mappings covering 25+ farm profile fields
 * including basic info, operational, financial, certification, and contact data
 */
export const farmProfileFieldMappings: FieldMapping[] = [
  // Basic farm information
  { sourceKey: 'farmName', targetKey: 'name', parser: parseString, description: 'Official farm name' },
  { sourceKey: 'ownerName', targetKey: 'owner_name', parser: parseString, description: 'Farm owner name' },
  { sourceKey: 'address', targetKey: 'address', parser: parseString, description: 'Physical address' },
  { sourceKey: 'country', targetKey: 'country', parser: parseString, description: 'Country code or name' },
  { sourceKey: 'department', targetKey: 'department', parser: parseString, description: 'Department/region' },
  { sourceKey: 'locality', targetKey: 'locality', parser: parseString, description: 'City/locality' },
  
  // Legal and registration
  { sourceKey: 'legalStatus', targetKey: 'legal_status', parser: parseString, description: 'Legal entity type' },
  { sourceKey: 'registrationNumber', targetKey: 'cnp_or_cui', parser: parseString, description: 'Tax/registration ID' },
  { sourceKey: 'taxNumberVAT', targetKey: 'tax_vat_number', parser: parseString, description: 'VAT number' },
  { sourceKey: 'establishmentDate', targetKey: 'establishment_date', parser: parseDate, description: 'Registration date' },
  
  // Farm operations
  { sourceKey: 'totalHectares', targetKey: 'total_hectares', parser: parseNumber, description: 'Total farm area' },
  { sourceKey: 'landOwnership', targetKey: 'own_or_lease', parser: parseBoolean, description: 'Ownership status' },
  { sourceKey: 'activities', targetKey: 'land_use_types', parser: parseStringArray, description: 'Farm activities' },
  { sourceKey: 'cropTypes', targetKey: 'crop_types', parser: parseStringArray, description: 'Crops grown' },
  { sourceKey: 'livestockTypes', targetKey: 'livestock_types', parser: parseStringArray, description: 'Livestock kept' },
  { sourceKey: 'livestockPresent', targetKey: 'livestock_present', parser: parseBoolean, description: 'Has livestock' },
  { sourceKey: 'irrigationMethods', targetKey: 'irrigation_method', parser: parseString, description: 'Irrigation type' },
  { sourceKey: 'soilType', targetKey: 'soil_type', parser: parseString, description: 'Soil classification' },
  
  // Certifications and compliance
  { sourceKey: 'certifications', targetKey: 'certifications', parser: parseStringArray, description: 'Certifications list' },
  { sourceKey: 'validityDates', targetKey: 'certifications_validity', parser: parseCertificationValidity, description: 'Cert validity dates' },
  { sourceKey: 'environmentalPermits', targetKey: 'environmental_permit', parser: parseBoolean, description: 'Has env permits' },
  { sourceKey: 'technicalDocs', targetKey: 'tech_docs', parser: parseBoolean, description: 'Has technical docs' },
  { sourceKey: 'lastInspectionDate', targetKey: 'last_inspection_date', parser: parseDate, description: 'Last inspection' },
  
  // Financial and operational scale
  { sourceKey: 'revenue', targetKey: 'revenue', parser: parseString, description: 'Annual revenue range' },
  { sourceKey: 'numberOfEmployees', targetKey: 'staff_count', parser: parseIntNumber, description: 'Employee count' },
  { sourceKey: 'subsidyInterests', targetKey: 'subsidy_interest', parser: parseStringArray, description: 'Subsidy interests' },
  
  // Contact information
  { sourceKey: 'email', targetKey: 'email', parser: validateEmail, description: 'Contact email' },
  { sourceKey: 'phoneNumber', targetKey: 'phone', parser: parsePhoneNumbers, description: 'Phone numbers' },
  { sourceKey: 'website', targetKey: 'website', parser: validateUrl, description: 'Website URL' },
  { sourceKey: 'preferredLanguage', targetKey: 'preferred_language', parser: parseString, description: 'Preferred language' },
  
  // Technology and equipment
  { sourceKey: 'softwareUsed', targetKey: 'software_used', parser: parseStringArray, description: 'Software systems' },
  { sourceKey: 'equipmentList', targetKey: 'equipment_list', parser: parseStringArray, description: 'Farm equipment' },
  
  // Location and geography
  { sourceKey: 'geolocation', targetKey: 'geolocation', parser: parseGeolocation, description: 'GPS coordinates' },
  { sourceKey: 'apiaRegions', targetKey: 'apia_region', parser: parseStringArray, description: 'APIA regions' },
  
  // Insurance and emergency
  { sourceKey: 'insuranceProvider', targetKey: 'insurance_provider', parser: parseString, description: 'Insurance company' },
  { sourceKey: 'insurancePolicyNumber', targetKey: 'insurance_policy_no', parser: parseString, description: 'Policy number' },
  { sourceKey: 'emergencyContactName', targetKey: 'emergency_contact_name', parser: parseString, description: 'Emergency contact' },
  { sourceKey: 'emergencyContactPhone', targetKey: 'emergency_contact_phone', parser: parsePhoneNumbers, description: 'Emergency phone' },
  
  // Additional notes and comments
  { sourceKey: 'comments', targetKey: 'notes', parser: parseString, description: 'Additional notes' },
  { sourceKey: 'specialConditions', targetKey: 'special_conditions', parser: parseString, description: 'Special conditions' },
];

/**
 * Subsidy-related document and evidence mappings
 * These are tracked separately from farm profile but important for validation
 */
export const subsidyDocumentMappings: FieldMapping[] = [
  { sourceKey: 'applicationForm', targetKey: 'application_form_file', description: 'Application form document' },
  { sourceKey: 'detailedQuotes', targetKey: 'detailed_investment_quotes', description: 'Investment quotes' },
  { sourceKey: 'bankAccountDetails', targetKey: 'bank_account_details', parser: parseString, description: 'Bank account info' },
  { sourceKey: 'companyStatutesOrKbis', targetKey: 'company_statutes_or_kbis', description: 'Legal existence docs' },
  { sourceKey: 'msaCertificate', targetKey: 'msa_certificate', description: 'MSA attestation' },
  { sourceKey: 'identityDocument', targetKey: 'identity_document', description: 'Identity verification' },
  { sourceKey: 'memberList', targetKey: 'members_list', parser: parseString, description: 'Membership lists' },
  { sourceKey: 'cooperativeCertificate', targetKey: 'cooperative_certificate', description: 'Cooperative attestation' },
  { sourceKey: 'balanceSheets', targetKey: 'balance_sheets', description: 'Financial reports' },
  { sourceKey: 'projectedIncomeStatement', targetKey: 'projected_income_statement', description: 'Financial projections' },
  { sourceKey: 'paymentInvoices', targetKey: 'payment_invoices', description: 'Expense invoices' },
  { sourceKey: 'salesContracts', targetKey: 'sales_contracts', description: 'Sales agreements' },
  { sourceKey: 'resellerAttestation', targetKey: 'reseller_attestation', description: 'Reseller proof' },
  { sourceKey: 'equipmentSellerDeclaration', targetKey: 'equipment_seller_declaration', description: 'Equipment declarations' },
  { sourceKey: 'technicalDataSheet', targetKey: 'technical_data_sheet', description: 'Equipment specifications' },
  { sourceKey: 'certificationProof', targetKey: 'certification_proof', description: 'Certification documents' },
  { sourceKey: 'insuranceDocument', targetKey: 'insurance_document', description: 'Insurance proofs' },
  { sourceKey: 'distributionMenu', targetKey: 'distribution_menu', description: 'Distribution menus' },
  { sourceKey: 'distributionRecord', targetKey: 'distribution_record', description: 'Distribution reports' },
];

/**
 * Create a lookup map for reverse mapping (form field -> extraction field)
 */
export const createReverseMapping = (mappings: FieldMapping[]): Map<string, string> => {
  return new Map(mappings.map(({ sourceKey, targetKey }) => [targetKey, sourceKey]));
};

/**
 * Get all available source keys from mappings
 */
export const getAllSourceKeys = (): string[] => {
  return [...farmProfileFieldMappings, ...subsidyDocumentMappings].map(m => m.sourceKey);
};

/**
 * Get all available target keys from mappings
 */
export const getAllTargetKeys = (): string[] => {
  return [...farmProfileFieldMappings, ...subsidyDocumentMappings].map(m => m.targetKey);
};
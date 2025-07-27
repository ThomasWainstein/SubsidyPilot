// Data Quality and Validation Utilities for AgriTool
// Phase 1 Implementation: Enhanced data quality checks and validation

export interface DataQualityIssue {
  id: string;
  type: 'missing_field' | 'placeholder_data' | 'invalid_format' | 'low_confidence';
  severity: 'critical' | 'high' | 'medium' | 'low';
  field: string;
  message: string;
  suggestedFix?: string;
  extractionConfidence?: number;
}

export interface SubsidyQualityReport {
  subsidyId: string;
  overallScore: number;
  issues: DataQualityIssue[];
  missingCriticalFields: string[];
  placeholderTitles: boolean;
  hasValidEligibility: boolean;
  hasValidDeadline: boolean;
  extractionCompleteness: number;
}

// Critical fields that must be present for a subsidy to be useful
export const CRITICAL_SUBSIDY_FIELDS = [
  'title',
  'description', 
  'eligibility',
  'region',
  'sector',
  'deadline',
  'agency'
] as const;

// Fields that often contain placeholder data
export const PLACEHOLDER_PATTERNS = [
  /^subsidy\s*\d+$/i,
  /^programme\s*\d+$/i,
  /^untitled/i,
  /^sans\s*titre/i,
  /^placeholder/i,
  /^test\s*/i,
  /^\[.*\]$/,
  /^temp\s*/i,
  /^draft/i
];

// Common invalid or generic eligibility patterns
export const GENERIC_ELIGIBILITY_PATTERNS = [
  /^all\s*farmers?$/i,
  /^everyone$/i,
  /^no\s*restrictions?$/i,
  /^to\s*be\s*determined$/i,
  /^tbd$/i,
  /^pending$/i,
  /^voir\s*conditions?$/i
];

/**
 * Validates and scores a subsidy's data quality
 */
export function assessSubsidyQuality(subsidy: any): SubsidyQualityReport {
  const issues: DataQualityIssue[] = [];
  const missingCriticalFields: string[] = [];
  
  // Check for missing critical fields
  CRITICAL_SUBSIDY_FIELDS.forEach(field => {
    const value = subsidy[field];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missingCriticalFields.push(field);
      issues.push({
        id: `missing_${field}`,
        type: 'missing_field',
        severity: 'critical',
        field,
        message: `Critical field '${field}' is missing or empty`,
        suggestedFix: `Extract ${field} from source documents or web content`
      });
    }
  });

  // Check for placeholder titles
  const title = subsidy.title || '';
  const hasPlaceholderTitle = PLACEHOLDER_PATTERNS.some(pattern => pattern.test(title));
  if (hasPlaceholderTitle) {
    issues.push({
      id: 'placeholder_title',
      type: 'placeholder_data',
      severity: 'high',
      field: 'title',
      message: 'Title appears to be a placeholder or generic value',
      suggestedFix: 'Re-extract title from original source document'
    });
  }

  // Check eligibility quality
  const eligibility = subsidy.eligibility || '';
  const hasGenericEligibility = GENERIC_ELIGIBILITY_PATTERNS.some(pattern => pattern.test(eligibility));
  if (hasGenericEligibility) {
    issues.push({
      id: 'generic_eligibility',
      type: 'placeholder_data',
      severity: 'high',
      field: 'eligibility',
      message: 'Eligibility criteria are too generic or incomplete',
      suggestedFix: 'Extract detailed eligibility requirements from source documents'
    });
  }

  // Check array fields for completeness
  const arrayFields = ['region', 'sector', 'beneficiary_types', 'eligible_actions'];
  arrayFields.forEach(field => {
    const value = subsidy[field];
    if (Array.isArray(value) && value.length === 0) {
      issues.push({
        id: `empty_array_${field}`,
        type: 'missing_field',
        severity: 'medium',
        field,
        message: `Array field '${field}' is empty`,
        suggestedFix: `Populate ${field} array with relevant values`
      });
    }
  });

  // Check deadline validity
  const hasValidDeadline = validateDeadline(subsidy.deadline);
  if (!hasValidDeadline) {
    issues.push({
      id: 'invalid_deadline',
      type: 'invalid_format',
      severity: 'high',
      field: 'deadline',
      message: 'Deadline is missing or in invalid format',
      suggestedFix: 'Extract deadline in YYYY-MM-DD format'
    });
  }

  // Calculate extraction completeness
  const totalExpectedFields = 30; // Based on canonical schema
  const populatedFields = Object.keys(subsidy).filter(key => {
    const value = subsidy[key];
    return value !== null && value !== undefined && 
           !(typeof value === 'string' && value.trim() === '') &&
           !(Array.isArray(value) && value.length === 0);
  }).length;
  
  const extractionCompleteness = Math.round((populatedFields / totalExpectedFields) * 100);

  // Calculate overall quality score
  const criticalPenalty = missingCriticalFields.length * 15;
  const highSeverityPenalty = issues.filter(i => i.severity === 'high').length * 10;
  const mediumSeverityPenalty = issues.filter(i => i.severity === 'medium').length * 5;
  
  const overallScore = Math.max(0, 100 - criticalPenalty - highSeverityPenalty - mediumSeverityPenalty);

  return {
    subsidyId: subsidy.id,
    overallScore,
    issues,
    missingCriticalFields,
    placeholderTitles: hasPlaceholderTitle,
    hasValidEligibility: !hasGenericEligibility && eligibility.length > 10,
    hasValidDeadline,
    extractionCompleteness
  };
}

/**
 * Validates if a deadline is in correct format and reasonable
 */
function validateDeadline(deadline: any): boolean {
  if (!deadline) return false;
  
  const date = new Date(deadline);
  if (isNaN(date.getTime())) return false;
  
  // Check if deadline is reasonable (not too far in past/future)
  const now = new Date();
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  const fiveYearsFromNow = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate());
  
  return date >= twoYearsAgo && date <= fiveYearsFromNow;
}

/**
 * Generates batch processing queries for subsidies with quality issues
 */
export function generateReprocessingCandidates(qualityReports: SubsidyQualityReport[]): string[] {
  return qualityReports
    .filter(report => 
      report.overallScore < 70 || 
      report.missingCriticalFields.length > 2 ||
      report.placeholderTitles
    )
    .map(report => report.subsidyId);
}

/**
 * Creates audit flags for database storage
 */
export function createAuditFlags(qualityReport: SubsidyQualityReport): Record<string, any> {
  return {
    quality_score: qualityReport.overallScore,
    extraction_completeness: qualityReport.extractionCompleteness,
    has_critical_issues: qualityReport.issues.some(i => i.severity === 'critical'),
    needs_reprocessing: qualityReport.overallScore < 70,
    missing_critical_fields: qualityReport.missingCriticalFields,
    quality_issues: qualityReport.issues.map(issue => ({
      type: issue.type,
      severity: issue.severity,
      field: issue.field,
      message: issue.message
    })),
    last_quality_check: new Date().toISOString()
  };
}

/**
 * Validates extracted data against expected schemas
 */
export function validateExtractionSchema(extractedData: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required string fields
  const requiredStrings = ['title', 'description'];
  requiredStrings.forEach(field => {
    if (typeof extractedData[field] !== 'string' || extractedData[field].trim().length === 0) {
      errors.push(`Missing or invalid ${field}`);
    }
  });

  // Array fields validation
  const arrayFields = ['region', 'sector', 'beneficiary_types'];
  arrayFields.forEach(field => {
    if (extractedData[field] && !Array.isArray(extractedData[field])) {
      errors.push(`${field} must be an array`);
    }
  });

  // Amount validation
  if (extractedData.amount) {
    if (!Array.isArray(extractedData.amount) || extractedData.amount.length !== 2) {
      warnings.push('Amount should be an array with [min, max] values');
    }
  }

  // Date validation
  if (extractedData.deadline && !validateDeadline(extractedData.deadline)) {
    errors.push('Invalid deadline format or value');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
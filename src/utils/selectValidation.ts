/**
 * Utility functions for safely handling Select component values
 * to prevent the "SelectItem value cannot be empty string" error
 */

/**
 * Ensures a value is safe for use in SelectItem components
 * Returns a non-empty string or a safe fallback
 */
export function getSafeSelectValue(value: any, fallback = 'unknown'): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return fallback;
  }
  
  // Handle strings
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? fallback : trimmed;
  }
  
  // Handle other types - convert to string and check
  const stringValue = String(value).trim();
  return stringValue === '' ? fallback : stringValue;
}

/**
 * Filters an array to only include valid SelectItem values
 * Removes null, undefined, empty strings, and non-string values
 */
export function filterValidSelectOptions(options: any[]): string[] {
  if (!Array.isArray(options)) {
    return [];
  }
  
  return options
    .filter(option => 
      option !== null && 
      option !== undefined && 
      typeof option === 'string' && 
      option.trim() !== ''
    )
    .map(option => option.trim());
}

/**
 * Validates that a value is safe for SelectItem
 * Returns true if the value can be used as a SelectItem value
 */
export function isValidSelectValue(value: any): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  
  if (typeof value !== 'string') {
    return false;
  }
  
  return value.trim() !== '';
}

/**
 * Creates a safe Select value for controlled components
 * Returns empty string for "no selection" states but ensures
 * it's never passed to SelectItem components
 */
export function getSelectDisplayValue(value: any, allowEmpty = false): string {
  if (value === null || value === undefined) {
    return allowEmpty ? '' : 'none';
  }
  
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return allowEmpty ? '' : 'none';
    }
    return trimmed;
  }
  
  const stringValue = String(value).trim();
  return stringValue === '' ? (allowEmpty ? '' : 'none') : stringValue;
}
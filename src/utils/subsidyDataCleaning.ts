/**
 * Utility functions for cleaning and formatting subsidy data display
 */

/**
 * Clean markdown formatting from text
 */
export const cleanMarkdownFormatting = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  return text
    .replace(/^==\s*(.+?)\s*==$/, '$1') // Remove == Présentation == style headers
    .replace(/== (.+?) ==/g, '$1') // Remove other == headers ==
    .trim();
};

/**
 * Parse eligibility string that might be JSON array
 */
export const parseEligibilityData = (eligibility: any): string[] => {
  if (!eligibility) return [];
  
  // If it's already an array, return it
  if (Array.isArray(eligibility)) {
    return eligibility.filter(item => item && typeof item === 'string');
  }
  
  // If it's a string that looks like JSON array
  if (typeof eligibility === 'string') {
    try {
      const parsed = JSON.parse(eligibility);
      if (Array.isArray(parsed)) {
        return parsed.filter(item => item && typeof item === 'string');
      }
      // If it's just a regular string, return as single item
      return eligibility.trim() ? [eligibility.trim()] : [];
    } catch {
      // If parsing fails, treat as regular string
      return eligibility.trim() ? [eligibility.trim()] : [];
    }
  }
  
  return [];
};

/**
 * Format documents array properly
 */
export const formatDocuments = (documents: any): Array<{text: string, url?: string}> => {
  if (!documents || !Array.isArray(documents)) return [];
  
  return documents.map(doc => {
    // If doc is an object with text/url properties
    if (typeof doc === 'object' && doc !== null) {
      if (doc.text || doc.url) {
        return {
          text: doc.text || 'Document',
          url: doc.url
        };
      }
      // If it's some other object, stringify it nicely
      return {
        text: Object.keys(doc).length > 0 ? 
          Object.entries(doc).map(([k,v]) => `${k}: ${v}`).join(', ') : 
          'Document'
      };
    }
    
    // If doc is a string
    if (typeof doc === 'string') {
      return { text: doc };
    }
    
    // Fallback
    return { text: 'Document' };
  }).filter(doc => doc.text && doc.text !== 'undefined');
};

/**
 * Check if an object/array is empty or contains no meaningful data
 */
export const hasContent = (data: any): boolean => {
  if (!data) return false;
  if (Array.isArray(data)) return data.length > 0;
  if (typeof data === 'object') return Object.keys(data).length > 0;
  if (typeof data === 'string') return data.trim().length > 0;
  return true;
};

/**
 * Format array as readable list
 */
export const formatArrayAsText = (arr: any[]): string => {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  
  const cleanItems = arr
    .filter(item => item !== null && item !== undefined)
    .map(item => typeof item === 'string' ? item : String(item))
    .filter(item => item.trim().length > 0);
    
  if (cleanItems.length === 0) return '';
  if (cleanItems.length === 1) return cleanItems[0];
  if (cleanItems.length === 2) return cleanItems.join(' and ');
  
  return cleanItems.slice(0, -1).join(', ') + ', and ' + cleanItems[cleanItems.length - 1];
};

/**
 * Clean and format subsidy description
 */
export const cleanSubsidyDescription = (description: string): string => {
  if (!description || typeof description !== 'string') return '';
  
  return cleanMarkdownFormatting(description)
    .replace(/\n\s*\n/g, '\n\n') // Clean up multiple newlines
    .trim();
};

/**
 * Format language array for display
 */
export const formatLanguages = (languages: any): string => {
  if (!languages) return '';
  
  let langArray = [];
  
  if (typeof languages === 'string') {
    try {
      langArray = JSON.parse(languages);
    } catch {
      langArray = [languages];
    }
  } else if (Array.isArray(languages)) {
    langArray = languages;
  } else {
    return String(languages);
  }
  
  return langArray
    .map(lang => typeof lang === 'string' ? lang.toUpperCase() : String(lang))
    .join(', ');
};
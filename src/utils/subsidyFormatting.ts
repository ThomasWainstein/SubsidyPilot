/**
 * Utility functions for formatting subsidy data consistently across the app
 */

/**
 * Format funding amount for display - handles both single values and ranges
 */
export const formatFundingAmount = (amount: number[] | number | null): string => {
  if (!amount) return 'Not specified';
  
  // Handle single number
  if (typeof amount === 'number') {
    if (amount === 0) return 'Ask for details';
    return `€${amount.toLocaleString()}`;
  }
  
  // Handle array
  if (Array.isArray(amount)) {
    if (amount.length === 0) return 'Not specified';
    
    // Filter out zero values
    const validAmounts = amount.filter(a => a > 0);
    if (validAmounts.length === 0) return 'Ask for details';
    
    if (validAmounts.length === 1) return `€${validAmounts[0].toLocaleString()}`;
    
    const min = Math.min(...validAmounts);
    const max = Math.max(...validAmounts);
    
    if (min === max) return `€${min.toLocaleString()}`;
    return `€${min.toLocaleString()} – €${max.toLocaleString()}`;
  }
  
  return 'Not specified';
};

/**
 * Get subsidy title - prioritize actual source titles, flag missing ones
 */
export const getSubsidyTitle = (subsidy: any): string => {
  // Handle multilingual titles
  if (typeof subsidy.title === 'object' && subsidy.title) {
    const title =
      subsidy.title.en ||
      subsidy.title.fr ||
      subsidy.title.ro ||
      Object.values(subsidy.title)[0];
    if (title && title !== 'Subsidy Page' && title.trim() !== '') {
      return title.trim();
    }
  }

  // Handle string titles - prioritize actual source titles
  const title = subsidy.title;
  if (title && title !== 'Subsidy Page' && title.trim() !== '') {
    return title.trim();
  }

  // Generate meaningful title from available data
  let generatedTitle = '';
  
  if (subsidy.agency && subsidy.sector && Array.isArray(subsidy.sector) && subsidy.sector.length > 0) {
    const sectors = subsidy.sector.slice(0, 2).join(', ');
    generatedTitle = `${subsidy.agency} - ${sectors} Grant`;
  } else if (subsidy.agency) {
    generatedTitle = `${subsidy.agency} Agricultural Grant`;
  } else if (subsidy.sector && Array.isArray(subsidy.sector) && subsidy.sector.length > 0) {
    const sectors = subsidy.sector.slice(0, 2).join(', ');
    generatedTitle = `${sectors} Funding Program`;
  } else if (subsidy.program) {
    generatedTitle = subsidy.program;
  } else {
    generatedTitle = `Agricultural Funding Program #${subsidy.id.slice(0, 8)}`;
  }

  // Add funding type if available and not already included
  if (subsidy.funding_type && !generatedTitle.toLowerCase().includes(subsidy.funding_type.toLowerCase())) {
    generatedTitle += ` (${subsidy.funding_type})`;
  }

  console.warn('Generated title for subsidy with missing/placeholder title', {
    id: subsidy.id,
    agency: subsidy.agency,
    sector: subsidy.sector,
    originalTitle: subsidy.title,
    generatedTitle
  });
  
  return generatedTitle;
};

/**
 * Clean and truncate description text
 */
export const cleanDescription = (text: string, maxLength: number = 300): string => {
  if (!text) return '';
  
  // Remove repeated sections and normalize whitespace
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const uniqueLines = [...new Set(lines)];
  const cleanText = uniqueLines.join(' ').replace(/\s+/g, ' ');
  
  if (cleanText.length <= maxLength) return cleanText;
  
  // Truncate at word boundary
  const truncated = cleanText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
};

/**
 * Get user-friendly description, handling multilingual content
 */
export const getSubsidyDescription = (subsidy: any): string => {
  let description = '';
  
  if (typeof subsidy.description === 'object' && subsidy.description) {
    description = subsidy.description.en || subsidy.description.fr || subsidy.description.ro || Object.values(subsidy.description)[0] || '';
  } else {
    description = subsidy.description || '';
  }
  
  if (!description) return 'No description available';
  
  return cleanDescription(description, 300);
};

/**
 * Normalize and clean array data
 */
export const normalizeArrayData = (data: string[] | string | null): string[] => {
  if (!data) return [];
  
  if (Array.isArray(data)) {
    // Clean, deduplicate, and filter empty values
    return [...new Set(data.map(item => item?.toString().trim()).filter(Boolean))];
  }
  
  if (typeof data === 'string') {
    // Split concatenated strings and clean
    const items = data.split(/[,;|\/]/).map(item => item.trim()).filter(Boolean);
    return [...new Set(items)];
  }
  
  return [];
};

/**
 * Get region display string
 */
export const getRegionDisplay = (region: string[] | string | null): string => {
  const regions = normalizeArrayData(region);
  if (regions.length === 0) return 'All regions';
  if (regions.length === 1) return regions[0];
  if (regions.length <= 3) return regions.join(', ');
  return `${regions.slice(0, 2).join(', ')} +${regions.length - 2} more`;
};

/**
 * Get sector display array
 */
export const getSectorDisplay = (sector: string[] | string | null): string[] => {
  return normalizeArrayData(sector);
};

/**
 * Get formatted sector display string
 */
export const getSectorDisplayString = (sector: string[] | string | null): string => {
  const sectors = normalizeArrayData(sector);
  if (sectors.length === 0) return 'All sectors';
  if (sectors.length <= 3) return sectors.join(', ');
  return `${sectors.slice(0, 2).join(', ')} +${sectors.length - 2} more`;
};

/**
 * Get deadline status and urgency
 */
export const getDeadlineStatus = (deadline: string | null): { status: string; urgent: boolean; daysLeft?: number } => {
  if (!deadline) return { status: 'Open application', urgent: false };
  
  const deadlineDate = new Date(deadline);
  const today = new Date();
  
  // Check if deadline is valid
  if (isNaN(deadlineDate.getTime())) {
    return { status: 'Check details', urgent: false };
  }
  
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { status: 'Application closed', urgent: false };
  if (diffDays === 0) return { status: 'Closes today', urgent: true, daysLeft: 0 };
  if (diffDays === 1) return { status: 'Closes tomorrow', urgent: true, daysLeft: 1 };
  if (diffDays <= 7) return { status: `${diffDays} days left`, urgent: true, daysLeft: diffDays };
  if (diffDays <= 30) return { status: `${diffDays} days left`, urgent: false, daysLeft: diffDays };
  
  // Format future date nicely
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  return { 
    status: `Due ${deadlineDate.toLocaleDateString('en-US', options)}`, 
    urgent: false, 
    daysLeft: diffDays 
  };
};

/**
 * Translate funding source keys to user-friendly labels
 */
export const translateFundingSource = (key: string): string => {
  const translations: Record<string, string> = {
    'public': 'Public Funding',
    'private': 'Private Funding',
    'hybrid': 'Mixed Funding',
    'mixed': 'Mixed Funding',
    'Aide au remboursement': 'Repayment Aid',
    'Aide de minimis': 'Minimis Aid',
    'Subvention': 'Grant',
    'Crédit d\'impôt': 'Tax Credit',
    'Prêt': 'Loan',
    'Assistance technique': 'Technical Assistance'
  };
  
  return translations[key] || key;
};

/**
 * Clean and format filter labels
 */
export const formatFilterLabel = (key: string, translationFn?: (key: string) => string): string => {
  // Handle translation keys
  if (key.startsWith('search.filters.') && translationFn) {
    return translationFn(key);
  }
  
  // Handle raw values that need translation
  if (translationFn) {
    const translated = translateFundingSource(key);
    if (translated !== key) return translated;
  }
  
  // Fallback: clean up the key
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};
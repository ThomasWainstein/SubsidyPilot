/**
 * Utility functions for formatting subsidy data consistently across the app
 */

/**
 * Format funding amount for display - handles both single values and ranges
 */
export const formatFundingAmount = (amount: number[] | number | null): string => {
  if (!amount) return 'Amount TBD';
  
  // Handle single number
  if (typeof amount === 'number') {
    return `€${amount.toLocaleString()}`;
  }
  
  // Handle array
  if (Array.isArray(amount)) {
    if (amount.length === 0) return 'Amount TBD';
    if (amount.length === 1) return `€${amount[0].toLocaleString()}`;
    
    const min = Math.min(...amount);
    const max = Math.max(...amount);
    
    if (min === max) return `€${min.toLocaleString()}`;
    return `€${min.toLocaleString()} - €${max.toLocaleString()}`;
  }
  
  return 'Amount TBD';
};

/**
 * Get a user-friendly title for subsidies, replacing generic titles
 */
export const getSubsidyTitle = (subsidy: any): string => {
  // Handle multilingual titles
  if (typeof subsidy.title === 'object' && subsidy.title) {
    const title = subsidy.title.en || subsidy.title.fr || subsidy.title.ro || Object.values(subsidy.title)[0];
    if (title && title !== 'Subsidy Page') return title;
  }
  
  // Handle string titles
  const title = subsidy.title;
  if (title && title !== 'Subsidy Page') return title;
  
  // Generate meaningful title from available data
  let generatedTitle = 'Agricultural Funding Program';
  
  if (subsidy.agency && subsidy.sector) {
    const sector = Array.isArray(subsidy.sector) ? subsidy.sector[0] : subsidy.sector;
    generatedTitle = `${subsidy.agency} - ${sector} Grant`;
  } else if (subsidy.agency) {
    generatedTitle = `${subsidy.agency} Agricultural Grant`;
  } else if (subsidy.sector) {
    const sector = Array.isArray(subsidy.sector) ? subsidy.sector[0] : subsidy.sector;
    generatedTitle = `${sector} Funding Program`;
  } else if (subsidy.program) {
    generatedTitle = subsidy.program;
  }
  
  // Add funding type if available and not already included
  if (subsidy.funding_type && !generatedTitle.toLowerCase().includes(subsidy.funding_type.toLowerCase())) {
    generatedTitle += ` (${subsidy.funding_type})`;
  }
  
  return generatedTitle;
};

/**
 * Get user-friendly description, handling multilingual content
 */
export const getSubsidyDescription = (subsidy: any): string => {
  if (typeof subsidy.description === 'object' && subsidy.description) {
    return subsidy.description.en || subsidy.description.fr || subsidy.description.ro || Object.values(subsidy.description)[0] || 'No description available';
  }
  return subsidy.description || 'No description available';
};

/**
 * Get region display string
 */
export const getRegionDisplay = (region: string[] | string | null): string => {
  if (!region) return 'All regions';
  if (Array.isArray(region)) {
    if (region.length === 0) return 'All regions';
    if (region.length === 1) return region[0];
    return region.slice(0, 2).join(', ') + (region.length > 2 ? ` +${region.length - 2} more` : '');
  }
  return region;
};

/**
 * Get sector display array
 */
export const getSectorDisplay = (sector: string[] | string | null): string[] => {
  if (!sector) return [];
  if (Array.isArray(sector)) return sector;
  return [sector];
};

/**
 * Get deadline status and urgency
 */
export const getDeadlineStatus = (deadline: string | null): { status: string; urgent: boolean; daysLeft?: number } => {
  if (!deadline) return { status: 'Open', urgent: false };
  
  const deadlineDate = new Date(deadline);
  const today = new Date();
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { status: 'Closed', urgent: false };
  if (diffDays <= 7) return { status: `${diffDays} days left`, urgent: true, daysLeft: diffDays };
  if (diffDays <= 30) return { status: `${diffDays} days left`, urgent: false, daysLeft: diffDays };
  
  return { status: deadlineDate.toLocaleDateString(), urgent: false, daysLeft: diffDays };
};
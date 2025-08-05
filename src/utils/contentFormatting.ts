import { Language } from '@/contexts/language/types';
import { MultilingualText } from '@/types/subsidy';

/**
 * Clean text content by removing technical artifacts and formatting properly
 */
export const cleanContent = (text: string): string => {
  if (!text) return '';
  
  // Remove technical markers and artifacts
  const cleaned = text
    // Remove == markers and technical tags
    .replace(/=+\s*([^=]+)\s*=+/g, '$1')
    // Remove AUTO-TRANSLATED prefixes
    .replace(/\[AUTO-TRANSLATED from [A-Z]+\]\s*/gi, '')
    // Remove technical variable references
    .replace(/\{\{[^}]+\}\}/g, '')
    // Remove markdown artifacts
    .replace(/^\s*#+ /gm, '')
    // Clean up multiple spaces and line breaks
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    // Remove leading/trailing whitespace
    .trim();

  return cleaned;
};

/**
 * Get clean, properly localized content
 */
export const getCleanLocalizedContent = (
  content: string | MultilingualText, 
  language: Language = 'en'
): string => {
  let rawText = '';
  
  if (typeof content === 'string') {
    rawText = content;
  } else if (content && typeof content === 'object') {
    // Try to get content in requested language, fallback to available languages
    rawText = content[language] || content['en'] || content['fr'] || content['ro'] || Object.values(content)[0] || '';
  }
  
  return cleanContent(rawText);
};

/**
 * Format funding amount with proper currency display
 */
export const formatFundingDisplay = (amount: number[] | number | null): string => {
  if (!amount) return 'Not specified';
  
  if (typeof amount === 'number') {
    if (amount === 0) return 'Contact agency for details';
    return `€${amount.toLocaleString()}`;
  }
  
  if (Array.isArray(amount)) {
    const validAmounts = amount.filter(a => a > 0);
    if (validAmounts.length === 0) return 'Contact agency for details';
    if (validAmounts.length === 1) return `€${validAmounts[0].toLocaleString()}`;
    
    const min = Math.min(...validAmounts);
    const max = Math.max(...validAmounts);
    return `€${min.toLocaleString()} - €${max.toLocaleString()}`;
  }
  
  return 'Not specified';
};

/**
 * Clean and format array data for display
 */
export const formatArrayForDisplay = (data: string[] | string | null, fallback: string = 'Not specified'): string => {
  if (!data) return fallback;
  
  if (Array.isArray(data)) {
    const cleaned = data.filter(Boolean).map(item => cleanContent(item));
    if (cleaned.length === 0) return fallback;
    if (cleaned.length <= 3) return cleaned.join(', ');
    return `${cleaned.slice(0, 2).join(', ')} and ${cleaned.length - 2} more`;
  }
  
  if (typeof data === 'string') {
    const cleaned = cleanContent(data);
    return cleaned || fallback;
  }
  
  return fallback;
};

/**
 * Get deadline status with urgency indication
 */
export const getDeadlineInfo = (deadline: string | null): { 
  text: string; 
  urgent: boolean; 
  icon: 'calendar' | 'alert-circle' | 'clock' 
} => {
  if (!deadline) return { text: 'Open application', urgent: false, icon: 'calendar' };
  
  const deadlineDate = new Date(deadline);
  const today = new Date();
  
  if (isNaN(deadlineDate.getTime())) {
    return { text: 'Check official page', urgent: false, icon: 'alert-circle' };
  }
  
  const diffTime = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { text: 'Application closed', urgent: false, icon: 'alert-circle' };
  if (diffDays === 0) return { text: 'Closes today', urgent: true, icon: 'alert-circle' };
  if (diffDays === 1) return { text: 'Closes tomorrow', urgent: true, icon: 'alert-circle' };
  if (diffDays <= 7) return { text: `${diffDays} days left`, urgent: true, icon: 'clock' };
  if (diffDays <= 30) return { text: `${diffDays} days left`, urgent: false, icon: 'clock' };
  
  return { 
    text: deadlineDate.toLocaleDateString('en-GB', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }), 
    urgent: false, 
    icon: 'calendar' 
  };
};
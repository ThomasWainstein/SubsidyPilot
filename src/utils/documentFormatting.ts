/**
 * Utility functions for formatting and displaying documents
 */

/**
 * Format document name to be human-friendly
 * - Decode URL encoding
 * - Replace underscores/hyphens with spaces
 * - Remove file extension
 * - Capitalize words properly
 */
export const formatDocumentName = (name: string): string => {
  try {
    // Decode URL encoding
    let formatted = decodeURIComponent(name);
    
    // Remove file extension
    formatted = formatted.replace(/\.[a-z0-9]+$/i, '');
    
    // Replace underscores and hyphens with spaces
    formatted = formatted.replace(/[_-]/g, ' ');
    
    // Remove extra spaces and trim
    formatted = formatted.replace(/\s+/g, ' ').trim();
    
    // Capitalize first letter of each word (title case)
    formatted = formatted.replace(/\b\w/g, c => c.toUpperCase());
    
    return formatted;
  } catch (error) {
    // Fallback if decoding fails
    return name.replace(/[_-]/g, ' ').replace(/\.[a-z0-9]+$/i, '');
  }
};

/**
 * Get file extension from filename or URL
 */
export const getFileExtension = (filename: string): string => {
  const match = filename.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : 'file';
};

/**
 * Format file size to human readable format
 */
export const formatFileSize = (size: string | number | undefined): string => {
  if (!size) return '-';
  
  if (typeof size === 'string') {
    // If already formatted (e.g., "2.2 MB"), return as is
    if (size.match(/\d+(\.\d+)?\s*(KB|MB|GB)/i)) {
      return size;
    }
    
    // Try to parse as number
    const parsed = parseFloat(size);
    if (isNaN(parsed)) return size;
    size = parsed;
  }
  
  // Convert bytes to human readable
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let sizeNum = size as number;
  
  while (sizeNum >= 1024 && unitIndex < units.length - 1) {
    sizeNum /= 1024;
    unitIndex++;
  }
  
  return `${sizeNum.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Get the original filename from a URL
 */
export const getFilenameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'document';
    return decodeURIComponent(filename);
  } catch {
    return 'document';
  }
};

/**
 * Extract document info from various formats
 */
export const extractDocumentInfo = (doc: any) => {
  const label = doc.label || doc.name || doc.filename || '';
  const url = doc.url || '';
  const type = doc.type || getFileExtension(label || url);
  const size = doc.size || '';
  const required = doc.required || doc.mandatory || false;
  const notes = doc.notes || doc.description || '';
  
  // Get the best display name
  let displayName = label;
  if (!displayName && url) {
    displayName = getFilenameFromUrl(url);
  }
  
  return {
    displayName: formatDocumentName(displayName),
    originalName: label || getFilenameFromUrl(url),
    url,
    type: type.toLowerCase(),
    size: formatFileSize(size),
    required,
    notes
  };
};
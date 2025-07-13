
import { toast } from '@/hooks/use-toast';

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export const handleApiError = (error: any, context?: string): void => {
  console.error(`API Error${context ? ` in ${context}` : ''}:`, error);
  
  let userMessage = 'An unexpected error occurred. Please try again.';
  
  if (error?.message) {
    // Check for common error patterns and provide user-friendly messages
    if (error.message.includes('network') || error.message.includes('fetch')) {
      userMessage = 'Network error. Please check your connection and try again.';
    } else if (error.message.includes('unauthorized') || error.message.includes('403')) {
      userMessage = 'You don\'t have permission to perform this action.';
    } else if (error.message.includes('not found') || error.message.includes('404')) {
      userMessage = 'The requested resource was not found.';
    } else if (error.message.includes('timeout')) {
      userMessage = 'Request timed out. Please try again.';
    }
  }
  
  toast({
    title: 'Error',
    description: userMessage,
    variant: 'destructive',
  });
};

export const handleUploadError = (error: any, fileName?: string): void => {
  console.error('Upload Error:', error);
  
  let userMessage = 'File upload failed. Please try again.';
  
  if (error?.message) {
    if (error.message.includes('size') || error.message.includes('large')) {
      userMessage = `File ${fileName ? `"${fileName}" ` : ''}is too large. Please choose a smaller file.`;
    } else if (error.message.includes('format') || error.message.includes('type')) {
      userMessage = `File ${fileName ? `"${fileName}" ` : ''}format is not supported. Please choose a different file.`;
    } else if (error.message.includes('network')) {
      userMessage = 'Upload failed due to network issues. Please check your connection and try again.';
    }
  }
  
  toast({
    title: 'Upload Failed',
    description: userMessage,
    variant: 'destructive',
  });
};

export const showSuccessMessage = (message: string, title = 'Success'): void => {
  toast({
    title,
    description: message,
  });
};

export const showWarningMessage = (message: string, title = 'Warning'): void => {
  toast({
    title,
    description: message,
    variant: 'default', // Using default as there's no warning variant
  });
};

/**
 * Safe value extractor for Select components to prevent empty string values
 */
export const getSafeSelectValue = (value: any, fallback = ''): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value.trim() || fallback;
  return String(value).trim() || fallback;
};

/**
 * Filter array to remove empty/invalid values for Select components
 */
export const filterValidSelectOptions = (options: any[]): string[] => {
  return options.filter(option => 
    option !== null && 
    option !== undefined && 
    typeof option === 'string' && 
    option.trim() !== ''
  );
};

/**
 * Handles form validation errors
 */
export const handleValidationError = (errors: Record<string, any>): void => {
  const errorMessages = Object.entries(errors)
    .map(([field, error]) => `${field}: ${error.message || error}`)
    .slice(0, 3) // Show max 3 errors
    .join(', ');
    
  toast({
    title: 'Validation Error',
    description: errorMessages,
    variant: 'destructive',
  });
};


export const validateFarmAccess = (farmUserId: string, currentUserId: string): boolean => {
  return farmUserId === currentUserId;
};

export const validateDocumentAccess = (documentFarmId: string, userFarms: string[]): boolean => {
  return userFarms.includes(documentFarmId);
};

export const sanitizeFileName = (fileName: string): string => {
  // Remove potentially dangerous characters
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 255);
};

export const validateFileType = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'File type not supported. Please upload PDF, Word, or image files only.'
    };
  }

  // 50MB limit
  if (file.size > 50 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'File size must be less than 50MB.'
    };
  }

  return { isValid: true };
};

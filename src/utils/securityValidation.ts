
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
  console.log('🔍 File validation - Name:', file.name, 'Type:', file.type, 'Size:', file.size);
  
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  console.log('🔍 Allowed types:', allowedTypes);
  console.log('🔍 File type check:', file.type, 'is allowed:', allowedTypes.includes(file.type));

  if (!allowedTypes.includes(file.type)) {
    const error = `File type ${file.type} not supported. Please upload PDF, Word, Excel, or image files only.`;
    console.error('❌ File type validation failed:', error);
    return {
      isValid: false,
      error
    };
  }

  // 50MB limit
  console.log('🔍 File size check:', file.size, 'bytes, limit: 50MB');
  if (file.size > 50 * 1024 * 1024) {
    const error = 'File size must be less than 50MB.';
    console.error('❌ File size validation failed:', error);
    return {
      isValid: false,
      error
    };
  }

  console.log('✅ File validation passed!');
  return { isValid: true };
};

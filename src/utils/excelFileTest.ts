// Excel File Upload Test Utility
// Use this to test Excel file uploads and debug issues

export const createTestExcelFile = (fileName: string = 'test.xlsx'): File => {
  // Create a minimal Excel file structure (XLSX is a ZIP file)
  const excelContent = new Uint8Array([
    0x50, 0x4B, 0x03, 0x04, // ZIP signature
    // Minimal Excel content would go here
  ]);
  
  const blob = new Blob([excelContent], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  return new File([blob], fileName, { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
};

export const createTestXlsFile = (fileName: string = 'test.xls'): File => {
  // Create a minimal XLS file structure  
  const xlsContent = new Uint8Array([
    0xD0, 0xCF, 0x11, 0xE0, // XLS signature
    // Minimal XLS content would go here
  ]);
  
  const blob = new Blob([xlsContent], { 
    type: 'application/vnd.ms-excel' 
  });
  
  return new File([blob], fileName, { 
    type: 'application/vnd.ms-excel' 
  });
};

export const logFileDetails = (file: File) => {
  console.log('📊 File Details:');
  console.log('  Name:', file.name);
  console.log('  Type:', file.type);
  console.log('  Size:', file.size, 'bytes');
  console.log('  Last Modified:', new Date(file.lastModified));
  
  // Check if it's an Excel file
  const isExcel = file.type.includes('excel') || 
                 file.type.includes('spreadsheet') ||
                 file.name.endsWith('.xls') ||
                 file.name.endsWith('.xlsx');
  
  console.log('  Is Excel:', isExcel);
  
  return isExcel;
};

export const testExcelUpload = () => {
  console.log('🧪 Testing Excel file creation...');
  
  const xlsxFile = createTestExcelFile('test.xlsx');
  const xlsFile = createTestXlsFile('test.xls');
  
  console.log('XLSX Test File:');
  logFileDetails(xlsxFile);
  
  console.log('XLS Test File:');
  logFileDetails(xlsFile);
  
  return { xlsxFile, xlsFile };
};
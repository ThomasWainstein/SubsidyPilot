// Utility functions for testing document uploads
// Use these functions to systematically test upload functionality

export const createTestFile = (name: string, size: number, type: string): File => {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
};

export const testFileScenarios = {
  // Valid files
  smallPdf: () => createTestFile('test.pdf', 1024 * 100, 'application/pdf'), // 100KB
  mediumExcel: () => createTestFile('test.xlsx', 1024 * 1024 * 5, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'), // 5MB
  largeWord: () => createTestFile('test.docx', 1024 * 1024 * 45, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), // 45MB
  
  // Edge cases
  maxSizeFile: () => createTestFile('max.pdf', 50 * 1024 * 1024, 'application/pdf'), // Exactly 50MB
  oversizedFile: () => createTestFile('huge.pdf', 55 * 1024 * 1024, 'application/pdf'), // 55MB (should fail)
  
  // Invalid files
  unsupportedType: () => createTestFile('test.exe', 1024, 'application/x-executable'),
  emptyFile: () => createTestFile('empty.pdf', 0, 'application/pdf'),
  
  // Excel files specifically
  excelOld: () => createTestFile('legacy.xls', 1024 * 500, 'application/vnd.ms-excel'),
  excelNew: () => createTestFile('modern.xlsx', 1024 * 500, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
};

export const runUploadTests = async (uploadFunction: (files: File[]) => Promise<void>) => {
  const results: { name: string; success: boolean; error?: string }[] = [];
  
  for (const [testName, createFile] of Object.entries(testFileScenarios)) {
    try {
      console.log(`🧪 Testing: ${testName}`);
      const file = createFile();
      await uploadFunction([file]);
      results.push({ name: testName, success: true });
      console.log(`✅ ${testName}: PASSED`);
    } catch (error) {
      results.push({ 
        name: testName, 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`❌ ${testName}: FAILED -`, error);
    }
  }
  
  console.log('\n📊 Upload Test Results:');
  console.table(results);
  
  return results;
};

export const logUploadAnalytics = (action: string, data: Record<string, any>) => {
  console.log(`📈 Upload Analytics - ${action}:`, {
    timestamp: new Date().toISOString(),
    action,
    ...data
  });
  
  // In production, send to analytics service
  // analytics.track(`upload_${action}`, data);
};
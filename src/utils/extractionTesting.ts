import { supabase } from '@/integrations/supabase/client';

/**
 * Comprehensive DOCX extraction testing utility
 * Tests Mammoth.js integration and fallback mechanisms
 */

export interface ExtractionTestResult {
  testName: string;
  extractionMethod: string;
  success: boolean;
  textExtracted: boolean;
  fallbackUsed: boolean;
  textPreview?: string;
  textLength: number;
  errorMessages: string[];
  openAIResponse?: any;
  dbRowCreated: boolean;
  logs: any[];
}

/**
 * Test extraction pipeline with detailed logging
 */
export async function testExtractionPipeline(
  documentId: string, 
  fileUrl: string, 
  fileName: string, 
  documentType: string,
  testName: string = 'Standard DOCX Test'
): Promise<ExtractionTestResult> {
  console.log(`🧪 Starting ${testName}...`);
  
  const testResult: ExtractionTestResult = {
    testName,
    extractionMethod: 'unknown',
    success: false,
    textExtracted: false,
    fallbackUsed: false,
    textLength: 0,
    errorMessages: [],
    dbRowCreated: false,
    logs: []
  };

  try {
    // Call the extraction edge function
    const result = await supabase.functions.invoke('extract-document-data', {
      body: {
        documentId,
        fileUrl,
        fileName,
        documentType
      }
    });
    
    console.log('📊 Extraction result:', result);
    testResult.logs.push(result);
    
    if (result.error) {
      testResult.errorMessages.push(result.error.message || 'Unknown error');
      return testResult;
    }
    
    // Check if data was extracted
    if (result.data) {
      testResult.success = true;
      
      // Parse debug information if available
      if (result.data.debugInfo) {
        const debugInfo = result.data.debugInfo;
        testResult.extractionMethod = debugInfo.extractionMethod || 'unknown';
        testResult.fallbackUsed = debugInfo.libraryUsed?.includes('fallback') || false;
        testResult.textLength = debugInfo.textLength || 0;
        testResult.textExtracted = testResult.textLength > 0;
        
        if (debugInfo.textPreview) {
          testResult.textPreview = debugInfo.textPreview.slice(0, 200);
        }
        
        if (debugInfo.errors?.length > 0) {
          testResult.errorMessages.push(...debugInfo.errors);
        }
      }
      
      // Check if database row was created
      const { data: extractionData, error: dbError } = await supabase
        .from('document_extractions')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (extractionData && extractionData.length > 0) {
        testResult.dbRowCreated = true;
        testResult.openAIResponse = extractionData[0].extracted_data;
      }
      
      if (dbError) {
        testResult.errorMessages.push(`DB check error: ${dbError.message}`);
      }
    }
    
  } catch (error) {
    testResult.errorMessages.push(`Test execution error: ${(error as Error).message}`);
  }
  
  return testResult;
}

/**
 * Run comprehensive test suite for DOCX extraction
 */
export async function runExtractionTestSuite(): Promise<ExtractionTestResult[]> {
  const results: ExtractionTestResult[] = [];
  
  // Test cases - replace with actual document IDs and URLs
  const testCases = [
    {
      name: 'Normal DOCX Test',
      documentId: 'test-doc-1',
      fileUrl: 'https://example.com/normal.docx',
      fileName: 'normal_farm_registration.docx',
      documentType: 'financial'
    },
    {
      name: 'Complex DOCX Test',
      documentId: 'test-doc-2', 
      fileUrl: 'https://example.com/complex.docx',
      fileName: 'complex_farm_with_tables.docx',
      documentType: 'legal'
    },
    {
      name: 'Corrupt DOCX Test',
      documentId: 'test-doc-3',
      fileUrl: 'https://example.com/corrupt.docx',
      fileName: 'corrupt_file.docx',
      documentType: 'other'
    }
  ];
  
  for (const testCase of testCases) {
    const result = await testExtractionPipeline(
      testCase.documentId,
      testCase.fileUrl,
      testCase.fileName,
      testCase.documentType,
      testCase.name
    );
    results.push(result);
    
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

/**
 * Generate test summary table
 */
export function generateTestSummary(results: ExtractionTestResult[]): string {
  let summary = '\n📊 EXTRACTION PIPELINE TEST SUMMARY\n';
  summary += '=' .repeat(80) + '\n';
  summary += 'Test File'.padEnd(20) + 'Method'.padEnd(15) + 'Text?'.padEnd(8) + 'Fallback?'.padEnd(10) + 'DB Row?'.padEnd(8) + 'Status\n';
  summary += '-'.repeat(80) + '\n';
  
  for (const result of results) {
    const method = result.extractionMethod.replace('docx_', '').slice(0, 12);
    const textStatus = result.textExtracted ? 'Yes' : 'No';
    const fallbackStatus = result.fallbackUsed ? 'Yes' : 'No';
    const dbStatus = result.dbRowCreated ? 'Yes' : 'No';
    const overallStatus = result.success ? '✅ Pass' : '❌ Fail';
    
    summary += result.testName.slice(0, 18).padEnd(20);
    summary += method.padEnd(15);
    summary += textStatus.padEnd(8);
    summary += fallbackStatus.padEnd(10);
    summary += dbStatus.padEnd(8);
    summary += overallStatus + '\n';
    
    if (result.errorMessages.length > 0) {
      summary += '  Errors: ' + result.errorMessages.join(', ') + '\n';
    }
    
    if (result.textPreview) {
      summary += '  Preview: ' + result.textPreview.slice(0, 100) + '...\n';
    }
  }
  
  summary += '=' .repeat(80) + '\n';
  return summary;
}

/**
 * Browser console testing function
 * Usage: Copy to browser console and run testMammothExtraction()
 */
export function createConsoleTestFunction() {
  return `
// Run this in browser console to test Mammoth.js extraction
async function testMammothExtraction() {
  try {
    const { testExtractionPipeline, generateTestSummary } = await import('./src/utils/extractionTesting.js');
    
    // Replace with actual document details
    const result = await testExtractionPipeline(
      'your-document-id',
      'your-file-url',
      'your-filename.docx',
      'financial',
      'Manual Browser Test'
    );
    
    console.log('🧪 Test Result:', result);
    console.log('📋 Text Preview:', result.textPreview);
    console.log('📊 Summary:', generateTestSummary([result]));
    
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return null;
  }
}

// Run the test
testMammothExtraction();
`;
}
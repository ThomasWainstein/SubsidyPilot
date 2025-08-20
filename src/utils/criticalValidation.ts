import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticResult {
  name: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

// Fixed Google Vision API test with proper UUID and accessible URL
export const testGoogleVisionAPIFixed = async (): Promise<DiagnosticResult> => {
  const startTime = Date.now();
  try {
    console.log('🧪 Testing Google Vision API with valid document...');
    
    const testDocumentId = crypto.randomUUID(); // Generate valid UUID
    
    const { data, error } = await supabase.functions.invoke('hybrid-ocr-extraction', {
      body: {
        documentId: testDocumentId,
        // Use a simple accessible test image
        fileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        fileName: 'vision-api-test.png',
        clientType: 'farm',
        documentType: 'test'
      }
    });

    const duration = Date.now() - startTime;
    
    if (error) {
      console.error('❌ Google Vision API test failed:', error);
      return {
        name: 'Google Vision API (Fixed)',
        success: false,
        error: error.message || JSON.stringify(error),
        duration
      };
    }

    console.log('✅ Google Vision API test successful:', data);
    return {
      name: 'Google Vision API (Fixed)',
      success: true,
      data,
      duration
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error('❌ Vision API test exception:', err);
    return {
      name: 'Google Vision API (Fixed)',
      success: false,
      error: err.message || 'Unknown error',
      duration
    };
  }
};

// Test with embedded base64 image (no external URL needed)
export const testWithEmbeddedImage = async (): Promise<DiagnosticResult> => {
  const startTime = Date.now();
  try {
    console.log('🧪 Testing with embedded base64 image...');
    
    const testDocumentId = crypto.randomUUID();
    
    // Simple 1x1 pixel PNG as base64 - no external URL needed
    const base64TestImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const { data, error } = await supabase.functions.invoke('hybrid-ocr-extraction', {
      body: {
        documentId: testDocumentId,
        fileUrl: base64TestImage,
        fileName: 'embedded-test.png',
        clientType: 'farm',
        documentType: 'test'
      }
    });

    const duration = Date.now() - startTime;
    
    return {
      name: 'Embedded Image Test',
      success: !error,
      data,
      error: error?.message,
      duration
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;
    return {
      name: 'Embedded Image Test',
      success: false,
      error: err.message,
      duration
    };
  }
};

// Test with a simple web-accessible document
export const testWebAccessibleDocument = async (): Promise<DiagnosticResult> => {
  const startTime = Date.now();
  try {
    console.log('🧪 Testing with web-accessible document...');
    
    const testDocumentId = crypto.randomUUID();
    
    // Use httpbin.org which should be accessible from Supabase
    const { data, error } = await supabase.functions.invoke('hybrid-ocr-extraction', {
      body: {
        documentId: testDocumentId,
        fileUrl: 'https://httpbin.org/image/png',
        fileName: 'web-accessible-test.png',
        clientType: 'farm',
        documentType: 'test'
      }
    });

    const duration = Date.now() - startTime;
    
    return {
      name: 'Web Accessible Document Test',
      success: !error,
      data,
      error: error?.message,
      duration
    };
  } catch (err: any) {
    const duration = Date.now() - startTime;
    return {
      name: 'Web Accessible Document Test',
      success: false,
      error: err.message,
      duration
    };
  }
};

// Test database operations with proper UUID
export const testDatabaseUUIDValidation = async (): Promise<DiagnosticResult> => {
  const startTime = Date.now();
  try {
    console.log('🧪 Testing database UUID validation...');
    
    const testId = crypto.randomUUID();
    const { data, error } = await supabase
      .from('document_extractions')
      .select('id')
      .eq('id', testId)
      .limit(1);
    
    const duration = Date.now() - startTime;
    
    return {
      name: 'Database UUID Validation',
      success: !error,
      data: { testUUID: testId, queryResult: data },
      error: error?.message,
      duration
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      name: 'Database UUID Validation',
      success: false,
      error: error.message,
      duration
    };
  }
};

// Comprehensive Phase 1A validation
export const runCriticalPhase1AValidation = async (): Promise<DiagnosticResult[]> => {
  console.log('🚀 Running CRITICAL Phase 1A Validation with fixes...');
  
  const results: DiagnosticResult[] = [];
  
  // Test 1: Database with proper UUID
  console.log('\n1️⃣ Testing database with valid UUID...');
  const dbResult = await testDatabaseUUIDValidation();
  results.push(dbResult);

  // Test 2: Edge function with embedded image (no external URL)
  console.log('\n2️⃣ Testing edge function with embedded image...');
  const embeddedResult = await testWithEmbeddedImage();
  results.push(embeddedResult);

  // Test 3: Test web accessible document (if embedded works)
  if (embeddedResult.success) {
    console.log('\n3️⃣ Testing web accessible document...');
    const webResult = await testWebAccessibleDocument();
    results.push(webResult);
  }

  // Test 4: Fixed Google Vision API test
  console.log('\n4️⃣ Testing fixed Google Vision API...');
  const visionResult = await testGoogleVisionAPIFixed();
  results.push(visionResult);

  // Analysis
  console.log('\n📊 CRITICAL VALIDATION RESULTS:');
  const passedTests = results.filter(r => r.success).length;
  console.log(`✅ ${passedTests}/${results.length} critical tests passed`);

  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.success ? 'PASS' : 'FAIL'}`);
    if (!result.success && result.error) {
      console.log(`   📝 Error: ${result.error}`);
    }
  });

  if (passedTests === results.length) {
    console.log('\n🎉 ALL CRITICAL TESTS PASSED - Phase 1A ready for real document testing!');
  } else {
    console.log('\n🚨 Critical issues remain - see errors above for specific fixes needed');
  }

  return results;
};
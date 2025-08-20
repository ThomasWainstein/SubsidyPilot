import { supabase } from '@/integrations/supabase/client';

// Immediate diagnostic functions for Phase 1A validation
export const runImmediateDiagnostics = async () => {
  console.log('🚀 Starting immediate Phase 1A diagnostics...');
  const results: any[] = [];
  
  // Test 1: Check if Edge Function responds at all
  console.log('\n1️⃣ Testing basic edge function connectivity...');
  try {
    const basicTest = await supabase.functions.invoke('hybrid-ocr-extraction', {
      body: { 
        test: true,
        documentId: 'connectivity-test',
        fileUrl: 'https://httpbin.org/image/png',
        fileName: 'connectivity-test.png',
        clientType: 'farm'
      }
    });
    console.log('✅ Edge function reachable:', basicTest);
    results.push({ test: 'Edge Function Connectivity', success: !basicTest.error, data: basicTest });
  } catch (error: any) {
    console.error('❌ Edge function unreachable:', error);
    results.push({ test: 'Edge Function Connectivity', success: false, error: error.message });
  }

  // Test 2: Check Google Vision API with simple test image
  console.log('\n2️⃣ Testing Google Vision API with test image...');
  try {
    const visionTest = await supabase.functions.invoke('hybrid-ocr-extraction', {
      body: {
        documentId: 'vision-api-test',
        fileUrl: 'https://via.placeholder.com/600x400/000000/FFFFFF?text=TEST+DOCUMENT+Sample+Form+Name+John+Doe+Amount+1000+EUR',
        fileName: 'vision-test.png',
        clientType: 'farm',
        documentType: 'test'
      }
    });
    console.log('✅ Vision API test result:', visionTest);
    results.push({ test: 'Google Vision API', success: !visionTest.error, data: visionTest });
  } catch (error: any) {
    console.error('❌ Vision API test failed:', error);
    results.push({ test: 'Google Vision API', success: false, error: error.message });
  }

  // Test 3: Check database connection
  console.log('\n3️⃣ Testing database connectivity...');
  try {
    const { data, error } = await supabase
      .from('subsidies')
      .select('id, title')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Database connected, records found:', data?.length || 0);
    results.push({ test: 'Database Connectivity', success: true, data: { recordCount: data?.length } });
  } catch (error: any) {
    console.error('❌ Database connection failed:', error);
    results.push({ test: 'Database Connectivity', success: false, error: error.message });
  }

  // Test 4: Check API keys configuration
  console.log('\n4️⃣ Testing API keys configuration...');
  try {
    const configTest = await supabase.functions.invoke('hybrid-ocr-extraction', {
      body: {
        documentId: 'config-test',
        fileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        fileName: 'config-test.png',
        clientType: 'farm',
        documentType: 'config'
      }
    });
    
    console.log('✅ API configuration test:', configTest);
    results.push({ test: 'API Configuration', success: !configTest.error, data: configTest });
  } catch (error: any) {
    console.error('❌ API configuration test failed:', error);
    results.push({ test: 'API Configuration', success: false, error: error.message });
  }

  // Summary
  console.log('\n📊 DIAGNOSTIC SUMMARY:');
  const successCount = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  console.log(`✅ ${successCount}/${totalTests} tests passed`);
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.test}: ${result.success ? 'PASS' : 'FAIL'}`);
    if (!result.success) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n🔗 Next Steps:');
  console.log('1. Check edge function logs in Supabase Dashboard → Edge Functions → hybrid-ocr-extraction → Logs');
  console.log('2. Test Google Vision API key manually with curl command');
  console.log('3. Verify Google Cloud Vision API is enabled in Google Console');
  
  return results;
};

// Test Google Vision API key independently
export const testGoogleVisionAPIKey = (apiKey: string) => {
  const curlCommand = `curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{
    "requests": [
      {
        "image": {
          "source": {
            "imageUri": "https://via.placeholder.com/600x400/000000/FFFFFF?text=TEST+DOCUMENT+Sample+Form"
          }
        },
        "features": [
          {
            "type": "TEXT_DETECTION",
            "maxResults": 1
          }
        ]
      }
    ]
  }' \\
  "https://vision.googleapis.com/v1/images:annotate?key=${apiKey}"`;

  console.log('🔧 Test your Google Vision API key with this curl command:');
  console.log(curlCommand);
  console.log('\n📋 Expected responses:');
  console.log('✅ Success: JSON response with text detection results');
  console.log('❌ 401/403: API key issue or permissions');
  console.log('❌ 400: API not enabled or malformed request');
  console.log('❌ Timeout: Network or Google Cloud issue');
  
  return curlCommand;
};

// Enhanced error analysis
export const analyzeExtractionErrors = (results: any[]) => {
  console.log('\n🔍 ERROR ANALYSIS:');
  
  const failedTests = results.filter(r => !r.success);
  
  if (failedTests.length === 0) {
    console.log('✅ No errors detected in diagnostics');
    return;
  }

  failedTests.forEach(test => {
    console.log(`\n❌ ${test.test} FAILED:`);
    console.log(`   Error: ${test.error}`);
    
    // Provide specific guidance based on error type
    if (test.error.includes('timeout')) {
      console.log('   🔧 Likely cause: Network timeout or API latency');
      console.log('   💡 Solution: Check network connectivity, verify API endpoints');
    } else if (test.error.includes('401') || test.error.includes('403')) {
      console.log('   🔧 Likely cause: API key authentication issue');
      console.log('   💡 Solution: Verify API key is correct and has proper permissions');
    } else if (test.error.includes('404')) {
      console.log('   🔧 Likely cause: API endpoint not found or service not enabled');
      console.log('   💡 Solution: Check Google Cloud Vision API is enabled');
    } else if (test.error.includes('quota')) {
      console.log('   🔧 Likely cause: API quota exceeded');
      console.log('   💡 Solution: Check Google Cloud Console for quota limits');
    } else if (test.error.includes('Edge Function returned a non-2xx status code')) {
      console.log('   🔧 Likely cause: Internal edge function error');
      console.log('   💡 Solution: Check edge function logs for detailed error information');
    }
  });
};

// Manual testing checklist
export const getManualTestingChecklist = () => {
  return [
    '1. 🔑 API Key Validation:',
    '   - Test Google Vision API key with curl command',
    '   - Verify OpenAI API key is working',
    '   - Check API keys are correctly set in Supabase secrets',
    '',
    '2. 🔧 Google Cloud Configuration:',
    '   - Verify Cloud Vision API is enabled in Google Console',
    '   - Check billing is enabled on Google Cloud project',
    '   - Confirm API key restrictions allow Supabase edge function IPs',
    '',
    '3. 📋 Edge Function Logs:',
    '   - Go to Supabase Dashboard → Edge Functions → hybrid-ocr-extraction',
    '   - Click "Logs" to see recent invocations',
    '   - Look for timeout patterns, API errors, or authentication failures',
    '',
    '4. 📄 Document Testing:',
    '   - Find 3-5 real French subsidy PDFs from official sources',
    '   - Test with simple text-based images first',
    '   - Gradually test with more complex documents',
    '',
    '5. 🎯 Accuracy Measurement:',
    '   - Create ground truth for at least 5 documents',
    '   - Define expected extraction fields per document type',
    '   - Calculate field-by-field accuracy percentage'
  ];
};

// Auto-run diagnostics if window object exists (browser environment)
if (typeof window !== 'undefined') {
  // Export to global scope for easy console access
  (window as any).runImmediateDiagnostics = runImmediateDiagnostics;
  (window as any).testGoogleVisionAPIKey = testGoogleVisionAPIKey;
  (window as any).analyzeExtractionErrors = analyzeExtractionErrors;
}
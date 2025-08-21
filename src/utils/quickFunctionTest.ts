import { supabase } from '@/integrations/supabase/client';

// Quick test function that can be called from console
export const quickFunctionTest = async () => {
  console.log('🔍 Testing Edge Function Status...');
  
  const functions = ['hybrid-extraction', 'async-document-processor', 'extract-document-data'];
  const results = [];
  
  for (const func of functions) {
    console.log(`\n📡 Testing ${func}...`);
    
    try {
      const startTime = Date.now();
      // Use query parameter for health check instead of request body
      const response = await fetch(`https://gvfgvbztagafjykncwto.supabase.co/functions/v1/${func}?test=health`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MDgxNzMsImV4cCI6MjA2NDI4NDE3M30.DLtvrw9I0nboGZiZQnGkszDTFHh4vDbpiA1do2J6rcI',
          'Content-Type': 'application/json'
        }
      });
      const duration = Date.now() - startTime;
      
      const data = response.ok ? await response.json() : null;
      const error = response.ok ? null : { message: `HTTP ${response.status}` };
      
      console.log(`⏱️ ${func} response time: ${duration}ms`);
      console.log(`📊 ${func} result:`, {
        hasData: !!data,
        hasError: !response.ok,
        data: data,
        error: error
      });
      
      results.push({
        function: func,
        status: response.ok ? 'SUCCESS' : 'ERROR',
        duration: duration,
        hasData: !!data,
        error: error?.message || null,
        data: data || null
      });
      
    } catch (error) {
      console.error(`❌ ${func} failed with exception:`, error);
      results.push({
        function: func,
        status: 'EXCEPTION',
        duration: 0,
        hasData: false,
        error: error.message,
        data: null
      });
    }
  }
  
  console.log('\n🎯 SUMMARY:');
  console.log('='.repeat(50));
  results.forEach(result => {
    const status = result.status === 'SUCCESS' ? '✅' : '❌';
    console.log(`${status} ${result.function}: ${result.status} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.data) {
      console.log(`   Data: ${JSON.stringify(result.data).substring(0, 100)}...`);
    }
  });
  
  const successCount = results.filter(r => r.status === 'SUCCESS').length;
  const deploymentStatus = successCount === functions.length ? 'FULLY DEPLOYED' : 
                          successCount > 0 ? 'PARTIALLY DEPLOYED' : 'NOT DEPLOYED';
  
  console.log(`\n🚀 DEPLOYMENT STATUS: ${deploymentStatus} (${successCount}/${functions.length})`);
  
  return {
    deploymentStatus,
    successCount,
    totalFunctions: functions.length,
    results
  };
};

// Test a real document processing call
export const testRealProcessing = async () => {
  console.log('\n🧪 Testing Real Document Processing...');
  
  try {
    const testDocumentId = crypto.randomUUID();
    // Use a simple 1x1 pixel PNG as base64
    const testImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    console.log('🚀 Calling async-document-processor with test data...');
    console.log('📋 Test parameters:', {
      documentId: testDocumentId,
      fileName: 'test-deployment.png',
      fileSize: testImageUrl.length
    });
    
    const startTime = Date.now();
    const response = await supabase.functions.invoke('async-document-processor', {
      body: {
        documentId: testDocumentId,
        fileUrl: testImageUrl,
        fileName: 'test-deployment.png',
        clientType: 'farm',
        documentType: 'test'
      }
    });
    const duration = Date.now() - startTime;
    
    console.log(`⏱️ Processing call completed in ${duration}ms`);
    console.log('📊 Response details:', {
      hasData: !!response.data,
      hasError: !!response.error,
      data: response.data,
      error: response.error
    });
    
    if (response.data?.jobId) {
      console.log(`✅ Job created successfully: ${response.data.jobId}`);
      
      // Check if job was created in database
      console.log('🔍 Checking job in database...');
      const { data: jobData, error: jobError } = await supabase
        .from('document_processing_jobs')
        .select('*')
        .eq('id', response.data.jobId)
        .single();
        
      if (jobError) {
        console.error('❌ Failed to retrieve job from database:', jobError);
      } else {
        console.log('✅ Job found in database:', jobData);
      }
      
      return {
        success: true,
        jobId: response.data.jobId,
        duration,
        jobData
      };
    } else {
      console.error('❌ No job ID returned');
      return {
        success: false,
        error: response.error?.message || 'No job ID returned',
        duration
      };
    }
    
  } catch (error) {
    console.error('❌ Real processing test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Make functions available globally for console access
if (typeof window !== 'undefined') {
  (window as any).quickFunctionTest = quickFunctionTest;
  (window as any).testRealProcessing = testRealProcessing;
}
import { supabase } from '@/integrations/supabase/client';

// Test if edge functions are deployed and responding
export const testFunctionDeployment = async () => {
  console.log('🔍 Testing Edge Function Deployment Status...');
  
  const functions = [
    'hybrid-extraction',
    'async-document-processor', 
    'extract-document-data'
  ];
  
  const results = [];
  
  for (const functionName of functions) {
    console.log(`\n📡 Testing ${functionName}...`);
    
    try {
      // Test basic health endpoint
      const healthTest = await supabase.functions.invoke(functionName, {
        body: { test: 'health' }
      });
      
      console.log(`✅ ${functionName} health response:`, {
        hasData: !!healthTest.data,
        hasError: !!healthTest.error,
        data: healthTest.data
      });
      
      results.push({
        function: functionName,
        status: healthTest.error ? 'ERROR' : 'DEPLOYED',
        error: healthTest.error?.message,
        data: healthTest.data
      });
      
    } catch (error) {
      console.error(`❌ ${functionName} test failed:`, error);
      results.push({
        function: functionName,
        status: 'FAILED',
        error: error.message
      });
    }
  }
  
  console.log('\n📊 Function Deployment Summary:');
  results.forEach(result => {
    console.log(`${result.status === 'DEPLOYED' ? '✅' : '❌'} ${result.function}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  return results;
};

// Test with a real document processing call
export const testRealProcessing = async () => {
  console.log('\n🧪 Testing Real Document Processing...');
  
  try {
    const testDocumentId = crypto.randomUUID();
    const testImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    console.log('🚀 Calling async-document-processor...');
    const response = await supabase.functions.invoke('async-document-processor', {
      body: {
        documentId: testDocumentId,
        fileUrl: testImageUrl,
        fileName: 'test-deployment.png',
        clientType: 'farm',
        documentType: 'test'
      }
    });
    
    console.log('📝 Async processor response:', {
      hasData: !!response.data,
      hasError: !!response.error,
      data: response.data,
      error: response.error
    });
    
    if (response.data?.jobId) {
      console.log(`✅ Job created successfully: ${response.data.jobId}`);
      
      // Wait a moment and check job status
      setTimeout(async () => {
        const { data: jobData } = await supabase
          .from('document_processing_jobs')
          .select('*')
          .eq('id', response.data.jobId)
          .single();
          
        console.log('📊 Job status:', jobData);
      }, 3000);
    }
    
    return response;
    
  } catch (error) {
    console.error('❌ Real processing test failed:', error);
    return { error: error.message };
  }
};

// Call this in browser console to run deployment test
export const runDeploymentTest = async () => {
  console.log('🎯 Starting comprehensive deployment test...');
  
  const deploymentResults = await testFunctionDeployment();
  const processingResult = await testRealProcessing();
  
  console.log('\n🎯 Test Complete! Check logs above for detailed results.');
  
  return {
    deployment: deploymentResults,
    processing: processingResult
  };
};

// Quick test - just call: testFunctionDeployment()
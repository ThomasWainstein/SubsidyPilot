// Test service role access via edge function
import { supabase } from '@/integrations/supabase/client';

export const testServiceRoleAccess = async () => {
  try {
    console.log('🔧 Testing service role access via edge function...');
    
    // Test via QA validation function which should have service role access
    const testResult = await supabase.functions.invoke('qa-validation-agent', {
      body: {
        extractedData: {
          title: 'Test Service Role Access',
          description: 'Testing write permissions'
        },
        originalHtml: '<html><body>Test</body></html>',
        sourceUrl: 'https://test-service-role-access.franceagrimer.fr'
      }
    });
    
    console.log('📊 Service role test result:', testResult);
    
    if (testResult.error) {
      console.error('❌ Service role access failed:', testResult.error);
      return false;
    }
    
    console.log('✅ Service role access successful');
    return true;
    
  } catch (error) {
    console.error('❌ Service role test failed:', error);
    return false;
  }
};

export const verifyQATableAccess = async () => {
  try {
    // Try reading from QA results table using raw query with type casting
    const { data, error } = await supabase
      .from('extraction_qa_results' as any)
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('❌ QA table read access failed:', error);
      return false;
    }
    
    console.log('✅ QA table read access successful, records found:', data?.length || 0);
    return true;
    
  } catch (error) {
    console.error('❌ QA table access test failed:', error);
    return false;
  }
};
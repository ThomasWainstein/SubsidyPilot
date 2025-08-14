import { supabase } from '@/integrations/supabase/client';

// Simple test to debug the V2 function
export const testV2Function = async () => {
  console.log('🧪 Testing ai-content-processor-v2 function directly...');
  
  try {
    // Test 1: Basic function call
    console.log('📡 Calling function...');
    const result = await supabase.functions.invoke('ai-content-processor-v2', {
      body: {
        run_id: crypto.randomUUID(),
        test_mode: true
      }
    });
    
    console.log('✅ Function response received');
    console.log('📊 Result:', result);
    
    if (result.error) {
      console.error('❌ Function returned error:', result.error);
      console.error('📋 Error details:', {
        message: result.error.message,
        name: result.error.name,
        stack: result.error.stack
      });
    }
    
    if (result.data) {
      console.log('✅ Function returned data:', result.data);
    }
    
    return result;
    
  } catch (error: any) {
    console.error('❌ Failed to call function:', error);
    console.error('📋 Error type:', error.constructor.name);
    console.error('📋 Error message:', error.message);
    
    if (error.message?.includes('Failed to fetch')) {
      console.error('🔍 This is likely an authentication or network issue');
    }
    
    return { error };
  }
};

// Call this in browser console: testV2Function()
// Or add it to a component button for easy testing
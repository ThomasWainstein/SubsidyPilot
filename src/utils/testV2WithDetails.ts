import { supabase } from '@/integrations/supabase/client';

// Enhanced test to catch the exact failure point
export const testV2WithDetails = async () => {
  console.log('🧪 Testing ai-content-processor-v2 with detailed monitoring...');
  
  const startTime = Date.now();
  let timeoutId: NodeJS.Timeout;
  
  try {
    // Set up a timeout to detect hanging
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Function call timed out after 30 seconds'));
      }, 30000); // 30 second timeout
    });
    
    console.log('📡 Calling ai-content-processor-v2...');
    
    // Race between function call and timeout
    const functionPromise = supabase.functions.invoke('ai-content-processor-v2', {
      body: {
        run_id: crypto.randomUUID(),
        test_mode: true,
        debug: true
      }
    });
    
    const result = await Promise.race([functionPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️ Function completed in ${duration}ms`);
    console.log('✅ Result:', result);
    
    return result;
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    
    console.error(`❌ Function failed after ${duration}ms`);
    console.error('📋 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Check for specific error types
    if (error.message?.includes('timed out')) {
      console.error('🕒 Function is hanging - likely OpenAI API timeout or infinite loop');
    } else if (error.message?.includes('Failed to fetch')) {
      console.error('🌐 Network/Authentication issue');
    } else if (error.message?.includes('Function returned an error')) {
      console.error('⚡ Function runtime error - check Supabase logs');
    }
    
    return { error, duration };
  }
};

// Test with minimal payload to isolate the issue
export const testV2Minimal = async () => {
  console.log('🧪 Testing ai-content-processor-v2 with minimal payload...');
  
  try {
    const result = await supabase.functions.invoke('ai-content-processor-v2', {
      body: {
        run_id: crypto.randomUUID(),
        test_mode: true,
        debug: true,
        // Force processing of just 1 page to avoid timeouts
        limit: 1
      }
    });
    
    console.log('✅ Minimal test result:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Minimal test failed:', error);
    return { error };
  }
};
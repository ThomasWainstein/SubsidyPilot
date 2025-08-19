import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LesAidesSubsidy {
  id?: string;
  titre?: string;
  nom?: string;
  title?: string;
  description?: string;
  montant_min?: number;
  montant_max?: number;
  date_limite?: string;
  url_candidature?: string;
  url?: string;
  secteurs?: string[];
  beneficiaires?: string[];
  conditions?: string;
  zones_geo?: string[];
  [key: string]: any;
}

interface LesAidesResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: LesAidesSubsidy[];
  data?: LesAidesSubsidy[];
  [key: string]: any;
}

interface SyncProgress {
  session_id: string;
  status: 'processing' | 'completed' | 'failed';
  pages_completed: number;
  total_pages: number;
  subsidies_processed: number;
  subsidies_added: number;
  subsidies_updated: number;
  error_count: number;
  start_time: string;
  estimated_completion?: string;
  current_action: string;
  errors?: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Les-Aides.fr Enhanced Sync Started');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lesAidesApiKey = Deno.env.get('LES_AIDES_API_KEY') || '711e55108232352685cca98b49777e6b836bfb79';
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize tracking variables
    let totalAdded = 0;
    let totalUpdated = 0;
    let errorCount = 0;
    let processedCount = 0;
    const startTime = Date.now();
    const sessionId = `les-aides-sync-${startTime}`;
    const errors: any[] = [];
    
    console.log(`📋 Session ID: ${sessionId}`);
    console.log(`🔧 Environment check: { hasSupabaseUrl: ${!!supabaseUrl}, hasSupabaseKey: ${!!supabaseKey}, hasApiKey: ${!!lesAidesApiKey} }`);
    
    // Circuit breaker - stop if too many errors
    const MAX_ERROR_RATE = 0.5; // 50% error rate
    const MIN_SAMPLES = 10;
    
    const checkCircuitBreaker = () => {
      if (processedCount >= MIN_SAMPLES) {
        const errorRate = errorCount / processedCount;
        if (errorRate > MAX_ERROR_RATE) {
          console.log(`🛑 Circuit breaker triggered! Error rate: ${(errorRate * 100).toFixed(1)}%`);
          return true;
        }
      }
      return false;
    };

    // Update progress in database
    const updateProgress = async (update: Partial<SyncProgress>) => {
      try {
        const progress: SyncProgress = {
          session_id: sessionId,
          status: 'processing',
          pages_completed: 0,
          total_pages: 1,
          subsidies_processed: processedCount,
          subsidies_added: totalAdded,
          subsidies_updated: totalUpdated,
          error_count: errorCount,
          start_time: new Date(startTime).toISOString(),
          current_action: 'Initializing...',
          ...update
        };

        // Calculate ETA
        if (processedCount > 0 && progress.total_pages > 0) {
          const elapsedMs = Date.now() - startTime;
          const avgTimePerItem = elapsedMs / processedCount;
          const remainingItems = (progress.total_pages * 50) - processedCount; // Assume 50 items per page
          const estimatedRemainingMs = remainingItems * avgTimePerItem;
          progress.estimated_completion = new Date(Date.now() + estimatedRemainingMs).toISOString();
        }

        if (errors.length > 0) {
          progress.errors = errors.slice(-5); // Keep last 5 errors
        }

        await supabase
          .from('sync_progress')
          .upsert(progress, { onConflict: 'session_id' });
      } catch (progressError) {
        console.log('⚠️ Progress update failed:', progressError.message);
      }
    };

    await updateProgress({ current_action: 'Testing API connectivity...' });

    // Comprehensive API endpoint discovery
    console.log('🧪 Testing API connectivity with different endpoints...');
    const baseUrls = [
      'https://api.les-aides.fr/',
      'https://les-aides.fr/api/',
      'https://www.les-aides.fr/api/',
      'https://api.les-aides.fr/'
    ];
    
    const endpointPatterns = ['aides', 'dispositifs', 'aids', 'search', 'api/aides', 'v1/aides'];
    const authMethods = [
      { 'Authorization': `Bearer ${lesAidesApiKey}` },
      { 'X-API-Key': lesAidesApiKey },
      { 'Authorization': `Token ${lesAidesApiKey}` },
      {}
    ];
    
    let workingEndpoint = '';
    let workingAuth = {};
    let responseData: LesAidesResponse | null = null;
    let totalPages = 1;
    
    // Test combinations systematically
    testLoop: for (const baseUrl of baseUrls) {
      for (const pattern of endpointPatterns) {
        for (const auth of authMethods) {
          const testUrl = `${baseUrl}${pattern}`;
          console.log(`🔍 Testing: ${testUrl} with auth: ${JSON.stringify(auth)}`);
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
            const response = await fetch(testUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'AgriTool-Platform/1.0',
                ...auth
              },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const responseText = await response.text();
              
              try {
                const data = JSON.parse(responseText) as LesAidesResponse;
                const subsidies = data.results || data.data || (Array.isArray(data) ? data : []);
                
                if (subsidies.length > 0 || (data.count !== undefined && data.count >= 0)) {
                  console.log(`✅ Found working endpoint: ${testUrl}`);
                  console.log(`📊 Data structure: count=${data.count}, results=${subsidies.length}`);
                  
                  workingEndpoint = testUrl;
                  workingAuth = auth;
                  responseData = data;
                  
                  // Calculate total pages (assume 50 items per page if not specified)
                  if (data.count) {
                    totalPages = Math.ceil(data.count / 50);
                  }
                  
                  break testLoop;
                }
              } catch (parseError) {
                // Continue testing
              }
            }
          } catch (fetchError) {
            // Continue testing
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    // Fallback to working sync function if no endpoint found
    if (!workingEndpoint) {
      console.log('⚠️ No working API endpoint found, trying fallback to working sync function...');
      await updateProgress({ current_action: 'Falling back to working sync function...' });
      
      try {
        const fallbackResponse = await supabase.functions.invoke('sync-les-aides-fixed');
        if (fallbackResponse.data) {
          console.log('✅ Fallback sync completed');
          return new Response(JSON.stringify({
            success: true,
            session_id: sessionId,
            fallback_used: true,
            data: fallbackResponse.data
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (fallbackError) {
        console.log('❌ Fallback also failed:', fallbackError.message);
      }
    }

    if (!workingEndpoint || !responseData) {
      const finalError = 'No working API endpoint found and fallback failed';
      await updateProgress({ 
        status: 'failed', 
        current_action: finalError,
        errors: [{ message: finalError, timestamp: new Date().toISOString() }]
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: finalError,
        session_id: sessionId
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`📍 Using working endpoint: ${workingEndpoint}`);
    console.log(`🎯 Target: ${totalPages} pages × 50 subsidies = ${totalPages * 50} total subsidies`);
    
    await updateProgress({ 
      total_pages: totalPages,
      current_action: 'Processing subsidies...' 
    });

    // Process pages with pagination support
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
      if (checkCircuitBreaker()) {
        console.log(`🛑 Stopping sync at page ${currentPage} due to high error rate`);
        break;
      }
      
      console.log(`📄 Processing page ${currentPage}/${totalPages}...`);
      await updateProgress({ 
        pages_completed: currentPage - 1,
        current_action: `Processing page ${currentPage}/${totalPages}` 
      });
      
      try {
        // Construct paginated URL
        const pageUrl = workingEndpoint.includes('?') 
          ? `${workingEndpoint}&page=${currentPage}`
          : `${workingEndpoint}?page=${currentPage}`;
        
        const response = await fetch(pageUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'AgriTool-Platform/1.0',
            ...workingAuth
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = JSON.parse(await response.text()) as LesAidesResponse;
        const subsidies = data.results || data.data || (Array.isArray(data) ? data : []);
        
        if (subsidies.length === 0) {
          console.log(`📄 Page ${currentPage} has no subsidies, stopping pagination`);
          break;
        }
        
        // Process subsidies in batches for better performance
        const BATCH_SIZE = 10;
        const subsidyBatches = [];
        for (let i = 0; i < subsidies.length; i += BATCH_SIZE) {
          subsidyBatches.push(subsidies.slice(i, i + BATCH_SIZE));
        }
        
        for (const batch of subsidyBatches) {
          const batchPromises = batch.map(async (subsidy, batchIndex) => {
            const subsidyIndex = processedCount + batchIndex + 1;
            console.log(`📋 Processing subsidy ${subsidyIndex} - Page ${currentPage}`);
            
            try {
              // Validate and extract data
              const title = subsidy.titre || subsidy.nom || subsidy.title || `Aide ${subsidy.id || subsidyIndex}`;
              const externalId = subsidy.id?.toString() || `les-aides-${startTime}-${subsidyIndex}`;
              
              if (!title.trim() || title.length < 3) {
                throw new Error(`Invalid title: "${title}"`);
              }
              
              // Check for existing subsidy with better error handling
              const { data: existingSubsidy, error: existingError } = await supabase
                .from('subsidies')
                .select('id')
                .eq('external_id', externalId)
                .eq('api_source', 'les-aides-fr')
                .maybeSingle();
              
              if (existingError && existingError.code !== 'PGRST116') {
                throw existingError;
              }
              
              // Prepare subsidy data
              const subsidyData = {
                code: `les-aides-${externalId}`,
                external_id: externalId,
                api_source: 'les-aides-fr',
                title: title.trim(),
                description: subsidy.description?.trim() || 'Aide aux entreprises françaises',
                amount_min: typeof subsidy.montant_min === 'number' ? subsidy.montant_min : null,
                amount_max: typeof subsidy.montant_max === 'number' ? subsidy.montant_max : null,
                currency: 'EUR',
                deadline: subsidy.date_limite ? new Date(subsidy.date_limite).toISOString() : null,
                eligibility_criteria: {
                  secteurs: Array.isArray(subsidy.secteurs) ? subsidy.secteurs : [],
                  beneficiaires: Array.isArray(subsidy.beneficiaires) ? subsidy.beneficiaires : [],
                  conditions: subsidy.conditions || '',
                  zones_geo: Array.isArray(subsidy.zones_geo) ? subsidy.zones_geo : []
                },
                application_url: subsidy.url_candidature || subsidy.url || '',
                status: 'active',
                raw_data: subsidy,
                updated_at: new Date().toISOString()
              };
              
              if (existingSubsidy) {
                // Update existing
                const { error: updateError } = await supabase
                  .from('subsidies')
                  .update(subsidyData)
                  .eq('id', existingSubsidy.id);
                
                if (updateError) {
                  // Handle specific database errors gracefully
                  if (updateError.code === '23505') { // Unique constraint violation
                    console.log(`⚠️ Duplicate detected for ${title}, skipping`);
                    return 'duplicate';
                  }
                  throw updateError;
                }
                
                totalUpdated++;
                console.log(`🔄 Updated: ${title}`);
                return 'updated';
              } else {
                // Insert new with creation timestamp
                const insertData = { ...subsidyData, created_at: new Date().toISOString() };
                
                const { data: insertedSubsidy, error: insertError } = await supabase
                  .from('subsidies')
                  .insert(insertData)
                  .select('id')
                  .single();
                
                if (insertError) {
                  if (insertError.code === '23505') { // Unique constraint violation
                    console.log(`⚠️ Duplicate detected for ${title}, skipping`);
                    return 'duplicate';
                  }
                  throw insertError;
                }
                
                totalAdded++;
                console.log(`✅ Added: ${title}`);
                
                // Add related data in parallel
                const relationPromises = [];
                
                if (subsidy.zones_geo?.length > 0) {
                  const locationData = subsidy.zones_geo.map((zone: string) => ({
                    subsidy_id: insertedSubsidy.id,
                    country_code: 'FR',
                    region: zone.trim()
                  }));
                  
                  relationPromises.push(
                    supabase.from('subsidy_locations').insert(locationData)
                      .then(() => console.log(`📍 Added ${locationData.length} locations`))
                      .catch(err => console.log(`⚠️ Location insert error: ${err.message}`))
                  );
                }
                
                if (subsidy.secteurs?.length > 0) {
                  const categoryData = subsidy.secteurs.map((secteur: string) => ({
                    subsidy_id: insertedSubsidy.id,
                    category: secteur.trim(),
                    sector: 'business'
                  }));
                  
                  relationPromises.push(
                    supabase.from('subsidy_categories').insert(categoryData)
                      .then(() => console.log(`🏷️ Added ${categoryData.length} categories`))
                      .catch(err => console.log(`⚠️ Category insert error: ${err.message}`))
                  );
                }
                
                // Wait for all relations to complete
                if (relationPromises.length > 0) {
                  await Promise.allSettled(relationPromises);
                }
                
                return 'inserted';
              }
            } catch (subsidyError) {
              errorCount++;
              const error = {
                message: subsidyError.message,
                subsidy_title: subsidy.titre || subsidy.nom || 'Unknown',
                subsidy_id: subsidy.id,
                timestamp: new Date().toISOString()
              };
              errors.push(error);
              console.error(`❌ Subsidy error:`, error);
              return 'error';
            }
          });
          
          // Process batch and update counters
          const results = await Promise.allSettled(batchPromises);
          processedCount += batch.length;
          
          // Update progress after each batch
          await updateProgress({
            subsidies_processed: processedCount,
            current_action: `Processed ${processedCount} subsidies from page ${currentPage}`
          });
        }
        
        // Rate limiting between pages
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (pageError) {
        errorCount++;
        const error = {
          message: pageError.message,
          page: currentPage,
          timestamp: new Date().toISOString()
        };
        errors.push(error);
        console.error(`❌ Network/Fetch error for page ${currentPage}:`, error);
        
        if (pageError.message.includes('Invalid URL')) {
          console.log(`🛑 Stopping sync at page ${currentPage} due to network error`);
          break;
        }
      }
    }
    
    // Final statistics and logging
    const durationMinutes = Math.round((Date.now() - startTime) / (1000 * 60));
    const finalStatus = errorCount === 0 ? 'completed' : (processedCount > 0 ? 'completed_with_errors' : 'failed');
    
    console.log(`📊 Sync Summary: ${totalAdded} added, ${totalUpdated} updated, ${errorCount} errors in ${durationMinutes}min`);
    
    // Log to api_sync_logs
    await supabase.from('api_sync_logs').insert({
      api_source: 'les-aides-fr',
      sync_type: 'full_sync',
      status: finalStatus,
      records_processed: processedCount,
      records_added: totalAdded,
      records_updated: totalUpdated,
      errors: errors.length > 0 ? { errors: errors.slice(-10) } : null, // Keep last 10 errors
      completed_at: new Date().toISOString()
    });
    
    // Final progress update
    await updateProgress({
      status: finalStatus,
      pages_completed: totalPages,
      current_action: `Sync completed: ${totalAdded} added, ${totalUpdated} updated`,
      estimated_completion: new Date().toISOString()
    });
    
    return new Response(JSON.stringify({
      success: finalStatus !== 'failed',
      session_id: sessionId,
      summary: {
        total_added: totalAdded,
        total_updated: totalUpdated,
        error_count: errorCount,
        records_processed: processedCount,
        duration_minutes: durationMinutes,
        working_endpoint: workingEndpoint,
        api_source: 'les-aides-fr',
        status: finalStatus
      },
      message: `✅ Les-Aides.fr sync ${finalStatus}! Added ${totalAdded}, updated ${totalUpdated} subsidies${errorCount > 0 ? ` with ${errorCount} errors` : ''}.`,
      errors: errors.slice(-5) // Return last 5 errors for debugging
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Critical sync error:', error);
    
    // Update progress with failure
    try {
      const sessionId = `les-aides-sync-${Date.now()}`;
      await updateProgress({
        status: 'failed',
        current_action: `Critical error: ${error.message}`,
        errors: [{ message: error.message, timestamp: new Date().toISOString() }]
      });
    } catch (progressError) {
      // Ignore progress update errors in critical error handler
    }
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      details: error.stack?.substring(0, 1000) || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
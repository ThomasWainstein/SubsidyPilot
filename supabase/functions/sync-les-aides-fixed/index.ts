import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 Starting les-aides.fr sync (fixed version)');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { sync_type = 'incremental' } = await req.json().catch(() => ({}))

    // Log sync start
    const { data: syncLog } = await supabase
      .from('api_sync_logs')
      .insert({
        api_source: 'les-aides-fr', // Match database source name
        sync_type,
        status: 'running'
      })
      .select('id')
      .single()

    const logId = syncLog?.id

    try {
      // Enhanced debugging for comprehensive sync analysis
      console.log('🚀 === ENHANCED SYNC DEBUGGING STARTED ===');
      console.log('📊 Current time:', new Date().toISOString());
      console.log('🔧 Sync type:', sync_type);
      
      const idcKey = Deno.env.get('LES_AIDES_IDC_KEY');
      if (!idcKey) {
        throw new Error('LES_AIDES_IDC_KEY environment variable not set');
      }
      
      console.log('🔑 IDC Key available:', idcKey ? 'YES' : 'NO');
      console.log('🔑 IDC Key length:', idcKey?.length);
      
      // Test multiple search strategies to understand API limitations
      const searchStrategies = [
        {
          name: 'Default Search',
          url: 'https://api.les-aides.fr/aides/',
          params: {}
        },
        {
          name: 'Domain 790 Only',
          url: 'https://api.les-aides.fr/aides/',
          params: { domaine: '790' }
        },
        {
          name: 'Broad Agricultural Search',
          url: 'https://api.les-aides.fr/aides/',
          params: { ape: 'A' } // All agriculture
        }
      ];
      
      console.log('🔍 Testing different search strategies...');
      
      let bestStrategy = null;
      let maxSubsidies = 0;
      
      for (const strategy of searchStrategies) {
        const params = new URLSearchParams(strategy.params);
        const fullUrl = strategy.url + (params.toString() ? '?' + params.toString() : '');
        
        console.log(`\n📡 Testing: ${strategy.name}`);
        console.log('🌐 Request URL:', fullUrl);
        console.log('📋 Headers:', {
          'User-Agent': 'SubsidyPilot/1.0 (https://subsidypilot.com)',
          'Accept': 'application/json',
          'X-IDC': '[REDACTED]'
        });
        
        try {
          const testResponse = await fetch(fullUrl, {
            headers: {
              'User-Agent': 'SubsidyPilot/1.0 (https://subsidypilot.com)',
              'Accept': 'application/json',
              'X-IDC': idcKey
            }
          });
          
          console.log('📊 Response status:', testResponse.status);
          console.log('📊 Response headers:', Object.fromEntries(testResponse.headers.entries()));
          
          if (!testResponse.ok) {
            console.log('❌ API request failed:', testResponse.status, testResponse.statusText);
            continue;
          }
          
          const testData = await testResponse.json();
          console.log('📊 Response data structure:', {
            type: typeof testData,
            keys: Object.keys(testData || {}),
            isArray: Array.isArray(testData),
            length: Array.isArray(testData) ? testData.length : 'N/A'
          });
          
          let subsidyCount = 0;
          if (Array.isArray(testData)) {
            subsidyCount = testData.length;
          } else if (testData.dispositifs) {
            subsidyCount = testData.dispositifs.length;
          } else if (testData.results) {
            subsidyCount = testData.results.length;
          }
          
          console.log(`📊 ${strategy.name} returned: ${subsidyCount} subsidies`);
          
          if (testData.depassement) {
            console.log('⚠️ DEPASSEMENT FLAG DETECTED - More than 200 results available!');
          }
          
          if (testData.nb_dispositifs) {
            console.log('📊 Total nb_dispositifs reported:', testData.nb_dispositifs);
          }
          
          if (subsidyCount > maxSubsidies) {
            maxSubsidies = subsidyCount;
            bestStrategy = { strategy, data: testData, url: fullUrl };
          }
          
        } catch (error) {
          console.log('❌ Error testing strategy:', error.message);
        }
      }
      
      console.log(`\n🏆 Best strategy: ${bestStrategy?.strategy.name} with ${maxSubsidies} subsidies`);
      
      if (!bestStrategy) {
        throw new Error('All API strategies failed');
      }
      
      const apiResponse = { ok: true, status: 200 };
      const subsidies = bestStrategy.data;
      
      // Determine the actual subsidies array from the API response
      let subsidiesArray = [];
      if (Array.isArray(subsidies)) {
        subsidiesArray = subsidies;
      } else if (subsidies.dispositifs) {
        subsidiesArray = subsidies.dispositifs;
      } else if (subsidies.results) {
        subsidiesArray = subsidies.results;
      }

      console.log(`📊 Processing ${subsidiesArray.length} subsidies from best strategy`);
      console.log('📊 Sample subsidy structure:', subsidiesArray[0] ? Object.keys(subsidiesArray[0]) : 'No subsidies found');
      
      if (subsidies.depassement) {
        console.log('⚠️ CRITICAL: DEPASSEMENT FLAG = TRUE');
        console.log('⚠️ This means there are MORE than 200 subsidies available!');
        console.log('⚠️ Current sync will only get first 200 - need pagination strategy');
      }
      
      if (subsidies.nb_dispositifs) {
        console.log(`📊 API reports total subsidies available: ${subsidies.nb_dispositifs}`);
        console.log(`📊 We are importing: ${subsidiesArray.length}`);
        console.log(`📊 Potential missing: ${subsidies.nb_dispositifs - subsidiesArray.length}`);
      }

      console.log('\n🔍 === DATABASE STATE ANALYSIS ===');
      
      // Check current database state before sync
      const { data: currentSubsidies, error: dbError } = await supabase
        .from('subsidies')
        .select('id, title, source, external_id, created_at, updated_at')
        .eq('source', 'les-aides-fr')
        .order('external_id', { ascending: true });
      
      if (dbError) {
        console.log('❌ Error checking current database state:', dbError.message);
      } else {
        console.log(`📊 Current database has ${currentSubsidies.length} les-aides-fr subsidies`);
        if (currentSubsidies.length > 0) {
          const externalIds = currentSubsidies.map(s => s.external_id).filter(id => id);
          console.log('📋 Current external_id range:', {
            min: Math.min(...externalIds.map(id => parseInt(id)).filter(n => !isNaN(n))),
            max: Math.max(...externalIds.map(id => parseInt(id)).filter(n => !isNaN(n))),
            sample_ids: externalIds.slice(0, 5)
          });
          
          const latestUpdated = Math.max(...currentSubsidies.map(s => new Date(s.updated_at).getTime()));
          console.log('📅 Most recent update:', new Date(latestUpdated).toISOString());
        }
      }

      let processed = 0;
      let added = 0;
      let updated = 0;
      const errors: any[] = [];

      // Process each subsidy with detailed logging
      if (subsidiesArray.length > 0) {
        console.log('\n🔄 === STARTING SUBSIDY PROCESSING ===');
        console.log(`📊 Total subsidies to process: ${subsidiesArray.length}`);
        
        for (let i = 0; i < subsidiesArray.length; i++) {
          const subsidy = subsidiesArray[i];
          try {
            console.log(`\n📄 Processing subsidy ${i + 1}/${subsidiesArray.length}:`);
            console.log('📋 Subsidy raw data keys:', Object.keys(subsidy));
            console.log('📋 Subsidy ID:', subsidy.numero || subsidy.id || 'NO_ID');
            console.log('📋 Subsidy name:', subsidy.nom?.substring(0, 60) || subsidy.title?.substring(0, 60) || 'NO_NAME');
            
            // Create consistent ID based on the Les-Aides API structure
            const subsidyId = `les-aides-${subsidy.numero || subsidy.id || crypto.randomUUID()}`;
            
            // Check if subsidy already exists to determine add vs update
            console.log('🔍 Checking if subsidy exists in database...');
            const { data: existingSubsidy, error: selectError } = await supabase
              .from('subsidies')
              .select('id, title, updated_at')
              .eq('id', subsidyId)
              .maybeSingle();
            
            if (selectError) {
              console.log('❌ Error checking existing subsidy:', selectError.message);
              errors.push({ subsidy: subsidyId, error: `Select error: ${selectError.message}` });
              continue;
            }
            
            if (existingSubsidy) {
              console.log('🔄 FOUND existing subsidy:', existingSubsidy.title?.substring(0, 50));
              console.log('🕒 Last updated:', existingSubsidy.updated_at);
            } else {
              console.log('✨ NEW subsidy - will be added to database');
            }
            
            // Map Les-Aides API fields to our database schema
            const subsidyData = {
              id: subsidyId,
              title: subsidy.nom || subsidy.title || 'Untitled Aid',
              description: subsidy.objectif || subsidy.description || subsidy.details || '',
              amount: subsidy.montant || subsidy.amount || subsidy.budget || null,
              region: subsidy.territoire || subsidy.region || 'France',
              deadline: subsidy.date_fin || subsidy.deadline || subsidy.end_date || null,
              eligibility: subsidy.beneficiaires || (Array.isArray(subsidy.eligibility) ? subsidy.eligibility.join(', ') : subsidy.eligibility) || '',
              sector: subsidy.domaine || subsidy.sector || subsidy.category || 'General',
              funding_type: subsidy.type_aide || subsidy.funding_type || 'Grant',
              application_url: subsidy.url || subsidy.application_link || null,
              source: 'les-aides-fr',
              status: 'active',
              created_at: existingSubsidy ? undefined : new Date().toISOString(),
              updated_at: new Date().toISOString(),
              external_id: (subsidy.numero || subsidy.id)?.toString() || null
            };
            
            console.log('💾 Attempting database upsert...');
            console.log('📝 Subsidy data preview:', {
              id: subsidyData.id,
              title: subsidyData.title?.substring(0, 50),
              description: subsidyData.description?.substring(0, 50),
              external_id: subsidyData.external_id
            });

            // Upsert subsidy
            const { error: upsertError } = await supabase
              .from('subsidies')
              .upsert(subsidyData, { 
                onConflict: 'id',
                ignoreDuplicates: false 
              });

            if (upsertError) {
              console.log('❌ Database upsert failed:', upsertError.message);
              errors.push({ subsidy: subsidyId, error: upsertError.message });
            } else {
              if (existingSubsidy) {
                console.log('✅ Successfully UPDATED existing subsidy');
                updated++;
              } else {
                console.log('✅ Successfully ADDED new subsidy');
                added++;
              }
            }
            processed++;

          } catch (error) {
            console.log('❌ Error processing subsidy:', error.message);
            errors.push({ subsidy: `item-${processed}`, error: (error as Error).message });
            processed++;
          }
          
          // Log progress every 10 subsidies
          if ((i + 1) % 10 === 0) {
            console.log(`📊 Progress: ${i + 1}/${subsidiesArray.length} processed (${Math.round((i + 1) / subsidiesArray.length * 100)}%)`);
          }
        }
        
        console.log('\n🏁 === PROCESSING COMPLETE ===');
        console.log(`📊 Final counts: ${processed} processed, ${added} added, ${updated} updated, ${errors.length} errors`);
      } else {
        console.log('⚠️ No subsidies found to process');
      }

      // Update sync log
      if (logId) {
        await supabase
          .from('api_sync_logs')
          .update({
            status: errors.length > 0 ? 'completed_with_errors' : 'completed',
            completed_at: new Date().toISOString(),
            records_processed: processed,
            records_added: added,
            records_updated: updated,
            errors: errors.length > 0 ? { error_count: errors.length, errors: errors.slice(0, 5) } : null
          })
          .eq('id', logId);
      }

      console.log(`✅ Sync completed: ${processed} processed, ${added} added, ${updated} updated, ${errors.length} errors`);

      // Final comprehensive analysis
      console.log('\n📊 === COMPREHENSIVE SYNC ANALYSIS ===');
      console.log('🎯 KEY DISCOVERIES:');
      console.log(`   • Best API strategy: ${bestStrategy.strategy.name}`);
      console.log(`   • API returned: ${subsidiesArray.length} subsidies`);
      console.log(`   • Total API subsidies available: ${subsidies.nb_dispositifs || 'Unknown'}`);
      console.log(`   • Database before sync: ${currentSubsidies?.length || 'Unknown'} subsidies`);
      console.log(`   • New subsidies added: ${added}`);
      console.log(`   • Existing subsidies updated: ${updated}`);
      
      if (subsidies.depassement) {
        console.log('⚠️ CRITICAL FINDINGS:');
        console.log('   • DEPASSEMENT FLAG = TRUE (More than 200 results available)');
        console.log('   • Current sync strategy only gets first 200 subsidies');
        console.log('   • Need to implement pagination or multiple domain searches');
      }
      
      if (subsidies.nb_dispositifs && subsidies.nb_dispositifs > subsidiesArray.length) {
        console.log('🚨 MISSING SUBSIDIES DETECTED:');
        console.log(`   • API reports ${subsidies.nb_dispositifs} total available`);
        console.log(`   • We only imported ${subsidiesArray.length}`);
        console.log(`   • Missing: ${subsidies.nb_dispositifs - subsidiesArray.length} subsidies`);
      }
      
      if (added === 0 && updated > 0) {
        console.log('🔄 SYNC STATUS: Update Mode');
        console.log('   • All subsidies already existed in database');
        console.log('   • This sync updated existing records only');
        console.log('   • No new subsidies were discovered');
      } else if (added > 0) {
        console.log('✨ SYNC STATUS: Expansion Mode');
        console.log(`   • Found ${added} new subsidies not in database`);
        console.log('   • Database was expanded with new entries');
      }
      
      console.log('\n💡 RECOMMENDATIONS:');
      if (subsidies.depassement) {
        console.log('   1. Implement pagination strategy to get ALL subsidies');
        console.log('   2. Search multiple domains (not just 790)');
      }
      if (added === 0 && subsidiesArray.length <= 44) {
        console.log('   1. API search parameters may be too restrictive');
        console.log('   2. Try broader searches (remove geographic/sector filters)');
      }
      console.log('   3. Monitor for "depassement" flag in future syncs');
      console.log('='.repeat(60));

      return new Response(JSON.stringify({
        success: true,
        processed,
        added,
        updated,
        errors,
        sync_log_id: logId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('❌ Sync failed:', error);
      
      // Update sync log with error
      if (logId) {
        await supabase
          .from('api_sync_logs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            errors: { error: (error as Error).message }
          })
          .eq('id', logId);
      }

      return new Response(JSON.stringify({
        success: false,
        error: (error as Error).message,
        sync_log_id: logId
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
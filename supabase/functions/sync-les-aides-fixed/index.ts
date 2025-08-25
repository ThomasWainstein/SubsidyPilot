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
      // 🎯 COMPREHENSIVE MULTI-DOMAIN SEARCH based on API documentation
      console.log('🚀 === ENHANCED SYNC STARTED (Using API Documentation) ===');
      console.log('📊 Current time:', new Date().toISOString());
      console.log('🔧 Sync type:', sync_type);
      
      // Use documented IDC key
      const idcKey = '711e55108232352685cca98b49777e6b836bfb79';
      console.log('🔑 Using documented IDC key from API documentation');
      
      // Based on API docs: search multiple domains for comprehensive coverage
      const priorityDomains = [
        { id: 790, name: 'Création Reprise' },
        { id: 793, name: 'Cession Transmission' }, 
        { id: 798, name: 'Développement commercial' },
        { id: 799, name: 'Innovation' },
        { id: 801, name: 'Investissement' },
        { id: 802, name: 'Formation' },
        { id: 803, name: 'Environnement' }
      ];
      
      // APE codes for broad business categories (per API documentation)
      const apeCategories = [
        'A', // Agriculture, sylviculture et pêche
        'C', // Industrie manufacturière  
        'G', // Commerce; réparation d'automobiles
        'J', // Information et communication
        'M', // Activités spécialisées, scientifiques et techniques
        'N', // Activités de services administratifs et de soutien
        'K', // Activités financières et d'assurance
        'F', // Construction
        'I'  // Hébergement et restauration
      ];

      let allSubsidies: any[] = [];
      let totalApiCalls = 0;
      let totalDepassements = 0;
      
      console.log(`🔍 Starting comprehensive search across ${priorityDomains.length} domains and ${apeCategories.length} APE categories`);
      
      // Search each domain + APE combination
      for (const domain of priorityDomains) {
        for (const ape of apeCategories) {
          console.log(`\n📡 Searching Domain ${domain.id} (${domain.name}) + APE ${ape}`);
          
          const searchParams = new URLSearchParams({
            domaine: domain.id.toString(),
            ape: ape,
          });
          
          const requestUrl = `https://api.les-aides.fr/aides/?${searchParams}`;
          console.log('🌐 URL:', requestUrl);
          
          const headers = {
            'User-Agent': 'SubsidyPilot/1.0 (https://subsidypilot.com)',
            'Accept': 'application/json',
            'X-IDC': idcKey,
          };
          
          try {
            totalApiCalls++;
            const response = await fetch(requestUrl, { headers });
            
            console.log('📊 Status:', response.status);
            
            if (response.ok) {
              const apiData = await response.json();
              
              console.log('✅ Success:', {
                dispositifs: apiData.dispositifs?.length || 0,
                depassement: apiData.depassement,
                nb_dispositifs: apiData.nb_dispositifs,
                idr: apiData.idr
              });
              
              if (apiData.dispositifs && Array.isArray(apiData.dispositifs)) {
                // Add domain/ape context to each subsidy for tracking
                const subsidiesWithContext = apiData.dispositifs.map((dispositif: any) => ({
                  ...dispositif,
                  _source_domain: domain.name,
                  _source_ape: ape,
                  _source_domain_id: domain.id
                }));
                
                allSubsidies.push(...subsidiesWithContext);
                
                // Track depassement flags - critical for understanding data limits
                if (apiData.depassement) {
                  totalDepassements++;
                  console.log('⚠️ DEPASSEMENT=true: More than 200 results available for this search!');
                  console.log(`   • Domain: ${domain.name}, APE: ${ape}`);
                  console.log(`   • Total available: ${apiData.nb_dispositifs || 'Unknown'}`);
                  console.log(`   • Retrieved: ${apiData.dispositifs.length}`);
                }
              }
              
              // Respect rate limiting (720 calls/day per API documentation)
              await new Promise(resolve => setTimeout(resolve, 800));
              
            } else {
              const errorText = await response.text();
              console.log('❌ API Error:', response.status, errorText);
            }
            
          } catch (error) {
            console.log('❌ Request failed:', error);
          }
        }
        
        // Longer pause between domains to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log(`\n📈 COMPREHENSIVE SEARCH SUMMARY:`);
      console.log(`Total API calls made: ${totalApiCalls}`);
      console.log(`Total subsidies collected: ${allSubsidies.length}`);
      console.log(`Depassement flags encountered: ${totalDepassements}`);
      console.log(`Unique subsidies: ${new Set(allSubsidies.map(s => s.numero)).size}`);
      
      if (totalDepassements > 0) {
        console.log(`🚨 CRITICAL: ${totalDepassements} searches hit the 200-result limit!`);
        console.log(`    This indicates MANY MORE subsidies are available than we're importing.`);
      }
      
      if (allSubsidies.length === 0) {
        throw new Error('No subsidies found across all domains and APE categories');
      }
      
      // Remove duplicates based on numero (dispositif ID from API)
      const uniqueSubsidies = allSubsidies.filter((subsidy, index, array) => 
        array.findIndex(s => s.numero === subsidy.numero) === index
      );
      
      console.log(`📊 After deduplication: ${uniqueSubsidies.length} unique subsidies`);
      
      // Create mock response structure for existing code compatibility
      const bestStrategy = {
        strategy: { name: `Multi-domain search (${priorityDomains.length} domains)` },
        data: {
          dispositifs: uniqueSubsidies,
          depassement: totalDepassements > 0,
          nb_dispositifs: allSubsidies.length, // Conservative estimate
        },
        url: 'Multiple domain searches'
      };
      
      let maxSubsidies = uniqueSubsidies.length;
      
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
            
            // Generate proper UUID for database, use external_id to track Les-Aides numero
            const externalId = (subsidy.numero || subsidy.id)?.toString() || null;
            
            // Check if subsidy already exists using external_id and source
            console.log('🔍 Checking if subsidy exists using external_id:', externalId);
            const { data: existingSubsidy, error: selectError } = await supabase
              .from('subsidies')
              .select('id, title, updated_at, external_id')
              .eq('external_id', externalId)
              .eq('source', 'les-aides-fr')
              .maybeSingle();
            
            if (selectError) {
              console.log('❌ Error checking existing subsidy:', selectError.message);
              errors.push({ subsidy: `external_id:${externalId}`, error: `Select error: ${selectError.message}` });
              continue;
            }
            
            // Use existing UUID or generate new one
            const subsidyId = existingSubsidy?.id || crypto.randomUUID();
            
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
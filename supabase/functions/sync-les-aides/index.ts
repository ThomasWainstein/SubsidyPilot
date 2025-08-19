import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LesAidesResponse {
  data: Array<{
    id: string;
    titre: string;
    description: string;
    montant_min?: number;
    montant_max?: number;
    date_limite?: string;
    url_candidature: string;
    criteres_eligibilite: any;
    localisation: {
      pays?: string;
      region?: string;
      ville?: string;
      code_postal?: string;
    };
    secteur_activite: string[];
    type_aide: string[];
    beneficiaires: string[];
    organisme_porteur: string;
    date_creation: string;
    date_maj: string;
  }>;
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Starting Les-Aides.fr API sync with REAL credentials...')

    // API credentials
    const API_KEY = '711e55108232352685cca98b49777e6b836bfb79'
    const API_BASE_URL = 'https://api.les-aides.fr'

    // Create sync log
    const { data: syncLog, error: syncLogError } = await supabase
      .from('api_sync_logs')
      .insert({
        api_source: 'les-aides-fr',
        sync_type: 'incremental',
        status: 'running'
      })
      .select()
      .single()

    if (syncLogError) {
      throw new Error(`Failed to create sync log: ${syncLogError.message}`)
    }

    console.log(`Created sync log: ${syncLog.id}`)

    let totalProcessed = 0
    let totalAdded = 0
    let totalUpdated = 0
    let page = 1
    const maxPages = 10
    const errors: any[] = []

    while (page <= maxPages) {
      console.log(`📡 Fetching page ${page} from Les-Aides.fr...`)

      try {
        const apiUrl = `${API_BASE_URL}/v1/aids?page=${page}&limit=50&secteur=agriculture`
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Accept': 'application/json',
            'User-Agent': 'AgriTool-Platform/1.0',
            'X-API-Key': API_KEY
          }
        })

        console.log(`📊 Les-Aides.fr Response: ${response.status} ${response.statusText}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ API Error: ${response.status} - ${errorText}`)
          
          if (response.status === 401) {
            throw new Error('Les-Aides.fr API authentication failed. Check API key.')
          }
          
          if (response.status === 429) {
            console.log('⚠️ Rate limit hit, waiting 30 seconds...')
            await new Promise(resolve => setTimeout(resolve, 30000))
            continue
          }
          
          errors.push({ page, error: `${response.status} ${response.statusText}` })
          break
        }

        const data: LesAidesResponse = await response.json()
        console.log(`✅ Received ${data.data?.length || 0} aids (Total: ${data.meta?.total || 'unknown'})`)

        if (!data.data || data.data.length === 0) {
          console.log('🏁 No more results from Les-Aides.fr')
          break
        }

        // Process each aid from Les-Aides.fr
        for (const aid of data.data) {
          try {
            console.log(`🔄 Processing: ${aid.titre}`)

            const subsidyData = {
              code: `les-aides-${aid.id}`,
              external_id: `les-aides-${aid.id}`,
              api_source: 'les-aides-fr',
              title: { fr: aid.titre || 'Aide aux entreprises' },
              description: { fr: aid.description || '' },
              funding_type: aid.type_aide?.join(', ') || 'grant',
              status: 'open',
              deadline: aid.date_limite ? new Date(aid.date_limite).toISOString() : null,
              eligibility_criteria: {
                fr: JSON.stringify({
                  secteur_activite: aid.secteur_activite || [],
                  type_aide: aid.type_aide || [],
                  beneficiaires: aid.beneficiaires || [],
                  criteres: aid.criteres_eligibilite || {}
                })
              },
              source_url: aid.url_candidature || '',
              agency: aid.organisme_porteur || 'Les-Aides.fr',
              tags: aid.secteur_activite || [],
              region: aid.localisation?.region ? [aid.localisation.region] : null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

            // Check if aid already exists
            const { data: existingAid } = await supabase
              .from('subsidies')
              .select('id')
              .eq('code', subsidyData.code)
              .maybeSingle()

            if (existingAid) {
              const { error: updateError } = await supabase
                .from('subsidies')
                .update(subsidyData)
                .eq('code', subsidyData.code)

              if (updateError) {
                console.error(`❌ Update error for ${aid.id}:`, updateError)
                errors.push({ aid: aid.id, error: updateError.message })
                continue
              }
              totalUpdated++
            } else {
              const { error: insertError } = await supabase
                .from('subsidies')
                .insert(subsidyData)

              if (insertError) {
                console.error(`❌ Insert error for ${aid.id}:`, insertError)
                errors.push({ aid: aid.id, error: insertError.message })
                continue
              }
              totalAdded++
            }

            totalProcessed++

            if (totalProcessed % 25 === 0) {
              console.log(`📊 Progress: ${totalProcessed} processed`)
            }

          } catch (error) {
            console.error(`💥 Error processing aid ${aid.id}:`, error)
            errors.push({ aid: aid.id, error: error.message })
          }
        }

        if (data.meta && page >= data.meta.total_pages) {
          console.log('🏁 Reached last page')
          break
        }

        page++

        if (page <= maxPages) {
          console.log('⏱️ Waiting 2 seconds to respect rate limits...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (pageError) {
        console.error(`💥 Page ${page} failed:`, pageError)
        errors.push({ page, error: pageError.message })
        
        if (pageError.message.includes('429')) {
          console.log('⏱️ Rate limited, waiting 60 seconds...')
          await new Promise(resolve => setTimeout(resolve, 60000))
          continue
        }
        
        break
      }
    }

    // Update sync log with final results
    const finalStatus = errors.length > 0 ? 'completed_with_errors' : 'completed'
    
    await supabase
      .from('api_sync_logs')
      .update({
        status: finalStatus,
        records_processed: totalProcessed,
        records_added: totalAdded,
        records_updated: totalUpdated,
        errors: errors.length > 0 ? errors : null,
        completed_at: new Date().toISOString()
      })
      .eq('id', syncLog.id)

    const result = {
      success: true,
      source: 'les-aides-fr',
      processed: totalProcessed,
      added: totalAdded,
      updated: totalUpdated,
      pages_processed: page - 1,
      errors: errors.length > 0 ? errors : null,
      sync_log_id: syncLog.id
    }

    console.log('🎉 Les-Aides.fr sync completed:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Les-Aides.fr sync failed:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        source: 'les-aides-fr'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
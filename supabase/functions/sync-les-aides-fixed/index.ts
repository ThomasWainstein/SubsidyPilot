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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Starting FIXED Les-Aides.fr sync...')

    // Create sync log
    const { data: syncLog, error: syncLogError } = await supabase
      .from('api_sync_logs')
      .insert({
        api_source: 'les-aides-fr-fixed',
        sync_type: 'incremental',
        status: 'running'
      })
      .select()
      .single()

    if (syncLogError) {
      throw new Error(`Failed to create sync log: ${syncLogError.message}`)
    }

    let totalProcessed = 0
    let totalAdded = 0
    let totalUpdated = 0
    const errors: any[] = []

    // Make API call to Les-Aides.fr for real data
    console.log('🌐 Fetching real data from Les-Aides.fr API...');
    
    const apiUrl = 'https://api.les-aides.fr/v1/aids?secteur=agriculture,elevage,agroalimentaire&page_size=10';
    const apiKey = Deno.env.get('LES_AIDES_API_KEY') || '711e55108232352685cca98b49777e6b836bfb79';
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'AgriTool-Platform/1.0 (+https://agritooldemo.site)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const apiData = await response.json();
    const realSubsidies = apiData.results || [];
    
    console.log(`📋 Retrieved ${realSubsidies.length} real subsidies from API`);
    
    if (realSubsidies.length === 0) {
      throw new Error('No subsidies returned from API');
    }
    
    const frenchAgriculturalAids = realSubsidies.map((apiSubsidy: any) => ({
        id: apiSubsidy.id || Math.random().toString(),
        titre: apiSubsidy.titre || apiSubsidy.nom || apiSubsidy.title || 'French Agricultural Subsidy',
        description: apiSubsidy.description || 'French agricultural subsidy from Les-Aides.fr',
        montant_min: apiSubsidy.montant_min || null,
        montant_max: apiSubsidy.montant_max || null,
        date_limite: apiSubsidy.date_limite || null,
        url_candidature: apiSubsidy.url_candidature || apiSubsidy.url || '',
        secteur_activite: apiSubsidy.secteurs || ['Agriculture'],
        type_aide: ['Subvention'],
        beneficiaires: apiSubsidy.beneficiaires || ['Exploitant agricole'],
        organisme_porteur: apiSubsidy.organisme_porteur || 'Les-Aides.fr',
        localisation: { pays: 'France', region: apiSubsidy.zones_geo?.[0] || 'France' },
        criteres_eligibilite: apiSubsidy.conditions || 'Voir conditions sur le site officiel'
      }
    ))

    console.log(`📋 Processing ${frenchAgriculturalAids.length} French agricultural aids...`)

    for (const aid of frenchAgriculturalAids) {
      try {
        console.log(`🔄 Processing: ${aid.titre}`)

        const subsidyData = {
          code: `les-aides-${aid.id}`,
          title: { fr: aid.titre },
          description: { fr: aid.description },
          funding_type: aid.type_aide?.join(', ') || 'grant',
          status: 'open',
          deadline: aid.date_limite ? new Date(aid.date_limite).toISOString() : null,
          eligibility_criteria: {
            fr: JSON.stringify({
              secteur_activite: aid.secteur_activite,
              type_aide: aid.type_aide,
              beneficiaires: aid.beneficiaires,
              criteres: aid.criteres_eligibilite,
              organisme_porteur: aid.organisme_porteur
            })
          },
          source_url: aid.url_candidature,
          agency: aid.organisme_porteur,
          tags: aid.secteur_activite || [],
          region: aid.localisation?.region ? [aid.localisation.region] : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        // Check if exists
        const { data: existing } = await supabase
          .from('subsidies')
          .select('id')
          .eq('code', subsidyData.code)
          .maybeSingle()

        let subsidyId: string

        if (existing) {
          const { data: updated, error: updateError } = await supabase
            .from('subsidies')
            .update(subsidyData)
            .eq('code', subsidyData.code)
            .select('id')
            .single()

          if (updateError) {
            console.error(`❌ Update error:`, updateError)
            errors.push({ aid: aid.id, error: updateError.message })
            continue
          }

          subsidyId = updated.id
          totalUpdated++
          console.log(`♻️ Updated: ${aid.titre}`)
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from('subsidies')
            .insert(subsidyData)
            .select('id')
            .single()

          if (insertError) {
            console.error(`❌ Insert error:`, insertError)
            errors.push({ aid: aid.id, error: insertError.message })
            continue
          }

          subsidyId = inserted.id
          totalAdded++
          console.log(`✨ Added: ${aid.titre}`)
        }

        // Handle location with proper constraint handling
        if (subsidyId && aid.localisation) {
          try {
            await supabase
              .from('subsidy_locations')
              .delete()
              .eq('subsidy_id', subsidyId)

            const { error: locationError } = await supabase
              .from('subsidy_locations')
              .insert({
                subsidy_id: subsidyId,
                country_code: 'FR',
                region: aid.localisation.region || 'France',
                city: aid.localisation.ville || null
              })

            if (locationError) {
              console.error(`⚠️ Location error:`, locationError)
              errors.push({ aid: aid.id, error: `Location: ${locationError.message}` })
            }
          } catch (locationError) {
            console.error(`⚠️ Location handling failed:`, locationError)
          }
        }

        // Handle categories with proper constraint handling
        if (subsidyId && aid.secteur_activite && aid.secteur_activite.length > 0) {
          try {
            await supabase
              .from('subsidy_categories')
              .delete()
              .eq('subsidy_id', subsidyId)

            for (const secteur of aid.secteur_activite) {
              const { error: categoryError } = await supabase
                .from('subsidy_categories')
                .insert({
                  subsidy_id: subsidyId,
                  category: secteur,
                  sector: aid.type_aide?.join(', ') || null
                })

              if (categoryError) {
                console.error(`⚠️ Category error:`, categoryError)
                errors.push({ aid: aid.id, error: `Category: ${categoryError.message}` })
              }
            }
          } catch (categoryError) {
            console.error(`⚠️ Category handling failed:`, categoryError)
          }
        }

        totalProcessed++

      } catch (error) {
        console.error(`💥 Error processing ${aid.id}:`, error)
        errors.push({ aid: aid.id, error: error.message })
      }
    }

    // Update sync log
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
      source: 'les-aides-fr-fixed',
      processed: totalProcessed,
      added: totalAdded,
      updated: totalUpdated,
      errors_count: errors.length,
      sync_log_id: syncLog.id,
      message: `✅ Successfully synced ${totalProcessed} French agricultural aids`
    }

    console.log('🎉 Fixed Les-Aides sync completed:', result)

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Sync failed:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        source: 'les-aides-fr-fixed'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
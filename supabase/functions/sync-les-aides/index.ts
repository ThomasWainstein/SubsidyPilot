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
    localisation: any;
    categories?: string[];
    secteur?: string;
  }>;
  meta: {
    total: number;
    page: number;
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

    console.log('Starting Les-Aides.fr sync...')

    // Start sync log
    const { data: syncLog, error: syncLogError } = await supabase
      .from('api_sync_logs')
      .insert({
        api_source: 'les-aides',
        sync_type: 'incremental',
        status: 'running'
      })
      .select()
      .single()

    if (syncLogError) {
      console.error('Failed to create sync log:', syncLogError)
      throw new Error(`Failed to create sync log: ${syncLogError.message}`)
    }

    console.log('Created sync log:', syncLog.id)

    // Use real Les-Aides.fr API
    const lesAidesApiKey = Deno.env.get('LES_AIDES_API_KEY')
    if (!lesAidesApiKey) {
      throw new Error('LES_AIDES_API_KEY not configured')
    }
    
    let totalProcessed = 0
    let totalAdded = 0
    let totalUpdated = 0
    const errors: any[] = []
    let page = 1

    console.log('Starting API requests to les-aides.fr...')

    while (page <= 5) { // Limit to 5 pages for initial sync
      try {
        console.log(`Fetching page ${page}...`)
        
        const response = await fetch(`https://api.les-aides.fr/v1/aids?page=${page}&limit=50&api_key=${lesAidesApiKey}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AgriTool-API-Client/1.0'
          }
        })

        if (!response.ok) {
          console.error(`API error: ${response.status} ${response.statusText}`)
          if (response.status === 401) {
            throw new Error('Invalid API key - please check LES_AIDES_API_KEY')
          }
          throw new Error(`Les-Aides API error: ${response.statusText}`)
        }

        const data: LesAidesResponse = await response.json()
        console.log(`Received ${data.data?.length || 0} records from page ${page}`)
        
        if (!data.data || data.data.length === 0) {
          console.log('No more data available, stopping pagination')
          break
        }
        for (const aid of data.data) {
          try {
            // Transform Les-Aides data to our schema
            const subsidyData = {
              code: aid.id, // Use the aid ID as the code
              external_id: `les-aides-${aid.id}`,
              api_source: 'les-aides',
              title: aid.titre,
              description: aid.description,
              amount_min: aid.montant_min,
              amount_max: aid.montant_max,
              deadline: aid.date_limite ? aid.date_limite : null,
              eligibility_criteria: aid.criteres_eligibilite,
              application_url: aid.url_candidature,
              status: 'active',
              raw_data: aid,
              updated_at: new Date().toISOString()
            }

            console.log('Processing subsidy:', subsidyData.title)

            // Check if subsidy already exists
            const { data: existingSubsidy } = await supabase
              .from('subsidies')
              .select('id')
              .eq('external_id', subsidyData.external_id)
              .maybeSingle()

            let subsidyId: string

            if (existingSubsidy) {
              // Update existing subsidy
              const { data: updatedSubsidy, error: updateError } = await supabase
                .from('subsidies')
                .update(subsidyData)
                .eq('external_id', subsidyData.external_id)
                .select('id')
                .single()

              if (updateError) {
                console.error('Update error:', updateError)
                errors.push({ subsidy: aid.id, error: updateError.message })
                continue
              }

              subsidyId = updatedSubsidy.id
              totalUpdated++
            } else {
              // Insert new subsidy
              const { data: newSubsidy, error: insertError } = await supabase
                .from('subsidies')
                .insert(subsidyData)
                .select('id')
                .single()

              if (insertError) {
                console.error('Insert error:', insertError)
                errors.push({ subsidy: aid.id, error: insertError.message })
                continue
              }

              subsidyId = newSubsidy.id
              totalAdded++
            }

            // Handle location data if it exists
            if (aid.localisation && subsidyId) {
              const locationData = {
                subsidy_id: subsidyId,
                country_code: aid.localisation.pays || 'FR',
                region: aid.localisation.region,
                city: aid.localisation.ville
              }

              const { error: locationError } = await supabase
                .from('subsidy_locations')
                .upsert(locationData, { 
                  onConflict: 'subsidy_id'
                })

              if (locationError) {
                console.error('Location error:', locationError)
                errors.push({ subsidy: aid.id, error: `Location: ${locationError.message}` })
              }
            }

            // Handle categories if they exist
            if (aid.categories && subsidyId) {
              // Delete existing categories for this subsidy
              await supabase
                .from('subsidy_categories')
                .delete()
                .eq('subsidy_id', subsidyId)

              // Insert new categories
              for (const category of aid.categories) {
                const categoryData = {
                  subsidy_id: subsidyId,
                  category: category,
                  sector: aid.secteur || 'agriculture'
                }

                const { error: categoryError } = await supabase
                  .from('subsidy_categories')
                  .insert(categoryData)

                if (categoryError) {
                  console.error('Category error:', categoryError)
                  errors.push({ subsidy: aid.id, error: `Category: ${categoryError.message}` })
                }
              }
            }

            totalProcessed++
            console.log(`Processed ${totalProcessed} subsidies from page ${page}`)

          } catch (error) {
            console.error('Error processing subsidy:', aid.id, error)
            errors.push({ subsidy: aid.id, error: error.message })
          }
        }

        page++
        
        // Add delay between requests to respect rate limits
        if (page <= 5) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (error) {
        console.error(`Error fetching page ${page}:`, error)
        errors.push({ page: page, error: error.message })
        break // Stop on API errors
      }
    }

    // Update sync log with results
    const { error: updateSyncError } = await supabase
      .from('api_sync_logs')
      .update({
        status: errors.length > 0 ? 'completed_with_errors' : 'completed',
        records_processed: totalProcessed,
        records_added: totalAdded,
        records_updated: totalUpdated,
        errors: errors.length > 0 ? errors : null,
        completed_at: new Date().toISOString()
      })
      .eq('id', syncLog.id)

    if (updateSyncError) {
      console.error('Failed to update sync log:', updateSyncError)
    }

    console.log('Les-Aides sync completed:', {
      processed: totalProcessed,
      added: totalAdded,
      updated: totalUpdated,
      errors: errors.length
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: totalProcessed,
        added: totalAdded,
        updated: totalUpdated,
        errors: errors.length > 0 ? errors : null,
        sync_log_id: syncLog.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
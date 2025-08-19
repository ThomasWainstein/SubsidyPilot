import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AidesTerrResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    id: number;
    name: string;
    description: string;
    perimeter: string;
    mobilization_steps: string[];
    origin_url: string;
    application_url: string;
    targeted_audiences: string[];
    aid_types: string[];
    destinations: string[];
    start_date: string | null;
    submission_deadline: string | null;
    eligibility: string;
    contact: string;
    recurrence: string;
    date_created: string;
    date_updated: string;
    status: string;
    programs: Array<{
      id: number;
      name: string;
      short_title: string;
    }>;
    financers: Array<{
      id: number;
      name: string;
      text: string;
    }>;
    instructors: Array<{
      id: number;
      name: string;
      text: string;
    }>;
  }>;
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

    console.log('Starting Aides-Territoires sync...')

    // Start sync log
    const { data: syncLog, error: syncLogError } = await supabase
      .from('api_sync_logs')
      .insert({
        api_source: 'aides-territoires',
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

    let page = 1
    let totalProcessed = 0
    let totalAdded = 0
    let totalUpdated = 0
    const errors: any[] = []
    let hasMore = true

    while (hasMore && page <= 5) { // Limit to 5 pages for initial sync
      try {
        console.log(`Fetching page ${page} from Aides-Territoires...`)
        
        // Real API call to Aides-Territoires
        const response = await fetch(`https://aides-territoires.beta.gouv.fr/api/aids/?page=${page}&page_size=50&status=published`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AgriTool-API-Client/1.0'
          }
        })

        if (!response.ok) {
          console.error(`Aides-Territoires API error: ${response.status} ${response.statusText}`)
          throw new Error(`Aides-Territoires API error: ${response.status} ${response.statusText}`)
        }

        const data: AidesTerrResponse = await response.json()
        console.log(`Received ${data.results?.length || 0} records from page ${page}`)
        
        if (!data.results || data.results.length === 0) {
          console.log('No more data available, stopping pagination')
          hasMore = false
          break
        }

        for (const aid of data.results) {
          try {
            // Transform to our schema
            const subsidyData = {
              code: `aides-territoires-${aid.id}`,
              external_id: `aides-territoires-${aid.id}`,
              api_source: 'aides-territoires',
              title: aid.name,
              description: aid.description,
              amount_min: null, // Aides-Territoires doesn't have specific amounts
              amount_max: null,
              deadline: aid.submission_deadline ? aid.submission_deadline : null,
              eligibility_criteria: {
                targeted_audiences: aid.targeted_audiences,
                aid_types: aid.aid_types,
                destinations: aid.destinations,
                eligibility_text: aid.eligibility,
                mobilization_steps: aid.mobilization_steps
              },
              application_url: aid.application_url || aid.origin_url,
              status: aid.status === 'published' ? 'active' : 'inactive',
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

            // Handle location data
            if (subsidyId) {
              const locationData = {
                subsidy_id: subsidyId,
                country_code: 'FR',
                region: aid.perimeter,
                city: null
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

            // Handle categories
            if (aid.aid_types && aid.aid_types.length > 0 && subsidyId) {
              // Delete existing categories for this subsidy
              await supabase
                .from('subsidy_categories')
                .delete()
                .eq('subsidy_id', subsidyId)

              // Insert new categories
              for (const aidType of aid.aid_types) {
                const categoryData = {
                  subsidy_id: subsidyId,
                  category: aidType,
                  sector: aid.destinations.join(', ')
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

        // Check if there's a next page
        hasMore = data.next !== null
        page++

        // Add delay between requests to respect rate limits
        if (hasMore && page <= 5) {
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

    console.log('Aides-Territoires sync completed:', {
      processed: totalProcessed,
      added: totalAdded,
      updated: totalUpdated,
      errors: errors.length
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        source: 'aides-territoires',
        processed: totalProcessed,
        added: totalAdded,
        updated: totalUpdated,
        errors: errors.length > 0 ? errors : null,
        pages_processed: page - 1,
        sync_log_id: syncLog.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Aides-Territoires sync error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        source: 'aides-territoires',
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
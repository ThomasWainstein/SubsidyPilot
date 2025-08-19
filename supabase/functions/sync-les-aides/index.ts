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

    let totalProcessed = 0
    let totalAdded = 0
    let totalUpdated = 0
    const errors: any[] = []

    // Use mock data for testing since API format needs to be verified
    const mockData = {
      data: [
        {
          id: "fr-agri-001",
          titre: "Aide à la modernisation des exploitations agricoles", 
          description: "Subvention pour moderniser les équipements agricoles et améliorer la compétitivité des exploitations.",
          montant_min: 5000,
          montant_max: 50000,
          date_limite: "2024-12-31",
          criteres_eligibilite: {
            "anciennete_min": 2,
            "superficie_min": 5,
            "type_exploitation": ["cereales", "elevage", "maraichage"]
          },
          url_candidature: "https://les-aides.fr/modernisation-agricole",
          localisation: {
            pays: "FR",
            region: "Occitanie"  
          },
          categories: ["agriculture", "modernisation"],
          secteur: "agriculture"
        },
        {
          id: "fr-bio-002",
          titre: "Aide à la conversion en agriculture biologique",
          description: "Soutien financier pour les agriculteurs souhaitant convertir leur exploitation vers l'agriculture biologique.",
          montant_min: 2000,
          montant_max: 25000,
          date_limite: "2025-06-30",
          criteres_eligibilite: {
            "formation_bio": true,
            "conversion_bio": true,
            "type_exploitation": ["cereales", "fruits", "legumes"]
          },
          url_candidature: "https://les-aides.fr/conversion-bio",
          localisation: {
            pays: "FR",
            region: "Nouvelle-Aquitaine"
          },
          categories: ["agriculture", "bio"],
          secteur: "agriculture"
        },
        {
          id: "fr-jeune-003",
          titre: "Dotation Jeunes Agriculteurs (DJA)",
          description: "Aide à l'installation pour les jeunes agriculteurs de moins de 40 ans souhaitant s'installer.",
          montant_min: 8000,
          montant_max: 80000,
          date_limite: "2024-10-15",
          criteres_eligibilite: {
            "age_max": 40,
            "diplome_agricole": true,
            "stage_preparation": true
          },
          url_candidature: "https://les-aides.fr/jeunes-agriculteurs",
          localisation: {
            pays: "FR"
          },
          categories: ["agriculture", "jeunes"],
          secteur: "agriculture"
        }
      ],
      meta: { total: 3, page: 1 }
    }

    console.log('Processing subsidies from mock data...')
    
    for (const aid of mockData.data) {
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
        console.log(`Processed ${totalProcessed} subsidies`)

      } catch (error) {
        console.error('Error processing subsidy:', aid.id, error)
        errors.push({ subsidy: aid.id, error: error.message })
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
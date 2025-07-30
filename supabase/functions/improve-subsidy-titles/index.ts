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
    // CRITICAL: Environment variable names are case-sensitive and MUST use standardized uppercase format
    const supabaseClient = createClient(
      Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting subsidy title improvement...')

    // Get all subsidies with placeholder or missing titles
    const { data: subsidies, error: fetchError } = await supabaseClient
      .from('subsidies_structured')
      .select('*')
      .or('title.eq.Subsidy Page,title.is.null,title.eq.')

    if (fetchError) {
      throw fetchError
    }

    console.log(`Found ${subsidies?.length || 0} subsidies with placeholder titles`)

    let updatedCount = 0
    
    if (subsidies && subsidies.length > 0) {
      for (const subsidy of subsidies) {
        // Create a better title based on available data
        let newTitle = 'Agricultural Funding Program'
        
        // Handle sector as array
        const sectors = Array.isArray(subsidy.sector) ? subsidy.sector : (subsidy.sector ? [subsidy.sector] : []);
        const sectorText = sectors.slice(0, 2).join(', ');
        
        if (subsidy.agency && sectorText) {
          newTitle = `${subsidy.agency} - ${sectorText} Grant`
        } else if (subsidy.agency) {
          newTitle = `${subsidy.agency} Agricultural Grant`
        } else if (sectorText) {
          newTitle = `${sectorText} Funding Program`
        } else if (subsidy.program) {
          newTitle = subsidy.program
        } else {
          // Generate from description or use agency name if available
          if (subsidy.description && subsidy.description.length > 0) {
            const descWords = subsidy.description.substring(0, 50).split(' ').slice(0, 6).join(' ')
            newTitle = `${descWords}... Program`
          } else {
            newTitle = `Agricultural Program #${subsidy.id.substring(0, 8)}`
          }
        }

        // Add funding type if available and meaningful
        if (subsidy.funding_type && 
            !newTitle.toLowerCase().includes(subsidy.funding_type.toLowerCase()) &&
            subsidy.funding_type !== 'unknown') {
          newTitle += ` (${subsidy.funding_type})`
        }
        
        // Ensure title doesn't exceed reasonable length
        if (newTitle.length > 80) {
          newTitle = newTitle.substring(0, 77) + '...'
        }

        // Update the title
        const { error: updateError } = await supabaseClient
          .from('subsidies_structured')
          .update({ title: newTitle })
          .eq('id', subsidy.id)

        if (updateError) {
          console.error(`Error updating subsidy ${subsidy.id}:`, updateError)
        } else {
          updatedCount++
          console.log(`Updated title for subsidy ${subsidy.id}: "${newTitle}"`)
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${updatedCount} subsidy titles`,
        updatedCount,
        totalFound: subsidies?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in improve-subsidy-titles function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
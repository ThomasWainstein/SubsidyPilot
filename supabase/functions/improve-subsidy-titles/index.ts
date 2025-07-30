import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 improve-subsidy-titles function called');
  
  if (req.method === 'OPTIONS') {
    console.log('📋 Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Creating Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Fetching subsidies with poor quality titles...');
    // Fetch subsidies with poor quality titles - expand the filter
    const { data: subsidies, error } = await supabaseClient
      .from('subsidies_structured')
      .select('id, title, agency, sector, description, url')
      .or('title.eq.Subsidy Page,title.ilike.%guide usager%,title.ilike.%rubrique%,title.ilike.%Agricultural Grant%,title.ilike.%Support Program%')
      .limit(50);

    console.log(`📊 Found ${subsidies?.length || 0} subsidies to improve`);

    if (error) throw new Error(`Failed to fetch subsidies: ${error.message}`);

    const improvements = [];
    console.log('🔄 Processing subsidies for title improvements...');
    
    for (const subsidy of subsidies || []) {
      console.log(`🔍 Processing subsidy ${subsidy.id}: "${subsidy.title}"`);
      console.log(`   Agency: ${subsidy.agency || 'None'}`);
      console.log(`   Sectors: ${subsidy.sector?.length ? subsidy.sector.join(', ') : 'None'}`);
      
      let improvedTitle = null;
      
      // Try to extract title from source URL if available
      if (subsidy.url) {
        console.log(`   📡 Fetching content from: ${subsidy.url}`);
        try {
          const response = await fetch(subsidy.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          if (response.ok) {
            const html = await response.text();
            
            // Extract title from various sources
            let extractedTitle = null;
            
            // Try to find title in h1 tags
            const h1Match = html.match(/<h1[^>]*>([^<]+)</i);
            if (h1Match) {
              extractedTitle = h1Match[1].trim();
            }
            
            // Try title tag as fallback
            if (!extractedTitle) {
              const titleMatch = html.match(/<title[^>]*>([^<]+)</i);
              if (titleMatch) {
                extractedTitle = titleMatch[1].trim()
                  .replace(/\s*-\s*FranceAgriMer.*$/i, '') // Remove site suffix
                  .replace(/\s*\|\s*.*$/i, ''); // Remove pipe separators
              }
            }
            
            // Try specific FranceAgriMer patterns
            if (!extractedTitle) {
              const patterns = [
                /<div[^>]*class="[^"]*titre[^"]*"[^>]*>([^<]+)/i,
                /<h2[^>]*>([^<]+(?:PAC|programme|opérationnel|aide)[^<]*)</i,
                /<h3[^>]*>([^<]+(?:PAC|programme|opérationnel|aide)[^<]*)</i
              ];
              
              for (const pattern of patterns) {
                const match = html.match(pattern);
                if (match) {
                  extractedTitle = match[1].trim();
                  break;
                }
              }
            }
            
            if (extractedTitle && extractedTitle.length > 10 && extractedTitle.length < 200) {
              // Clean up the extracted title
              improvedTitle = extractedTitle
                .replace(/\s+/g, ' ')
                .replace(/^[^\w]+|[^\w]+$/g, '') // Remove leading/trailing non-word chars
                .trim();
              
              console.log(`   🎯 Extracted title from URL: "${improvedTitle}"`);
            }
          }
        } catch (urlError) {
          console.log(`   ⚠️ Failed to fetch URL: ${urlError.message}`);
        }
      }
      
      // Fallback to description-based extraction if URL extraction failed
      if (!improvedTitle && subsidy.description) {
        const desc = subsidy.description;
        
        // Look for patterns that suggest a title
        const titlePatterns = [
          /([A-Z][^.!?]*(?:PAC|programme|opérationnel|aide|subvention)[^.!?]*)/i,
          /([A-Z][^.!?]*(?:fruits|légumes|viticulture|agricole)[^.!?]*)/i,
          /^([A-Z][^.!?]{20,100})/
        ];
        
        for (const pattern of titlePatterns) {
          const match = desc.match(pattern);
          if (match) {
            improvedTitle = match[1].trim();
            console.log(`   📝 Extracted title from description: "${improvedTitle}"`);
            break;
          }
        }
      }
      
      // Final fallback - generate based on agency and sector
      if (!improvedTitle) {
        let cleanAgency = null;
        if (subsidy.agency) {
          const agencyLower = subsidy.agency.toLowerCase();
          if (agencyLower.includes('franceagrimer')) {
            cleanAgency = 'FranceAgriMer';
          } else {
            const words = subsidy.agency.split(' ');
            cleanAgency = words.length > 3 ? words.slice(0, 3).join(' ') : subsidy.agency;
          }
        }
        
        if (cleanAgency && subsidy.sector?.length) {
          const sectors = subsidy.sector.slice(0, 2).join(', ');
          improvedTitle = `Aide ${cleanAgency} - ${sectors}`;
        } else if (cleanAgency) {
          improvedTitle = `Aide ${cleanAgency}`;
        }
      }
      
      if (improvedTitle) {
        console.log(`   ✅ Generated title: "${improvedTitle}"`);
        console.log(`   💾 Updating subsidy ${subsidy.id} with new title...`);
        const { error: updateError } = await supabaseClient
          .from('subsidies_structured')
          .update({ title: improvedTitle })
          .eq('id', subsidy.id);
          
        if (updateError) {
          console.error(`   ❌ Failed to update subsidy ${subsidy.id}: ${updateError.message}`);
        } else {
          console.log(`   ✅ Successfully updated subsidy ${subsidy.id}`);
          improvements.push({
            id: subsidy.id,
            oldTitle: subsidy.title,
            newTitle: improvedTitle
          });
        }
      }
    }
    
    console.log(`🎉 Completed processing. Improved ${improvements.length} subsidies`);

    return new Response(JSON.stringify({
      success: true,
      improved: improvements.length,
      improvements
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
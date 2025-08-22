import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

interface RomanianSubsidy {
  title: string;
  description: string;
  agency: string;
  eligibility_criteria: string;
  funding_amount?: string;
  deadline?: string;
  application_url?: string;
  sector?: string;
  region?: string;
  type: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action = 'process', run_id, openai_api_key } = await req.json();
    
    if (!openai_api_key) {
      throw new Error('OpenAI API key required for Romanian subsidy processing');
    }

    console.log('🇷🇴 Processing Romanian subsidies...', { action, run_id });

    if (action === 'process') {
      // Get unprocessed Romanian pages
      const { data: romanianPages, error: fetchError } = await supabase
        .from('raw_scraped_pages')
        .select('*')
        .in('source_site', ['apia-romania', 'afir-romania'])
        .is('processed_at', null)
        .limit(20);

      if (fetchError) {
        throw new Error(`Failed to fetch Romanian pages: ${fetchError.message}`);
      }

      console.log(`📄 Found ${romanianPages?.length || 0} unprocessed Romanian pages`);

      const processedSubsidies: any[] = [];
      
      for (const page of romanianPages || []) {
        try {
          console.log(`🔄 Processing page: ${page.source_url}`);
          
          // Extract subsidy data using OpenAI
          const subsidyData = await extractRomanianSubsidyData(
            page.text_markdown || page.raw_text,
            page.source_url,
            page.source_site,
            openai_api_key
          );

          if (subsidyData) {
            // Insert into subsidies table
            const subsidyRecord = {
              code: generateRomanianSubsidyCode(subsidyData, page.source_url),
              title: { ro: subsidyData.title },
              description: { ro: subsidyData.description },
              eligibility_criteria: { ro: subsidyData.eligibility_criteria },
              agency: subsidyData.agency,
              funding_type: subsidyData.type,
              source_url: page.source_url,
              status: 'open' as const,
              country: 'RO',
              language: 'ro',
              tags: subsidyData.sector ? [subsidyData.sector] : [],
              region: subsidyData.region ? [subsidyData.region] : null,
              deadline: subsidyData.deadline ? new Date(subsidyData.deadline) : null,
              additional_data: {
                funding_amount: subsidyData.funding_amount,
                application_url: subsidyData.application_url,
                scraped_from: page.source_site,
                processed_at: new Date().toISOString()
              }
            };

            const { data: insertedSubsidy, error: insertError } = await supabase
              .from('subsidies')
              .insert(subsidyRecord)
              .select('id')
              .single();

            if (insertError) {
              if (insertError.code === '23505') {
                console.log(`⚠️ Duplicate subsidy skipped: ${subsidyData.title}`);
              } else {
                console.error(`❌ Failed to insert subsidy: ${insertError.message}`);
              }
            } else {
              processedSubsidies.push({
                id: insertedSubsidy.id,
                title: subsidyData.title,
                agency: subsidyData.agency,
                source_url: page.source_url
              });
              console.log(`✅ Inserted subsidy: ${subsidyData.title}`);
            }
          }

          // Mark page as processed
          await supabase
            .from('raw_scraped_pages')
            .update({ processed_at: new Date().toISOString() })
            .eq('id', page.id);

        } catch (pageError) {
          console.error(`❌ Error processing page ${page.source_url}:`, pageError);
          
          // Mark page as processed with error
          await supabase
            .from('raw_scraped_pages')
            .update({ 
              processed_at: new Date().toISOString(),
              processing_error: (pageError as Error).message
            })
            .eq('id', page.id);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return new Response(JSON.stringify({
        success: true,
        processed_pages: romanianPages?.length || 0,
        created_subsidies: processedSubsidies.length,
        subsidies: processedSubsidies,
        run_id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Romanian processor error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function extractRomanianSubsidyData(
  textContent: string,
  sourceUrl: string,
  sourceSite: string,
  apiKey: string
): Promise<RomanianSubsidy | null> {
  const isAPIASource = sourceSite === 'apia-romania';
  const agency = isAPIASource ? 'APIA' : 'AFIR';
  
  const systemPrompt = `You are an expert at extracting Romanian agricultural and rural development subsidy information from ${agency} (${
    isAPIASource 
      ? 'Agenția de Plăți și Intervenție pentru Agricultură' 
      : 'Agenția pentru Finanțarea Investițiilor Rurale'
  }).

Extract structured information about subsidies, grants, and funding opportunities from Romanian government documents.

Romanian Key Terms to Recognize:
- Măsuri de sprijin, scheme de plată, subvenții, granturi
- Fonduri europene, dezvoltare rurală, modernizare
- Fermieri, agricultori, crescători de animale
- Tinerii fermieri, întreprinderi agricole
- Investiții, echipamente, infrastructură
- PNDR, PNRR, PAC, FEADR

Return ONLY a JSON object with this exact structure:
{
  "title": "Name of the subsidy/program in Romanian",
  "description": "Detailed description in Romanian (2-3 sentences)",
  "agency": "${agency}",
  "eligibility_criteria": "Who can apply and requirements in Romanian",
  "funding_amount": "Amount or range if specified (e.g., 'până la 100.000 EUR')",
  "deadline": "Application deadline if mentioned (YYYY-MM-DD format)",
  "application_url": "Direct application URL if found",
  "sector": "Agricultural sector (e.g., 'agricultură', 'zootehnie', 'silvicultură')",
  "region": "Specific region if mentioned, otherwise 'România'",
  "type": "Type of funding (e.g., 'grant', 'loan', 'subsidy')"
}

Return null if no clear subsidy information is found.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract subsidy information from this Romanian text:\n\n${textContent.slice(0, 4000)}` }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const extractedText = result.choices[0].message.content.trim();
    
    // Parse JSON response
    if (extractedText === 'null' || extractedText.toLowerCase().includes('null')) {
      return null;
    }

    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const subsidyData = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!subsidyData.title || !subsidyData.description || !subsidyData.agency) {
      return null;
    }

    return subsidyData;

  } catch (error) {
    console.error('❌ OpenAI extraction error:', error);
    return null;
  }
}

function generateRomanianSubsidyCode(subsidy: RomanianSubsidy, sourceUrl: string): string {
  const agency = subsidy.agency.toLowerCase();
  const titleSlug = subsidy.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
  
  const urlHash = sourceUrl.split('/').pop()?.replace(/[^\w]/g, '') || 'unknown';
  
  return `${agency}-${titleSlug}-${urlHash}`.slice(0, 100);
}
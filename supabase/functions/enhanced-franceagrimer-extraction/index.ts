import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENHANCED_FRANCEAGRIMER_PROMPT = `You are an expert data extraction specialist for FranceAgriMer subsidy pages. Extract ALL available information with maximum detail and accuracy.

CRITICAL REQUIREMENTS:
1. Extract EVERY piece of information from the page - leave nothing out
2. Preserve original French text exactly (no translation)
3. Capture ALL downloadable documents with complete metadata
4. Extract ALL structured sections (Présentation, Pour qui?, Quand?, Comment?)
5. Include ALL contact information, deadlines, and application details
6. Preserve formatting and structure

Output this EXACT JSON structure:

{
  "title": "Exact page title",
  "agency": "FranceAgriMer",
  "program": "Program name",
  "url": "Source URL",
  
  "presentation": {
    "content": "Complete presentation text verbatim",
    "objectives": ["List of all objectives mentioned"],
    "target_outcomes": "Target outcomes if mentioned"
  },
  
  "eligibility": {
    "content": "Complete eligibility text verbatim with ALL criteria",
    "beneficiary_types": ["All types of eligible beneficiaries"],
    "requirements": ["All specific requirements"],
    "exclusions": ["Any exclusions mentioned"]
  },
  
  "timeline": {
    "application_period_start": "YYYY-MM-DD if found",
    "application_period_end": "YYYY-MM-DD if found", 
    "deadline": "YYYY-MM-DD if found",
    "period_text": "Original text about timing",
    "status": "open/closed/upcoming based on dates"
  },
  
  "application_process": {
    "content": "Complete application process text",
    "steps": [
      {
        "step_number": 1,
        "title": "Step title",
        "description": "Complete step description",
        "platform": "Submission platform if mentioned"
      }
    ],
    "submission_method": "How to submit",
    "required_platform": "Platform name if specified"
  },
  
  "funding": {
    "amount_description": "Complete funding amount text",
    "amounts": ["All amounts mentioned"],
    "cofinancing_rate": "Rate if mentioned", 
    "payment_terms": "Payment terms if specified",
    "funding_source": "Source of funding"
  },
  
  "documents": [
    {
      "title": "EXACT document title as shown",
      "filename": "actual-filename.pdf",
      "url": "full download URL",
      "type": "pdf|docx|xlsx|etc",
      "size": "file size if shown (e.g. 84.55 KB)",
      "date": "date if shown",
      "required": true/false,
      "description": "purpose if mentioned"
    }
  ],
  
  "contact": {
    "emails": ["all email addresses"],
    "phones": ["all phone numbers"],
    "addresses": ["physical addresses"],
    "online_portals": ["web portals or platforms"],
    "support_description": "support information"
  },
  
  "geographic_scope": {
    "regions": ["all applicable regions"],
    "departments": ["specific departments if mentioned"],
    "national": true/false,
    "scope_description": "geographic scope description"
  },
  
  "sectoral_scope": {
    "sectors": ["all applicable sectors"],
    "activities": ["specific activities"],
    "crop_types": ["specific crops if mentioned"],
    "scope_description": "sectoral scope description"
  },
  
  "legal_framework": {
    "legal_basis": "legal basis if mentioned",
    "regulations": ["relevant regulations"],
    "decisions": ["decision numbers"],
    "compliance_requirements": ["compliance requirements"]
  },
  
  "evaluation": {
    "criteria": ["evaluation criteria"],
    "selection_process": "selection process description",
    "priority_criteria": ["priority criteria if mentioned"]
  },
  
  "additional_info": {
    "alerts": ["any alerts or notices"],
    "updates": ["recent updates"],
    "related_programs": ["related programs mentioned"],
    "faq_items": [
      {
        "question": "question text",
        "answer": "answer text"
      }
    ]
  },
  
  "metadata": {
    "extraction_date": "current date",
    "language": "fr",
    "page_type": "franceagrimer_subsidy",
    "sections_found": ["list of all sections extracted"],
    "documents_found": 0,
    "completeness_score": 95
  }
}

EXTRACTION RULES:
- Use ONLY information actually present on the page
- Keep ALL original French text exactly as written
- If a section is not found, set to null or empty array
- Extract complete text blocks, don't summarize
- For documents, use EXACT titles as shown on page
- Convert relative URLs to absolute URLs
- Preserve all formatting in content fields
- Extract ALL dates and convert to YYYY-MM-DD format
- Include ALL contact information found anywhere on page`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, forceReprocess = false } = await req.json();
    
    if (!url) {
      throw new Error('URL is required');
    }

    console.log(`🔍 Enhanced FranceAgriMer extraction for: ${url}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if already processed with enhanced extraction
    if (!forceReprocess) {
      const { data: existing } = await supabase
        .from('subsidies_structured')
        .select('id, audit')
        .eq('url', url)
        .maybeSingle();

      if (existing?.audit?.extraction_method === 'enhanced_franceagrimer_v1') {
        console.log('✅ Already processed with enhanced extraction');
        return new Response(JSON.stringify({
          success: true,
          message: 'Already processed with enhanced extraction',
          subsidy_id: existing.id
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch page content with tab navigation
    console.log('📄 Fetching complete page content with all tabs...');
    const allTabContent = await fetchAllTabContent(url);
    console.log(`📄 Complete content: ${allTabContent.length} characters`);

    // Extract with OpenAI using all tab content
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('🤖 Calling OpenAI for enhanced extraction...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: ENHANCED_FRANCEAGRIMER_PROMPT
          },
          {
            role: 'user',
            content: `Extract complete information from this FranceAgriMer subsidy page:

URL: ${url}

Complete HTML Content (All Tabs):
${allTabContent.substring(0, 50000)}`
          }
        ],
        temperature: 0.05,
        max_tokens: 4000
      })
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('❌ OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIResult = await openAIResponse.json();
    const extractedContent = openAIResult.choices[0].message.content;

    console.log('🔍 Raw extraction result length:', extractedContent.length);

    // Parse extracted data
    let extractedData;
    try {
      const cleanContent = extractedContent.replace(/```json\n?|\n?```/g, '').trim();
      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('❌ Failed to parse extraction result:', parseError);
      console.error('Raw content:', extractedContent.substring(0, 1000));
      throw new Error('Failed to parse extraction result as JSON');
    }

    console.log('✅ Successfully parsed extraction data');
    console.log(`📊 Sections found: ${extractedData.metadata?.sections_found?.length || 0}`);
    console.log(`📋 Documents found: ${extractedData.documents?.length || 0}`);

    // Map to database format with comprehensive data
    const mappedData = {
      url: url,
      title: extractedData.title,
      agency: extractedData.agency || 'FranceAgriMer',
      program: extractedData.program,
      
      // Rich content fields using markdown
      description: extractedData.presentation?.content || '',
      description_markdown: extractedData.presentation?.content || null,
      
      eligibility: extractedData.eligibility?.content || '',
      eligibility_markdown: extractedData.eligibility?.content || null,
      
      application_method: extractedData.application_process?.content || '',
      application_method_markdown: extractedData.application_process?.content || null,
      
      // Documents with complete metadata  
      documents: extractedData.documents || [],
      
      // Timing information
      deadline: extractedData.timeline?.deadline || extractedData.timeline?.application_period_end,
      application_window_start: extractedData.timeline?.application_period_start,
      application_window_end: extractedData.timeline?.application_period_end,
      deadlines: extractedData.timeline?.period_text || '',
      deadlines_markdown: extractedData.timeline?.period_text || null,
      
      // Geographic and sectoral scope
      region: extractedData.geographic_scope?.regions || [],
      sector: extractedData.sectoral_scope?.sectors || [],
      
      // Funding information
      amount: extractedData.funding?.amounts || [],
      amounts: extractedData.funding?.amount_description || '',
      co_financing_rate: extractedData.funding?.cofinancing_rate ? parseFloat(extractedData.funding.cofinancing_rate) : null,
      funding_source: extractedData.funding?.funding_source,
      funding_markdown: extractedData.funding?.amount_description || null,
      
      // Application process
      questionnaire_steps: extractedData.application_process?.steps || [],
      application_requirements: extractedData.application_process?.steps?.map((step: any) => ({
        step: step.step_number,
        title: step.title,
        description: step.description
      })) || [],
      
      // Evaluation
      evaluation_criteria: extractedData.evaluation?.criteria?.join('; ') || '',
      
      // Legal framework
      legal_entity_type: extractedData.eligibility?.beneficiary_types || [],
      compliance_requirements: extractedData.legal_framework?.compliance_requirements?.join('; ') || '',
      
      // Contact information stored in audit
      audit: {
        extraction_method: 'enhanced_franceagrimer_v1',
        extraction_timestamp: new Date().toISOString(),
        enhanced_data: {
          presentation: extractedData.presentation,
          timeline: extractedData.timeline,
          contact: extractedData.contact,
          legal_framework: extractedData.legal_framework,
          evaluation: extractedData.evaluation,
          additional_info: extractedData.additional_info
        },
        sections_extracted: extractedData.metadata?.sections_found || [],
        documents_found: extractedData.documents?.length || 0,
        completeness_score: extractedData.metadata?.completeness_score || 90
      },
      
      // System fields
      missing_fields: [],
      audit_notes: `Enhanced FranceAgriMer extraction - ${extractedData.metadata?.sections_found?.length || 0} sections`,
      updated_at: new Date().toISOString()
    };

    // Upsert to database
    console.log('💾 Storing enhanced extraction...');
    const { data: subsidyData, error: upsertError } = await supabase
      .from('subsidies_structured')
      .upsert(mappedData)
      .select('id')
      .single();

    if (upsertError) {
      console.error('❌ Database upsert error:', upsertError);
      throw new Error(`Failed to store enhanced extraction: ${upsertError.message}`);
    }

    console.log(`✅ Enhanced extraction completed and stored: ${subsidyData.id}`);

    return new Response(JSON.stringify({
      success: true,
      subsidy_id: subsidyData.id,
      message: 'Enhanced FranceAgriMer extraction completed',
      stats: {
        sections_found: extractedData.metadata?.sections_found?.length || 0,
        documents_found: extractedData.documents?.length || 0,
        completeness_score: extractedData.metadata?.completeness_score || 90
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Enhanced extraction error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchAllTabContent(url: string): Promise<string> {
  console.log('🔄 Fetching content from all tabs...');
  
  // Fetch main page first
  const mainResponse = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!mainResponse.ok) {
    throw new Error(`Failed to fetch main page: ${mainResponse.status}`);
  }

  let allContent = await mainResponse.text();
  console.log(`📄 Main page content: ${allContent.length} characters`);

  // For FranceAgriMer pages, the tab content might be loaded via AJAX
  // Let's try to find and extract all tab content sections
  
  // Extract any script-embedded data that might contain all tab content
  const scriptMatches = allContent.match(/<script[^>]*>(.*?)<\/script>/gs);
  if (scriptMatches) {
    scriptMatches.forEach(script => {
      allContent += '\n\n--- SCRIPT CONTENT ---\n' + script;
    });
  }

  // Try to fetch tab-specific content if we can identify the pattern
  // Look for tab URLs or AJAX endpoints in the HTML
  const tabUrlPatterns = [
    /data-url=["']([^"']*pour-qui[^"']*)["']/gi,
    /data-url=["']([^"']*quand[^"']*)["']/gi,
    /data-url=["']([^"']*comment[^"']*)["']/gi,
    /href=["']([^"']*\?tab=pour-qui[^"']*)["']/gi,
    /href=["']([^"']*\?tab=quand[^"']*)["']/gi,
    /href=["']([^"']*\?tab=comment[^"']*)["']/gi
  ];

  const baseUrl = new URL(url);
  const foundTabUrls: string[] = [];

  // Check for tab-specific URLs
  tabUrlPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(allContent)) !== null) {
      const tabUrl = match[1].startsWith('http') ? match[1] : new URL(match[1], baseUrl).href;
      if (!foundTabUrls.includes(tabUrl)) {
        foundTabUrls.push(tabUrl);
      }
    }
  });

  // If no specific tab URLs found, try constructing them
  if (foundTabUrls.length === 0) {
    const possibleTabUrls = [
      `${url}?tab=pour-qui`,
      `${url}?tab=quand`, 
      `${url}?tab=comment`,
      `${url}#pour-qui`,
      `${url}#quand`,
      `${url}#comment`
    ];
    foundTabUrls.push(...possibleTabUrls);
  }

  console.log(`🔍 Found ${foundTabUrls.length} potential tab URLs`);

  // Fetch content from each tab
  for (const tabUrl of foundTabUrls.slice(0, 6)) { // Limit to avoid too many requests
    try {
      console.log(`📱 Fetching tab content: ${tabUrl}`);
      const tabResponse = await fetch(tabUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Referer': url
        }
      });

      if (tabResponse.ok) {
        const tabContent = await tabResponse.text();
        if (tabContent.length > 1000 && !allContent.includes(tabContent.substring(100, 500))) {
          console.log(`✅ Added unique tab content: ${tabContent.length} characters`);
          allContent += `\n\n--- TAB CONTENT: ${tabUrl} ---\n${tabContent}`;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch tab content from ${tabUrl}:`, error);
    }
  }

  // Also try to extract any hidden/collapsed content from the main page
  // Look for content in hidden divs that might contain tab data
  const hiddenContentPatterns = [
    /<div[^>]*class="[^"]*tab-content[^"]*"[^>]*>(.*?)<\/div>/gs,
    /<div[^>]*id="[^"]*pour-qui[^"]*"[^>]*>(.*?)<\/div>/gs,
    /<div[^>]*id="[^"]*quand[^"]*"[^>]*>(.*?)<\/div>/gs,
    /<div[^>]*id="[^"]*comment[^"]*"[^>]*>(.*?)<\/div>/gs,
    /<section[^>]*class="[^"]*hidden[^"]*"[^>]*>(.*?)<\/section>/gs
  ];

  hiddenContentPatterns.forEach(pattern => {
    const matches = allContent.match(pattern);
    if (matches) {
      matches.forEach(match => {
        allContent += '\n\n--- HIDDEN CONTENT ---\n' + match;
      });
    }
  });

  console.log(`📊 Final content size: ${allContent.length} characters`);
  return allContent;
}
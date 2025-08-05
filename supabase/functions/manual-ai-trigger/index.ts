import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const config = {
      supabase_url: Deno.env.get('SUPABASE_URL'),
      supabase_service_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    };

    console.log('🧪 Manual AI Trigger Environment Check:', {
      has_supabase_url: !!config.supabase_url,
      has_service_key: !!config.supabase_service_key
    });

    if (!config.supabase_url || !config.supabase_service_key) {
      throw new Error('Missing required Supabase configuration');
    }

    const supabase = createClient(config.supabase_url, config.supabase_service_key);
    
    const { source = 'all', force_reprocess = false } = await req.json();

    console.log('🧪 Manual AI Processing Trigger:', { source, force_reprocess });

    // Get pages to process
    let query = supabase
      .from('raw_scraped_pages')
      .select('*');
    
    if (force_reprocess) {
      query = query.eq('status', 'scraped');
    } else {
      query = query.eq('status', 'scraped');
    }
    
    if (source !== 'all') {
      query = query.eq('source_site', source);
    }

    const { data: pages, error } = await query;
    if (error) throw error;

    console.log(`📊 Found ${pages?.length || 0} pages to process`);

    if (!pages || pages.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No pages found to process',
        pages_found: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Trigger AI content processor
    const aiResult = await supabase.functions.invoke('ai-content-processor', {
      body: {
        source: source,
        session_id: `manual-trigger-${Date.now()}`,
        page_ids: pages.map(p => p.id),
        quality_threshold: 0.6
      }
    });

    console.log('🤖 AI Processor Result:', aiResult);

    return new Response(JSON.stringify({
      success: true,
      message: 'AI processing triggered successfully',
      pages_sent_for_processing: pages.length,
      ai_processor_response: aiResult.data,
      page_urls: pages.map(p => p.source_url)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Manual AI Trigger error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
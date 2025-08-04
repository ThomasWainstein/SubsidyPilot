import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();
    const record = payload.record;
    if (!record) {
      throw new Error('No record provided');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fieldCount = record.extracted_data && typeof record.extracted_data === 'object'
      ? Object.keys(record.extracted_data).length
      : 0;

    const { error } = await supabase
      .from('farm_document_extraction_status')
      .upsert({
        document_id: record.document_id,
        status: record.status,
        field_count: fieldCount,
        last_updated: new Date().toISOString(),
        error: record.error_message || null,
      });

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to update farm document status:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

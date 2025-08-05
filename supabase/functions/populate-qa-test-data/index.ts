import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    console.log('Populating test QA data...');

    // Test data based on real FranceAgriMer patterns
    const testQAResults = [
      {
        source_url: 'https://www.franceagrimer.fr/Accompagner/Planification-ecologique/Planification-ecologique-agriculteurs/Renovation-des-vergers-campagnes-2024-2025-et-2025-2026',
        qa_pass: false,
        errors: ['Missing eligibility criteria structure', 'No application documents detected', 'Deadline information flattened'],
        warnings: ['Complex nested content detected', 'Dynamic JavaScript content'],
        missing_fields: ['application_deadline', 'eligible_beneficiaries', 'required_documents', 'contact_information'],
        structure_loss: ['eligibility_criteria', 'application_process', 'evaluation_criteria'],
        documents_loss: ['application_form.pdf', 'guidelines.pdf', 'technical_specifications.pdf'],
        admin_required: true,
        completeness_score: 45.5,
        structural_integrity_score: 62.0,
        review_data: {
          extraction_type: 'deep_structural',
          original_html: 'Complex nested div structure with dynamic content',
          extracted_json: 'Partial structure with missing sections',
          ui_screenshot: 'screenshot_renovation_vergers.png'
        }
      },
      {
        source_url: 'https://www.franceagrimer.fr/aide-stockage-fruits-legumes',
        qa_pass: true,
        errors: [],
        warnings: ['Minor formatting inconsistencies in date formats'],
        missing_fields: [],
        structure_loss: [],
        documents_loss: [],
        admin_required: false,
        completeness_score: 96.8,
        structural_integrity_score: 95.2,
        review_data: {
          extraction_type: 'deep_structural',
          original_html: 'Well-structured HTML with clear sections',
          extracted_json: 'Complete extraction with all required fields',
          ui_screenshot: 'screenshot_stockage_success.png'
        }
      },
      {
        source_url: 'https://www.franceagrimer.fr/aide-investissement-transformation',
        qa_pass: false,
        errors: ['Document extraction failed', 'List structure collapsed to paragraph', 'Missing annex metadata'],
        warnings: ['JavaScript-loaded content detected', 'PDF links require authentication'],
        missing_fields: ['contact_information', 'evaluation_criteria', 'application_forms'],
        structure_loss: ['investment_categories', 'eligibility_conditions', 'funding_brackets'],
        documents_loss: ['technical_specifications.pdf', 'application_guide.pdf'],
        admin_required: true,
        completeness_score: 72.3,
        structural_integrity_score: 68.9,
        review_data: {
          extraction_type: 'deep_structural',
          original_html: 'Dynamic content with async loading',
          extracted_json: 'Incomplete due to authentication barriers',
          ui_screenshot: 'screenshot_investment_partial.png'
        }
      },
      {
        source_url: 'https://www.franceagrimer.fr/aide-promotion-produits-bio',
        qa_pass: false,
        errors: ['Critical structure loss in eligibility section', 'All annexes missing'],
        warnings: ['Suspected dynamic content loading', 'Complex table structures'],
        missing_fields: ['deadline_dates', 'funding_amounts', 'application_procedure'],
        structure_loss: ['eligibility_table', 'funding_categories', 'application_steps'],
        documents_loss: ['application_form_bio.pdf', 'eligibility_guide.pdf', 'examples.pdf'],
        admin_required: true,
        completeness_score: 38.7,
        structural_integrity_score: 42.1,
        review_data: {
          extraction_type: 'deep_structural',
          original_html: 'Complex table-based layout',
          extracted_json: 'Major data loss in critical sections',
          ui_screenshot: 'screenshot_bio_failed.png'
        },
        admin_status: 'pending'
      },
      {
        source_url: 'https://www.franceagrimer.fr/aide-equipement-agricole-durable',
        qa_pass: true,
        errors: [],
        warnings: [],
        missing_fields: [],
        structure_loss: [],
        documents_loss: [],
        admin_required: false,
        completeness_score: 98.5,
        structural_integrity_score: 97.8,
        review_data: {
          extraction_type: 'deep_structural',
          original_html: 'Clean, semantic HTML structure',
          extracted_json: 'Perfect extraction with all elements preserved',
          ui_screenshot: 'screenshot_equipment_perfect.png'
        }
      }
    ];

    // Insert test data
    const { data, error } = await supabase
      .from('extraction_qa_results')
      .insert(testQAResults)
      .select();

    if (error) {
      console.error('Error inserting test data:', error);
      throw error;
    }

    console.log(`Successfully inserted ${data.length} QA test records`);

    // Also insert some admin review actions
    const adminReviewUpdates = [
      {
        id: data[0]?.id,
        admin_status: 'reviewed',
        admin_notes: 'Extraction needs improvement. Missing critical eligibility criteria and documents. Flagged for re-extraction with enhanced document detection.',
        reviewed_by: 'admin@agritool.com',
        reviewed_at: new Date().toISOString()
      },
      {
        id: data[3]?.id, 
        admin_status: 'rejected',
        admin_notes: 'Unacceptable data loss. Critical sections missing. Extraction pipeline needs debugging before retry.',
        reviewed_by: 'admin@agritool.com',
        reviewed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      }
    ];

    for (const update of adminReviewUpdates.filter(u => u.id)) {
      await supabase
        .from('extraction_qa_results')
        .update({
          admin_status: update.admin_status,
          admin_notes: update.admin_notes,
          reviewed_by: update.reviewed_by,
          reviewed_at: update.reviewed_at
        })
        .eq('id', update.id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Populated ${data.length} QA test records with admin reviews`,
      records: data 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in populate-qa-test-data:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
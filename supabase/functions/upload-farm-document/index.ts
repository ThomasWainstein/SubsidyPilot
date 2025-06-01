
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid document categories that match the database enum
const VALID_DOCUMENT_CATEGORIES = ['legal', 'financial', 'environmental', 'technical', 'certification', 'other'];

const normalizeDocumentCategory = (category: unknown): string => {
  if (!category || typeof category !== 'string') {
    console.warn('Invalid category type, defaulting to "other":', typeof category, category);
    return 'other';
  }
  
  const trimmed = category.trim().toLowerCase();
  
  if (!trimmed || trimmed === '') {
    console.warn('Empty category string, defaulting to "other"');
    return 'other';
  }
  
  if (VALID_DOCUMENT_CATEGORIES.includes(trimmed)) {
    return trimmed;
  }
  
  console.warn('Unknown category, defaulting to "other":', category);
  return 'other';
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const farmId = formData.get('farmId') as string;
    const rawCategory = formData.get('category') as string;

    console.log('Upload request received:', { 
      fileName: file?.name, 
      farmId, 
      rawCategory,
      fileSize: file?.size 
    });

    if (!file || !farmId || !rawCategory) {
      console.error('Missing required fields:', { file: !!file, farmId, rawCategory });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize and validate category with fallback
    const category = normalizeDocumentCategory(rawCategory);
    console.log('Category normalized from', rawCategory, 'to', category);

    // Verify user owns the farm
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id')
      .eq('id', farmId)
      .eq('user_id', user.id)
      .single();

    if (farmError || !farm) {
      console.error('Farm access denied:', farmError);
      return new Response(JSON.stringify({ error: 'Farm not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `${farmId}/${category}/${fileName}`;

    console.log('Uploading file:', { filePath, size: file.size, type: file.type });

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('farm-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('farm-documents')
      .getPublicUrl(filePath);

    // Store document record in database with validated category
    const { data: documentData, error: dbError } = await supabase
      .from('farm_documents')
      .insert({
        farm_id: farmId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        category: category, // Using normalized category
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('farm-documents').remove([filePath]);
      return new Response(JSON.stringify({ error: 'Failed to save document record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Document uploaded successfully:', { 
      id: documentData.id, 
      category: documentData.category,
      fileName: documentData.file_name 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      document: documentData,
      message: 'Document uploaded successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in upload-farm-document function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

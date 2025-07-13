
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Valid document categories that match the database enum
const VALID_DOCUMENT_CATEGORIES = ['legal', 'financial', 'environmental', 'technical', 'certification', 'other'];

// Valid MIME types for security - includes Excel files
const VALID_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp'
];

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

const sanitizeFileName = (fileName: string): string => {
  // Remove potentially dangerous characters and limit length
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 255);
};

const validateFileType = (file: File): { isValid: boolean; error?: string } => {
  if (!VALID_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not supported. Please upload PDF, Word, Excel, or image files only.`
    };
  }
  return { isValid: true };
};

// Validate file content to prevent fake files (e.g., txt renamed to pdf)
const validateFileContent = async (file: File): Promise<{ isValid: boolean; error?: string }> => {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Check file signatures (magic numbers)
    if (file.type === 'application/pdf') {
      // PDF starts with %PDF
      const pdfHeader = '%PDF';
      const fileHeader = new TextDecoder().decode(bytes.slice(0, 4));
      if (!fileHeader.startsWith(pdfHeader)) {
        return { isValid: false, error: 'File is not a valid PDF document' };
      }
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
               file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      // Modern Office docs are ZIP files starting with PK
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4B) {
        return { isValid: false, error: 'File is not a valid Office document' };
      }
    } else if (file.type === 'application/msword' || file.type === 'application/vnd.ms-excel') {
      // Old Office docs start with specific signatures
      if (bytes[0] !== 0xD0 || bytes[1] !== 0xCF || bytes[2] !== 0x11 || bytes[3] !== 0xE0) {
        return { isValid: false, error: 'File is not a valid legacy Office document' };
      }
    } else if (file.type.startsWith('image/')) {
      // Basic image validation
      if (file.type === 'image/jpeg') {
        if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
          return { isValid: false, error: 'File is not a valid JPEG image' };
        }
      } else if (file.type === 'image/png') {
        const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        for (let i = 0; i < pngHeader.length; i++) {
          if (bytes[i] !== pngHeader[i]) {
            return { isValid: false, error: 'File is not a valid PNG image' };
          }
        }
      }
    }
    
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Unable to validate file content' };
  }
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
      console.error('Authentication failed:', authError);
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
      fileSize: file?.size,
      fileType: file?.type,
      userId: user.id
    });

    if (!file || !farmId || !rawCategory) {
      console.error('Missing required fields:', { file: !!file, farmId, rawCategory });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Security validation: Check file type
    const fileTypeCheck = validateFileType(file);
    if (!fileTypeCheck.isValid) {
      console.error('Invalid file type:', file.type);
      return new Response(JSON.stringify({ error: fileTypeCheck.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Security validation: Check file content
    const fileContentCheck = await validateFileContent(file);
    if (!fileContentCheck.isValid) {
      console.error('Invalid file content:', fileContentCheck.error);
      return new Response(JSON.stringify({ error: fileContentCheck.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize and validate category with fallback
    const category = normalizeDocumentCategory(rawCategory);
    console.log('Category normalized from', rawCategory, 'to', category);

    // Verify user owns the farm - CRITICAL SECURITY CHECK
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('id, user_id')
      .eq('id', farmId)
      .eq('user_id', user.id)
      .single();

    if (farmError || !farm) {
      console.error('Farm access denied:', farmError, 'User:', user.id, 'Farm:', farmId);
      return new Response(JSON.stringify({ error: 'Farm not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      console.error('File too large:', file.size, 'Max:', maxSize);
      return new Response(JSON.stringify({ error: 'File size exceeds 50MB limit' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate secure filename with proper path structure
    const timestamp = Date.now();
    const sanitizedFileName = sanitizeFileName(file.name);
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const filePath = `${farmId}/${category}/${fileName}`;

    console.log('Uploading file:', { filePath, size: file.size, type: file.type });

    // Upload file to storage with proper path structure
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('farm-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ 
        error: 'Failed to upload file', 
        details: uploadError.message 
      }), {
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
      try {
        await supabase.storage.from('farm-documents').remove([filePath]);
        console.log('Cleaned up orphaned file:', filePath);
      } catch (cleanupError) {
        console.error('Failed to cleanup orphaned file:', cleanupError);
      }
      
      return new Response(JSON.stringify({ 
        error: 'Failed to save document record',
        details: dbError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Document uploaded successfully:', { 
      id: documentData.id, 
      category: documentData.category,
      fileName: documentData.file_name,
      filePath: filePath,
      userId: user.id
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
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

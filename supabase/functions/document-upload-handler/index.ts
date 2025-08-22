import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  farmId?: string; // Made optional for test scenarios
  fileName: string;
  fileSize: number;
  documentType: string;
  category?: string; // Made optional for test scenarios
  clientType?: 'individual' | 'business' | 'municipality' | 'ngo' | 'farm';
  userId?: string; // Add userId for test scenarios
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const uploadData = await req.json() as UploadRequest;
    console.log(`📤 Initiating async upload for ${uploadData.fileName}`);

    // Handle test scenarios - create or get test farm ID
    let farmId = uploadData.farmId;
    let category = uploadData.category || 'test-documents';
    
    if (!farmId && uploadData.userId) {
      // For test scenarios, create a default test farm for the user
      console.log('🧪 Test upload detected, checking for test farm...');
      
      // Try to find existing test farm for user
      const { data: existingFarm } = await supabase
        .from('farms')
        .select('id')
        .eq('name', 'Test Farm')
        .eq('user_id', uploadData.userId)
        .single();
      
      if (existingFarm) {
        farmId = existingFarm.id;
        console.log(`✅ Using existing test farm: ${farmId}`);
      } else {
        // Create test farm for user
        const { data: newFarm, error: farmError } = await supabase
          .from('farms')
          .insert({
            name: 'Test Farm',
            user_id: uploadData.userId,
            address: 'Test Address',
            total_hectares: 0,
            legal_status: 'individual',
            country: 'Test Country'
          })
          .select('id')
          .single();
        
        if (farmError || !newFarm) {
          throw new Error(`Failed to create test farm: ${farmError?.message}`);
        }
        
        farmId = newFarm.id;
        console.log(`✅ Created new test farm: ${farmId}`);
      }
    } else if (!farmId) {
      throw new Error('farmId or userId must be provided');
    }

    // Validate file constraints
    const maxSize = getMaxFileSize(uploadData.documentType, uploadData.fileName);
    if (uploadData.fileSize > maxSize) {
      return new Response(JSON.stringify({
        success: false,
        error: `File too large: ${Math.round(uploadData.fileSize/1024/1024)}MB (max: ${Math.round(maxSize/1024/1024)}MB)`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate upload URL and document ID
    const documentId = crypto.randomUUID();
    const filePath = `${farmId}/${category}/${uploadData.fileName}`;
    
    // Create signed upload URL
    const { data: uploadUrl, error: urlError } = await supabase.storage
      .from('farm-documents')
      .createSignedUploadUrl(filePath, {
        upsert: true
      });

    if (urlError) {
      throw new Error(`Failed to create upload URL: ${urlError.message}`);
    }

    // Create document record
    const { error: docError } = await supabase
      .from('farm_documents')
      .insert({
        id: documentId,
        farm_id: farmId,
        file_name: uploadData.fileName,
        file_url: `${supabaseUrl}/storage/v1/object/public/farm-documents/${filePath}`,
        file_size: uploadData.fileSize,
        category: category,
        mime_type: getMimeType(uploadData.fileName),
        processing_status: 'upload_pending',
        uploaded_at: new Date().toISOString()
      });

    if (docError) {
      throw new Error(`Failed to create document record: ${docError.message}`);
    }

    // Create extraction record for tracking
    const { error: extractionError } = await supabase
      .from('document_extractions')
      .insert({
        document_id: documentId,
        status: 'uploading',
        status_v2: 'uploading',
        extracted_data: {},
        confidence_score: 0.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (extractionError) {
      console.error('⚠️ Failed to create extraction record:', extractionError);
      // Don't fail the upload for this
    }

    console.log(`✅ Upload prepared for ${uploadData.fileName}, document ID: ${documentId}`);

    return new Response(JSON.stringify({
      success: true,
      documentId,
      uploadUrl: uploadUrl.signedUrl,
      filePath,
      processingConfig: {
        async: true,
        estimatedTime: getEstimatedProcessingTime(uploadData.documentType, uploadData.fileName),
        maxFileSize: `${Math.round(maxSize/1024/1024)}MB`
      },
      instructions: {
        step1: 'Upload file to the provided signed URL',
        step2: 'Document processing will start automatically after upload',
        step3: 'Monitor processing status via the document ID'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Upload handler failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getMaxFileSize(documentType: string, fileName: string): number {
  const lowerFileName = fileName.toLowerCase();
  const lowerDocType = documentType.toLowerCase();

  // EU Policy documents - larger limit
  if (lowerFileName.includes('eu') || lowerFileName.includes('policy') || 
      lowerFileName.includes('agricultural') || lowerDocType.includes('policy')) {
    return 50 * 1024 * 1024; // 50MB
  }

  // Farm applications
  if (lowerDocType === 'farm-application' || lowerFileName.includes('application')) {
    return 25 * 1024 * 1024; // 25MB
  }

  // Financial documents
  if (lowerDocType === 'financial' || lowerFileName.includes('financial')) {
    return 20 * 1024 * 1024; // 20MB
  }

  return 15 * 1024 * 1024; // 15MB default
}

function getEstimatedProcessingTime(documentType: string, fileName: string): string {
  const lowerFileName = fileName.toLowerCase();
  const lowerDocType = documentType.toLowerCase();

  // EU Policy documents - longer processing
  if (lowerFileName.includes('eu') || lowerFileName.includes('policy')) {
    return '3-5 minutes';
  }

  // Complex applications
  if (lowerDocType === 'farm-application') {
    return '2-3 minutes';
  }

  return '1-2 minutes';
}

function getMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'txt': 'text/plain'
  };
  
  return mimeTypes[extension || 'pdf'] || 'application/octet-stream';
}
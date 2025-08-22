import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  farmId?: string; // Legacy - being phased out
  fileName: string;
  fileSize: number;
  documentType: string;
  category?: string;
  clientType?: 'individual' | 'business' | 'municipality' | 'ngo' | 'farm';
  userId?: string;
  useCase?: 'client-onboarding' | 'subsidy-intelligence'; // New: distinguish processing type
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
    console.log(`📤 Initiating ${uploadData.useCase || 'client-onboarding'} upload for ${uploadData.fileName}`);

    // Universal client profile handling (replaces farm-only logic)
    let clientProfileId = null;
    let documentStoragePath = '';
    let category = uploadData.category || 'test-documents';
    
    if (uploadData.userId && !uploadData.farmId) {
      // Modern approach: Use universal client profiles
      console.log(`🌍 Universal upload detected for ${uploadData.clientType || 'unknown'} client`);
      
      // Get or create client profile based on type
      const clientType = uploadData.clientType || 'individual';
      const profileName = getTestProfileName(clientType);
      
      // Try to find existing test profile for user and type
      const { data: existingProfile } = await supabase
        .from('client_profiles')
        .select('id, profile_data')
        .eq('user_id', uploadData.userId)
        .eq('profile_data->>test_profile_type', clientType)
        .maybeSingle();
      
      if (existingProfile) {
        clientProfileId = existingProfile.id;
        console.log(`✅ Using existing ${clientType} profile: ${clientProfileId}`);
      } else {
        // Get applicant type ID
        const { data: applicantType } = await supabase
          .from('applicant_types')
          .select('id')
          .eq('type_name', clientType)
          .single();
        
        if (!applicantType) {
          throw new Error(`Unknown client type: ${clientType}`);
        }
        
        // Create new test client profile
        const { data: newProfile, error: profileError } = await supabase
          .from('client_profiles')
          .insert({
            user_id: uploadData.userId,
            applicant_type_id: applicantType.id,
            status: 'active',
            profile_data: {
              test_profile_type: clientType,
              business_name: profileName,
              created_for_testing: true,
              document_use_case: uploadData.useCase || 'client-onboarding'
            }
          })
          .select('id')
          .single();
        
        if (profileError || !newProfile) {
          throw new Error(`Failed to create ${clientType} profile: ${profileError?.message}`);
        }
        
        clientProfileId = newProfile.id;
        console.log(`✅ Created new ${clientType} profile: ${clientProfileId}`);
      }
      
      // Set storage path based on client profile
      documentStoragePath = `client-profiles/${clientProfileId}/${category}`;
      
    } else if (uploadData.farmId) {
      // Legacy support for existing farm-based uploads
      console.log('🚜 Legacy farm upload detected');
      documentStoragePath = `${uploadData.farmId}/${category}`;
    } else {
      throw new Error('Either userId (for universal clients) or farmId (legacy) must be provided');
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
    const filePath = `${documentStoragePath}/${uploadData.fileName}`;
    
    // Create signed upload URL
    const { data: uploadUrl, error: urlError } = await supabase.storage
      .from('farm-documents')
      .createSignedUploadUrl(filePath, {
        upsert: true
      });

    if (urlError) {
      throw new Error(`Failed to create upload URL: ${urlError.message}`);
    }

    // Create document record (universal approach)
    let docError = null;
    
    if (clientProfileId) {
      // Modern approach: For universal clients, we'll skip the farm document creation
      // and just track in document_extractions for now until we have client_documents table
      console.log(`📋 Universal client document - skipping farm_documents table for profile ${clientProfileId}`);
    } else {
      // Legacy approach: Store as farm document
      const { error } = await supabase
        .from('farm_documents')
        .insert({
          id: documentId,
          farm_id: uploadData.farmId,
          file_name: uploadData.fileName,
          file_url: `${supabaseUrl}/storage/v1/object/public/farm-documents/${filePath}`,
          file_size: uploadData.fileSize,
          category: category,
          mime_type: getMimeType(uploadData.fileName),
          processing_status: 'upload_pending',
          uploaded_at: new Date().toISOString()
        });
      docError = error;
    }

    if (docError) {
      throw new Error(`Failed to create document record: ${docError.message}`);
    }

    // Create extraction record for tracking
    const { error: extractionError } = await supabase
      .from('document_extractions')
      .insert({
        document_id: documentId,
        user_id: uploadData.userId || null,
        status: 'uploading',
        status_v2: 'uploading',
        extracted_data: {},
        confidence_score: 0.0,
        progress_metadata: {
          client_profile_id: clientProfileId,
          client_type: uploadData.clientType,
          use_case: uploadData.useCase,
          file_size: uploadData.fileSize,
          file_path: filePath
        },
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

function getTestProfileName(clientType: string): string {
  const profileNames = {
    'individual': 'Test Individual Entrepreneur',
    'business': 'Test Tech Startup',
    'municipality': 'Test City Council',
    'ngo': 'Test Environmental NGO',
    'farm': 'Test Agricultural Enterprise'
  };
  
  return profileNames[clientType as keyof typeof profileNames] || `Test ${clientType} Entity`;
}
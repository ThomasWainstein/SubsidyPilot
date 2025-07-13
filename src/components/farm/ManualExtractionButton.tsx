import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface ManualExtractionButtonProps {
  documentId: string;
  farmId: string;
  fileName: string;
  fileUrl: string;
  category: string;
  hasExistingExtraction?: boolean;
  className?: string;
}

const ManualExtractionButton = ({ 
  documentId, 
  farmId, 
  fileName, 
  fileUrl, 
  category,
  hasExistingExtraction = false,
  className = ""
}: ManualExtractionButtonProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isExtracting, setIsExtracting] = useState(false);

  const handleManualExtraction = async () => {
    setIsExtracting(true);
    console.log(`🔄 Starting manual extraction for: ${fileName}`);
    console.log(`📄 Document details:`, { documentId, fileUrl, fileName, category });

    // Validate required parameters
    if (!documentId || !fileUrl || !fileName) {
      throw new Error(`Missing required parameters: documentId=${documentId}, fileUrl=${fileUrl}, fileName=${fileName}`);
    }

    try {
      const { data, error } = await supabase.functions.invoke('extract-document-data', {
        body: {
          documentId,
          fileUrl,
          fileName,
          documentType: category
        }
      });

      if (error) throw error;

      console.log(`✅ Manual extraction completed for ${fileName}:`, data);
      
      toast({
        title: t('common.extractionCompleted'),
        description: `Successfully extracted data from ${fileName}`,
      });

      if (data?.extractedData && data.extractedData.confidence > 0) {
        navigate(`/farm/${farmId}/edit?prefill=true&extractionId=${data.documentId}`);
      }

    } catch (error) {
      console.error(`❌ Manual extraction failed for ${fileName}:`, error);
      
      await supabase.from('document_extractions').insert({
        document_id: documentId,
        extracted_data: { error: 'Manual extraction failed', details: error.message },
        extraction_type: 'openai_gpt4o',
        confidence_score: 0,
        status: 'failed',
        error_message: error.message
      });

      toast({
        title: t('common.extractionFailed'),
        description: error.message || 'Failed to extract data from document',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const buttonText = hasExistingExtraction ? 'Re-extract' : 'Extract & Prefill';

  return (
    <Button
      onClick={handleManualExtraction}
      disabled={isExtracting}
      variant={hasExistingExtraction ? "outline" : "default"}
      size="sm"
      className={className}
    >
      {isExtracting ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Extracting...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          {buttonText}
        </>
      )}
    </Button>
  );
};

export default ManualExtractionButton;
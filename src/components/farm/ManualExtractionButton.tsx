import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ManualExtractionButtonProps {
  documentId: string;
  farmId: string;
  fileName: string;
  fileUrl: string;
  category: string;
  hasExistingExtraction?: boolean;
  className?: string;
  onExtractionStart?: () => void;
  onExtractionComplete?: (data: any) => void;
  onExtractionError?: (error: string) => void;
}

const ManualExtractionButton = ({ 
  documentId, 
  farmId, 
  fileName, 
  fileUrl, 
  category,
  hasExistingExtraction = false,
  className = "",
  onExtractionStart,
  onExtractionComplete,
  onExtractionError
}: ManualExtractionButtonProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManualExtraction = async () => {
    setIsExtracting(true);
    setError(null);
    onExtractionStart?.();
    
    console.log(`🔄 Starting manual extraction for: ${fileName}`);
    console.log(`📄 Document details:`, { documentId, fileUrl, fileName, category });

    // Validate required parameters
    if (!documentId || !fileUrl || !fileName) {
      const errorMsg = `Missing required parameters: documentId=${documentId}, fileUrl=${fileUrl}, fileName=${fileName}`;
      console.error(`❌ ${errorMsg}`);
      setError(errorMsg);
      onExtractionError?.(errorMsg);
      setIsExtracting(false);
      return;
    }

    try {
      console.log(`🚀 Calling extract-document-data function...`);
      
      const { data, error } = await supabase.functions.invoke('extract-document-data', {
        body: {
          documentId,
          fileUrl,
          fileName,
          documentType: category
        }
      });

      if (error) {
        console.error(`❌ Edge function error:`, error);
        throw new Error(error.message || 'Edge function call failed');
      }

      console.log(`✅ Manual extraction completed for ${fileName}:`, data);
      
      if (data?.success && data?.extractedData) {
        const extractedData = data.extractedData;
        
        // Enhanced success feedback with details
        toast({
          title: t('common.extractionCompleted'),
          description: `Successfully extracted ${extractedData.extractedFields?.length || 0} fields from ${fileName} (${Math.round((extractedData.confidence || 0) * 100)}% confidence)`,
        });

        onExtractionComplete?.(extractedData);

        // Navigate to prefill if we have good extraction data
        if (extractedData.confidence && extractedData.confidence > 0.1) {
          navigate(`/farm/${farmId}/edit?prefill=true&extractionId=${documentId}`);
        }
      } else {
        // Handle extraction with errors or low confidence
        const errorMsg = data?.extractedData?.error || 'Extraction completed but no data was found';
        console.warn(`⚠️ Extraction issue: ${errorMsg}`);
        
        toast({
          title: 'Extraction Completed with Issues',
          description: `${fileName}: ${errorMsg}`,
          variant: 'default',
        });
        
        onExtractionError?.(errorMsg);
      }

    } catch (error) {
      const errorMessage = (error as Error).message || 'Unknown extraction error';
      console.error(`❌ Manual extraction failed for ${fileName}:`, error);
      
      setError(errorMessage);
      onExtractionError?.(errorMessage);
      
      // Store error in database for admin review
      try {
        await supabase.from('document_extractions').insert({
          document_id: documentId,
          extracted_data: { 
            error: 'Manual extraction failed', 
            details: errorMessage,
            timestamp: new Date().toISOString(),
            fileName,
            fileUrl
          },
          extraction_type: 'manual_retry',
          confidence_score: 0,
          status: 'failed',
          error_message: errorMessage
        });
        console.log(`📝 Error logged to database for admin review`);
      } catch (dbError) {
        console.error(`❌ Failed to log error to database:`, dbError);
      }

      toast({
        title: t('common.extractionFailed'),
        description: `${fileName}: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const buttonText = hasExistingExtraction ? 'Re-extract & Prefill' : 'Extract & Prefill';
  const buttonVariant = hasExistingExtraction ? "outline" : "default";

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleManualExtraction}
        disabled={isExtracting}
        variant={buttonVariant}
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
      
      {error && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span className="truncate">{error}</span>
        </div>
      )}
    </div>
  );
};

export default ManualExtractionButton;
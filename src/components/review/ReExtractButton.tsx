import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  AlertTriangle,
  CheckCircle 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { retryDocumentExtraction } from '@/utils/aiExtractionUtils';
import { useQueryClient } from '@tanstack/react-query';

interface ReExtractButtonProps {
  documentId: string;
  documentName: string;
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

const ReExtractButton = ({ 
  documentId, 
  documentName, 
  onSuccess, 
  variant = 'outline',
  size = 'sm'
}: ReExtractButtonProps) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const queryClient = useQueryClient();

  const handleReExtract = async () => {
    setIsExtracting(true);
    
    try {
      toast({
        title: 'Re-extraction started',
        description: `Processing ${documentName} again...`,
      });

      const result = await retryDocumentExtraction(documentId);
      
      if (result.success) {
        toast({
          title: 'Re-extraction completed',
          description: `Successfully re-processed ${documentName} with ${Math.round((result.confidence || 0) * 100)}% confidence`,
        });

        // Invalidate relevant queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['documents-for-review'] });
        queryClient.invalidateQueries({ queryKey: ['document-review-detail'] });
        queryClient.invalidateQueries({ queryKey: ['document-extractions'] });
        queryClient.invalidateQueries({ queryKey: ['review-statistics'] });

        onSuccess?.();
      } else {
        toast({
          title: 'Re-extraction failed',
          description: result.error || 'An error occurred during re-extraction',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Re-extraction error:', error);
      toast({
        title: 'Re-extraction failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Button 
      variant={variant}
      size={size}
      onClick={handleReExtract}
      disabled={isExtracting}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isExtracting ? 'animate-spin' : ''}`} />
      {isExtracting ? 'Re-extracting...' : 'Re-extract'}
    </Button>
  );
};

export default ReExtractButton;
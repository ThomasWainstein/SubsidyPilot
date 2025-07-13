import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, FileText, Settings } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Tables } from '@/integrations/supabase/types';

type DocumentExtraction = Tables<'document_extractions'>;

interface PrefillPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  farmId: string;
  fileName: string;
  extraction: DocumentExtraction;
}

const PrefillPromptDialog = ({ 
  isOpen, 
  onClose, 
  farmId, 
  fileName, 
  extraction 
}: PrefillPromptDialogProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { setSuppressPrefillPrompt } = useUserPreferences();

  const handlePrefillNow = () => {
    onClose();
    navigate(`/farm/${farmId}/edit?prefill=true&extractionId=${extraction.id}`);
  };

  const handleNoThanks = () => {
    onClose();
  };

  const handleDontAskAgain = () => {
    setSuppressPrefillPrompt(true);
    onClose();
  };

  const getConfidenceColor = (confidence: number | null) => {
    if (!confidence) return 'bg-gray-100 text-gray-800';
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-orange-100 text-orange-800';
  };

  const confidence = extraction.confidence_score || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('common.extractionCompleted')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <FileText className="h-5 w-5 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">{fileName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getConfidenceColor(confidence)}`}
                >
                  {t('common.confidence')}: {confidence}%
                </Badge>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('common.usePrefillPrompt')}
          </p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex gap-2 w-full">
            <Button 
              onClick={handlePrefillNow}
              className="flex-1"
              size="sm"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {t('common.prefillNow')}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleNoThanks}
              className="flex-1"
              size="sm"
            >
              {t('common.noThanks')}
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={handleDontAskAgain}
            className="w-full text-xs"
            size="sm"
          >
            <Settings className="h-3 w-3 mr-1" />
            {t('common.dontAskAgain')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrefillPromptDialog;
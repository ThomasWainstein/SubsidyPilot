import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import ManualExtractionButton from './ManualExtractionButton';

interface UploadSuccessPromptProps {
  farmId: string;
  uploadedFiles: Array<{
    documentId: string;
    fileName: string;
    fileUrl: string;
    category: string;
  }>;
  onDismiss: () => void;
}

const UploadSuccessPrompt = ({ farmId, uploadedFiles, onDismiss }: UploadSuccessPromptProps) => {
  const { t } = useLanguage();
  const { preferences, setSuppressPrefillPrompt } = useUserPreferences();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!preferences.suppressPrefillPrompt && uploadedFiles.length > 0) {
      setIsVisible(true);
    }
  }, [preferences.suppressPrefillPrompt, uploadedFiles.length]);

  const handleDontAskAgain = () => {
    setSuppressPrefillPrompt(true);
    setIsVisible(false);
    onDismiss();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible || uploadedFiles.length === 0) {
    return null;
  }

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="font-medium text-sm">Documents Uploaded Successfully</h4>
          </div>
          <AlertDescription className="text-sm mb-3">
            {t('common.usePrefillPrompt')}
          </AlertDescription>
          
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <ManualExtractionButton
                key={file.documentId}
                documentId={file.documentId}
                farmId={farmId}
                fileName={file.fileName}
                fileUrl={file.fileUrl}
                category={file.category}
                className="text-xs"
              />
            ))}
          </div>
          
          <div className="flex gap-2 mt-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDontAskAgain}
              className="text-xs h-7"
            >
              <Settings className="h-3 w-3 mr-1" />
              {t('common.dontAskAgain')}
            </Button>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
};

export default UploadSuccessPrompt;
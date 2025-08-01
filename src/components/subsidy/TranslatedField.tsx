import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Globe } from 'lucide-react';
import { Language } from '@/contexts/language/types';
import { getCleanLocalizedContent } from '@/utils/contentFormatting';

interface TranslatedFieldProps {
  content: string | any;
  fieldKey: string;
  currentLanguage: Language;
  originalLanguage?: Language;
  className?: string;
  children?: (props: { text: string; isTranslated: boolean }) => React.ReactNode;
}

export const TranslatedField = ({ 
  content, 
  fieldKey, 
  currentLanguage, 
  originalLanguage = 'fr',
  className = '',
  children 
}: TranslatedFieldProps) => {
  const [showOriginal, setShowOriginal] = useState(false);

  // Get clean content in both languages
  const targetContent = getCleanLocalizedContent(content, currentLanguage);
  const originalContent = getCleanLocalizedContent(content, originalLanguage);
  
  // Check if we have native content in the target language
  const hasNativeTranslation = typeof content === 'object' && content && content[currentLanguage];
  
  // Determine what to display
  const displayText = showOriginal ? originalContent : targetContent;
  const isActuallyTranslated = !hasNativeTranslation && currentLanguage !== originalLanguage && originalContent && targetContent !== originalContent;
  const shouldShowToggle = isActuallyTranslated && originalContent !== targetContent;

  if (children) {
    return (
      <div className={className}>
        {children({ text: displayText, isTranslated: isActuallyTranslated && !showOriginal })}
        {shouldShowToggle && (
          <div className="flex items-center gap-2 mt-2">
            {isActuallyTranslated && !showOriginal && (
              <Badge variant="outline" className="text-xs">
                <Globe className="w-3 h-3 mr-1" />
                Translated
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOriginal(!showOriginal)}
              className="text-xs h-6"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              {showOriginal ? `Show ${currentLanguage.toUpperCase()}` : `Original ${originalLanguage.toUpperCase()}`}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        <span>{displayText}</span>
        
        {shouldShowToggle && (
          <div className="flex items-center gap-2">
            {isActuallyTranslated && !showOriginal && (
              <Badge variant="outline" className="text-xs">
                <Globe className="w-3 h-3 mr-1" />
                Translated
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOriginal(!showOriginal)}
              className="text-xs h-6"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              {showOriginal ? `Show ${currentLanguage.toUpperCase()}` : `Original ${originalLanguage.toUpperCase()}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
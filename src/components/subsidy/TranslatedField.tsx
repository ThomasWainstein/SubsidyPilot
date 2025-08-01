import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Globe } from 'lucide-react';
import { Language } from '@/contexts/language/types';
import { getLocalizedContent } from '@/utils/language';
import { useAutoTranslation } from '@/hooks/useAutoTranslation';

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
  const { translateText, getTranslatedText } = useAutoTranslation({
    originalLanguage,
    targetLanguage: currentLanguage
  });

  // Get the content in the current language
  const localizedContent = getLocalizedContent(content, currentLanguage);
  const originalContent = getLocalizedContent(content, originalLanguage);
  
  // Check if content exists in target language
  const hasNativeTranslation = typeof content === 'object' && content && (content as any)[currentLanguage];
  
  const { text, isTranslated, isLoading } = getTranslatedText(
    hasNativeTranslation ? localizedContent : originalContent,
    fieldKey
  );

  // Auto-translate if needed and content doesn't exist in target language
  useEffect(() => {
    if (!hasNativeTranslation && originalContent && currentLanguage !== originalLanguage) {
      translateText(originalContent, fieldKey);
    }
  }, [originalContent, currentLanguage, originalLanguage, hasNativeTranslation, translateText, fieldKey]);

  const displayText = showOriginal ? originalContent : text;
  const shouldShowToggle = !hasNativeTranslation && currentLanguage !== originalLanguage && originalContent;

  if (children) {
    return (
      <div className={className}>
        {children({ text: displayText, isTranslated: isTranslated && !showOriginal })}
        {shouldShowToggle && (
          <div className="flex items-center gap-2 mt-2">
            {isTranslated && !showOriginal && (
              <Badge variant="outline" className="text-xs">
                <Globe className="w-3 h-3 mr-1" />
                Auto-translated
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOriginal(!showOriginal)}
              className="text-xs h-6"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              {showOriginal ? `Show ${currentLanguage.toUpperCase()}` : `Show original (${originalLanguage.toUpperCase()})`}
            </Button>
          </div>
        )}
        {isTranslated && !showOriginal && (
          <p className="text-xs text-muted-foreground mt-1">
            This is an AI-generated translation. 
            <Button variant="link" className="text-xs p-0 h-auto ml-1" onClick={() => setShowOriginal(true)}>
              See original text
            </Button>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        ) : (
          <span>{displayText}</span>
        )}
        
        {shouldShowToggle && (
          <div className="flex items-center gap-2">
            {isTranslated && !showOriginal && (
              <Badge variant="outline" className="text-xs">
                <Globe className="w-3 h-3 mr-1" />
                Auto-translated
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOriginal(!showOriginal)}
              className="text-xs h-6"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              {showOriginal ? `Show ${currentLanguage.toUpperCase()}` : `Show original (${originalLanguage.toUpperCase()})`}
            </Button>
          </div>
        )}
        
        {isTranslated && !showOriginal && (
          <p className="text-xs text-muted-foreground">
            This is an AI-generated translation. 
            <Button variant="link" className="text-xs p-0 h-auto ml-1" onClick={() => setShowOriginal(true)}>
              See original text
            </Button>
          </p>
        )}
      </div>
    </div>
  );
};
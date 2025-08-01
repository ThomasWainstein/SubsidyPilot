import { useState, useCallback } from 'react';
import { Language } from '@/contexts/language/types';

interface TranslationState {
  [key: string]: {
    [language in Language]?: string;
  };
}

interface UseAutoTranslationProps {
  originalLanguage: Language;
  targetLanguage: Language;
}

export const useAutoTranslation = ({ originalLanguage, targetLanguage }: UseAutoTranslationProps) => {
  const [translations, setTranslations] = useState<TranslationState>({});
  const [isTranslating, setIsTranslating] = useState<{ [key: string]: boolean }>({});

  const translateText = useCallback(async (text: string, fieldKey: string) => {
    if (originalLanguage === targetLanguage) return text;
    
    // Check if we already have this translation
    if (translations[fieldKey]?.[targetLanguage]) {
      return translations[fieldKey][targetLanguage]!;
    }

    setIsTranslating(prev => ({ ...prev, [fieldKey]: true }));

    try {
      // TODO: Replace with actual API call to DeepL or OpenAI
      // For now, we'll simulate translation
      const translatedText = `[AUTO-TRANSLATED from ${originalLanguage.toUpperCase()}] ${text}`;
      
      setTranslations(prev => ({
        ...prev,
        [fieldKey]: {
          ...prev[fieldKey],
          [targetLanguage]: translatedText
        }
      }));

      return translatedText;
    } catch (error) {
      console.error('Translation failed:', error);
      return text; // Return original text on failure
    } finally {
      setIsTranslating(prev => ({ ...prev, [fieldKey]: false }));
    }
  }, [originalLanguage, targetLanguage, translations]);

  const getTranslatedText = useCallback((
    originalText: string,
    fieldKey: string
  ): { text: string; isTranslated: boolean; isLoading: boolean } => {
    if (originalLanguage === targetLanguage) {
      return { text: originalText, isTranslated: false, isLoading: false };
    }

    const translatedText = translations[fieldKey]?.[targetLanguage];
    const isLoading = isTranslating[fieldKey] || false;

    if (translatedText) {
      return { text: translatedText, isTranslated: true, isLoading: false };
    }

    return { text: originalText, isTranslated: false, isLoading };
  }, [originalLanguage, targetLanguage, translations, isTranslating]);

  return {
    translateText,
    getTranslatedText,
    isTranslating: (fieldKey: string) => isTranslating[fieldKey] || false
  };
};
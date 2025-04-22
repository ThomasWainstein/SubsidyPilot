
import { Language } from '@/contexts/language/types';
import { MultilingualText } from '@/types/subsidy';

export const getLocalizedContent = (
  content: string | MultilingualText, 
  language: Language = 'en'
): string => {
  if (typeof content === 'string') return content;
  return content[language] || content['en'] || '';
};

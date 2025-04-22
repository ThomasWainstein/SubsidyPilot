
import { TranslationKey } from './types/index';

export type Language = 'en' | 'fr' | 'es' | 'ro' | 'pl';

export interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

export * from './types/index';

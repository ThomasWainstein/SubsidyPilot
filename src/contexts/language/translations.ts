
import { Language, TranslationKey } from './types';
import { enTranslations } from './translations/en';
import { frTranslations } from './translations/fr';
import { esTranslations } from './translations/es';
import { roTranslations } from './translations/ro';
import { plTranslations } from './translations/pl';

// Define the translations
export const translations: Record<Language, Record<TranslationKey, string>> = {
  en: enTranslations,
  fr: frTranslations,
  es: esTranslations,
  ro: roTranslations,
  pl: plTranslations
};


import { Language, TranslationKey } from './types';
import { en } from './translations/en';
import { fr } from './translations/fr';
import { es } from './translations/es';
import { ro } from './translations/ro';
import { pl } from './translations/pl';

// Define the translations
export const translations: Record<Language, Partial<Record<TranslationKey, string>>> = {
  en,
  fr,
  es,
  ro,
  pl
};

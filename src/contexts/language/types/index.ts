
import { Dispatch, SetStateAction } from 'react';
import { CommonTranslationKey } from './common';
import { DashboardTranslationKey } from './dashboard';
import { FarmTranslationKey } from './farm';
import { SubsidiesTranslationKey } from './subsidies';
import { ApplicationTranslationKey } from './application';
import { FormTranslationKey } from './form';
import { MessagesTranslationKey } from './messages';
import { NavigationTranslationKey } from './navigation';

export type Language = 'en' | 'fr' | 'es' | 'ro';

export type TranslationKey =
  | CommonTranslationKey
  | DashboardTranslationKey
  | FarmTranslationKey
  | SubsidiesTranslationKey
  | ApplicationTranslationKey
  | FormTranslationKey
  | MessagesTranslationKey
  | NavigationTranslationKey;

export interface LanguageContextType {
  language: Language;
  setLanguage: Dispatch<SetStateAction<Language>>;
  t: (key: TranslationKey) => string;
}

export * from './common';
export * from './dashboard';
export * from './farm';
export * from './subsidies';
export * from './application';
export * from './form';
export * from './messages';
export * from './navigation';

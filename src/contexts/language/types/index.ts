import { CommonTranslationKey } from './common';
import { DashboardTranslationKey } from './dashboard';
import { FarmTranslationKey } from './farm';
import { SubsidiesTranslationKey } from './subsidies';
import { ApplicationTranslationKey } from './application';
import { FormTranslationKey } from './form';
import { MessagesTranslationKey } from './messages';
import { NavigationTranslationKey } from './navigation';
import { StatusTranslationKey } from './status';
import { EUPortalTranslationKey } from './euportal';
import { ExtensionTranslationKey } from './extension';
import { HomeTranslationKey } from './home';
import { FeaturesTranslationKey } from './features';
import { FooterTranslationKey } from './footer';

export type Language = 'en' | 'fr' | 'es' | 'ro' | 'pl';

export type TranslationKey =
  | CommonTranslationKey
  | DashboardTranslationKey
  | FarmTranslationKey
  | SubsidiesTranslationKey
  | ApplicationTranslationKey
  | FormTranslationKey
  | MessagesTranslationKey
  | NavigationTranslationKey
  | StatusTranslationKey
  | EUPortalTranslationKey
  | ExtensionTranslationKey
  | HomeTranslationKey
  | FeaturesTranslationKey
  | FooterTranslationKey;

export interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
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
export * from './status';
export * from './euportal';
export * from './extension';
export * from './home';
export * from './features';
export * from './footer';

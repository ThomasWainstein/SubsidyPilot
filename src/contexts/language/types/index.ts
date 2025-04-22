
import { ApplicationTranslationKey } from './application';
import { CommonTranslationKey } from './common';
import { DashboardTranslationKey } from './dashboard';
import { EUPortalTranslationKey } from './euportal';
import { ExtensionTranslationKey } from './extension';
import { FarmTranslationKey } from './farm';
import { FeaturesTranslationKey } from './features';
import { FooterTranslationKey } from './footer';
import { FormTranslationKey } from './form';
import { HomeTranslationKey } from './home';
import { MessagesTranslationKey } from './messages';
import { NavigationTranslationKey } from './navigation';
import { SimulationTranslationKey } from './simulation';
import { StatusTranslationKey } from './status';
import { SubsidiesTranslationKey } from './subsidies';

export type TranslationKey =
  | ApplicationTranslationKey
  | CommonTranslationKey
  | DashboardTranslationKey
  | EUPortalTranslationKey
  | ExtensionTranslationKey
  | FarmTranslationKey
  | FeaturesTranslationKey
  | FooterTranslationKey
  | FormTranslationKey
  | HomeTranslationKey
  | MessagesTranslationKey
  | NavigationTranslationKey
  | SimulationTranslationKey
  | StatusTranslationKey
  | SubsidiesTranslationKey;

export type { Language } from '../';

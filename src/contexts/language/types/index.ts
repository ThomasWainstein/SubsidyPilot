
// Export all types from the separate type files
export * from './common';
export * from './dashboard';
export * from './farm';
export * from './subsidies';
export * from './application';
export * from './euportal';
export * from './extension';
export * from './features';
export * from './form';
export * from './home';
export * from './messages';
export * from './navigation';
export * from './simulation';
export * from './status';
export * from './footer';

// Define the Language type here to avoid circular imports
export type Language = 'en' | 'fr' | 'es' | 'ro' | 'pl';

// Combine all translation keys
export type TranslationKey = 
  | import('./common').CommonTranslationKey
  | import('./dashboard').DashboardTranslationKey
  | import('./farm').FarmTranslationKey
  | import('./subsidies').SubsidiesTranslationKey
  | import('./application').ApplicationTranslationKey
  | import('./euportal').EUPortalTranslationKey
  | import('./extension').ExtensionTranslationKey
  | import('./features').FeaturesTranslationKey
  | import('./form').FormTranslationKey
  | import('./home').HomeTranslationKey
  | import('./messages').MessagesTranslationKey
  | import('./navigation').NavigationTranslationKey
  | import('./simulation').SimulationTranslationKey
  | import('./status').StatusTranslationKey
  | import('./footer').FooterTranslationKey;

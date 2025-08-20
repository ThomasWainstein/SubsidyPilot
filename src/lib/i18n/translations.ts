/**
 * Internationalization system for multi-country support
 */

export type SupportedLocale = 'en' | 'fr' | 'es' | 'de' | 'it' | 'ro' | 'pl';

export const translations = {
  en: {
    // Common
    loading: 'Loading...',
    error: 'Error',
    tryAgain: 'Try Again',
    backToSearch: 'Back to Search',
    share: 'Share',
    favorite: 'Favorite',
    contactSupport: 'Contact Support',
    
    // Subsidy Details
    subsidyDetails: 'Subsidy Details',
    programDescription: 'Program Description',
    fundingInformation: 'Funding Information',
    eligibilityCriteria: 'Eligibility Criteria',
    applicationProcess: 'Application Process',
    requiredDocuments: 'Required Documents',
    keyInformation: 'Key Information',
    quickActions: 'Quick Actions',
    
    // Status
    active: 'Active',
    expired: 'Expired',
    pending: 'Pending',
    
    // Navigation
    overview: 'Overview',
    eligibility: 'Eligibility',
    documents: 'Documents',
    contact: 'Contact',
    
    // Actions
    applyNow: 'Apply Now',
    downloadForms: 'Download Forms',
    visitWebsite: 'Visit Official Website',
    viewDetails: 'View Program Details',
    
    // Amounts and Currency
    maximumAmount: 'Maximum Amount',
    notSpecified: 'Not specified',
    amountNotSpecified: 'Amount not specified',
    
    // Regions and Countries
    regions: {
      'Île-de-France': 'Île-de-France',
      'Nouvelle-Aquitaine': 'Nouvelle-Aquitaine',
      'Auvergne-Rhône-Alpes': 'Auvergne-Rhône-Alpes',
      'Hauts-de-France': 'Hauts-de-France',
      'Occitanie': 'Occitanie',
      'Grand Est': 'Grand Est',
      'Provence-Alpes-Côte d\'Azur': 'Provence-Alpes-Côte d\'Azur',
      'Bretagne': 'Brittany',
      'Normandie': 'Normandy',
      'Bourgogne-Franche-Comté': 'Burgundy-Franche-Comté',
      'Centre-Val de Loire': 'Centre-Val de Loire',
      'Pays de la Loire': 'Pays de la Loire',
      'Corsica': 'Corsica'
    },
    
    // SEO and Meta
    seo: {
      subsidyTitle: '{title} - Agricultural Subsidy',
      subsidyDescription: 'Learn about {title}, a {region} agricultural subsidy program. Maximum funding: {amount}. Apply now for agricultural support.',
      breadcrumbs: {
        home: 'Home',
        search: 'Search Subsidies',
        subsidy: 'Subsidy Details'
      }
    }
  },
  
  fr: {
    // Common
    loading: 'Chargement...',
    error: 'Erreur',
    tryAgain: 'Réessayer',
    backToSearch: 'Retour à la recherche',
    share: 'Partager',
    favorite: 'Favori',
    contactSupport: 'Contacter le support',
    
    // Subsidy Details
    subsidyDetails: 'Détails de la subvention',
    programDescription: 'Description du programme',
    fundingInformation: 'Informations de financement',
    eligibilityCriteria: 'Critères d\'éligibilité',
    applicationProcess: 'Processus de candidature',
    requiredDocuments: 'Documents requis',
    keyInformation: 'Informations clés',
    quickActions: 'Actions rapides',
    
    // Status
    active: 'Actif',
    expired: 'Expiré',
    pending: 'En attente',
    
    // Navigation
    overview: 'Aperçu',
    eligibility: 'Éligibilité',
    documents: 'Documents',
    contact: 'Contact',
    
    // Actions
    applyNow: 'Postuler maintenant',
    downloadForms: 'Télécharger les formulaires',
    visitWebsite: 'Visiter le site officiel',
    viewDetails: 'Voir les détails du programme',
    
    // Amounts and Currency
    maximumAmount: 'Montant maximum',
    notSpecified: 'Non spécifié',
    amountNotSpecified: 'Montant non spécifié',
    
    // Regions and Countries
    regions: {
      'Île-de-France': 'Île-de-France',
      'Nouvelle-Aquitaine': 'Nouvelle-Aquitaine',
      'Auvergne-Rhône-Alpes': 'Auvergne-Rhône-Alpes',
      'Hauts-de-France': 'Hauts-de-France',
      'Occitanie': 'Occitanie',
      'Grand Est': 'Grand Est',
      'Provence-Alpes-Côte d\'Azur': 'Provence-Alpes-Côte d\'Azur',
      'Bretagne': 'Bretagne',
      'Normandie': 'Normandie',
      'Bourgogne-Franche-Comté': 'Bourgogne-Franche-Comté',
      'Centre-Val de Loire': 'Centre-Val de Loire',
      'Pays de la Loire': 'Pays de la Loire',
      'Corsica': 'Corse'
    },
    
    // SEO and Meta
    seo: {
      subsidyTitle: '{title} - Subvention Agricole',
      subsidyDescription: 'Découvrez {title}, un programme de subvention agricole en {region}. Financement maximum : {amount}. Candidatez maintenant pour un soutien agricole.',
      breadcrumbs: {
        home: 'Accueil',
        search: 'Rechercher des subventions',
        subsidy: 'Détails de la subvention'
      }
    }
  },
  
  es: {
    // Common
    loading: 'Cargando...',
    error: 'Error',
    tryAgain: 'Intentar de nuevo',
    backToSearch: 'Volver a la búsqueda',
    share: 'Compartir',
    favorite: 'Favorito',
    contactSupport: 'Contactar soporte',
    
    // Subsidy Details
    subsidyDetails: 'Detalles de la subvención',
    programDescription: 'Descripción del programa',
    fundingInformation: 'Información de financiación',
    eligibilityCriteria: 'Criterios de elegibilidad',
    applicationProcess: 'Proceso de solicitud',
    requiredDocuments: 'Documentos requeridos',
    keyInformation: 'Información clave',
    quickActions: 'Acciones rápidas',
    
    // Status
    active: 'Activo',
    expired: 'Expirado',
    pending: 'Pendiente',
    
    // Navigation
    overview: 'Resumen',
    eligibility: 'Elegibilidad',
    documents: 'Documentos',
    contact: 'Contacto',
    
    // Actions
    applyNow: 'Aplicar ahora',
    downloadForms: 'Descargar formularios',
    visitWebsite: 'Visitar sitio web oficial',
    viewDetails: 'Ver detalles del programa',
    
    // Amounts and Currency
    maximumAmount: 'Cantidad máxima',
    notSpecified: 'No especificado',
    amountNotSpecified: 'Cantidad no especificada',
    
    // SEO and Meta
    seo: {
      subsidyTitle: '{title} - Subvención Agrícola',
      subsidyDescription: 'Conozca {title}, un programa de subvención agrícola en {region}. Financiación máxima: {amount}. Solicite ahora apoyo agrícola.',
      breadcrumbs: {
        home: 'Inicio',
        search: 'Buscar subvenciones',
        subsidy: 'Detalles de la subvención'
      }
    }
  }
};

export type TranslationKey = keyof typeof translations.en;
export type NestedTranslationKey = string;

/**
 * Get nested translation value using dot notation
 */
export function getNestedTranslation(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path;
}

/**
 * Replace placeholders in translation strings
 */
export function interpolateTranslation(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => variables[key] || match);
}
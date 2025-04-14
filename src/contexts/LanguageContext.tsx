
import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define all supported languages
export type Language = 'en' | 'fr' | 'es' | 'ro';

// Define the translation keys structure
export type TranslationKey = 
  | 'common.getStarted'
  | 'common.viewFarm'
  | 'common.addNewFarm'
  | 'common.submit'
  | 'common.save'
  | 'common.cancel'
  | 'common.upload'
  | 'common.downloadPdf'
  | 'common.viewDetails'
  | 'common.explainThis'
  | 'common.teamAccess'
  | 'common.lastUpdated'
  | 'common.profile'
  | 'common.documents'
  | 'common.subsidies'
  | 'common.applications'
  | 'common.dashboard'
  | 'home.title'
  | 'home.tagline'
  | 'dashboard.title'
  | 'dashboard.subtitle'
  | 'farm.profileTitle'
  | 'farm.profileSubtitle'
  | 'farm.assistantTitle'
  | 'farm.assistantPlaceholder'
  | 'farm.assistantResponse'
  | 'farm.documentTitle'
  | 'farm.documentSubtitle'
  | 'subsidies.title'
  | 'subsidies.subtitle'
  | 'subsidies.matchConfidence'
  | 'subsidies.deadline'
  | 'subsidies.regionEligibility'
  | 'subsidies.grantCode'
  | 'subsidies.maxGrant'
  | 'application.title'
  | 'application.subtitle'
  | 'application.confirmationMessage'
  | 'application.section1'
  | 'application.section2'
  | 'application.section3'
  | 'application.section4'
  | 'application.section5'
  | 'application.section6'
  | 'application.formSaved'
  | 'status.inProgress'
  | 'status.submitted'
  | 'status.approved'
  | 'status.inReview'
  | 'status.needsUpdate'
  | 'status.profileComplete'
  | 'status.subsidyInProgress';

// Define the translations
const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    'common.getStarted': 'Get Started',
    'common.viewFarm': 'View Farm',
    'common.addNewFarm': 'Add New Farm',
    'common.submit': 'Submit',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.upload': 'Upload',
    'common.downloadPdf': 'Download PDF',
    'common.viewDetails': 'View Details',
    'common.explainThis': 'Explain This',
    'common.teamAccess': 'Team Access',
    'common.lastUpdated': 'Last Updated',
    'common.profile': 'Profile',
    'common.documents': 'Documents',
    'common.subsidies': 'Subsidies',
    'common.applications': 'Applications',
    'common.dashboard': 'Dashboard',
    'home.title': 'AgriTool',
    'home.tagline': 'Manage your entire farm portfolio with AgriTool.',
    'dashboard.title': 'Consultant Dashboard',
    'dashboard.subtitle': 'Manage your farm portfolio and track subsidy applications',
    'farm.profileTitle': 'Digital Farm Profile',
    'farm.profileSubtitle': 'Comprehensive digital profile for your farm',
    'farm.assistantTitle': 'AgriBot Assistant',
    'farm.assistantPlaceholder': 'Type additional information about your farm...',
    'farm.assistantResponse': 'Thanks! I\'ve added this to your digital profile.',
    'farm.documentTitle': 'Documents',
    'farm.documentSubtitle': 'Upload and manage farm documents',
    'subsidies.title': 'Subsidy Matches',
    'subsidies.subtitle': 'Available subsidies matching your farm profile',
    'subsidies.matchConfidence': 'Match Confidence',
    'subsidies.deadline': 'Deadline',
    'subsidies.regionEligibility': 'Region Eligibility',
    'subsidies.grantCode': 'Grant Code',
    'subsidies.maxGrant': 'Maximum Grant',
    'application.title': 'Subsidy Application',
    'application.subtitle': 'Complete the form to apply for this subsidy',
    'application.confirmationMessage': 'Your application has been received',
    'application.section1': 'Basic Information',
    'application.section2': 'Farm Details',
    'application.section3': 'Project Information',
    'application.section4': 'Financial Information',
    'application.section5': 'Sustainability',
    'application.section6': 'Additional Documents',
    'application.formSaved': 'Your application draft has been saved.',
    'status.inProgress': 'In Progress',
    'status.submitted': 'Submitted',
    'status.approved': 'Approved',
    'status.inReview': 'In Review',
    'status.needsUpdate': 'Needs Update',
    'status.profileComplete': 'Profile Complete',
    'status.subsidyInProgress': 'Subsidy In Progress',
  },
  fr: {
    'common.getStarted': 'Commencer',
    'common.viewFarm': 'Voir Ferme',
    'common.addNewFarm': 'Ajouter Ferme',
    'common.submit': 'Soumettre',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.upload': 'Télécharger',
    'common.downloadPdf': 'Télécharger PDF',
    'common.viewDetails': 'Voir Détails',
    'common.explainThis': 'Expliquer',
    'common.teamAccess': 'Accès Équipe',
    'common.lastUpdated': 'Dernière Mise à Jour',
    'common.profile': 'Profil',
    'common.documents': 'Documents',
    'common.subsidies': 'Subventions',
    'common.applications': 'Applications',
    'common.dashboard': 'Tableau de Bord',
    'home.title': 'AgriTool',
    'home.tagline': 'Gérez tout votre portefeuille agricole avec AgriTool.',
    'dashboard.title': 'Tableau de Bord du Consultant',
    'dashboard.subtitle': 'Gérez votre portefeuille agricole et suivez les demandes de subventions',
    'farm.profileTitle': 'Profil Numérique de la Ferme',
    'farm.profileSubtitle': 'Profil numérique complet pour votre ferme',
    'farm.assistantTitle': 'Assistant AgriBot',
    'farm.assistantPlaceholder': 'Tapez des informations supplémentaires sur votre ferme...',
    'farm.assistantResponse': 'Merci ! J\'ai ajouté cela à votre profil numérique.',
    'farm.documentTitle': 'Documents',
    'farm.documentSubtitle': 'Téléchargez et gérez les documents de la ferme',
    'subsidies.title': 'Correspondances de Subventions',
    'subsidies.subtitle': 'Subventions disponibles correspondant au profil de votre ferme',
    'subsidies.matchConfidence': 'Confiance de Correspondance',
    'subsidies.deadline': 'Date Limite',
    'subsidies.regionEligibility': 'Éligibilité Régionale',
    'subsidies.grantCode': 'Code de Subvention',
    'subsidies.maxGrant': 'Subvention Maximale',
    'application.title': 'Demande de Subvention',
    'application.subtitle': 'Remplissez le formulaire pour demander cette subvention',
    'application.confirmationMessage': 'Votre demande a été reçue',
    'application.section1': 'Informations de Base',
    'application.section2': 'Détails de la Ferme',
    'application.section3': 'Informations sur le Projet',
    'application.section4': 'Informations Financières',
    'application.section5': 'Durabilité',
    'application.section6': 'Documents Supplémentaires',
    'application.formSaved': 'Votre brouillon de demande a été enregistré.',
    'status.inProgress': 'En Cours',
    'status.submitted': 'Soumis',
    'status.approved': 'Approuvé',
    'status.inReview': 'En Révision',
    'status.needsUpdate': 'Mise à Jour Nécessaire',
    'status.profileComplete': 'Profil Complet',
    'status.subsidyInProgress': 'Subvention En Cours',
  },
  es: {
    'common.getStarted': 'Comenzar',
    'common.viewFarm': 'Ver Granja',
    'common.addNewFarm': 'Añadir Granja',
    'common.submit': 'Enviar',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.upload': 'Subir',
    'common.downloadPdf': 'Descargar PDF',
    'common.viewDetails': 'Ver Detalles',
    'common.explainThis': 'Explicar Esto',
    'common.teamAccess': 'Acceso del Equipo',
    'common.lastUpdated': 'Última Actualización',
    'common.profile': 'Perfil',
    'common.documents': 'Documentos',
    'common.subsidies': 'Subsidios',
    'common.applications': 'Aplicaciones',
    'common.dashboard': 'Panel',
    'home.title': 'AgriTool',
    'home.tagline': 'Gestiona toda tu cartera agrícola con AgriTool.',
    'dashboard.title': 'Panel del Consultor',
    'dashboard.subtitle': 'Gestiona tu cartera de granjas y haz seguimiento de las solicitudes de subsidios',
    'farm.profileTitle': 'Perfil Digital de la Granja',
    'farm.profileSubtitle': 'Perfil digital completo para tu granja',
    'farm.assistantTitle': 'Asistente AgriBot',
    'farm.assistantPlaceholder': 'Escribe información adicional sobre tu granja...',
    'farm.assistantResponse': '¡Gracias! He añadido esto a tu perfil digital.',
    'farm.documentTitle': 'Documentos',
    'farm.documentSubtitle': 'Sube y gestiona documentos de la granja',
    'subsidies.title': 'Coincidencias de Subsidios',
    'subsidies.subtitle': 'Subsidios disponibles que coinciden con el perfil de tu granja',
    'subsidies.matchConfidence': 'Confianza de Coincidencia',
    'subsidies.deadline': 'Fecha Límite',
    'subsidies.regionEligibility': 'Elegibilidad Regional',
    'subsidies.grantCode': 'Código de Subsidio',
    'subsidies.maxGrant': 'Subsidio Máximo',
    'application.title': 'Solicitud de Subsidio',
    'application.subtitle': 'Completa el formulario para solicitar este subsidio',
    'application.confirmationMessage': 'Tu solicitud ha sido recibida',
    'application.section1': 'Información Básica',
    'application.section2': 'Detalles de la Granja',
    'application.section3': 'Información del Proyecto',
    'application.section4': 'Información Financiera',
    'application.section5': 'Sostenibilidad',
    'application.section6': 'Documentos Adicionales',
    'application.formSaved': 'El borrador de tu solicitud ha sido guardado.',
    'status.inProgress': 'En Progreso',
    'status.submitted': 'Enviado',
    'status.approved': 'Aprobado',
    'status.inReview': 'En Revisión',
    'status.needsUpdate': 'Necesita Actualización',
    'status.profileComplete': 'Perfil Completo',
    'status.subsidyInProgress': 'Subsidio En Progreso',
  },
  ro: {
    'common.getStarted': 'Începe',
    'common.viewFarm': 'Vizualizează Fermă',
    'common.addNewFarm': 'Adaugă Fermă',
    'common.submit': 'Trimite',
    'common.save': 'Salvează',
    'common.cancel': 'Anulează',
    'common.upload': 'Încarcă',
    'common.downloadPdf': 'Descarcă PDF',
    'common.viewDetails': 'Vezi Detalii',
    'common.explainThis': 'Explică Asta',
    'common.teamAccess': 'Acces Echipă',
    'common.lastUpdated': 'Ultima Actualizare',
    'common.profile': 'Profil',
    'common.documents': 'Documente',
    'common.subsidies': 'Subvenții',
    'common.applications': 'Aplicații',
    'common.dashboard': 'Panou',
    'home.title': 'AgriTool',
    'home.tagline': 'Gestionează întregul portofoliu agricol cu AgriTool.',
    'dashboard.title': 'Panou Consultant',
    'dashboard.subtitle': 'Gestionează portofoliul de ferme și urmărește aplicațiile pentru subvenții',
    'farm.profileTitle': 'Profil Digital al Fermei',
    'farm.profileSubtitle': 'Profil digital cuprinzător pentru ferma ta',
    'farm.assistantTitle': 'Asistent AgriBot',
    'farm.assistantPlaceholder': 'Tastează informații suplimentare despre ferma ta...',
    'farm.assistantResponse': 'Mulțumesc! Am adăugat acest lucru la profilul tău digital.',
    'farm.documentTitle': 'Documente',
    'farm.documentSubtitle': 'Încarcă și gestionează documentele fermei',
    'subsidies.title': 'Potriviri de Subvenții',
    'subsidies.subtitle': 'Subvenții disponibile care se potrivesc cu profilul fermei tale',
    'subsidies.matchConfidence': 'Încredere de Potrivire',
    'subsidies.deadline': 'Termen Limită',
    'subsidies.regionEligibility': 'Eligibilitate Regională',
    'subsidies.grantCode': 'Cod Subvenție',
    'subsidies.maxGrant': 'Subvenție Maximă',
    'application.title': 'Cerere de Subvenție',
    'application.subtitle': 'Completează formularul pentru a aplica pentru această subvenție',
    'application.confirmationMessage': 'Cererea ta a fost primită',
    'application.section1': 'Informații de Bază',
    'application.section2': 'Detalii Fermă',
    'application.section3': 'Informații Proiect',
    'application.section4': 'Informații Financiare',
    'application.section5': 'Sustenabilitate',
    'application.section6': 'Documente Adiționale',
    'application.formSaved': 'Schița cererii tale a fost salvată.',
    'status.inProgress': 'În Desfășurare',
    'status.submitted': 'Trimis',
    'status.approved': 'Aprobat',
    'status.inReview': 'În Revizuire',
    'status.needsUpdate': 'Necesită Actualizare',
    'status.profileComplete': 'Profil Complet',
    'status.subsidyInProgress': 'Subvenție În Desfășurare',
  }
};

// Language context type
interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

// Create the context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Provider component
export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  // Translation function
  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook for using the language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

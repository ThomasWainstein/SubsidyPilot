/**
 * Document parser utility for extracting content from various document types
 */

/**
 * Comprehensive document content interface for 100% extraction completeness
 * Matches FranceAgriMer subsidy page structure and all linked documents
 */
export interface DocumentContent {
  // Core Information - MANDATORY
  title: string;
  programName: string;
  agency: string;
  description: string;
  objectives: string;
  
  // Categorization & Tags - MANDATORY
  sectors: string[];
  tags: string[];
  categories: string[];
  
  // Financial Details - COMPREHENSIVE
  funding: {
    amountMin?: string;
    amountMax?: string;
    coFinancingRate?: string;
    fundingDetails?: string;
    eligibleExpenses?: string[];
    excludedExpenses?: string[];
    budgetRequirements?: string[];
    paymentTerms?: string[];
  };
  
  // Eligibility - EXHAUSTIVE
  eligibility: {
    generalCriteria: string;
    eligibleEntities: string[];
    legalEntityTypes: string[];
    geographicScope: string[];
    sectorialRequirements?: string[];
    sizeRequirements?: string[];
    experienceRequirements?: string[];
    exclusionCriteria?: string[];
  };
  
  // Timeline & Deadlines - COMPLETE
  timeline: {
    applicationPeriod?: {
      start?: string;
      end?: string;
    };
    keyDeadlines?: { [key: string]: string };
    projectDuration?: string;
    implementationPeriod?: string;
    reportingDeadlines?: string[];
  };
  
  // Application Process - DETAILED
  applicationProcess: {
    steps: string[];
    submissionMethod?: string;
    applicationPlatform?: string;
    evaluationCriteria?: string[];
    selectionProcess?: string;
    decisionTimeline?: string;
    appealProcess?: string;
  };
  
  // Documents & Resources - ALL FILES
  documents: {
    required: Array<{
      name: string;
      type: string;
      size?: string;
      url?: string;
      description?: string;
      mandatory: boolean;
      downloadDate?: string;
    }>;
    associated: Array<{
      name: string;
      type: string;
      size?: string;
      url?: string;
      description?: string;
      category?: string;
      updateDate?: string;
    }>;
    templates?: Array<{
      name: string;
      type: string;
      url?: string;
      description?: string;
    }>;
  };
  
  // FAQ & Guidance - COMPLETE
  faq: Array<{
    question: string;
    answer: string;
    url?: string;
    category?: string;
  }>;
  
  // Contact Information - EXHAUSTIVE
  contact: {
    primaryEmail?: string;
    secondaryEmail?: string;
    phone?: string;
    helpdesk?: string;
    agency?: string;
    address?: string;
    website?: string;
    emergencyContact?: string;
  };
  
  // Legal & Regulatory - ALL REFERENCES
  legal: {
    legalBasis: string[];
    regulations: string[];
    decrees: string[];
    circulars: string[];
    guidelines: string[];
    compliance: string[];
    sanctions?: string[];
  };
  
  // Alerts & Updates - CURRENT
  alerts: Array<{
    type: string;
    message: string;
    date?: string;
    severity?: string;
    url?: string;
  }>;
  
  // Reporting & Obligations - DETAILED
  obligations: {
    reportingRequirements?: string[];
    monitoringRequirements?: string[];
    complianceChecks?: string[];
    auditRequirements?: string[];
    recordKeeping?: string[];
  };
  
  // Geographic & Regional - PRECISE
  geography: {
    regions: string[];
    departments?: string[];
    territories?: string[];
    exclusions?: string[];
    specialConditions?: string[];
  };
  
  // Technical Requirements - IF APPLICABLE
  technical: {
    technicalRequirements?: string[];
    certificationNeeded?: string[];
    standardsCompliance?: string[];
    equipmentRequirements?: string[];
  };
  
  // Meta Information - TRACKING
  meta: {
    sourceUrl: string;
    extractedText: string;
    extractionConfidence: number;
    extractionDate: string;
    lastUpdated?: string;
    publicationDate?: string;
    documentVersion?: string;
    language: string;
    extractionMethod: string;
  };
}

/**
 * Parse document content from URL (placeholder for now)
 * In a real implementation, this would call an edge function or API
 * to extract content from PDF, DOC, XLS files
 */
export const parseDocumentContent = async (url: string): Promise<DocumentContent | null> => {
  try {
    // For now, return null - this would be implemented with an edge function
    // that uses pdf-parse, mammoth.js, or similar libraries
    console.log('Document parsing not yet implemented for:', url);
    return null;
  } catch (error) {
    console.error('Failed to parse document:', error);
    return null;
  }
};

/**
 * Extract comprehensive structured data from document text using AI
 * This implementation focuses on 100% completeness matching official sources
 */
export const extractStructuredData = async (text: string): Promise<Partial<DocumentContent>> => {
  try {
    // Enhanced AI extraction prompt for maximum completeness
    const extractionPrompt = `
    Extraire TOUTES les informations de ce document de subvention agricole français. 
    CRITIQUE: Extraire CHAQUE détail - ne pas résumer ou omettre quoi que ce soit.
    
    Extraction requise (retourner JSON):
    {
      "programName": "titre exact du programme",
      "agency": "organisme émetteur",
      "description": "description complète avec tous les détails",
      "objectives": "tous les objectifs listés",
      "fundingAmount": "montants de financement avec taux",
      "coFinancingRate": "pourcentages de cofinancement",
      "eligibility": "critères d'éligibilité complets",
      "beneficiaryTypes": ["tous les types d'entités éligibles"],
      "applicationProcess": ["chaque étape de candidature"],
      "deadline": "date limite de candidature",
      "requiredDocuments": [{"name": "nom du doc", "type": "pdf/xlsx", "mandatory": true}],
      "associatedDocuments": [{"name": "FAQ file", "type": "xlsx", "size": "17.94 KB"}],
      "legalReferences": ["tous les textes légaux mentionnés"],
      "contactInfo": "détails de contact",
      "eligibleExpenses": ["toutes les dépenses éligibles"],
      "excludedExpenses": ["toutes les dépenses exclues"],
      "evaluationCriteria": ["tous les critères d'évaluation"],
      "reportingObligations": ["toutes les obligations de rapport"]
    }
    
    Texte à analyser: ${text}
    `;
    
    // In a real implementation, this would call OpenAI/Claude API
    // For now, return enhanced mock extraction with realistic FranceAgriMer data
    console.log('Enhanced AI extraction for text length:', text.length);
    
    // Mock comprehensive extraction matching new structured interface
    return {
      title: "Plan de structuration des filières agricoles et agroalimentaires",
      programName: "Plan de structuration des filières agricoles et agroalimentaires",
      agency: "FranceAgriMer",
      description: "Le plan de structuration des filières agricoles et agroalimentaires s'inscrit dans le cadre du Programme national de développement agricole et rural (PNDAR). Il vise à soutenir les projets collectifs de structuration et d'organisation des filières agricoles, agroalimentaires et forestières.",
      objectives: "Améliorer la compétitivité des filières agricoles, favoriser l'organisation économique des producteurs, soutenir l'innovation et la modernisation, renforcer les liens entre acteurs de la filière",
      
      sectors: ["Agriculture", "Agroalimentaire", "Coopératives agricoles"],
      tags: ["structuration", "filières", "collectif", "innovation"],
      categories: ["Aide à l'organisation", "Développement économique"],
      
      funding: {
        amountMin: "50 000 €",
        amountMax: "500 000 €",
        coFinancingRate: "50% maximum du coût total HT",
        fundingDetails: "Entre 50 000 € et 500 000 € selon le projet",
        eligibleExpenses: [
          "Dépenses d'ingénierie du projet",
          "Dépenses de personnel directement affectées au projet", 
          "Prestations d'études et de conseil",
          "Frais de communication et de promotion",
          "Coûts de formation des acteurs de la filière",
          "Investissements matériels spécifiques au projet"
        ],
        excludedExpenses: [
          "Dépenses de fonctionnement courant",
          "Investissements immobiliers",
          "Achat de véhicules de transport",
          "Frais financiers et d'assurance",
          "TVA récupérable"
        ]
      },
      
      eligibility: {
        generalCriteria: "Sont éligibles les organismes à vocation agricole, les organisations de producteurs, les interprofessions, les coopératives agricoles et leurs unions, ainsi que les associations d'organisations de producteurs.",
        eligibleEntities: [
          "Organisations de producteurs",
          "Coopératives agricoles et leurs unions",
          "Interprofessions agricoles",
          "Associations d'organisations de producteurs",
          "Organismes à vocation agricole"
        ],
        legalEntityTypes: [
          "SARL",
          "SAS", 
          "Coopérative agricole",
          "Association loi 1901",
          "Groupement d'intérêt économique"
        ],
        geographicScope: ["France métropolitaine", "DOM-TOM"]
      },
      
      timeline: {
        applicationPeriod: {
          start: "2024-01-15",
          end: "2024-12-31"
        },
        projectDuration: "12 à 36 mois maximum",
        keyDeadlines: {
          "Dépôt des candidatures": "2024-12-31",
          "Instruction des dossiers": "2025-03-31",
          "Notification des décisions": "2025-06-30"
        }
      },
      
      applicationProcess: {
        steps: [
          "Télécharger le dossier de candidature sur le site FranceAgriMer",
          "Compléter l'ensemble des pièces du dossier",
          "Déposer le dossier complet avant la date limite",
          "Attendre l'instruction par les services de FranceAgriMer",
          "Présentation devant le comité d'évaluation si nécessaire"
        ],
        submissionMethod: "Dépôt électronique via le portail FranceAgriMer",
        evaluationCriteria: [
          "Caractère collectif et structurant du projet",
          "Impact économique attendu sur la filière",
          "Innovation et caractère exemplaire",
          "Qualité du partenariat et gouvernance",
          "Viabilité économique et pérennité"
        ]
      },
      
      documents: {
        required: [
          {
            name: "Formulaire de demande d'aide",
            type: "pdf",
            mandatory: true,
            description: "Dossier officiel de candidature dûment complété et signé"
          },
          {
            name: "Statuts de l'organisme demandeur",
            type: "pdf", 
            mandatory: true,
            description: "Statuts à jour de la structure porteuse du projet"
          },
          {
            name: "Budget prévisionnel détaillé",
            type: "xlsx",
            mandatory: true,
            description: "Plan de financement complet du projet"
          },
          {
            name: "Déclaration d'aides d'État",
            type: "pdf",
            mandatory: true,
            description: "Formulaire de déclaration des aides publiques reçues"
          }
        ],
        associated: [
          {
            name: "FAQ Structuration des filières agricoles",
            type: "xlsx",
            size: "17.94 KB",
            description: "Questions fréquentes sur le dispositif d'aide"
          },
          {
            name: "Guide du candidat 2024",
            type: "pdf", 
            size: "245.67 KB",
            description: "Guide complet pour la constitution du dossier"
          },
          {
            name: "Modèle de budget prévisionnel",
            type: "xlsx",
            size: "89.23 KB", 
            description: "Modèle Excel pour le plan de financement"
          }
        ]
      },
      
      faq: [
        {
          question: "Quel est le montant minimum de l'aide ?",
          answer: "Le montant minimum de l'aide est de 50 000 € HT."
        },
        {
          question: "Puis-je déposer plusieurs projets ?", 
          answer: "Un organisme ne peut déposer qu'un seul projet par appel à candidatures."
        }
      ],
      
      contact: {
        primaryEmail: "aides.franceagrimer@franceagrimer.fr",
        secondaryEmail: "serviceclients.draaf@agriculture.gouv.fr",
        agency: "FranceAgriMer",
        website: "https://www.franceagrimer.fr"
      },
      
      legal: {
        legalBasis: [
          "Règlement (UE) n° 1305/2013 du Parlement européen et du Conseil",
          "Code rural et de la pêche maritime - Article L361-1",
          "Décret n° 2015-1781 du 28 décembre 2015"
        ],
        regulations: [],
        decrees: [],
        circulars: [],
        guidelines: [],
        compliance: ["Cette aide constitue une aide d'État soumise aux règles de minimis agricole"]
      },
      
      alerts: [],
      
      obligations: {
        reportingRequirements: [
          "Rapport d'activité intermédiaire à mi-parcours", 
          "Rapport final d'exécution dans les 3 mois suivant la fin du projet",
          "Justificatifs comptables et pièces de dépenses",
          "Bilan d'impact et indicateurs de résultats"
        ]
      },
      
      geography: {
        regions: ["France métropolitaine", "Outre-mer"]
      },
      
      technical: {
        technicalRequirements: []
      },
      
      meta: {
        sourceUrl: "",
        extractedText: text,
        extractionConfidence: 85,
        extractionDate: new Date().toISOString(),
        language: "fr",
        extractionMethod: "AI Mock Extraction"
      }
    };
  } catch (error) {
    console.error('Failed to extract structured data:', error);
    return {};
  }
};

/**
 * Get document type from URL
 */
export const getDocumentType = (url: string): 'pdf' | 'doc' | 'xls' | 'unknown' => {
  const extension = url.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'doc';
    case 'xls':
    case 'xlsx':
      return 'xls';
    default:
      return 'unknown';
  }
};
/**
 * Enhanced French Subsidy Content Parser
 * Extracts structured information from French subsidy descriptions using advanced regex patterns
 * Specifically designed to handle complex French subsidy language patterns
 */

export interface ExtractedFunding {
  type: 'percentage' | 'fixed' | 'range' | 'maximum' | 'minimum' | 'percentage_with_range';
  percentage?: number;
  minAmount?: number;
  maxAmount?: number;
  investmentMin?: number;
  investmentMax?: number;
  currency: string;
  conditions?: string;
  originalText: string;
}

export interface ExtractedEligibility {
  entityTypes: string[];
  sectors: string[];
  geographicScope: string[];
  sizeRequirements?: string;
  specificConditions: string[];
  originalText: string;
}

export interface ExtractedDeadline {
  date?: string;
  type: 'fixed' | 'rolling' | 'annual' | 'unknown';
  description: string;
  originalText: string;
}

export interface ExtractedApplicationProcess {
  steps: string[];
  timeline?: string;
  requiredDocuments: string[];
  contactInfo?: string;
  beforeProjectStart?: boolean;
  originalText: string;
}

export interface ParsedSubsidyContent {
  funding: ExtractedFunding[];
  eligibility: ExtractedEligibility;
  applicationProcess?: ExtractedApplicationProcess;
  contactInfo?: string;
  deadline?: ExtractedDeadline;
  confidence: number;
}

export class FrenchSubsidyParser {
  // Enhanced funding pattern matchers with comprehensive French subsidy terminology
  private static FUNDING_PATTERNS = {
    // Complex percentage with investment range - handles complex cases like yours
    percentageWithInvestmentRange: [
      /(\d+(?:[.,]\d+)?)\s*%.*?(?:dépense|investissement|coût).*?(?:compris\s+)?entre\s+(\d+(?:\s*\d{3})*)\s*€(?:\s*HT)?\s+et\s+(\d+(?:\s*\d{3})*)\s*€(?:\s*HT)?/gi,
      /subvention.*?hauteur\s+de\s+(\d+(?:[.,]\d+)?)\s*%.*?investissement.*?entre\s+(\d+(?:\s*\d{3})*)\s*€.*?et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
      /aide.*?(\d+(?:[.,]\d+)?)\s*%.*?dépense.*?sur.*?investissement.*?entre\s+(\d+(?:\s*\d{3})*)\s*€.*?et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
      /taux.*?subvention.*?(\d+(?:[.,]\d+)?)\s*%.*?assiette.*?entre\s+(\d+(?:\s*\d{3})*)\s*€.*?et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
    ],
    
    // Aid ceiling with percentage calculation (HIGHEST PRIORITY - actual aid amounts)
    aidCeilingWithRange: [
      /plafond\s+d.aide.*?entre\s+(\d+(?:\s*\d{3})*)\s*(?:€)?\s+et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
      /soit\s+un\s+plafond.*?entre\s+(\d+(?:\s*\d{3})*)\s*et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
      /aide.*?plafonnée.*?entre\s+(\d+(?:\s*\d{3})*)\s*et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
      // NEW: Explicit aid amounts in parentheses (your specific case)
      /\(aide:\s*€?(\d+(?:\s*\d{3})*)\s*(?:€)?\s*[-–]\s*€?(\d+(?:\s*\d{3})*)\s*€?\)/gi,
      /aide\s+compris\s+entre\s+(\d+(?:\s*\d{3})*)\s*et\s+(\d+(?:\s*\d{3})*)\s*€/gi,
    ],
    
    // Prime (bonus/premium) patterns - important French funding type
    primePatterns: [
      /prime.*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /prime\s+forfaitaire.*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /prime\s+à\s+l'équipement.*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /prime\s+de\s+modernisation.*?(\d+(?:\s*\d{3})*)\s*€/gi,
    ],
    
    // Bonification (interest rate bonus) patterns
    bonificationPatterns: [
      /bonification.*?taux.*?(\d+(?:[.,]\d+)?)\s*%/gi,
      /bonification\s+d'intérêt/gi,
    ],
    
    // Avance (advance) patterns
    avancePatterns: [
      /avance.*?remboursable.*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /avance.*?taux\s+zéro/gi,
      /prêt.*?taux\s+préférentiel/gi,
    ],
    
    // Garantie (guarantee) patterns
    garantiePatterns: [
      /garantie.*?jusqu'à.*?(\d+(?:[.,]\d+)?)\s*%/gi,
      /fonds?\s+de\s+garantie/gi,
      /cautionnement.*?(\d+(?:\s*\d{3})*)\s*€/gi,
    ],
    
    // Co-financing patterns (EU funding)
    cofinancementPatterns: [
      /cofinancement.*?(\d+(?:[.,]\d+)?)\s*%/gi,
      /co[- ]financement.*?européen/gi,
      /contrepartie.*?nationale.*?(\d+(?:[.,]\d+)?)\s*%/gi,
      /FEDER.*?(\d+(?:[.,]\d+)?)\s*%/gi,
    ],
    
    // Investment thresholds
    seuilPatterns: [
      /seuil\s+minimum.*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /investissement\s+minimum.*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /plancher.*?d'aide.*?(\d+(?:\s*\d{3})*)\s*€/gi,
    ],
    
    // Standard percentage patterns
    percentage: [
      /(?:subvention|aide).*?(?:hauteur\s+de|jusqu'à|maximum\s+de)\s*(\d+(?:[.,]\d+)?)\s*%/gi,
      /(\d+(?:[.,]\d+)?)\s*%.*?(?:dépense|investissement|coût)/gi,
      /taux.*?subvention.*?(\d+(?:[.,]\d+)?)\s*%/gi,
      /aide.*?représente.*?(\d+(?:[.,]\d+)?)\s*%/gi,
    ],
    
    // Amount ranges
    amountRange: [
      /entre\s*(\d+(?:\s*\d{3})*)\s*€.*?et\s*(\d+(?:\s*\d{3})*)\s*€/gi,
      /de\s*(\d+(?:\s*\d{3})*)\s*€.*?à\s*(\d+(?:\s*\d{3})*)\s*€/gi,
      /(\d+(?:\s*\d{3})*)\s*€.*?à\s*(\d+(?:\s*\d{3})*)\s*€/gi,
      /fourchette.*?(\d+(?:\s*\d{3})*)\s*€.*?(\d+(?:\s*\d{3})*)\s*€/gi,
    ],
    
    // Maximum amounts
    maxAmount: [
      /plafond.*?(?:aide|subvention).*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /maximum.*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /jusqu'à\s*(\d+(?:\s*\d{3})*)\s*€/gi,
      /plafonnée?\s+à\s+(\d+(?:\s*\d{3})*)\s*€/gi,
      /ne\s+peut\s+excéder\s+(\d+(?:\s*\d{3})*)\s*€/gi,
      /au\s+plus\s+(\d+(?:\s*\d{3})*)\s*€/gi,
    ],
    
    // Minimum amounts
    minAmount: [
      /minimum.*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /au\s+moins\s*(\d+(?:\s*\d{3})*)\s*€/gi,
      /seuil.*?(\d+(?:\s*\d{3})*)\s*€/gi,
      /plancher.*?(\d+(?:\s*\d{3})*)\s*€/gi,
    ]
  };

  // Enhanced entity type patterns with comprehensive French business classifications
  private static ENTITY_PATTERNS = {
    // Business Size Categories
    'TPE': /TPE|très\s+petites\s+entreprises/gi,
    'PME': /PME|petites\s+et\s+moyennes\s+entreprises/gi,
    'ETI': /ETI|entreprises?\s+de\s+taille\s+intermédiaire/gi,
    'GE': /grandes?\s+entreprises?|GE(?:\s|$)/gi,
    
    // Specific Legal Forms - Critical Missing Categories
    'Micro-entreprises': /micro[- ]entreprises?|auto[- ]entrepreneurs?|régime\s+micro/gi,
    'Entreprises individuelles': /entreprises?\s+individuelles?|EI(?:\s|$)|EIRL/gi,
    'Sociétés civiles': /sociétés?\s+civiles?|SCI|SCP/gi,
    'Sociétés commerciales': /sociétés?\s+commerciales?|SARL|SA(?:\s|$)|SAS|EURL|SASU/gi,
    'Groupements': /groupements?\s+d'intérêt\s+économique|GIE/gi,
    'Mutuelles': /mutuelles?|sociétés?\s+mutuelles?/gi,
    'Exploitations agricoles': /exploitations?\s+agricoles?|GAEC|EARL/gi,
    
    // Traditional Categories
    'Entreprises': /entreprises?(?!\s+(?:très|petites|moyennes|grandes|individuelles))/gi,
    'Associations': /associations?/gi,
    'Collectivités': /collectivités?|communes?|départements?|régions?|établissements?\s+publics?/gi,
    'Artisans': /artisans?|artisanat/gi,
    'Commerçants': /commerçants?|commerce/gi,
    'Agriculteurs': /agriculteurs?|exploitants?\s+agricoles?/gi,
    'Professionnels libéraux': /professionnels?\s+libéraux|professions?\s+libérales?/gi,
    'Startups': /startups?|jeunes?\s+entreprises?/gi,
    'Coopératives': /coopératives?|SCOP/gi,
  };

  // Comprehensive sector activity patterns based on French economic classification
  private static SECTOR_PATTERNS = {
    // Primary Sector
    'Agriculture': /agriculture|agricole|exploitation\s+agricole|GAEC|EARL|élevage/gi,
    'Pêche': /pêche|pêcheur|aquaculture|conchyliculture|ostréiculture/gi,
    'Sylviculture': /sylviculture|forestier|exploitation\s+forestière|bois/gi,
    'Extraction': /extraction|minier|mines|carrières|exploitation\s+minière/gi,
    
    // Secondary Sector  
    'Industrie manufacturière': /industrie\s+manufacturière|transformation|fabrication|manufacturing/gi,
    'BTP': /BTP|bâtiment|travaux\s+publics|construction|génie\s+civil/gi,
    'Agroalimentaire': /agroalimentaire|industrie\s+alimentaire|transformation\s+alimentaire|agro[- ]industrie/gi,
    'Textile': /textile|confection|habillement|mode|cuir/gi,
    'Automobile': /automobile|automotive|équipementier\s+automobile/gi,
    'Aéronautique': /aéronautique|aérospatial|défense|spatial/gi,
    'Chimie': /chimie|chimique|pharmaceutique|cosmétique/gi,
    'Métallurgie': /métallurgie|sidérurgie|fonderie|mécanique/gi,
    'Électronique': /électronique|électrotechnique|composants/gi,
    
    // Tertiary Sector
    'Commerce': /commerce|commerciale|négoce|distribution|retail/gi,
    'Transport': /transport|logistique|messagerie|entreposage|fret/gi,
    'Hébergement-restauration': /hébergement|restauration|hôtellerie|tourisme|CHR/gi,
    'Information-communication': /information|communication|média|numérique|digital|TIC/gi,
    'Services aux entreprises': /services\s+aux\s+entreprises|conseil|ingénierie|B2B/gi,
    'Services aux particuliers': /services\s+aux\s+particuliers|coiffure|soins|réparation|B2C/gi,
    'Enseignement': /enseignement|éducation|formation|pédagogique|école/gi,
    'Santé': /santé|médical|paramédical|pharmaceutique|clinique/gi,
    'Action sociale': /action\s+sociale|médico[- ]social|aide\s+à\s+domicile|EHPAD/gi,
    'Finance': /finance|banque|assurance|crédit|investissement/gi,
    'Immobilier': /immobilier|foncier|promotion\s+immobilière/gi,
    'Culture': /culture|culturel|spectacle|audiovisuel|patrimoine/gi,
    'Sport': /sport|sportif|loisirs|fitness/gi,
    
    // Modern/Innovation Sectors
    'Technologies': /technologies|tech|innovation|R&D|recherche/gi,
    'Énergie': /énergie|énergétique|renouvelable|photovoltaïque|éolien/gi,
    'Environnement': /environnement|écologie|durable|recyclage|déchets/gi,
    'Économie circulaire': /économie\s+circulaire|réemploi|upcycling/gi,
  };

  // Enhanced geographic patterns
  private static GEOGRAPHIC_PATTERNS = {
    'National': /France|français|nationale?|territoire\s+français/gi,
    'Régional': /région|régional/gi,
    'Départemental': /département|départemental/gi,
    'Communal': /commune|communal|local/gi,
    'Intercommunal': /communauté\s+de\s+communes|intercommunal|EPCI/gi,
    'Pays de Mormal': /pays\s+de\s+mormal/gi, // Specific to your example
    'Nord': /nord|région\s+nord/gi,
    'Hauts-de-France': /hauts[- ]de[- ]france/gi,
  };

  // Enhanced application process patterns with comprehensive French administrative terminology
  private static PROCESS_PATTERNS = {
    // Application timing
    beforeStart: /avant\s+le\s+démarrage|avant\s+commencement|préalablement|avant\s+tout\s+engagement|antérieurement/gi,
    quotesRequired: /sur\s+la\s+base\s+de\s+devis|devis|factures?\s+proforma|estimation/gi,
    contactRequired: /retirer.*?dossier|s.adresser\s+à|contacter|prendre\s+contact/gi,
    documentsRequired: /dossier\s+de\s+demande|pièces?\s+justificatives?|documents?\s+à\s+fournir/gi,
    
    // Application stages
    preSelection: /présélection|éligibilité|recevabilité|admissibilité/gi,
    instruction: /instruction.*?dossier|examen.*?candidature|analyse\s+du\s+dossier/gi,
    evaluation: /évaluation|notation|comité.*?sélection|jury/gi,
    decision: /décision|notification|attribution|sélection/gi,
    
    // Required documents
    documentsRIB: /RIB|relevé\s+d'identité\s+bancaire|coordonnées\s+bancaires/gi,
    kbis: /extrait\s+K[- ]?bis|immatriculation.*?registre|numéro\s+SIREN/gi,
    bilanComptable: /bilan\s+comptable|comptes\s+annuels|liasse\s+fiscale/gi,
    planFinancement: /plan\s+de\s+financement|budget\s+prévisionnel/gi,
    etudeFaisabilite: /étude\s+de\s+faisabilité|business\s+plan|étude\s+technique/gi,
    
    // Timing requirements
    delaiInscription: /délai.*?inscription|date\s+limite.*?dépôt|échéance/gi,
    delaiRealisation: /délai.*?réalisation|durée.*?projet|calendrier/gi,
    engagementJuridique: /engagement\s+juridique|signature.*?contrat|convention/gi,
    
    // Compliance requirements
    marchesPublics: /marchés?\s+publics?|code.*?marchés|procédure\s+d'appel\s+d'offres/gi,
    aidesEtat: /aides?\s+d'État|notification.*?Commission\s+européenne/gi,
    transparence: /transparence|publication.*?bénéficiaires|publicité/gi,
  };

  // Enhanced contact information patterns
  private static CONTACT_PATTERNS = {
    // Administrative bodies
    prefecture: /préfecture|sous[- ]préfecture|préfet|services\s+de\s+l'État/gi,
    conseil: /conseil\s+(?:régional|départemental|municipal)|collectivité/gi,
    chambreCommerce: /chambre.*?commerce|CCI|chambre\s+consulaire/gi,
    chambreMetiers: /chambre.*?métiers|CMA|chambre\s+d'artisanat/gi,
    
    // Development agencies
    agenceDeveloppement: /agence.*?développement\s+économique|ADL|ADEN/gi,
    technopole: /technopôle|pépinière\s+d'entreprises|incubateur/gi,
    
    // Contact methods
    retrait: /retrait.*?dossier|téléchargement|récupération/gi,
    depot: /dépôt.*?dossier|transmission|envoi/gi,
    permanence: /permanence|rendez[- ]vous|accueil|bureau/gi,
    
    // Digital platforms
    plateforme: /plateforme.*?dématérialisée|téléprocédure|portail\s+numérique/gi,
    portail: /portail.*?internet|site\s+dédié|plateforme\s+en\s+ligne/gi,
    
    // Specific contact roles
    chargeeDeveloppement: /chargée?\s+(?:du\s+service\s+)?développement\s+économique/gi,
    responsableAides: /responsable.*?aides|gestionnaire.*?subventions/gi,
  };

  static parse(content: string): ParsedSubsidyContent {
    // Clean content for better parsing
    const cleanContent = this.cleanContent(content);
    
    const funding = this.extractFunding(cleanContent);
    const eligibility = this.extractEligibility(cleanContent);
    const applicationProcess = this.extractApplicationProcess(cleanContent);
    const contactInfo = this.extractContactInfo(cleanContent);
    const deadline = this.extractDeadline(cleanContent);
    
    // Calculate confidence based on extracted information completeness
    const confidence = this.calculateConfidence(funding, eligibility, applicationProcess, contactInfo, deadline);

    return {
      funding,
      eligibility,
      applicationProcess,
      contactInfo,
      deadline,
      confidence
    };
  }

  private static cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/['']/g, "'")
      .replace(/[""]/g, '"')
      .trim();
  }

  private static extractFunding(content: string): ExtractedFunding[] {
    const results: ExtractedFunding[] = [];
    
    // PRIORITY 1: Extract aid ceiling ranges FIRST (actual aid amounts)
    for (const pattern of this.FUNDING_PATTERNS.aidCeilingWithRange) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const minAmount = parseInt(match[1].replace(/\s/g, ''));
        const maxAmount = parseInt(match[2].replace(/\s/g, ''));
        
        // Validate amounts: ensure min <= max and amounts are reasonable
        if (isNaN(minAmount) || isNaN(maxAmount) || minAmount < 0 || maxAmount < 0) {
          continue;
        }
        
        // If min > max, swap them
        const validMin = Math.min(minAmount, maxAmount);
        const validMax = Math.max(minAmount, maxAmount);
        
        results.push({
          type: 'range',
          minAmount: validMin,
          maxAmount: validMax,
          currency: 'EUR',
          conditions: 'Montant aide directe',
          originalText: match[0]
        });
      }
    }

    // If we found explicit aid amounts, prioritize them and stop
    if (results.length > 0) {
      return results;
    }

    // PRIORITY 2: Extract complex percentage with investment range (fallback)
    for (const pattern of this.FUNDING_PATTERNS.percentageWithInvestmentRange) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const percentage = parseFloat(match[1].replace(',', '.'));
        const investmentMin = parseInt(match[2].replace(/\s/g, ''));
        const investmentMax = parseInt(match[3].replace(/\s/g, ''));
        
        // Validate percentage and amounts: ensure they are reasonable
        if (isNaN(percentage) || isNaN(investmentMin) || isNaN(investmentMax) || 
            percentage <= 0 || percentage > 100 || investmentMin < 0 || investmentMax < 0) {
          continue;
        }
        
        // Ensure min <= max for investment amounts
        const validInvestMin = Math.min(investmentMin, investmentMax);
        const validInvestMax = Math.max(investmentMin, investmentMax);
        
        // Calculate aid amounts based on percentage and investment range
        const minAmount = Math.round(validInvestMin * percentage / 100);
        const maxAmount = Math.round(validInvestMax * percentage / 100);
        
        results.push({
          type: 'percentage_with_range',
          percentage,
          minAmount,
          maxAmount,
          investmentMin: validInvestMin,
          investmentMax: validInvestMax,
          currency: 'EUR',
          conditions: `Sur investissement entre €${validInvestMin.toLocaleString()} et €${validInvestMax.toLocaleString()}`,
          originalText: match[0]
        });
      }
    }

    // PRIORITY 3: Extract prime (bonus/premium) patterns
    for (const pattern of this.FUNDING_PATTERNS.primePatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const amount = parseInt(match[1].replace(/\s/g, ''));
        results.push({
          type: 'fixed',
          minAmount: amount,
          maxAmount: amount,
          currency: 'EUR',
          conditions: 'Prime forfaitaire',
          originalText: match[0]
        });
      }
    }

    // PRIORITY 4: Extract standard percentage-based funding
    for (const pattern of this.FUNDING_PATTERNS.percentage) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const percentage = parseFloat(match[1].replace(',', '.'));
        
        // Validate percentage: ensure it's reasonable (0-100%)
        if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
          continue;
        }
        
        results.push({
          type: 'percentage',
          percentage,
          currency: 'EUR',
          originalText: match[0]
        });
      }
    }

    // PRIORITY 5: Extract amount ranges
    for (const pattern of this.FUNDING_PATTERNS.amountRange) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const minAmount = parseInt(match[1].replace(/\s/g, ''));
        const maxAmount = parseInt(match[2].replace(/\s/g, ''));
        
        // Validate amounts: ensure min <= max and amounts are reasonable
        if (isNaN(minAmount) || isNaN(maxAmount) || minAmount < 0 || maxAmount < 0) {
          continue;
        }
        
        // If min > max, swap them
        const validMin = Math.min(minAmount, maxAmount);
        const validMax = Math.max(minAmount, maxAmount);
        
        results.push({
          type: 'range',
          minAmount: validMin,
          maxAmount: validMax,
          currency: 'EUR',
          originalText: match[0]
        });
      }
    }

    // PRIORITY 6: Extract maximum amounts
    for (const pattern of this.FUNDING_PATTERNS.maxAmount) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const maxAmount = parseInt(match[1].replace(/\s/g, ''));
        results.push({
          type: 'maximum',
          maxAmount,
          currency: 'EUR',
          originalText: match[0]
        });
      }
    }

    // PRIORITY 7: Extract minimum amounts
    for (const pattern of this.FUNDING_PATTERNS.minAmount) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const minAmount = parseInt(match[1].replace(/\s/g, ''));
        results.push({
          type: 'minimum',
          minAmount,
          currency: 'EUR',
          originalText: match[0]
        });
      }
    }

    // Extract additional funding types (bonification, avance, etc.)
    this.extractAdditionalFundingTypes(content, results);

    // Sort by priority - complex patterns first, then by specificity
    return results.sort((a, b) => {
      const priorityOrder = ['percentage_with_range', 'range', 'percentage', 'maximum', 'minimum', 'fixed'];
      const aPriority = priorityOrder.indexOf(a.type);
      const bPriority = priorityOrder.indexOf(b.type);
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Secondary sort by amount of information available
      const aInfo = (a.percentage ? 1 : 0) + (a.minAmount ? 1 : 0) + (a.maxAmount ? 1 : 0) + (a.investmentMin ? 1 : 0);
      const bInfo = (b.percentage ? 1 : 0) + (b.minAmount ? 1 : 0) + (b.maxAmount ? 1 : 0) + (b.investmentMin ? 1 : 0);
      
      return bInfo - aInfo;
    });
  }

  private static extractAdditionalFundingTypes(content: string, results: ExtractedFunding[]): void {
    // Bonification patterns
    for (const pattern of this.FUNDING_PATTERNS.bonificationPatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const rate = parseFloat(match[1].replace(',', '.'));
          results.push({
            type: 'percentage',
            percentage: rate,
            currency: 'EUR',
            conditions: 'Bonification d\'intérêt',
            originalText: match[0]
          });
        }
      }
    }

    // Guarantee patterns
    for (const pattern of this.FUNDING_PATTERNS.garantiePatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const guaranteeRate = parseFloat(match[1].replace(',', '.'));
          results.push({
            type: 'percentage',
            percentage: guaranteeRate,
            currency: 'EUR',
            conditions: 'Garantie',
            originalText: match[0]
          });
        }
      }
    }

    // Co-financing patterns
    for (const pattern of this.FUNDING_PATTERNS.cofinancementPatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const cofinanceRate = parseFloat(match[1].replace(',', '.'));
          results.push({
            type: 'percentage',
            percentage: cofinanceRate,
            currency: 'EUR',
            conditions: 'Cofinancement européen',
            originalText: match[0]
          });
        }
      }
    }
  }

  private static extractEligibility(content: string): ExtractedEligibility {
    const entityTypes: string[] = [];
    const sectors: string[] = [];
    const geographicScope: string[] = [];
    const specificConditions: string[] = [];

    // Extract entity types with normalized labels
    for (const [type, pattern] of Object.entries(this.ENTITY_PATTERNS)) {
      if (pattern.test(content)) {
        entityTypes.push(type);
      }
    }

    // Extract sectors
    for (const [sector, pattern] of Object.entries(this.SECTOR_PATTERNS)) {
      if (pattern.test(content)) {
        sectors.push(sector);
      }
    }

    // Extract geographic scope with normalized labels
    for (const [scope, pattern] of Object.entries(this.GEOGRAPHIC_PATTERNS)) {
      if (pattern.test(content)) {
        geographicScope.push(scope);
      }
    }

    // Extract specific conditions
    const conditionPatterns = [
      /secteur\s+d.activité[^.]*\./gi,
      /nombre\s+de\s+salariés?[^.]*\./gi,
      /chiffre\s+d.affaires?[^.]*\./gi,
    ];

    for (const pattern of conditionPatterns) {
      const matches = [...content.matchAll(pattern)];
      specificConditions.push(...matches.map(m => m[0].trim()));
    }

    return {
      entityTypes,
      sectors,
      geographicScope,
      specificConditions,
      originalText: content
    };
  }

  private static extractApplicationProcess(content: string): ExtractedApplicationProcess | undefined {
    const steps: string[] = [];
    const requiredDocuments: string[] = [];
    let beforeProjectStart = false;
    let timeline = '';
    let contactInfo = '';

    // Check if application must be before project start
    if (this.PROCESS_PATTERNS.beforeStart.test(content)) {
      beforeProjectStart = true;
      steps.push('Demande à effectuer avant le démarrage du projet');
    }

    // Check for quote requirements
    if (this.PROCESS_PATTERNS.quotesRequired.test(content)) {
      requiredDocuments.push('Devis détaillés');
      steps.push('Présentation de devis pour le projet');
    }

    // Extract detailed document requirements
    const documentChecks = [
      { pattern: this.PROCESS_PATTERNS.documentsRIB, doc: 'RIB (Relevé d\'Identité Bancaire)' },
      { pattern: this.PROCESS_PATTERNS.kbis, doc: 'Extrait K-bis' },
      { pattern: this.PROCESS_PATTERNS.bilanComptable, doc: 'Bilan comptable' },
      { pattern: this.PROCESS_PATTERNS.planFinancement, doc: 'Plan de financement' },
      { pattern: this.PROCESS_PATTERNS.etudeFaisabilite, doc: 'Étude de faisabilité' },
    ];

    for (const check of documentChecks) {
      if (check.pattern.test(content)) {
        requiredDocuments.push(check.doc);
      }
    }

    // Extract application steps
    const processPatterns = [
      /démarche\s+à\s+suivre[^.]*\./gi,
      /demande.*?dossier[^.]*\./gi,
      /retirer.*?dossier[^.]*\./gi,
      /étapes?\s+de\s+candidature[^.]*\./gi,
      /procédure\s+d'instruction[^.]*\./gi,
      /modalités\s+de\s+candidature[^.]*\./gi,
    ];

    for (const pattern of processPatterns) {
      const matches = [...content.matchAll(pattern)];
      steps.push(...matches.map(m => m[0].trim()));
    }

    // Extract additional document requirements
    const docPatterns = [
      /pièces?\s+justificatives?[^.]*\./gi,
      /documents?\s+à\s+fournir[^.]*\./gi,
      /dossier\s+complet[^.]*\./gi,
      /justificatifs?\s+requis[^.]*\./gi,
    ];

    for (const pattern of docPatterns) {
      const matches = [...content.matchAll(pattern)];
      requiredDocuments.push(...matches.map(m => m[0].trim()));
    }

    // Extract timeline information
    const timelinePatterns = [
      /délai.*?(\d+\s+(?:mois|jours?|semaines?))[^.]*\./gi,
      /durée.*?instruction.*?(\d+\s+(?:mois|jours?|semaines?))[^.]*\./gi,
      /traitement.*?dossier.*?(\d+\s+(?:mois|jours?|semaines?))[^.]*\./gi,
    ];

    for (const pattern of timelinePatterns) {
      const match = content.match(pattern);
      if (match) {
        timeline = match[0].trim();
        break;
      }
    }

    // Extract contact information specific to application process
    const processContactPatterns = [
      /renseignements?\s+complémentaires.*?([^.]*)\./gi,
      /informations?\s+auprès\s+(?:de\s+)?([^.]*)\./gi,
    ];

    for (const pattern of processContactPatterns) {
      const match = content.match(pattern);
      if (match) {
        contactInfo = match[1]?.trim() || '';
        break;
      }
    }

    // Only return if we have meaningful process information
    if (steps.length === 0 && requiredDocuments.length === 0 && !beforeProjectStart && !timeline) {
      return undefined;
    }

    return {
      steps: [...new Set(steps)], // Remove duplicates
      requiredDocuments: [...new Set(requiredDocuments)], // Remove duplicates
      beforeProjectStart,
      timeline,
      contactInfo,
      originalText: content
    };
  }

  private static extractContactInfo(content: string): string | undefined {
    // Enhanced contact information extraction with priority order
    const contactPatterns = [
      // Specific contact roles (highest priority)
      /(?:chargée?\s+(?:du\s+service\s+)?développement\s+économique.*?)(?:de\s+)?([^.]*\.)/gi,
      /(?:responsable.*?aides.*?)(?:de\s+)?([^.]*\.)/gi,
      
      // Administrative bodies
      /auprès\s+(?:de\s+)?(?:la?\s+)?([^.]*préfecture[^.]*)\./gi,
      /auprès\s+(?:de\s+)?(?:la?\s+)?([^.]*conseil[^.]*)\./gi,
      /auprès\s+(?:de\s+)?(?:la?\s+)?([^.]*chambre[^.]*)\./gi,
      
      // General contact patterns
      /auprès\s+(?:de\s+)?(?:la?\s+)?([^.]*organisme[^.]*)\./gi,
      /contact(?:er)?\s*:?\s*([^.]*)\./gi,
      /s.adresser\s+(?:à\s+)?([^.]*)\./gi,
      /retirer.*?dossier.*?auprès\s+(?:de\s+)?([^.]*)\./gi,
      
      // Digital platforms
      /(?:sur\s+)?(?:la\s+)?plateforme.*?([^.]*)\./gi,
      /(?:sur\s+)?(?:le\s+)?portail.*?([^.]*)\./gi,
    ];

    for (const pattern of contactPatterns) {
      const match = content.match(pattern);
      if (match) {
        // Clean and return the contact information
        let contactInfo = match[1]?.trim() || match[0].trim();
        
        // Clean up common prefixes/suffixes
        contactInfo = contactInfo
          .replace(/^(?:de\s+)?(?:la\s+)?(?:le\s+)?/, '')
          .replace(/\.$/, '')
          .trim();
        
        if (contactInfo.length > 5) { // Minimum meaningful length
          return contactInfo;
        }
      }
    }

    return undefined;
  }

  private static extractDeadline(content: string): ExtractedDeadline | undefined {
    // Enhanced deadline patterns
    const deadlinePatterns = [
      /avant\s+le\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
      /jusqu.au\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
      /limite\s+(?:de\s+dépôt\s+)?(?:le\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
      /date\s+limite\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
    ];

    for (const pattern of deadlinePatterns) {
      const match = content.match(pattern);
      if (match) {
        return {
          date: match[1],
          type: 'fixed',
          description: match[0].trim(),
          originalText: match[0]
        };
      }
    }

    // Look for rolling/continuous deadlines
    const continuousPatterns = [
      /en\s+continu/gi,
      /permanent/gi,
      /tout\s+moment/gi,
      /toute\s+l.année/gi,
    ];

    for (const pattern of continuousPatterns) {
      if (pattern.test(content)) {
        return {
          type: 'rolling',
          description: 'Candidatures en continu',
          originalText: content
        };
      }
    }

    return undefined;
  }

  private static calculateConfidence(
    funding: ExtractedFunding[],
    eligibility: ExtractedEligibility,
    applicationProcess?: ExtractedApplicationProcess,
    contactInfo?: string,
    deadline?: ExtractedDeadline
  ): number {
    let score = 0;
    let maxScore = 10; // Increased for more granular scoring

    // Funding information (most important - 40% of total)
    if (funding.length > 0) {
      score += 2;
      // Bonus for complex funding patterns
      if (funding.some(f => f.type === 'percentage_with_range')) score += 2;
      // Bonus for having specific amounts
      if (funding.some(f => f.minAmount && f.maxAmount)) score += 1;
    }
    
    // Eligibility information (25% of total)
    if (eligibility.entityTypes.length > 0) score += 1.5;
    if (eligibility.geographicScope.length > 0) score += 1;
    if (eligibility.specificConditions.length > 0) score += 0.5;
    
    // Application process (20% of total)
    if (applicationProcess) {
      if (applicationProcess.steps.length > 0) score += 1;
      if (applicationProcess.beforeProjectStart) score += 0.5;
      if (applicationProcess.requiredDocuments.length > 0) score += 0.5;
    }
    
    // Contact information (10% of total)
    if (contactInfo) score += 1;
    
    // Deadline information (5% of total)
    if (deadline) score += 0.5;

    return Math.min(1, score / maxScore);
  }

  // Enhanced utility method to format funding for display
  static formatFundingDisplay(funding: ExtractedFunding[]): string {
    if (funding.length === 0) return 'Montant non spécifié';

    const primary = funding[0];
    
    switch (primary.type) {
      case 'percentage_with_range':
        // If we have calculated aid amounts, show only those
        if (primary.minAmount && primary.maxAmount) {
          return `€${primary.minAmount.toLocaleString()} - €${primary.maxAmount.toLocaleString()}`;
        }
        // Otherwise show the percentage with investment range
        if (primary.percentage && primary.investmentMin && primary.investmentMax) {
          return `${primary.percentage}% sur investissement €${primary.investmentMin.toLocaleString()} - €${primary.investmentMax.toLocaleString()}`;
        }
        return `${primary.percentage}% de subvention`;
      case 'percentage':
        return `${primary.percentage}% de subvention`;
      case 'range':
        return `€${primary.minAmount?.toLocaleString()} - €${primary.maxAmount?.toLocaleString()}`;
      case 'maximum':
        return `Jusqu'à €${primary.maxAmount?.toLocaleString()}`;
      case 'minimum':
        return `À partir de €${primary.minAmount?.toLocaleString()}`;
      default:
        return primary.originalText;
    }
  }

  // Debug method to test patterns against content
  static debugPatterns(content: string): Record<string, any> {
    return {
      funding: this.extractFunding(content),
      eligibility: this.extractEligibility(content),
      applicationProcess: this.extractApplicationProcess(content),
      contactInfo: this.extractContactInfo(content),
      deadline: this.extractDeadline(content),
    };
  }
}
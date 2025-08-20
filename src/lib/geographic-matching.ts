/**
 * Enhanced Geographic Matching for French Administrative Regions
 * Handles regional reorganizations, administrative changes, and synonyms
 */

export interface GeographicMatch {
  score: number;
  matches: boolean;
  reason: string;
  confidence: number;
  matchType: 'exact' | 'contains' | 'synonym' | 'parent' | 'child' | 'national' | 'european';
  blocker?: string;
}

export class FrenchGeographicMatcher {
  
  // French administrative region mappings with historical names
  private static readonly REGIONS = {
    'nouvelle-aquitaine': {
      current: 'Nouvelle-Aquitaine',
      former: ['Aquitaine', 'Limousin', 'Poitou-Charentes'],
      departments: ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'],
      aliases: ['nouvelle aquitaine', 'nouvelleaquitaine']
    },
    'occitanie': {
      current: 'Occitanie',
      former: ['Languedoc-Roussillon', 'Midi-Pyrénées'],
      departments: ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'],
      aliases: ['occitanie', 'languedoc', 'midi-pyrénées']
    },
    'auvergne-rhône-alpes': {
      current: 'Auvergne-Rhône-Alpes',
      former: ['Auvergne', 'Rhône-Alpes'],
      departments: ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'],
      aliases: ['auvergne rhône alpes', 'rhone alpes', 'auvergne']
    },
    'grand-est': {
      current: 'Grand Est',
      former: ['Alsace', 'Champagne-Ardenne', 'Lorraine'],
      departments: ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'],
      aliases: ['grand est', 'alsace', 'lorraine', 'champagne']
    },
    'provence-alpes-côte-dazur': {
      current: 'Provence-Alpes-Côte d\'Azur',
      former: ['Provence-Alpes-Côte d\'Azur'],
      departments: ['04', '05', '06', '13', '83', '84'],
      aliases: ['paca', 'provence', 'côte azur', 'alpes maritimes']
    },
    'hauts-de-france': {
      current: 'Hauts-de-France',
      former: ['Nord-Pas-de-Calais', 'Picardie'],
      departments: ['02', '59', '60', '62', '80'],
      aliases: ['hauts de france', 'nord pas de calais', 'picardie']
    },
    'bretagne': {
      current: 'Bretagne',
      former: ['Bretagne'],
      departments: ['22', '29', '35', '56'],
      aliases: ['bretagne', 'brittany']
    },
    'normandie': {
      current: 'Normandie',
      former: ['Basse-Normandie', 'Haute-Normandie'],
      departments: ['14', '27', '50', '61', '76'],
      aliases: ['normandie', 'basse normandie', 'haute normandie']
    },
    'pays-de-la-loire': {
      current: 'Pays de la Loire',
      former: ['Pays de la Loire'],
      departments: ['44', '49', '53', '72', '85'],
      aliases: ['pays de la loire', 'pays loire']
    },
    'centre-val-de-loire': {
      current: 'Centre-Val de Loire',
      former: ['Centre'],
      departments: ['18', '28', '36', '37', '41', '45'],
      aliases: ['centre val de loire', 'centre', 'val de loire']
    },
    'bourgogne-franche-comté': {
      current: 'Bourgogne-Franche-Comté',
      former: ['Bourgogne', 'Franche-Comté'],
      departments: ['21', '25', '39', '58', '70', '71', '89', '90'],
      aliases: ['bourgogne franche comté', 'bourgogne', 'franche comté']
    },
    'île-de-france': {
      current: 'Île-de-France',
      former: ['Île-de-France'],
      departments: ['75', '77', '78', '91', '92', '93', '94', '95'],
      aliases: ['ile de france', 'idf', 'paris region', 'région parisienne']
    }
  };

  // Department to region mapping
  private static readonly DEPARTMENTS = {
    '75': 'Paris', '77': 'Seine-et-Marne', '78': 'Yvelines', '91': 'Essonne',
    '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis', '94': 'Val-de-Marne', '95': 'Val-d\'Oise',
    '01': 'Ain', '02': 'Aisne', '03': 'Allier', '04': 'Alpes-de-Haute-Provence',
    '05': 'Hautes-Alpes', '06': 'Alpes-Maritimes', '07': 'Ardèche', '08': 'Ardennes',
    '09': 'Ariège', '10': 'Aube', '11': 'Aude', '12': 'Aveyron',
    '13': 'Bouches-du-Rhône', '14': 'Calvados', '15': 'Cantal', '16': 'Charente',
    '17': 'Charente-Maritime', '18': 'Cher', '19': 'Corrèze', '21': 'Côte-d\'Or',
    '22': 'Côtes-d\'Armor', '23': 'Creuse', '24': 'Dordogne', '25': 'Doubs',
    '26': 'Drôme', '27': 'Eure', '28': 'Eure-et-Loir', '29': 'Finistère',
    '30': 'Gard', '31': 'Haute-Garonne', '32': 'Gers', '33': 'Gironde',
    '34': 'Hérault', '35': 'Ille-et-Vilaine', '36': 'Indre', '37': 'Indre-et-Loire',
    '38': 'Isère', '39': 'Jura', '40': 'Landes', '41': 'Loir-et-Cher',
    '42': 'Loire', '43': 'Haute-Loire', '44': 'Loire-Atlantique', '45': 'Loiret',
    '46': 'Lot', '47': 'Lot-et-Garonne', '48': 'Lozère', '49': 'Maine-et-Loire',
    '50': 'Manche', '51': 'Marne', '52': 'Haute-Marne', '53': 'Mayenne',
    '54': 'Meurthe-et-Moselle', '55': 'Meuse', '56': 'Morbihan', '57': 'Moselle',
    '58': 'Nièvre', '59': 'Nord', '60': 'Oise', '61': 'Orne',
    '62': 'Pas-de-Calais', '63': 'Puy-de-Dôme', '64': 'Pyrénées-Atlantiques', '65': 'Hautes-Pyrénées',
    '66': 'Pyrénées-Orientales', '67': 'Bas-Rhin', '68': 'Haut-Rhin', '69': 'Rhône',
    '70': 'Haute-Saône', '71': 'Saône-et-Loire', '72': 'Sarthe', '73': 'Savoie',
    '74': 'Haute-Savoie', '76': 'Seine-Maritime', '79': 'Deux-Sèvres', '80': 'Somme',
    '81': 'Tarn', '82': 'Tarn-et-Garonne', '83': 'Var', '84': 'Vaucluse',
    '85': 'Vendée', '86': 'Vienne', '87': 'Haute-Vienne', '88': 'Vosges',
    '89': 'Yonne', '90': 'Territoire de Belfort'
  };

  /**
   * Enhanced geographic matching with confidence scoring
   */
  static calculateMatch(
    farmLocation: string,
    subsidyRegions: string[]
  ): GeographicMatch {
    if (!farmLocation || !subsidyRegions || subsidyRegions.length === 0) {
      return {
        score: 0,
        matches: false,
        reason: 'Informations géographiques insuffisantes',
        confidence: 0,
        matchType: 'exact',
        blocker: 'Localisation de la ferme ou zones éligibles non spécifiées'
      };
    }

    const normalizedFarm = this.normalizeLocation(farmLocation);
    const normalizedSubsidyRegions = subsidyRegions.map(r => this.normalizeLocation(r));

    // Check each subsidy region for matches
    for (const subsidyRegion of normalizedSubsidyRegions) {
      const match = this.findMatch(normalizedFarm, subsidyRegion);
      if (match.matches) {
        return match;
      }
    }

    // Check for national/European programs
    const nationalMatch = this.checkNationalPrograms(subsidyRegions);
    if (nationalMatch.matches) {
      return nationalMatch;
    }

    // No match found
    return {
      score: 0,
      matches: false,
      reason: `Votre localisation (${farmLocation}) ne correspond pas aux zones éligibles`,
      confidence: 0.9,
      matchType: 'exact',
      blocker: `Programme limité à: ${subsidyRegions.join(', ')}`
    };
  }

  /**
   * Find specific geographic match between farm and subsidy region
   */
  private static findMatch(farmLocation: string, subsidyRegion: string): GeographicMatch {
    // Exact match
    if (farmLocation === subsidyRegion) {
      return {
        score: 30,
        matches: true,
        reason: `Correspondance exacte: ${subsidyRegion}`,
        confidence: 1.0,
        matchType: 'exact'
      };
    }

    // Contains match (one contains the other)
    if (farmLocation.includes(subsidyRegion) || subsidyRegion.includes(farmLocation)) {
      return {
        score: 25,
        matches: true,
        reason: `Correspondance géographique: ${subsidyRegion}`,
        confidence: 0.9,
        matchType: 'contains'
      };
    }

    // Region synonym/alias match
    const synonymMatch = this.checkSynonyms(farmLocation, subsidyRegion);
    if (synonymMatch.matches) {
      return synonymMatch;
    }

    // Administrative hierarchy match (department to region)
    const hierarchyMatch = this.checkHierarchy(farmLocation, subsidyRegion);
    if (hierarchyMatch.matches) {
      return hierarchyMatch;
    }

    return {
      score: 0,
      matches: false,
      reason: 'Aucune correspondance géographique',
      confidence: 0.8,
      matchType: 'exact'
    };
  }

  /**
   * Check region synonyms and historical names
   */
  private static checkSynonyms(farmLocation: string, subsidyRegion: string): GeographicMatch {
    for (const [key, regionData] of Object.entries(this.REGIONS)) {
      // Check if farm location matches current or former region names
      const farmMatches = [regionData.current.toLowerCase(), ...regionData.former.map(f => f.toLowerCase()), ...regionData.aliases]
        .some(name => this.normalizeLocation(name) === farmLocation);

      // Check if subsidy region matches current or former region names
      const subsidyMatches = [regionData.current.toLowerCase(), ...regionData.former.map(f => f.toLowerCase()), ...regionData.aliases]
        .some(name => this.normalizeLocation(name) === subsidyRegion);

      if (farmMatches && subsidyMatches) {
        return {
          score: 28,
          matches: true,
          reason: `Correspondance régionale: ${regionData.current}`,
          confidence: 0.95,
          matchType: 'synonym'
        };
      }
    }

    return { score: 0, matches: false, reason: '', confidence: 0, matchType: 'synonym' };
  }

  /**
   * Check administrative hierarchy (department belongs to region)
   */
  private static checkHierarchy(farmLocation: string, subsidyRegion: string): GeographicMatch {
    // Check if farm is a department and subsidy covers the parent region
    for (const [key, regionData] of Object.entries(this.REGIONS)) {
      const regionNames = [regionData.current.toLowerCase(), ...regionData.former.map(f => f.toLowerCase())];
      
      if (regionNames.some(name => this.normalizeLocation(name) === subsidyRegion)) {
        // Check if farm location is a department in this region
        for (const deptCode of regionData.departments) {
          const deptName = this.DEPARTMENTS[deptCode];
          if (deptName && this.normalizeLocation(deptName.toLowerCase()) === farmLocation) {
            return {
              score: 26,
              matches: true,
              reason: `Votre département (${deptName}) est dans la région éligible (${regionData.current})`,
              confidence: 0.9,
              matchType: 'parent'
            };
          }
        }
      }
    }

    // Check reverse: if farm is a region and subsidy is for a department in that region
    for (const [key, regionData] of Object.entries(this.REGIONS)) {
      const regionNames = [regionData.current.toLowerCase(), ...regionData.former.map(f => f.toLowerCase())];
      
      if (regionNames.some(name => this.normalizeLocation(name) === farmLocation)) {
        // Check if subsidy region is a department in this region
        for (const deptCode of regionData.departments) {
          const deptName = this.DEPARTMENTS[deptCode];
          if (deptName && this.normalizeLocation(deptName.toLowerCase()) === subsidyRegion) {
            return {
              score: 24,
              matches: true,
              reason: `Programme départemental dans votre région (${regionData.current})`,
              confidence: 0.85,
              matchType: 'child'
            };
          }
        }
      }
    }

    return { score: 0, matches: false, reason: '', confidence: 0, matchType: 'parent' };
  }

  /**
   * Check for national and European programs
   */
  private static checkNationalPrograms(subsidyRegions: string[]): GeographicMatch {
    const nationalIndicators = [
      'france', 'national', 'métropolitaine', 'français', 'territoire français',
      'ensemble du territoire', 'toute la france'
    ];

    const europeanIndicators = [
      'européen', 'europe', 'union européenne', 'ue', 'feder', 'feader',
      'programme européen', 'fonds européen'
    ];

    for (const region of subsidyRegions) {
      const normalized = this.normalizeLocation(region);
      
      // Check for national programs
      if (nationalIndicators.some(indicator => normalized.includes(indicator))) {
        return {
          score: 20,
          matches: true,
          reason: 'Programme national - accessible partout en France',
          confidence: 0.95,
          matchType: 'national'
        };
      }

      // Check for European programs
      if (europeanIndicators.some(indicator => normalized.includes(indicator))) {
        return {
          score: 18,
          matches: true,
          reason: 'Programme européen - accessible en France',
          confidence: 0.9,
          matchType: 'european'
        };
      }
    }

    return { score: 0, matches: false, reason: '', confidence: 0, matchType: 'national' };
  }

  /**
   * Normalize location strings for comparison
   */
  private static normalizeLocation(location: string): string {
    return location
      .toLowerCase()
      .trim()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/['-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Test the geographic matching system
   */
  static runTests(): void {
    console.log('🧪 Testing French Geographic Matching System');
    
    const testCases = [
      { farm: 'Normandie', subsidy: ['Région Normandie'], expected: true },
      { farm: 'Seine-Maritime', subsidy: ['Normandie'], expected: true },
      { farm: 'Bretagne', subsidy: ['Hauts-de-France'], expected: false },
      { farm: 'Pays de la Loire', subsidy: ['France métropolitaine'], expected: true },
      { farm: 'Gironde', subsidy: ['Nouvelle-Aquitaine'], expected: true },
      { farm: 'Nord', subsidy: ['Nord-Pas-de-Calais'], expected: true },
      { farm: 'Alsace', subsidy: ['Grand Est'], expected: true }
    ];

    for (const test of testCases) {
      const result = this.calculateMatch(test.farm, test.subsidy);
      const success = result.matches === test.expected;
      console.log(`${success ? '✅' : '❌'} ${test.farm} → ${test.subsidy.join(', ')}: ${result.reason} (Score: ${result.score})`);
    }
  }
}
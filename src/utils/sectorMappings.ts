/**
 * Mappings for Les Aides API sectors and regions to human-readable names
 */

export const SECTOR_MAPPINGS: Record<string, string> = {
  '288': 'Aéronautique',
  '342': 'Aérospatiale', 
  '289': 'Agroalimentaire - Nutrition',
  '290': 'Agroindustrie',
  '314': 'Armement - Défense',
  '336': 'Artisanat',
  '341': 'Automobile',
  '393': 'Bio',
  '291': 'Biotechnologie',
  '349': 'Bois',
  '295': 'BTP matériaux de construction',
  '414': 'Culture',
  '388': 'Chimie',
  '335': 'Economie Sociale et Solidaire',
  '294': 'Edition - Communication - Multimédia',
  '347': 'Electronique',
  '293': 'Environnement',
  '292': 'Energie',
  '340': 'Ferroviaire',
  '348': 'Génie civil',
  '376': 'Industries culturelles et créatives',
  '392': 'Logistique',
  '405': 'Matériaux biosourcés',
  '337': 'Métiers de bouche',
  '390': 'Métallurgie',
  '298': 'Nucléaire',
  '361': 'Numérique',
  '389': 'Pharmaceutique',
  '299': 'Plasturgie',
  '297': 'Santé',
  '339': 'Services à la personne',
  '391': 'Service aux entreprises',
  '300': 'Sport - Loisir',
  '301': 'Technologie et technique industrielles',
  '302': 'Textile',
  '303': 'TIC - Matériels et techniques informatiques',
  '338': 'Tourisme',
  '304': 'Transport'
};

export const REGION_MAPPINGS: Record<string, string> = {
  '84': 'Auvergne-Rhône-Alpes',
  '27': 'Bourgogne-Franche-Comté',
  '53': 'Bretagne',
  '24': 'Centre-Val de Loire',
  '94': 'Corse',
  '44': 'Grand Est',
  '1': 'Guadeloupe',
  '3': 'Guyane',
  '32': 'Hauts-de-France',
  '11': 'Île-de-France',
  '4': 'La Réunion',
  '2': 'Martinique',
  '6': 'Mayotte',
  '28': 'Normandie',
  '75': 'Nouvelle-Aquitaine',
  '988': 'Nouvelle Calédonie',
  '76': 'Occitanie',
  '52': 'Pays de la Loire',
  '987': 'Polynésie Française',
  '93': "Provence-Alpes-Côte d'Azur",
  '977': 'Saint-Barthélemy',
  '978': 'Saint-Martin',
  '975': 'Saint-Pierre et Miquelon',
  '986': 'Wallis et Futuna'
};

/**
 * Convert domain numbers to human-readable sector names
 */
export const mapDomainsToSectors = (domains: string[] | string | null): string[] => {
  if (!domains) return [];
  
  const domainArray = Array.isArray(domains) ? domains : [domains];
  
  return domainArray
    .map(domain => {
      // Extract domain number from strings like "Domain 790" or just "790"
      const domainNumber = domain.toString().replace(/[^0-9]/g, '');
      return SECTOR_MAPPINGS[domainNumber] || null;
    })
    .filter(Boolean) as string[];
};

/**
 * Get a user-friendly sector display string
 */
export const getSectorDisplayFromDomains = (domains: string[] | string | null): string => {
  const sectors = mapDomainsToSectors(domains);
  
  if (sectors.length === 0) return 'All sectors';
  if (sectors.length === 1) return sectors[0];
  if (sectors.length <= 2) return sectors.join(' • ');
  
  return `${sectors.slice(0, 2).join(' • ')} +${sectors.length - 2} more`;
};

/**
 * Get eligibility status based on subsidy data
 */
export const getEligibilityStatus = (subsidy: any): { status: 'eligible' | 'check' | 'restricted'; label: string } => {
  // Simple logic - this could be enhanced with actual farm matching
  const hasRegionRestriction = subsidy.region && subsidy.region !== 'All regions' && subsidy.region !== '';
  const hasSectorRestriction = subsidy.sector && Array.isArray(subsidy.sector) && subsidy.sector.length > 0;
  
  if (!hasRegionRestriction && !hasSectorRestriction) {
    return { status: 'eligible', label: 'Available nationwide' };
  }
  
  if (hasRegionRestriction) {
    // Show actual regions instead of generic "Location restricted"
    if (Array.isArray(subsidy.region)) {
      const validRegions = subsidy.region.filter(r => r && r.trim() !== '');
      if (validRegions.length === 0) {
        return { status: 'eligible', label: 'Available nationwide' };
      }
      if (validRegions.length === 1) {
        return { status: 'restricted', label: validRegions[0] };
      }
      if (validRegions.length <= 2) {
        return { status: 'restricted', label: validRegions.join(', ') };
      }
      return { status: 'restricted', label: `${validRegions.slice(0, 2).join(', ')} +${validRegions.length - 2} more` };
    } else if (subsidy.region && subsidy.region.trim() !== '') {
      return { status: 'restricted', label: subsidy.region };
    }
  }
  
  return { status: 'check', label: 'Check requirements' };
};
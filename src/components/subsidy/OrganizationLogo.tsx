import React from 'react';

// Import organization logos
// Note: bpifrance-official.png not found, using fallback approach
import regionAuvergneRhoneAlpes from '@/assets/organizations/region-auvergne-rhone-alpes.png';
import regionBourgogneFrancheComte from '@/assets/organizations/region-bourgogne-franche-comte.png';
import regionNormandie from '@/assets/organizations/region-normandie.png';
import regionNouvelleAquitaine from '@/assets/organizations/region-nouvelle-aquitaine.png';
import regionPaca from '@/assets/organizations/region-paca.png';
import regionReunion from '@/assets/organizations/region-reunion.png';
import agenceDevEconomiqueCorse from '@/assets/organizations/agence-dev-economique-corse.png';
import cciHautsDeFrance from '@/assets/organizations/cci-hauts-de-france.png';
import clermontAuvergneMetropole from '@/assets/organizations/clermont-auvergne-metropole.png';
import communauteCommunesGeneric from '@/assets/organizations/communaute-communes-generic.png';

interface OrganizationLogoProps {
  organizationName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Organization name to logo mapping  
const organizationLogos: Record<string, string> = {
  // 'Bpifrance': will use special handling below,
  'Région Auvergne-Rhône-Alpes': regionAuvergneRhoneAlpes,
  'Région Bourgogne Franche-Comté': regionBourgogneFrancheComte,
  'Région Normandie': regionNormandie,
  'Région Nouvelle-Aquitaine': regionNouvelleAquitaine,
  'Région Provence-Alpes-Côte d\'Azur': regionPaca,
  'Région Réunion': regionReunion,
  'Agence de Développement Economique de la Corse': agenceDevEconomiqueCorse,
  'Chambre de Commerce et d\'Industrie de la région Hauts de France': cciHautsDeFrance,
  'Clermont Auvergne Métropole': clermontAuvergneMetropole,
  'Communauté de Communes des 7 Vallées': communauteCommunesGeneric,
  'Communauté de Communes du Bazadais': communauteCommunesGeneric,
  'Communauté de Communes du Saulnois': communauteCommunesGeneric,
};

const OrganizationLogo: React.FC<OrganizationLogoProps> = ({
  organizationName,
  size = 'sm',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  // Special handling for Bpifrance with official styling
  if (organizationName === 'Bpifrance') {
    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-sm flex items-center justify-center text-gray-700 font-bold ${className}`} 
           style={{ fontSize: size === 'lg' ? '0.6rem' : size === 'md' ? '0.5rem' : '0.4rem' }}>
        <span>bpi</span>
      </div>
    );
  }

  const logoSrc = organizationLogos[organizationName];

  if (!logoSrc) {
    // Fallback icon for organizations without specific logos
    return (
      <div className={`${sizeClasses[size]} bg-muted rounded-sm flex items-center justify-center ${className}`}>
        <span className="text-xs font-semibold text-muted-foreground">
          {organizationName.substring(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <img
      src={`${logoSrc}?t=${Date.now()}`}
      alt={`${organizationName} logo`}
      className={`${sizeClasses[size]} object-contain rounded-sm ${className}`}
    />
  );
};

export default OrganizationLogo;
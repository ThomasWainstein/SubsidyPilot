import React from 'react';
import { useLanguage } from '@/contexts/language';
import FilterSection from '../FilterSection';
import FilterCheckbox from '../FilterCheckbox';
import OrganizationLogo from '../OrganizationLogo';

interface OrganizationFilterProps {
  selectedOrganizations: string[];
  availableOrganizations: string[];
  onOrganizationToggle: (organization: string) => void;
}

const OrganizationFilter: React.FC<OrganizationFilterProps> = ({
  selectedOrganizations,
  availableOrganizations,
  onOrganizationToggle
}) => {
  const { t } = useLanguage();

  // Show only the most common/important organizations first
  const featuredOrganizations = availableOrganizations.filter(org => 
    org.includes('Bpifrance') || 
    org.includes('Région') || 
    org.includes('ADEME') ||
    org.includes('Pôle emploi')
  ).slice(0, 8);

  const otherOrganizations = availableOrganizations
    .filter(org => !featuredOrganizations.includes(org))
    .slice(0, 6);

  return (
    <FilterSection title="Funding Organizations">
      {featuredOrganizations.length > 0 && (
        <div className="mb-4 min-w-0">
          <h4 className="text-xs text-muted-foreground mb-2 font-medium">Major Funders</h4>
          <div className="space-y-2">
            {featuredOrganizations.map(organization => (
              <div key={organization} className="flex items-center space-x-3">
                <OrganizationLogo organizationName={organization} size="sm" />
                <FilterCheckbox
                  id={`organization-${organization}`}
                  value={organization}
                  checked={selectedOrganizations.includes(organization)}
                  onChange={() => onOrganizationToggle(organization)}
                  translationKey={organization}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {otherOrganizations.length > 0 && (
        <div className="min-w-0">
          <h4 className="text-xs text-muted-foreground mb-2 font-medium">Other Organizations</h4>
          <div className="space-y-2">
            {otherOrganizations.map(organization => (
              <div key={organization} className="flex items-center space-x-3">
                <OrganizationLogo organizationName={organization} size="sm" />
                <FilterCheckbox
                  id={`organization-other-${organization}`}
                  value={organization}
                  checked={selectedOrganizations.includes(organization)}
                  onChange={() => onOrganizationToggle(organization)}
                  translationKey={organization}
                />
              </div>
            ))}
            {availableOrganizations.length > featuredOrganizations.length + otherOrganizations.length && (
              <p className="text-xs text-muted-foreground px-2">
                +{availableOrganizations.length - featuredOrganizations.length - otherOrganizations.length} more organizations
              </p>
            )}
          </div>
        </div>
      )}

      {availableOrganizations.length === 0 && (
        <p className="text-sm text-muted-foreground">Loading organizations...</p>
      )}
    </FilterSection>
  );
};

export default OrganizationFilter;
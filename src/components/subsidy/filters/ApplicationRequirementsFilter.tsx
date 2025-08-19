
import React from 'react';
import { useLanguage } from '@/contexts/language';
import FilterSection from '../FilterSection';
import FilterCheckbox from '../FilterCheckbox';
import FilterTagButton from '../FilterTagButton';

interface ApplicationRequirementsFilterProps {
  documentsRequired: string[];
  applicationFormats: string[];
  onDocumentRequiredToggle: (doc: string) => void;
  onApplicationFormatToggle: (format: string) => void;
}

const ApplicationRequirementsFilter: React.FC<ApplicationRequirementsFilterProps> = ({
  documentsRequired,
  applicationFormats,
  onDocumentRequiredToggle,
  onApplicationFormatToggle
}) => {
  const { t } = useLanguage();

  return (
    <FilterSection title="search.filters.applicationRequirements">
      <div className="mb-4 min-w-0">
        <h4 className="text-xs text-muted-foreground mb-2 font-medium">{t('search.filters.documentsRequired')}</h4>
        <div className="flex flex-wrap gap-2 min-w-0">
          {[
            { value: 'businessPlan', key: 'search.filters.documentsRequired.businessPlan' },
            { value: 'sustainabilityReport', key: 'search.filters.documentsRequired.sustainabilityReport' },
            { value: 'carbonAssessment', key: 'search.filters.documentsRequired.carbonAssessment' },
            { value: 'euFarmId', key: 'search.filters.documentsRequired.euFarmId' },
            { value: 'digitalCertification', key: 'search.filters.documentsRequired.digitalCertification' },
            { value: 'previousGrantRecord', key: 'search.filters.documentsRequired.previousGrantRecord' },
          ].map(doc => (
            <FilterTagButton
              key={doc.value}
              value={doc.value}
              active={documentsRequired.includes(doc.value)}
              onClick={() => onDocumentRequiredToggle(doc.value)}
              translationKey={doc.key}
            />
          ))}
        </div>
      </div>

      <div className="min-w-0">
        <h4 className="text-xs text-muted-foreground mb-2 font-medium">{t('search.filters.applicationFormat')}</h4>
        <div className="space-y-2">
          {[
            { value: 'online', key: 'search.filters.applicationFormat.online' },
            { value: 'pdf', key: 'search.filters.applicationFormat.pdf' },
            { value: 'portal', key: 'search.filters.applicationFormat.portal' },
            { value: 'consultant', key: 'search.filters.applicationFormat.consultant' },
          ].map(format => (
            <FilterCheckbox
              key={format.value}
              id={`application-format-${format.value}`}
              value={format.value}
              checked={applicationFormats.includes(format.value)}
              onChange={() => onApplicationFormatToggle(format.value)}
              translationKey={format.key}
            />
          ))}
        </div>
      </div>
    </FilterSection>
  );
};

export default ApplicationRequirementsFilter;

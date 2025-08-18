import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/language';
import { getLocalizedContent } from '@/utils/language';

interface DetailedSubsidyDisplayProps {
  subsidy: any;
  onBack?: () => void;
}

export const DetailedSubsidyDisplay: React.FC<DetailedSubsidyDisplayProps> = ({ 
  subsidy, 
  onBack 
}) => {
  const { t, language } = useLanguage();

  // Extract data with proper formatting
  const formatArray = (data: any): string[] => {
    if (Array.isArray(data)) return data.filter(Boolean);
    if (typeof data === 'string') return data ? [data] : [];
    return [];
  };

  const formatAmount = (amount: any): string => {
    if (Array.isArray(amount) && amount.length > 0) {
      return amount.join(', ');
    }
    if (typeof amount === 'string') return amount;
    if (typeof amount === 'object' && amount !== null) {
      return JSON.stringify(amount);
    }
    return String(t('subsidy.display.noAdditionalInfo') || 'N/A');
  };

  const safeString = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const categories = formatArray(subsidy.sectors || subsidy.categories);
  const objectives = formatArray(subsidy.objectives);
  const eligibleActions = formatArray(subsidy.eligible_actions);
  const ineligibleActions = formatArray(subsidy.ineligible_actions);
  const requiredDocuments = formatArray(subsidy.required_documents);
  const fundingRateDetails = formatArray(subsidy.funding_rate_details);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content Area */}
      <div className="flex-1 max-w-4xl mx-auto p-6 mr-80">
        <div className="bg-card rounded-lg shadow-sm border border-border">
          {/* Header Section */}
          <div className="border-b border-border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-3">
                  {getLocalizedContent(subsidy.title, language) || 'Untitled Subsidy'}
                </h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  {categories.map((category, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
              {onBack && (
                <Button variant="outline" onClick={onBack} className="ml-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('subsidy.display.backToSearch')}
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <span className="text-sm font-medium text-muted-foreground">{t('subsidy.display.agency')}:</span>
                <p className="text-foreground">{safeString(subsidy.agency || subsidy.issuing_body)}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">{t('subsidy.display.publicationDate')}:</span>
                <p className="text-foreground">{safeString(subsidy.publication_date || subsidy.draft_date)}</p>
              </div>
            </div>
          </div>

          {/* Description Section */}
          {subsidy.description && (
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">{t('subsidy.display.description')}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {getLocalizedContent(subsidy.description, language)}
              </p>
            </div>
          )}

          {/* Objectives Section */}
          {objectives.length > 0 && (
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">{t('subsidy.display.objectives')}</h2>
              <ul className="space-y-2">
                {objectives.map((objective, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-primary mr-2">•</span>
                    <span className="text-muted-foreground">{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Funding Details Section */}
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('subsidy.display.fundingDetails')}</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-foreground mb-2">{t('subsidy.display.amount')}</h3>
                <p className="text-muted-foreground mb-3">{formatAmount(subsidy.amount || subsidy.funding_amount)}</p>
                 {subsidy.minimum_investment && (
                   <p className="text-sm text-muted-foreground">
                     {t('subsidy.display.minimumInvestment')}: {safeString(subsidy.minimum_investment)}
                   </p>
                 )}
              </div>
              {fundingRateDetails.length > 0 && (
                <div>
                  <h3 className="font-medium text-foreground mb-2">{t('subsidy.display.fundingRates')}</h3>
                  <ul className="space-y-1">
                    {fundingRateDetails.map((rate, index) => (
                      <li key={index} className="text-muted-foreground text-sm">{rate}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Eligible Actions */}
          {eligibleActions.length > 0 && (
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">{t('subsidy.display.eligibleActions')}</h2>
              <div className="space-y-2">
                {eligibleActions.map((action, index) => (
                  <div key={index} className="flex items-start">
                    <Check className="text-green-500 mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground text-sm">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ineligible Actions */}
          {ineligibleActions.length > 0 && (
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">{t('subsidy.display.ineligibleActions')}</h2>
              <div className="space-y-2">
                {ineligibleActions.map((action, index) => (
                  <div key={index} className="flex items-start">
                    <X className="text-destructive mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground text-sm">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {requiredDocuments.length > 0 && (
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground mb-3">{t('subsidy.display.requiredDocuments')}</h2>
              <div className="grid grid-cols-2 gap-2">
                {requiredDocuments.map((doc, index) => (
                  <div key={index} className="p-3 bg-muted rounded border">
                    <span className="text-sm text-muted-foreground">{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legal Information */}
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('subsidy.display.legalInformation')}</h2>
            <div className="grid grid-cols-2 gap-4">
              {subsidy.reference_code && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">{t('subsidy.display.referenceCode')}:</span>
                  <p className="text-foreground">{subsidy.reference_code}</p>
                </div>
              )}
              {subsidy.regulatory_references && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">{t('subsidy.display.regulatoryReferences')}:</span>
                  <p className="text-foreground">{subsidy.regulatory_references}</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('subsidy.display.additionalInformation')}</h2>
            <div className="bg-muted rounded-lg p-4 min-h-[100px]">
              {subsidy.additional_information ? (
                <div className="text-muted-foreground leading-relaxed">
                  {getLocalizedContent(subsidy.additional_information, language)}
                </div>
              ) : (
                <div className="text-muted-foreground/60 italic text-sm">
                  {t('subsidy.display.noAdditionalInfo')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar Summary */}
      <div className="fixed right-0 top-0 w-80 h-full bg-card shadow-lg border-l border-border p-6 overflow-y-auto">
        <div className="sticky top-0 bg-card pb-4 border-b border-border mb-4">
          <h2 className="text-xl font-bold text-foreground">{t('subsidy.display.summary')}</h2>
        </div>
        
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <h3 className="font-semibold text-primary mb-2">{t('subsidy.display.keyInformation')}</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-primary/80">{t('subsidy.display.maxAmount')}:</span>
                <p className="text-primary/70">{formatAmount(subsidy.amount)}</p>
              </div>
              <div>
                <span className="font-medium text-primary/80">{t('subsidy.display.deadline')}:</span>
                <p className="text-primary/70">{safeString(subsidy.deadline || subsidy.application_deadline)}</p>
              </div>
              <div>
                <span className="font-medium text-primary/80">{t('subsidy.display.sector')}:</span>
                <p className="text-primary/70">{safeString(categories[0])}</p>
              </div>
            </div>
          </div>

          {/* Application Period */}
          {(subsidy.application_window_start || subsidy.application_window_end) && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t('subsidy.display.applicationPeriod')}</h3>
              <div className="bg-green-50 dark:bg-green-950/20 rounded p-3">
                <div className="text-sm">
                   {subsidy.application_window_start && (
                     <p><span className="font-medium">{t('subsidy.display.start')}:</span> {safeString(subsidy.application_window_start)}</p>
                   )}
                   {subsidy.application_window_end && (
                     <p><span className="font-medium">{t('subsidy.display.end')}:</span> {safeString(subsidy.application_window_end)}</p>
                   )}
                </div>
              </div>
            </div>
          )}

          {/* Funding Rates */}
          {fundingRateDetails.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t('subsidy.display.fundingRates')}</h3>
              <div className="space-y-2">
                {fundingRateDetails.map((rate, index) => (
                  <div key={index} className={`rounded p-3 ${index === 0 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-orange-50 dark:bg-orange-950/20'}`}>
                    <div className="text-sm">
                      <p className={`text-sm ${index === 0 ? 'text-yellow-700 dark:text-yellow-300' : 'text-orange-700 dark:text-orange-300'}`}>{rate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Geographic Scope */}
          {subsidy.geographic_scope && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t('subsidy.display.geographicEligibility')}</h3>
              <div className="bg-purple-50 dark:bg-purple-950/20 rounded p-3">
                <p className="text-sm text-purple-700 dark:text-purple-300">{safeString(subsidy.geographic_scope)}</p>
              </div>
            </div>
          )}

          {/* Target Entities / Beneficiaries */}
          {(subsidy.legal_entity_type || subsidy.target_entities) && (
            <div>
              <h3 className="font-semibold text-foreground mb-2">{t('subsidy.display.beneficiaries')}</h3>
              <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded p-3">
                <p className="text-sm text-indigo-700 dark:text-indigo-300">{safeString(subsidy.legal_entity_type || subsidy.target_entities)}</p>
              </div>
            </div>
          )}

          {/* Source Link */}
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-foreground mb-2">{t('subsidy.display.source')}</h3>
            <div className="bg-muted rounded p-3 mb-4">
              {subsidy.url ? (
                <a 
                  href={subsidy.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:text-primary/80 underline break-all inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {subsidy.url}
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">N/A</span>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-foreground mb-2">{t('subsidy.display.contact')}</h3>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">{safeString(subsidy.agency || subsidy.issuing_body)}</p>
              {subsidy.program && <p>{safeString(subsidy.program)}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  ExternalLink, 
  FileText, 
  Mail, 
  Phone, 
  Calendar,
  Clock,
  Euro,
  Building,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Target,
  FileCheck,
  Scale,
  Link,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { DocumentContent } from '@/utils/documentParser';
import { formatFundingDisplay, getDeadlineInfo, cleanContent } from '@/utils/contentFormatting';
import { TranslatedField } from './TranslatedField';
import { Language } from '@/contexts/language/types';

interface ComprehensiveSubsidyDisplayProps {
  subsidy: any;
  extractedData?: Partial<DocumentContent>;
  currentLanguage?: Language;
}

export const ComprehensiveSubsidyDisplay = ({ 
  subsidy, 
  extractedData = {},
  currentLanguage = 'en'
}: ComprehensiveSubsidyDisplayProps) => {
  
  const renderCleanSection = (
    title: string, 
    content: string | string[] | null | undefined, 
    icon?: React.ReactNode,
    useTranslation: boolean = true
  ) => {
    if (!content || (Array.isArray(content) && content.length === 0)) return null;
    
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {useTranslation ? (
            <TranslatedField
              content={content}
              fieldKey={title.toLowerCase()}
              currentLanguage={currentLanguage}
            >
              {({ text }) => (
                <div className="prose max-w-none">
                  {Array.isArray(content) ? (
                    <ul className="space-y-2">
                      {(content as string[]).map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm leading-relaxed">{cleanContent(item)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {text.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className="mb-3">{paragraph}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TranslatedField>
          ) : (
            <div className="text-sm leading-relaxed">
              {Array.isArray(content) ? (
                <ul className="space-y-2">
                  {content.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <span>{cleanContent(item)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="whitespace-pre-wrap">{cleanContent(content)}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderDocumentSection = (
    title: string, 
    documents: Array<{name: string; type: string; size?: string; url?: string; mandatory?: boolean; description?: string}> = [],
    icon?: React.ReactNode
  ) => {
    if (!documents || documents.length === 0) return null;

    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documents.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">{doc.name}</div>
                    {doc.description && (
                      <div className="text-xs text-muted-foreground mt-1">{doc.description}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {doc.type.toUpperCase()}
                      </Badge>
                      {doc.size && (
                        <span className="text-xs text-muted-foreground">{doc.size}</span>
                      )}
                      {doc.mandatory && (
                        <Badge variant="destructive" className="text-xs">
                          Obligatoire
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {doc.url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-1" />
                      Télécharger
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderInfoGrid = (items: Array<{label: string; value: string; icon?: React.ReactNode; urgent?: boolean}>) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="text-muted-foreground font-medium text-xs uppercase tracking-wide">
              {item.label}
            </div>
            <div className={`font-semibold text-sm flex items-center gap-1 ${item.urgent ? 'text-destructive' : 'text-foreground'}`}>
              {item.icon}
              {item.value}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Process data
  const deadlineInfo = getDeadlineInfo(subsidy.deadline || extractedData.deadline);
  const fundingDisplay = formatFundingDisplay(subsidy.amount || extractedData.fundingAmount);
  const programName = extractedData.programName || subsidy.title || subsidy.program;
  const managingAgency = extractedData.agency || subsidy.agency || "FranceAgriMer";

  // Create navigation sections
  const navigationSections = [
    { id: 'overview', label: 'Aperçu' },
    { id: 'description', label: 'Description & Objectifs' },
    { id: 'eligibility', label: 'Conditions d\'éligibilité' },
    { id: 'application', label: 'Comment candidater' },
    { id: 'evaluation', label: 'Critères d\'évaluation' },
    { id: 'documents', label: 'Documents associés' },
    { id: 'timeline', label: 'Calendrier' },
    { id: 'contact', label: 'Contact & Aide' }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Navigation */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            {navigationSections.map((section) => (
              <Button
                key={section.id}
                variant="ghost"
                size="sm"
                onClick={() => document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })}
                className="text-xs"
              >
                {section.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Program Header */}
      <Card id="overview" className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="pt-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">{programName}</h1>
            <p className="text-muted-foreground">Géré par {managingAgency}</p>
          </div>

          {/* Key Information Grid */}
          {renderInfoGrid([
            {
              label: "Programme de financement",
              value: subsidy.funding_type || subsidy.program || "Aide publique",
              icon: <Target className="w-4 h-4" />
            },
            {
              label: "Organisme gestionnaire", 
              value: managingAgency,
              icon: <Building className="w-4 h-4" />
            },
            {
              label: "Financement disponible",
              value: fundingDisplay,
              icon: <Euro className="w-4 h-4" />
            },
            {
              label: "Qui peut candidater?",
              value: Array.isArray(subsidy.legal_entity_type) ? 
                subsidy.legal_entity_type.slice(0, 2).join(', ') + (subsidy.legal_entity_type.length > 2 ? '...' : '') :
                "Voir conditions",
              icon: <Users className="w-4 h-4" />
            },
            {
              label: "Date limite de candidature",
              value: deadlineInfo.text,
              icon: <Calendar className="w-4 h-4" />,
              urgent: deadlineInfo.urgent
            },
            {
              label: "Couverture géographique",
              value: Array.isArray(subsidy.region) ? 
                subsidy.region.join(', ') || "France entière" : 
                "France entière",
              icon: <MapPin className="w-4 h-4" />
            },
            {
              label: "Durée du projet",
              value: extractedData.projectDuration || subsidy.project_duration || "Non spécifiée",
              icon: <Clock className="w-4 h-4" />
            },
            {
              label: "Taux de cofinancement",
              value: extractedData.coFinancingRate || 
                (subsidy.co_financing_rate ? `${subsidy.co_financing_rate}%` : "Voir détails"),
              icon: <FileCheck className="w-4 h-4" />
            }
          ])}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t">
            <Button size="lg" className="min-w-[160px]">
              Candidater maintenant
            </Button>
            
            {(subsidy.url || subsidy.source_url) && (
              <Button variant="outline" size="lg" asChild>
                <a href={subsidy.url || subsidy.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Page officielle
                </a>
              </Button>
            )}
            
            <Button variant="outline" size="lg">
              <Download className="w-4 h-4 mr-2" />
              Guide de candidature
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Description & Objectives */}
      <div id="description">
        {renderCleanSection(
          "Description & Objectifs", 
          extractedData.description || subsidy.description,
          <FileText className="w-5 h-5" />
        )}
        
        {/* Program Objectives */}
        {(subsidy.objectives || extractedData.objectives) && renderCleanSection(
          "Objectifs du programme",
          subsidy.objectives || extractedData.objectives,
          <Target className="w-5 h-5" />,
          false
        )}
      </div>

      {/* Eligibility Section */}
      <div id="eligibility">
        {renderCleanSection(
          "Conditions d'éligibilité", 
          extractedData.eligibility || subsidy.eligibility,
          <Users className="w-5 h-5" />
        )}

        {/* Legal Entity Types */}
        {(subsidy.legal_entity_type || extractedData.legalEntityTypes) && renderCleanSection(
          "Types d'entités juridiques éligibles",
          subsidy.legal_entity_type || extractedData.legalEntityTypes,
          <Scale className="w-5 h-5" />,
          false
        )}

        {/* Beneficiary Types */}
        {(subsidy.beneficiary_types || extractedData.beneficiaryTypes) && renderCleanSection(
          "Types de bénéficiaires",
          subsidy.beneficiary_types || extractedData.beneficiaryTypes,
          <Building className="w-5 h-5" />,
          false
        )}
      </div>

      {/* Eligible and Ineligible Actions */}
      {(subsidy.eligible_actions || extractedData.eligibleActions) && renderCleanSection(
        "Actions et investissements éligibles",
        subsidy.eligible_actions || extractedData.eligibleActions,
        <CheckCircle className="w-5 h-5 text-green-600" />,
        false
      )}

      {(subsidy.ineligible_actions || extractedData.excludedActions) && renderCleanSection(
        "Actions exclues",
        subsidy.ineligible_actions || extractedData.excludedActions,
        <XCircle className="w-5 h-5 text-red-600" />,
        false
      )}

      <Separator className="my-8" />

      {/* Application Process */}
      <div id="application">
        {renderCleanSection(
          "Comment candidater", 
          extractedData.applicationProcess || subsidy.application_method,
          <FileCheck className="w-5 h-5" />
        )}
      </div>

      {/* Evaluation Criteria */}
      <div id="evaluation">
        {(extractedData.evaluationCriteria || subsidy.evaluation_criteria) && renderCleanSection(
          "Critères d'évaluation",
          extractedData.evaluationCriteria || subsidy.evaluation_criteria,
          <CheckCircle className="w-5 h-5" />
        )}
      </div>

      {/* Required Documents */}
      <div id="documents">
        {renderDocumentSection(
          "Documents obligatoires", 
          extractedData.requiredDocuments || [],
          <FileText className="w-5 h-5 text-red-600" />
        )}

        {/* Associated Documents */}
        {renderDocumentSection(
          "Documents associés & Ressources", 
          extractedData.associatedDocuments || [],
          <Download className="w-5 h-5" />
        )}
      </div>

      {/* Timeline */}
      <div id="timeline">
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5" />
              Calendrier et dates clés
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {extractedData.applicationOpens && (
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">Ouverture des candidatures</span>
                <span className="text-sm text-muted-foreground">{extractedData.applicationOpens}</span>
              </div>
            )}
            {(extractedData.deadline || subsidy.deadline) && (
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">Date limite de candidature</span>
                <span className={`text-sm ${deadlineInfo.urgent ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                  {deadlineInfo.text}
                </span>
              </div>
            )}
            {extractedData.projectDuration && (
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">Durée du projet</span>
                <span className="text-sm text-muted-foreground">{extractedData.projectDuration}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legal Framework */}
      {(extractedData.legalReferences || subsidy.compliance_requirements) && renderCleanSection(
        "Cadre légal et réglementaire",
        extractedData.legalReferences || subsidy.compliance_requirements,
        <Scale className="w-5 h-5" />
      )}

      {/* Contact Information */}
      <div id="contact">
        {(extractedData.contactInfo || extractedData.contactEmail) && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="w-5 h-5" />
                Contact et assistance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {extractedData.contactInfo && (
                <div className="text-sm">{cleanContent(extractedData.contactInfo)}</div>
              )}
              {extractedData.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${extractedData.contactEmail}`} className="text-primary hover:underline text-sm">
                    {extractedData.contactEmail}
                  </a>
                </div>
              )}
              {extractedData.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${extractedData.contactPhone}`} className="text-primary hover:underline text-sm">
                    {extractedData.contactPhone}
                  </a>
                </div>
              )}
              
              {/* FAQ Section */}
              {extractedData.faqs && extractedData.faqs.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Questions fréquentes
                  </h4>
                  <div className="space-y-3">
                    {extractedData.faqs.map((faq, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="font-medium text-sm mb-1">{faq.question}</div>
                        <div className="text-sm text-muted-foreground">{faq.answer}</div>
                        {faq.url && (
                          <a href={faq.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs mt-1 inline-block">
                            Voir plus d'informations
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Legal Disclaimer */}
      {extractedData.legalDisclaimer && (
        <Card className="bg-muted/30 border-muted">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground leading-relaxed">
              <strong>Avertissement légal :</strong> {cleanContent(extractedData.legalDisclaimer)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, ExternalLink, Calendar, Users, Euro, FileText, Target, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EnhancedSubsidy } from '@/types/enhanced-subsidy';

interface EnhancedSubsidyDisplayProps {
  subsidy: EnhancedSubsidy;
}

export function EnhancedSubsidyDisplay({ subsidy }: EnhancedSubsidyDisplayProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non spécifiée';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
  };

  const renderSourceBadge = (sources: any[]) => {
    if (!sources || sources.length === 0) return null;
    const sourceCount = sources.length;
    return (
      <Badge variant="outline" className="text-xs">
        {sourceCount} source{sourceCount > 1 ? 's' : ''}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold">
                {subsidy.subsidy_identity.title.value || 'Titre non disponible'}
              </CardTitle>
              {subsidy.subsidy_identity.program_name.value && (
                <p className="text-lg text-muted-foreground">
                  {subsidy.subsidy_identity.program_name.value}
                </p>
              )}
              {subsidy.subsidy_identity.issuing_body.value && (
                <p className="text-sm text-muted-foreground">
                  {subsidy.subsidy_identity.issuing_body.value}
                </p>
              )}
            </div>
            {renderSourceBadge(subsidy.subsidy_identity.title.source)}
          </div>
          
          {/* Sectors */}
          {subsidy.subsidy_identity.sectors.value.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {subsidy.subsidy_identity.sectors.value.map((sector, index) => (
                <Badge key={index} variant="secondary">
                  {sector}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Timeline Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendrier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Publication</p>
                <p className="text-muted-foreground">
                  {formatDate(subsidy.status_timeline.published_on.value)}
                </p>
              </div>
              <div>
                <p className="font-medium">Ouverture</p>
                <p className="text-muted-foreground">
                  {formatDate(subsidy.status_timeline.opens_on.value)}
                </p>
              </div>
              <div>
                <p className="font-medium">Échéance</p>
                <p className="text-muted-foreground">
                  {formatDate(subsidy.status_timeline.deadline.value)}
                </p>
              </div>
            </div>
            
            {subsidy.status_timeline.suspension_or_notes.value && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  {subsidy.status_timeline.suspension_or_notes.value}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Financement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subsidy.financials.envelope_total.value && (
              <div>
                <p className="font-medium">Enveloppe totale</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(subsidy.financials.envelope_total.value)}
                </p>
              </div>
            )}
            
            {subsidy.financials.project_min_spend.value && (
              <div>
                <p className="font-medium">Montant minimum par projet</p>
                <p className="text-lg">
                  {formatCurrency(subsidy.financials.project_min_spend.value)}
                  {subsidy.financials.project_min_spend.dom_exception && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({formatCurrency(subsidy.financials.project_min_spend.dom_exception)} DOM)
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Funding Rate Rules */}
            {subsidy.financials.funding_rate_rules.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium">Taux d'aide</p>
                {subsidy.financials.funding_rate_rules.map((rule, index) => (
                  <div key={index} className="text-sm border rounded p-2">
                    <p className="font-medium capitalize">{rule.category === 'immaterial' ? 'Immatériel' : 'Matériel'}</p>
                    <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                      <span>PME: {(rule.pme_max_pct * 100).toFixed(0)}%</span>
                      <span>GE: {(rule.ge_max_pct * 100).toFixed(0)}%</span>
                      {rule.dom_max_pct && (
                        <span className="col-span-2">DOM: {(rule.dom_max_pct * 100).toFixed(0)}%</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Plafond: {formatCurrency(rule.cap_per_project_eur)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Objectives & Scope */}
      {subsidy.objectives_scope.objectives.value.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Objectifs et périmètre
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Objectifs</h4>
              <ul className="space-y-1">
                {subsidy.objectives_scope.objectives.value.map((objective, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {objective}
                  </li>
                ))}
              </ul>
            </div>

            {subsidy.objectives_scope.eligible_actions.value.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-green-700">Actions éligibles</h4>
                <ul className="space-y-1">
                  {subsidy.objectives_scope.eligible_actions.value.map((action, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {subsidy.objectives_scope.ineligible_costs.value.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-red-700">Coûts non éligibles</h4>
                <ul className="space-y-1">
                  {subsidy.objectives_scope.ineligible_costs.value.map((cost, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      {cost}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Beneficiaries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bénéficiaires
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subsidy.beneficiaries.eligible_entities.value.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-green-700">Entités éligibles</h4>
              <ul className="space-y-1">
                {subsidy.beneficiaries.eligible_entities.value.map((entity, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {entity}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {subsidy.beneficiaries.ineligible_entities.value.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-red-700">Entités non éligibles</h4>
              <ul className="space-y-1">
                {subsidy.beneficiaries.ineligible_entities.value.map((entity, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    {entity}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {subsidy.beneficiaries.partnership_requirements.value && (
            <div>
              <h4 className="font-medium mb-2">Exigences de partenariat</h4>
              <p className="text-sm text-muted-foreground">
                {subsidy.beneficiaries.partnership_requirements.value}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Process */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Processus de candidature
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subsidy.application.how_to_apply.value && (
            <div>
              <h4 className="font-medium mb-2">Comment candidater</h4>
              <p className="text-sm text-muted-foreground">
                {subsidy.application.how_to_apply.value}
              </p>
            </div>
          )}

          {subsidy.application.required_documents.value.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Documents requis</h4>
              <ul className="space-y-1">
                {subsidy.application.required_documents.value.map((doc, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    {doc}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {subsidy.application.selection_criteria.value && (
            <div>
              <h4 className="font-medium mb-2">Critères de sélection</h4>
              <p className="text-sm text-muted-foreground">
                {subsidy.application.selection_criteria.value}
              </p>
            </div>
          )}

          {subsidy.application.contact.value && (
            <div>
              <h4 className="font-medium mb-2">Contact</h4>
              <p className="text-sm text-muted-foreground">
                {subsidy.application.contact.value}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      {subsidy.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Documents associés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {subsidy.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{doc.type}</p>
                    <p className="text-xs text-muted-foreground">{doc.filename}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Notes */}
      {subsidy.compliance.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes de conformité</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{subsidy.compliance.notes}</p>
            {subsidy.compliance.state_aid_regimes.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium">Régimes d'aide d'État:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {subsidy.compliance.state_aid_regimes.map((regime, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {regime}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
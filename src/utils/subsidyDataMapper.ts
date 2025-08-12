// Utility functions to map between legacy Subsidy format and EnhancedSubsidy format

import { Subsidy } from '@/types/subsidy';
import { EnhancedSubsidy, isEnhancedSubsidy } from '@/types/enhanced-subsidy';

/**
 * Maps legacy Subsidy data to EnhancedSubsidy format for consistent display
 */
export function mapLegacyToEnhanced(legacy: Subsidy): EnhancedSubsidy {
  return {
    id: legacy.id,
    ingestion: {
      fetched_at: legacy.created_at || new Date().toISOString(),
      source_type: 'legacy',
      source_urls: legacy.url ? [legacy.url] : [],
      source_notes: 'Migrated from legacy format'
    },
    subsidy_identity: {
      title: {
        value: legacy.title,
        lang: legacy.language || 'fr',
        source: legacy.url ? [{ type: 'web', url: legacy.url }] : []
      },
      program_name: {
        value: legacy.program,
        source: []
      },
      issuing_body: {
        value: legacy.agency,
        source: []
      },
      country_region: {
        value: Array.isArray(legacy.region) ? legacy.region.join(', ') : legacy.region,
        source: []
      },
      sectors: {
        value: Array.isArray(legacy.sector) ? legacy.sector : (legacy.sector ? [legacy.sector] : []),
        source: []
      },
      languages: [legacy.language || 'fr']
    },
    status_timeline: {
      published_on: {
        value: legacy.created_at,
        source: []
      },
      opens_on: {
        value: legacy.application_window_start,
        source: []
      },
      deadline: {
        value: legacy.deadline || legacy.application_window_end,
        source: []
      },
      suspension_or_notes: {
        value: null,
        source: []
      }
    },
    financials: {
      envelope_total: {
        value: null, // Legacy format doesn't typically have total envelope
        currency: 'EUR',
        source: []
      },
      funding_rate_rules: [],
      project_min_spend: {
        value: legacy.amount && Array.isArray(legacy.amount) ? legacy.amount[0] : null,
        eur: true,
        dom_exception: null,
        source: []
      }
    },
    beneficiaries: {
      eligible_entities: {
        value: Array.isArray(legacy.beneficiary_types) ? legacy.beneficiary_types : [],
        source: []
      },
      ineligible_entities: {
        value: [],
        source: []
      },
      partnership_requirements: {
        value: null,
        source: []
      }
    },
    objectives_scope: {
      objectives: {
        value: Array.isArray(legacy.objectives) ? legacy.objectives : [],
        source: []
      },
      eligible_actions: {
        value: Array.isArray(legacy.eligible_actions) ? legacy.eligible_actions : [],
        source: []
      },
      ineligible_costs: {
        value: Array.isArray(legacy.ineligible_actions) ? legacy.ineligible_actions : [],
        source: []
      },
      geographic_scope: {
        value: legacy.geographic_scope ? String(legacy.geographic_scope) : null,
        source: []
      },
      target_products_crops: {
        value: [],
        source: []
      }
    },
    application: {
      how_to_apply: {
        value: legacy.application_method,
        source: []
      },
      required_documents: {
        value: Array.isArray(legacy.documents) ? legacy.documents.map((doc: any) => 
          typeof doc === 'string' ? doc : doc.title || doc.name || 'Document'
        ) : [],
        source: []
      },
      selection_process: {
        value: null,
        source: []
      },
      selection_criteria: {
        value: legacy.evaluation_criteria,
        source: []
      },
      payment_schedule: {
        value: legacy.payment_terms,
        source: []
      },
      reporting_requirements: {
        value: legacy.reporting_requirements,
        source: []
      },
      contact: {
        value: legacy.technical_support,
        source: []
      },
      faq: {
        value: null,
        source: []
      }
    },
    verbatim_blocks: [],
    documents: Array.isArray(legacy.documents) ? legacy.documents.map((doc: any, index: number) => ({
      title: typeof doc === 'string' ? doc : doc.title || doc.name || `Document ${index + 1}`,
      type: 'template' as const,
      filename: typeof doc === 'string' ? doc : doc.filename || doc.name || `document-${index + 1}`,
      mime: 'application/pdf',
      lang: legacy.language || 'fr',
      source: []
    })) : [],
    ui_mapping: {
      overview_blocks: [],
      eligibility_blocks: [],
      budget_blocks: [],
      process_blocks: [],
      documents_section: 'show_all'
    },
    compliance: {
      notes: legacy.audit_notes,
      state_aid_regimes: []
    },
    provenance: {}
  };
}

/**
 * Extracts key information for display in lists/cards from either format
 */
export function getSubsidyDisplayInfo(subsidy: Subsidy | EnhancedSubsidy) {
  if (isEnhancedSubsidy(subsidy)) {
    return {
      id: subsidy.id,
      title: subsidy.subsidy_identity.title.value || 'Titre non disponible',
      description: subsidy.objectives_scope.objectives.value.join(' • ') || 'Description non disponible',
      program: subsidy.subsidy_identity.program_name.value,
      agency: subsidy.subsidy_identity.issuing_body.value,
      deadline: subsidy.status_timeline.deadline.value,
      sectors: subsidy.subsidy_identity.sectors.value,
      regions: subsidy.subsidy_identity.country_region.value ? [subsidy.subsidy_identity.country_region.value] : [],
      envelope: subsidy.financials.envelope_total.value,
      minAmount: subsidy.financials.project_min_spend.value,
      contact: subsidy.application.contact.value,
      url: subsidy.ingestion.source_urls[0] || null,
      documentsCount: subsidy.documents.length
    };
  } else {
    // Legacy format
    return {
      id: subsidy.id,
      title: subsidy.title || 'Titre non disponible',
      description: subsidy.description || 'Description non disponible',
      program: subsidy.program,
      agency: subsidy.agency,
      deadline: subsidy.deadline,
      sectors: Array.isArray(subsidy.sector) ? subsidy.sector : (subsidy.sector ? [subsidy.sector] : []),
      regions: Array.isArray(subsidy.region) ? subsidy.region : (subsidy.region ? [subsidy.region] : []),
      envelope: null,
      minAmount: Array.isArray(subsidy.amount) ? subsidy.amount[0] : null,
      contact: subsidy.technical_support,
      url: subsidy.url,
      documentsCount: Array.isArray(subsidy.documents) ? subsidy.documents.length : 0
    };
  }
}

/**
 * Gets formatted amount display text
 */
export function formatSubsidyAmount(subsidy: Subsidy | EnhancedSubsidy): string {
  const info = getSubsidyDisplayInfo(subsidy);
  
  if (info.envelope) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(info.envelope);
  }
  
  if (info.minAmount) {
    return `À partir de ${new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(info.minAmount)}`;
  }
  
  return 'Montant à déterminer';
}

/**
 * Gets status based on timeline for enhanced subsidies
 */
export function getSubsidyStatus(subsidy: Subsidy | EnhancedSubsidy): {
  status: 'open' | 'closed' | 'suspended' | 'unknown';
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  if (isEnhancedSubsidy(subsidy)) {
    const now = new Date();
    const deadline = subsidy.status_timeline.deadline.value ? new Date(subsidy.status_timeline.deadline.value) : null;
    const suspension = subsidy.status_timeline.suspension_or_notes.value;
    
    if (suspension) {
      return { status: 'suspended', label: 'Suspendu', variant: 'destructive' };
    }
    
    if (deadline && deadline < now) {
      return { status: 'closed', label: 'Fermé', variant: 'secondary' };
    }
    
    return { status: 'open', label: 'Ouvert', variant: 'default' };
  } else {
    // Legacy format - basic status detection
    const now = new Date();
    const deadline = subsidy.deadline ? new Date(subsidy.deadline) : null;
    
    if (deadline && deadline < now) {
      return { status: 'closed', label: 'Fermé', variant: 'secondary' };
    }
    
    return { status: 'open', label: 'Ouvert', variant: 'default' };
  }
}
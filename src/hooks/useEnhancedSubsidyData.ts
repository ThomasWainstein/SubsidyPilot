// Hook to handle enhanced subsidy data loading and processing

import { useState, useEffect } from 'react';
import { EnhancedSubsidy } from '@/types/enhanced-subsidy';

// Mock data loader - in production this would load from Supabase or API
const mockEnhancedSubsidies: Record<string, EnhancedSubsidy> = {
  'legumineuses-example': {
    "id": "pe-legumineuses-2024-franceagrimer",
    "ingestion": {
      "fetched_at": "2025-08-12T00:00:00Z",
      "source_type": "webpage",
      "source_urls": [
        "https://www.franceagrimer.fr/aides/projets-territoriaux-filieres-legumineuses"
      ],
      "source_notes": "Associated decisions and templates captured from linked documents; dates and envelope updated by modification decision."
    },
    "subsidy_identity": {
      "title": {
        "value": "Projets territoriaux filières légumineuses",
        "lang": "fr",
        "source": [
          {
            "type": "web",
            "url": "https://www.franceagrimer.fr/aides/projets-territoriaux-filieres-legumineuses"
          }
        ]
      },
      "program_name": {
        "value": "Planification écologique – Projets territoriaux",
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 1
          }
        ]
      },
      "issuing_body": {
        "value": "FranceAgriMer (Établissement national des produits de l'agriculture et de la mer)",
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 1
          }
        ]
      },
      "country_region": {
        "value": "France (métropole et DOM)",
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 2
          }
        ]
      },
      "sectors": {
        "value": [
          "Filières végétales",
          "Oléo-protéagineux",
          "Économie des filières"
        ],
        "source": [
          {
            "type": "web",
            "url": "https://www.franceagrimer.fr/aides/projets-territoriaux-filieres-legumineuses"
          }
        ]
      },
      "languages": [
        "fr"
      ]
    },
    "status_timeline": {
      "published_on": {
        "value": "2025-05-26",
        "source": [
          {
            "type": "web",
            "url": "https://www.franceagrimer.fr/aides/projets-territoriaux-filieres-legumineuses"
          }
        ]
      },
      "opens_on": {
        "value": "2024-06-28",
        "source": [
          {
            "type": "web",
            "url": "https://www.franceagrimer.fr/aides/projets-territoriaux-filieres-legumineuses"
          }
        ]
      },
      "deadline": {
        "value": null,
        "source": [
          {
            "type": "web",
            "url": "https://www.franceagrimer.fr/aides/projets-territoriaux-filieres-legumineuses"
          }
        ]
      },
      "suspension_or_notes": {
        "value": "Dépôt suspendu à compter du 10/03/2025 à 09h pour permettre l'instruction des dossiers déposés.",
        "source": [
          {
            "type": "web",
            "url": "https://www.franceagrimer.fr/aides/projets-territoriaux-filieres-legumineuses"
          }
        ]
      }
    },
    "financials": {
      "envelope_total": {
        "value": 15400000,
        "currency": "EUR",
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-106 DM_légumineuses.docx_2.pdf",
            "page": 4
          }
        ]
      },
      "funding_rate_rules": [
        {
          "category": "immaterial",
          "pme_max_pct": 0.6,
          "ge_max_pct": 0.5,
          "dom_max_pct": 0.75,
          "cap_per_project_eur": 500000,
          "source": [
            {
              "type": "doc",
              "filename": "Décision INTV-SIIF-2024-048_2.pdf",
              "page": 6
            }
          ]
        },
        {
          "category": "material",
          "pme_max_pct": 0.4,
          "ge_max_pct": 0.25,
          "dom_max_pct": 0.75,
          "cap_per_project_eur": 5000000,
          "source": [
            {
              "type": "doc",
              "filename": "Décision INTV-SIIF-2024-048_2.pdf",
              "page": 6
            }
          ]
        }
      ],
      "project_min_spend": {
        "value": 200000,
        "eur": true,
        "dom_exception": 100000,
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 6
          }
        ]
      }
    },
    "beneficiaries": {
      "eligible_entities": {
        "value": [
          "Exploitations agricoles et leurs groupements",
          "Collecteurs / coopératives",
          "Entreprises de transformation agroalimentaires",
          "Négoces / distributeurs",
          "Acteurs R&D (instituts techniques, centres techniques)",
          "Chambres d'agriculture",
          "Structures fédératrices (société de projet, GIE, association…)",
          "Interprofessions / entités représentatives"
        ],
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 5
          }
        ]
      },
      "ineligible_entities": {
        "value": [
          "Collectivités territoriales (pour ce financement)"
        ],
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 5
          }
        ]
      },
      "partnership_requirements": {
        "value": "Démarche collective avec ≥2 partenaires indépendants couvrant ≥2 maillons (dont au moins un opérateur de l'amont agricole) ; chef de file unique contractant avec FranceAgriMer ; convention de partenariat obligatoire.",
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 5
          },
          {
            "type": "doc",
            "filename": "FAQ_AAP legumineuses_2.pdf",
            "page": 1
          }
        ]
      }
    },
    "objectives_scope": {
      "objectives": {
        "value": [
          "Structuration et développement des filières légumineuses",
          "Transition agro-écologique (réduction intrants, GES, eau)",
          "Augmentation des surfaces en légumineuses et protéines",
          "Valorisation/Transformation (amont/aval)",
          "Autonomie protéique et souveraineté alimentaire"
        ],
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 4
          }
        ]
      },
      "eligible_actions": {
        "value": [
          "Ingénierie de projet, études, conseils, prestations externes (plafond de part)",
          "Investissements à l'aval des filières (collecte, tri, stockage, transformation)",
          "Prototypes/démonstrateurs (R&D)",
          "Immobilier lié au projet (avec plafond terrains)"
        ],
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 8
          }
        ]
      },
      "ineligible_costs": {
        "value": [
          "Fonctionnement courant, déplacements, frais de mission",
          "Investissements amont dans les exploitations jusqu'à la récolte",
          "Mise aux normes, simple renouvellement d'équipements",
          "Matériel roulant, location de matériel, panneaux photovoltaïques",
          "Investissements à l'étranger, biens d'occasion ou reconditionnés",
          "Investissements déjà financés par un autre dispositif"
        ],
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 8
          }
        ]
      },
      "geographic_scope": {
        "value": "Territoires en France (projets territorialisés ; cachet DRAAF requis)",
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 9
          }
        ]
      },
      "target_products_crops": {
        "value": [
          "Liste des légumineuses en annexe : féverole, lentille, lupin, luzerne, pois protéagineux, soja, pois chiche, haricots secs/demi-sec, etc."
        ],
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 13
          }
        ]
      }
    },
    "application": {
      "how_to_apply": {
        "value": "Dépôt électronique sur la plateforme dédiée (PAD FranceAgriMer). La date/heure de dépôt en ligne fait foi.",
        "source": [
          {
            "type": "doc",
            "filename": "FAQ_AAP legumineuses_2.pdf",
            "page": 1
          }
        ]
      },
      "required_documents": {
        "value": [
          "doc_1 — Descriptif littéraire du projet (cachet DRAAF)",
          "doc_2 — Fiches projet (partenaires, dépenses, budget/financement, taille entreprise, situation/historique financière)",
          "doc_3 — Impacts et indicateurs (incl. indicateurs environnementaux/DNSH)",
          "doc_4 — Accord de partenariat signé (sauf coopératives/interprofessions solo)",
          "doc_5 — PPT de présentation (≈20 slides)",
          "doc_6 — Scénario contrefactuel (uniquement pour GE)",
          "Devis (dépenses matérielles et prestations)",
          "Comptes/liasses des 2 derniers exercices"
        ],
        "source": [
          {
            "type": "doc",
            "filename": "doc_1-Descriptif littéraire_projets légumineuses_2.docx",
            "page": 4
          },
          {
            "type": "doc",
            "filename": "FAQ_AAP legumineuses_2.pdf",
            "page": 1
          }
        ]
      },
      "selection_process": {
        "value": "Éligibilité par FAM → COPIL national (DGPE, DRAAF, CGAAER…). Audition si dépenses ≥5 M€ (≥1 M€ DOM). Notation selon grille (poids environnemental 60%).",
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 10
          }
        ]
      },
      "selection_criteria": {
        "value": "Grille de sélection (Annexe 2) : territoire, partenariat/filière, environnement (60%, seuil min 6/12), économie/finances, social/sociétal.",
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 14
          }
        ]
      },
      "payment_schedule": {
        "value": "Avance jusqu'à 50% à la signature ; solde après réalisation et justification complète sous 3 mois.",
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 10
          }
        ]
      },
      "reporting_requirements": {
        "value": "Compte-rendu détaillé, indicateurs (incl. environnement), états récapitulatifs et pièces justificatives (factures acquittées, bulletins de salaire, etc.).",
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf",
            "page": 11
          }
        ]
      },
      "contact": {
        "value": "pe-aap.proteines@franceagrimer.fr",
        "source": [
          {
            "type": "web",
            "url": "https://www.franceagrimer.fr/aides/projets-territoriaux-filieres-legumineuses"
          }
        ]
      },
      "faq": {
        "value": "FAQ officielle jointe ; précise rôles, éligibilité, docs, modalités de sélection et versement.",
        "source": [
          {
            "type": "doc",
            "filename": "FAQ_AAP legumineuses_2.pdf",
            "page": 1
          }
        ]
      }
    },
    "verbatim_blocks": [],
    "documents": [
      {
        "title": "doc_1 – Descriptif littéraire du projet",
        "type": "template",
        "filename": "doc_1-Descriptif littéraire_projets légumineuses_2.docx",
        "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "lang": "fr",
        "source": [
          {
            "type": "doc",
            "filename": "doc_1-Descriptif littéraire_projets légumineuses_2.docx"
          }
        ]
      },
      {
        "title": "doc_2 – Fiches projet (Excel)",
        "type": "template",
        "filename": "doc_2-Fiches projet_légumineuses_2.xlsx",
        "mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "lang": "fr",
        "source": [
          {
            "type": "doc",
            "filename": "doc_2-Fiches projet_légumineuses_2.xlsx"
          }
        ]
      },
      {
        "title": "Décision INTV-SIIF-2024-048 (règles)",
        "type": "decision",
        "filename": "Décision INTV-SIIF-2024-048_2.pdf",
        "mime": "application/pdf",
        "lang": "fr",
        "source": [
          {
            "type": "doc",
            "filename": "Décision INTV-SIIF-2024-048_2.pdf"
          }
        ]
      },
      {
        "title": "FAQ officielle",
        "type": "faq",
        "filename": "FAQ_AAP legumineuses_2.pdf",
        "mime": "application/pdf",
        "lang": "fr",
        "source": [
          {
            "type": "doc",
            "filename": "FAQ_AAP legumineuses_2.pdf"
          }
        ]
      }
    ],
    "ui_mapping": {
      "overview_blocks": [],
      "eligibility_blocks": [],
      "budget_blocks": [],
      "process_blocks": [],
      "documents_section": "show_all"
    },
    "compliance": {
      "notes": "Régimes d'aides d'État cités dans la décision ; indicateurs environnementaux et DNSH requis.",
      "state_aid_regimes": [
        "SA.108057",
        "SA.107366",
        "SA.108468",
        "SA.113412",
        "SA.113755"
      ]
    },
    "provenance": {}
  }
};

export function useEnhancedSubsidyData(subsidyId: string) {
  const [enhancedSubsidy, setEnhancedSubsidy] = useState<EnhancedSubsidy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEnhancedData = async () => {
      if (!subsidyId) return;

      setIsLoading(true);
      setError(null);

      try {
        // Check if we have enhanced data for this subsidy
        const enhanced = mockEnhancedSubsidies[subsidyId];
        
        if (enhanced) {
          setEnhancedSubsidy(enhanced);
        } else {
          setError('No enhanced data available for this subsidy');
        }
      } catch (err) {
        setError('Failed to load enhanced subsidy data');
        console.error('Enhanced subsidy data loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadEnhancedData();
  }, [subsidyId]);

  return {
    enhancedSubsidy,
    isLoading,
    error,
    refetch: () => {
      const enhanced = mockEnhancedSubsidies[subsidyId];
      if (enhanced) {
        setEnhancedSubsidy(enhanced);
        setError(null);
      } else {
        setError('No enhanced data available');
      }
    }
  };
}
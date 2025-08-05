#!/usr/bin/env python3
"""
Batch Quality Assessment - Side-by-side comparison of real vs extracted content
For analyzing FranceAgriMer extraction quality and identifying improvement areas
"""

import json
import re
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass
from quality_validator import SubsidyQualityValidator, validate_batch_extractions

@dataclass
class ComparisonResult:
    """Result of comparing extracted vs real content"""
    subsidy_title: str
    extraction_score: float
    coverage_gaps: List[str]
    complexity_lost: List[str]
    accuracy_issues: List[str]
    improvement_priority: str  # HIGH, MEDIUM, LOW

class BatchQualityAssessment:
    """Comprehensive assessment of extraction quality vs real content"""
    
    def __init__(self):
        self.validator = SubsidyQualityValidator()
        
        # Key patterns that indicate complexity in real content
        self.complexity_patterns = {
            'financial_complexity': [
                r'majoration.*?(\d+)%', r'bonus.*?(\d+)%', r'plafond.*?€', 
                r'limite.*?€', r'taux.*?(\d+)%.*?(\d+)%'
            ],
            'legal_complexity': [
                r'article\s+\d+', r'règlement.*?\d+/\d+', r'R\(UE\)', 
                r'directive.*?\d+', r'code.*?rural'
            ],
            'eligibility_complexity': [
                r'sont exclus', r'ne sont pas éligibles', r'à condition que',
                r'sous réserve', r'exception.*?faite'
            ],
            'procedural_complexity': [
                r'étapes?.*?suivantes?', r'phases?.*?instruction', 
                r'procédure.*?sélection', r'critères?.*?évaluation'
            ]
        }

    def assess_test_cases(self) -> Dict[str, Any]:
        """Assess the 4 test cases provided in the prompt"""
        
        test_cases = [
            {
                'title': 'Aide à la coopération concernant les fonctions de garde-côtes',
                'extracted': self._parse_coast_guard_extracted(),
                'real_url': 'https://www.franceagrimer.fr/aides/os-41-ta-3-cooperation-garde-cotes',
                'real_content': self._get_coast_guard_real_content()
            },
            {
                'title': 'Programme opérationnel oléicole PAC 2023-2027',
                'extracted': self._parse_olive_extracted(),
                'real_url': 'https://www.franceagrimer.fr/aides/programme-operationnel-po-oleicole-relevant-de-la-pac-2023-2027',
                'real_content': self._get_olive_real_content()
            },
            {
                'title': 'Aide aux Organisations de Producteurs et Associations d\'Organisations de Producteurs',
                'extracted': self._parse_producer_org_extracted(),
                'real_url': 'https://www.franceagrimer.fr/aides/aide-aux-organisations-de-producteurs-op-et-aux-associations-dop-aop-reconnues',
                'real_content': self._get_producer_org_real_content()
            }
        ]
        
        comparison_results = []
        
        for case in test_cases:
            result = self._compare_extraction_to_real(
                case['extracted'], 
                case['real_content'], 
                case['title']
            )
            comparison_results.append(result)
        
        # Generate aggregate assessment
        return self._generate_aggregate_assessment(comparison_results)

    def _compare_extraction_to_real(self, extracted: Dict[str, Any], 
                                   real_content: str, title: str) -> ComparisonResult:
        """Compare extracted data against real content"""
        
        # Validate extraction quality
        quality_score = self.validator.validate_extraction(extracted, real_content)
        
        # Identify coverage gaps
        coverage_gaps = self._identify_coverage_gaps(extracted, real_content)
        
        # Assess complexity preservation
        complexity_lost = self._assess_complexity_loss(extracted, real_content)
        
        # Check accuracy issues
        accuracy_issues = self._check_accuracy_issues(extracted, real_content)
        
        # Determine improvement priority
        priority = self._determine_priority(quality_score.coverage_score, 
                                          coverage_gaps, complexity_lost)
        
        return ComparisonResult(
            subsidy_title=title,
            extraction_score=quality_score.coverage_score,
            coverage_gaps=coverage_gaps,
            complexity_lost=complexity_lost,
            accuracy_issues=accuracy_issues,
            improvement_priority=priority
        )

    def _identify_coverage_gaps(self, extracted: Dict[str, Any], 
                               real_content: str) -> List[str]:
        """Identify what important information was missed"""
        gaps = []
        
        # Check for financial complexity
        if self._has_pattern(real_content, self.complexity_patterns['financial_complexity']):
            if not extracted.get('co_financing_bonuses') and not extracted.get('funding_calculation'):
                gaps.append("Missing complex funding rules (bonuses, limits, conditions)")
        
        # Check for legal references
        if self._has_pattern(real_content, self.complexity_patterns['legal_complexity']):
            if not extracted.get('regulatory_framework'):
                gaps.append("Missing legal/regulatory framework references")
        
        # Check for detailed eligibility
        if self._has_pattern(real_content, self.complexity_patterns['eligibility_complexity']):
            eligibility = extracted.get('eligibility', '')
            if len(eligibility) < 200 or 'exclus' not in eligibility.lower():
                gaps.append("Missing detailed eligibility criteria and exclusions")
        
        # Check for procedural complexity
        if self._has_pattern(real_content, self.complexity_patterns['procedural_complexity']):
            if not extracted.get('evaluation_criteria') or not extracted.get('selection_process'):
                gaps.append("Missing detailed evaluation and selection process")
        
        # Check document completeness
        docs_in_real = len(re.findall(r'pièces?\s+justificatives?|documents?\s+obligatoires?|annexes?', real_content, re.I))
        docs_extracted = len(extracted.get('documents', []))
        if docs_in_real > docs_extracted * 2:
            gaps.append("Incomplete document requirements list")
        
        return gaps

    def _assess_complexity_loss(self, extracted: Dict[str, Any], 
                               real_content: str) -> List[str]:
        """Assess what complexity was lost in extraction"""
        complexity_lost = []
        
        # Financial complexity loss
        real_rates = len(re.findall(r'(\d+)%', real_content))
        extracted_rates = 1 if extracted.get('co_financing_rate') else 0
        extracted_rates += len(extracted.get('co_financing_bonuses', []))
        
        if real_rates > extracted_rates * 2:
            complexity_lost.append(f"Financial rate complexity: {real_rates} rates in source, {extracted_rates} captured")
        
        # Document complexity
        if 'facultatif' in real_content.lower() or 'obligatoire' in real_content.lower():
            docs = extracted.get('documents', [])
            if not any(isinstance(doc, dict) and 'mandatory' in doc for doc in docs):
                complexity_lost.append("Document mandatory/optional distinction lost")
        
        # Timeline complexity
        timeline_indicators = len(re.findall(r'délai|échéance|dépôt|avant le|jusqu\'au', real_content, re.I))
        if timeline_indicators > 3 and not extracted.get('application_window'):
            complexity_lost.append("Complex application timeline simplified")
        
        return complexity_lost

    def _check_accuracy_issues(self, extracted: Dict[str, Any], 
                              real_content: str) -> List[str]:
        """Check for potential accuracy issues"""
        issues = []
        
        # Check funding amounts
        amounts_in_real = re.findall(r'(\d+(?:\.\d+)?)\s*(?:€|euros)', real_content)
        if amounts_in_real and extracted.get('amount'):
            max_real = max(float(a.replace('.', '')) for a in amounts_in_real)
            max_extracted = max(extracted['amount']) if isinstance(extracted['amount'], list) else extracted['amount']
            
            if abs(max_real - max_extracted) > max_real * 0.1:  # 10% tolerance
                issues.append(f"Funding amount mismatch: real max ~{max_real}, extracted {max_extracted}")
        
        # Check agency
        if 'franceagrimer' in real_content.lower() and extracted.get('agency'):
            if 'franceagrimer' not in extracted['agency'].lower():
                issues.append("Agency attribution may be incorrect")
        
        return issues

    def _determine_priority(self, score: float, gaps: List[str], 
                           complexity_lost: List[str]) -> str:
        """Determine improvement priority"""
        if score < 50 or len(gaps) > 3:
            return "HIGH"
        elif score < 75 or len(complexity_lost) > 2:
            return "MEDIUM"
        else:
            return "LOW"

    def _has_pattern(self, text: str, patterns: List[str]) -> bool:
        """Check if text contains any of the given patterns"""
        return any(re.search(pattern, text, re.I) for pattern in patterns)

    def _generate_aggregate_assessment(self, results: List[ComparisonResult]) -> Dict[str, Any]:
        """Generate comprehensive assessment report"""
        
        total_cases = len(results)
        avg_score = sum(r.extraction_score for r in results) / total_cases
        
        # Count priority levels
        priority_counts = {}
        for result in results:
            priority_counts[result.improvement_priority] = priority_counts.get(result.improvement_priority, 0) + 1
        
        # Aggregate common issues
        all_gaps = []
        all_complexity_lost = []
        for result in results:
            all_gaps.extend(result.coverage_gaps)
            all_complexity_lost.extend(result.complexity_lost)
        
        # Count frequency of issues
        gap_frequency = {}
        for gap in all_gaps:
            gap_frequency[gap] = gap_frequency.get(gap, 0) + 1
        
        complexity_frequency = {}
        for complexity in all_complexity_lost:
            complexity_frequency[complexity] = complexity_frequency.get(complexity, 0) + 1
        
        return {
            'assessment_summary': {
                'total_test_cases': total_cases,
                'average_extraction_score': avg_score,
                'overall_grade': 'A' if avg_score >= 85 else 'B' if avg_score >= 70 else 'C' if avg_score >= 55 else 'D',
                'priority_distribution': priority_counts
            },
            'common_issues': {
                'most_frequent_gaps': sorted(gap_frequency.items(), key=lambda x: x[1], reverse=True),
                'most_frequent_complexity_loss': sorted(complexity_frequency.items(), key=lambda x: x[1], reverse=True)
            },
            'individual_results': [
                {
                    'title': r.subsidy_title,
                    'score': r.extraction_score,
                    'priority': r.improvement_priority,
                    'main_issues': r.coverage_gaps[:3]  # Top 3 issues
                } for r in results
            ],
            'recommendations': self._generate_recommendations(results, avg_score),
            'prompt_improvements_needed': self._suggest_prompt_improvements(all_gaps, all_complexity_lost)
        }

    def _generate_recommendations(self, results: List[ComparisonResult], avg_score: float) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        if avg_score < 60:
            recommendations.append("CRITICAL: Complete prompt overhaul needed - extraction quality below acceptable threshold")
        elif avg_score < 75:
            recommendations.append("MAJOR: Significant prompt improvements needed for production readiness")
        else:
            recommendations.append("MINOR: Fine-tuning needed for optimal extraction quality")
        
        # Specific recommendations based on common issues
        high_priority_count = len([r for r in results if r.improvement_priority == "HIGH"])
        if high_priority_count > len(results) / 2:
            recommendations.append("Priority: Focus on financial complexity and legal reference extraction")
        
        complexity_issues = sum(len(r.complexity_lost) for r in results)
        if complexity_issues > len(results) * 2:
            recommendations.append("Critical: Add explicit instructions to preserve complexity, not summarize")
        
        recommendations.append("Implement enhanced postprocessor validation before production deployment")
        
        return recommendations

    def _suggest_prompt_improvements(self, gaps: List[str], complexity_lost: List[str]) -> List[str]:
        """Suggest specific prompt improvements"""
        improvements = []
        
        if any('funding rules' in gap for gap in gaps):
            improvements.append("Add explicit instruction: 'Extract ALL funding rates, bonuses, and conditions separately - never merge or average'")
        
        if any('legal' in gap for gap in gaps):
            improvements.append("Add explicit instruction: 'Include ALL legal references, article numbers, and regulatory citations exactly as written'")
        
        if any('eligibility' in gap for gap in gaps):
            improvements.append("Add explicit instruction: 'Extract complete eligibility criteria including all exclusions and conditional scenarios'")
        
        if any('Document' in comp for comp in complexity_lost):
            improvements.append("Add explicit instruction: 'Distinguish mandatory vs optional documents with structured format'")
        
        improvements.append("Add validation step: 'Before finalizing, verify no complex information was simplified or omitted'")
        
        return improvements

    # Mock data for the test cases (extracted from user's examples)
    def _parse_coast_guard_extracted(self) -> Dict[str, Any]:
        return {
            "title": "Aide à la coopération concernant les fonctions de garde-côtes",
            "description": "L'objectif spécifique 4.1 « Renforcement de la gestion durable des mers et des océans...",
            "agency": "Secrétariat général de la Mer",
            "program": "TA 3 - Coopération concernant les fonctions de garde-côtes",
            "co_financing_rate": 70,
            "region": ["All regions"],
            "funding_type": "FEAMPA",
            "eligibility": "No specific eligibility criteria provided.",
            "legal_entity_type": ["administration publique", "centre opérationnel public", "service regroupant les fonctions gardes-côtes"],
            "application_method": "Dépôt de demande de subvention dématérialisé sur le portail SYNERGIE",
            "documents": ["Liste Des PièCes Justificatives", "L'Annexe FinancièRe DéTaillant Les DéPenses"],
            "evaluation_criteria": ["Pertinence du projet vis-à-vis de l'objectif stratégique et de la priorité"]
        }

    def _get_coast_guard_real_content(self) -> str:
        return """
        L'objectif spécifique 4.1 « Renforcement de la gestion durable des mers et des océans par la promotion des connaissances du milieu marin, de la surveillance maritime et/ou de la coopération concernant les fonctions de garde-côtes» (article 25 du Règlement (UE) 2021/1139) » et son type d'action 3 (TA 3) relative à la coopération concernant les fonctions de garde-côtes doivent répondre aux objectifs français et européens de mutualisation et d'échanges d'informations entre les autorités garde- côtes.

        Le TA 3, objet du présent appel à projet est piloté par le Secrétariat général de la Mer. Son objectif est de contribuer d'une part au développement de l'initiative CISE[1] engagée par l'Union européenne dans le cadre de la politique maritime intégrée et d'autre part de créer et de favoriser une coopération durable et pérenne entre les autorités garde-côtes européennes.

        Ce dispositif financera en priorité les actions suivantes :
        - Développement d'adapteurs et/ ou de nœuds CISE ;
        - Assistance technique pour la maintenance d'adapteurs ou de nœuds existant ;
        - Amélioration des capacités d'échange de données des systèmes déjà connectés à CISE ;
        
        Taux de financement FEMPA: Le taux de financement FEAMPA est fixé à 70% du coût total du projet

        Documents nécessaires:
        - Liste des pièces justificatives 
        - L'annexe financière détaillant les dépenses
        - Le modèle de convention de partenariat (facultatif)
        - La liste des aides publiques déjà perçues
        """

    def _parse_olive_extracted(self) -> Dict[str, Any]:
        return {
            "title": "Programme opérationnel oléicole PAC 2023-2027",
            "deadline": "2022-11-30",
            "region": ["All regions"],
            "agency": "FranceAgriMer gère les programmes opérationnels oléicoles",
            "program": "Programme opérationnel oléicole",
            "eligibility": "No specific eligibility criteria provided.",
            "documents": []
        }

    def _get_olive_real_content(self) -> str:
        return """
        PROGRAMMES OPÉRATIONNELS (PO) OLÉICOLES RELEVANT DE LA PROGRAMMATION PAC 2023-2027

        Il s'agit d'une aide de l'Union Européenne avec un financement national complémentaire.

        Le montant de l'aide de l'Union accordée au titre du fonds opérationnel de l'année concernée du programme est calculé sur la base d'un taux d'aide de 50 % ou de 75 % fixé par objectif et type d'intervention (cf. art 65.1 du règlement (UE) 2021/2115) et par application de la double limite suivante :

        -  d'un montant égal à 30 % de la valeur réelle de la production commercialisée par le bénéficiaire ou ses OP membres au cours de la période de référence en 2023 et 2024, à 15 % en 2025 et 2026 et à 10 % à partir de 2027 ;
        -  d'une enveloppe (cf. art 88 du règlement (UE) 2021/2115) de 554 000 euros par exercice financier FEAGA.

        Un financement national complémentaire (cf. art 65 du règlement (UE) 2021/2015) est attribué via FranceAgriMer jusqu'à concurrence de 50 % des coûts non couverts par l'aide financière de l'Union.

        Les Associations d'Organisations de Producteurs (AOP) reconnues au sens de l'OCM par le Ministère en charge de l'Agriculture et de la Souveraineté Alimentaire.

        Dépôt des dossiers de demande d'agrément : au plus tard le 30 septembre minuit de l'année précédant celle de démarrage du PO. Toutefois, pour un programme débutant au 1er janvier 2023, la date limite est fixée au 30 novembre 2022.
        """

    def _parse_producer_org_extracted(self) -> Dict[str, Any]:
        return {
            "title": "Aide aux Organisations de Producteurs et Associations d'Organisations de Producteurs",
            "region": ["All regions"],
            "amount": [20000, 40000],
            "agency": "FranceAgriMer",
            "program": "Aide aux Organisations de Producteurs et Associations d'Organisations de Producteurs",
            "co_financing_rate": 50,
            "project_duration": "24",
            "eligibility": "No specific eligibility criteria provided.",
            "application_method": "Les demandes de paiement sont à transmettre au service instructeur de FranceAgriMer",
            "documents": []
        }

    def _get_producer_org_real_content(self) -> str:
        return """
        Le présent dispositif vise à financer des outils et des services nécessaires à la mission de négociation collective des OP et AOP.

        L'aide est versée dans le cadre du Règlement (UE) n° 1407/2013 de la Commission du 18 décembre 2013 modifié relatif à l'application des articles 107 et 108 du traité sur le fonctionnement de l'Union européenne aux aides de minimis.

        Les investissements éligibles à ce dispositif se décomposent en trois volets :

        Volet A – Systèmes d'information
        Volet B – Conseil externe  
        Volet C – appui au développement pour les nouvelles AOP

        L'accompagnement prend la forme d'une aide financière. Le taux d'aide est de 50 % des dépenses éligibles, bonifié de 20% pour les départements d'Outre-Mer, dans la limite d'un plafond d'aide de :
        - 20.000 € par volet pour les OP pour les volets A et B,
        - 40.000 € par volet pour les AOP pour les volets A et B,
        - 40.000 € pour les AOP pour le volet C.

        Sont exclues du dispositif :
        - les fédérations d'Organisations de producteurs ;
        - les Organisations de Producteurs bénéficiaires de programmes opérationnels Fruits et légumes ;
        """

if __name__ == "__main__":
    assessor = BatchQualityAssessment()
    assessment = assessor.assess_test_cases()
    print(json.dumps(assessment, indent=2, ensure_ascii=False))
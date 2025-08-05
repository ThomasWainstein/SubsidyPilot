#!/usr/bin/env python3
"""
AgriTool Quality Validator - Enhanced postprocessor for extraction quality control
Validates completeness and flags missing critical information in extracted subsidy data
"""

import json
import logging
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass

@dataclass
class QualityScore:
    """Quality assessment score for extraction completeness"""
    coverage_score: float  # 0-100
    critical_missing: List[str]
    warnings: List[str]
    completeness_details: Dict[str, bool]

class SubsidyQualityValidator:
    """Enhanced validator for subsidy extraction quality and completeness"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Critical fields that should always be present for FranceAgriMer subsidies
        self.critical_fields = {
            'financial': ['amount', 'co_financing_rate', 'funding_type'],
            'eligibility': ['eligibility', 'legal_entity_type'],
            'process': ['application_method', 'documents'],
            'identification': ['title', 'agency', 'description']
        }
        
        # High-value fields that significantly impact quality
        self.high_value_fields = [
            'co_financing_bonuses', 'evaluation_criteria', 'deadline', 
            'application_window', 'regulatory_framework', 'contact_information'
        ]
        
        # Complex fields that often get oversimplified
        self.complexity_indicators = {
            'funding_calculation': ['limite', 'plafond', 'majoration', 'bonus'],
            'eligibility': ['exclus', 'article', 'règlement', 'condition'],
            'documents': ['obligatoire', 'facultatif', 'annexe', 'modèle'],
            'application_window': ['dépôt', 'délai', 'échéance', 'période']
        }

    def validate_extraction(self, extracted_data: Dict[str, Any], 
                          source_text: str = None) -> QualityScore:
        """
        Comprehensive validation of extracted subsidy data
        
        Args:
            extracted_data: The extracted JSON data
            source_text: Optional source text for complexity analysis
            
        Returns:
            QualityScore with detailed assessment
        """
        coverage_score = 0
        critical_missing = []
        warnings = []
        completeness_details = {}
        
        # Check critical field presence and quality
        for category, fields in self.critical_fields.items():
            category_score = self._assess_field_category(extracted_data, fields, category)
            coverage_score += category_score * 25  # Each category worth 25 points
            
            for field in fields:
                is_present = self._is_field_complete(extracted_data, field)
                completeness_details[f"{category}_{field}"] = is_present
                if not is_present:
                    critical_missing.append(f"{category}: {field}")
        
        # Assess high-value field presence
        high_value_score = 0
        for field in self.high_value_fields:
            if self._is_field_complete(extracted_data, field):
                high_value_score += 1
            else:
                warnings.append(f"Missing high-value field: {field}")
                
        # Add high-value bonus (up to 20 points)
        coverage_score += min(20, (high_value_score / len(self.high_value_fields)) * 20)
        
        # Check for complexity preservation
        complexity_warnings = self._assess_complexity_preservation(extracted_data, source_text)
        warnings.extend(complexity_warnings)
        
        # Validate data structure integrity
        structure_warnings = self._validate_data_structure(extracted_data)
        warnings.extend(structure_warnings)
        
        return QualityScore(
            coverage_score=min(100, coverage_score),
            critical_missing=critical_missing,
            warnings=warnings,
            completeness_details=completeness_details
        )

    def _assess_field_category(self, data: Dict[str, Any], fields: List[str], 
                              category: str) -> float:
        """Assess completeness of a field category (0-1 score)"""
        total_fields = len(fields)
        complete_fields = sum(1 for field in fields if self._is_field_complete(data, field))
        return complete_fields / total_fields if total_fields > 0 else 0

    def _is_field_complete(self, data: Dict[str, Any], field: str) -> bool:
        """Check if a field is present and meaningfully populated"""
        if field not in data:
            return False
            
        value = data[field]
        
        # Check for empty/null values
        if value is None:
            return False
            
        # Check for empty strings
        if isinstance(value, str) and not value.strip():
            return False
            
        # Check for empty arrays
        if isinstance(value, list) and len(value) == 0:
            return False
            
        # Check for minimal/generic content
        if isinstance(value, str):
            generic_indicators = [
                'not specified', 'non spécifié', 'no specific', 
                'pas de critères', 'no criteria', 'see website'
            ]
            if any(indicator in value.lower() for indicator in generic_indicators):
                return False
                
        return True

    def _assess_complexity_preservation(self, data: Dict[str, Any], 
                                      source_text: str = None) -> List[str]:
        """Check if complex information was properly preserved"""
        warnings = []
        
        for field, indicators in self.complexity_indicators.items():
            if field in data and isinstance(data[field], str):
                field_value = data[field].lower()
                
                # Check if source had complexity that wasn't captured
                if source_text:
                    source_lower = source_text.lower()
                    source_complexity = sum(1 for indicator in indicators 
                                          if indicator in source_lower)
                    field_complexity = sum(1 for indicator in indicators 
                                         if indicator in field_value)
                    
                    if source_complexity > field_complexity * 2:  # Threshold for oversimplification
                        warnings.append(
                            f"Field '{field}' may be oversimplified - "
                            f"source has {source_complexity} complexity indicators, "
                            f"extraction has {field_complexity}"
                        )

        return warnings

    def _validate_data_structure(self, data: Dict[str, Any]) -> List[str]:
        """Validate the structure and format of extracted data"""
        warnings = []
        
        # Check array fields are properly formatted
        array_fields = ['amount', 'region', 'sector', 'documents', 'legal_entity_type']
        for field in array_fields:
            if field in data and not isinstance(data[field], list):
                warnings.append(f"Field '{field}' should be an array but is {type(data[field])}")
        
        # Check amount field specifically
        if 'amount' in data and isinstance(data['amount'], list):
            try:
                amounts = [float(x) for x in data['amount'] if x is not None]
                if len(amounts) == 0:
                    warnings.append("Amount field is empty or contains no valid numbers")
                elif len(amounts) == 2 and amounts[0] > amounts[1]:
                    warnings.append("Amount range appears inverted (min > max)")
            except (ValueError, TypeError):
                warnings.append("Amount field contains non-numeric values")
        
        # Check for suspiciously short descriptions
        if 'description' in data and isinstance(data['description'], str):
            if len(data['description']) < 100:
                warnings.append("Description field may be too brief for a complete subsidy description")
        
        # Check co-financing rate reasonableness
        if 'co_financing_rate' in data and data['co_financing_rate'] is not None:
            try:
                rate = float(data['co_financing_rate'])
                if rate > 100:
                    warnings.append("Co-financing rate appears to be over 100%")
                elif rate < 0:
                    warnings.append("Co-financing rate is negative")
            except (ValueError, TypeError):
                warnings.append("Co-financing rate is not a valid number")
        
        return warnings

    def generate_quality_report(self, quality_score: QualityScore, 
                              subsidy_id: str = None) -> Dict[str, Any]:
        """Generate a comprehensive quality report"""
        
        # Determine quality level
        if quality_score.coverage_score >= 90:
            quality_level = "EXCELLENT"
        elif quality_score.coverage_score >= 75:
            quality_level = "GOOD"
        elif quality_score.coverage_score >= 60:
            quality_level = "FAIR"
        else:
            quality_level = "POOR"
        
        # Count completion by category
        completion_by_category = {}
        for key, value in quality_score.completeness_details.items():
            category = key.split('_')[0]
            if category not in completion_by_category:
                completion_by_category[category] = {'complete': 0, 'total': 0}
            completion_by_category[category]['total'] += 1
            if value:
                completion_by_category[category]['complete'] += 1
        
        return {
            'subsidy_id': subsidy_id,
            'overall_score': quality_score.coverage_score,
            'quality_level': quality_level,
            'critical_missing_count': len(quality_score.critical_missing),
            'warning_count': len(quality_score.warnings),
            'completion_by_category': completion_by_category,
            'critical_missing': quality_score.critical_missing,
            'warnings': quality_score.warnings,
            'recommendations': self._generate_recommendations(quality_score),
            'requires_human_review': quality_score.coverage_score < 75 or len(quality_score.critical_missing) > 0
        }

    def _generate_recommendations(self, quality_score: QualityScore) -> List[str]:
        """Generate actionable recommendations for improvement"""
        recommendations = []
        
        if quality_score.coverage_score < 60:
            recommendations.append("Consider re-extraction with enhanced prompt or manual review")
        
        if any('financial' in missing for missing in quality_score.critical_missing):
            recommendations.append("Priority: Extract complete funding information including rates and bonuses")
            
        if any('eligibility' in missing for missing in quality_score.critical_missing):
            recommendations.append("Priority: Extract complete eligibility criteria including exclusions")
        
        complexity_warnings = [w for w in quality_score.warnings if 'oversimplified' in w]
        if complexity_warnings:
            recommendations.append("Review source for complex conditions that may have been simplified")
        
        if len(quality_score.warnings) > 5:
            recommendations.append("High warning count - consider manual validation")
            
        return recommendations

def validate_batch_extractions(extractions: List[Dict[str, Any]], 
                             source_texts: List[str] = None) -> Dict[str, Any]:
    """
    Validate a batch of extractions and generate aggregate statistics
    
    Args:
        extractions: List of extracted subsidy data
        source_texts: Optional list of source texts for complexity analysis
        
    Returns:
        Aggregate validation report
    """
    validator = SubsidyQualityValidator()
    
    all_scores = []
    all_reports = []
    
    for i, extraction in enumerate(extractions):
        source_text = source_texts[i] if source_texts and i < len(source_texts) else None
        quality_score = validator.validate_extraction(extraction, source_text)
        quality_report = validator.generate_quality_report(quality_score, f"subsidy_{i}")
        
        all_scores.append(quality_score.coverage_score)
        all_reports.append(quality_report)
    
    # Calculate aggregate statistics
    total_extractions = len(extractions)
    avg_score = sum(all_scores) / total_extractions if total_extractions > 0 else 0
    
    quality_distribution = {
        'excellent': len([s for s in all_scores if s >= 90]),
        'good': len([s for s in all_scores if 75 <= s < 90]),
        'fair': len([s for s in all_scores if 60 <= s < 75]),
        'poor': len([s for s in all_scores if s < 60])
    }
    
    # Identify common issues
    all_warnings = []
    all_critical_missing = []
    for report in all_reports:
        all_warnings.extend(report['warnings'])
        all_critical_missing.extend(report['critical_missing'])
    
    common_warnings = {}
    for warning in all_warnings:
        common_warnings[warning] = common_warnings.get(warning, 0) + 1
    
    common_missing = {}
    for missing in all_critical_missing:
        common_missing[missing] = common_missing.get(missing, 0) + 1
    
    return {
        'batch_summary': {
            'total_extractions': total_extractions,
            'average_score': avg_score,
            'quality_distribution': quality_distribution,
            'requires_review_count': len([r for r in all_reports if r['requires_human_review']])
        },
        'common_issues': {
            'most_common_warnings': sorted(common_warnings.items(), key=lambda x: x[1], reverse=True)[:10],
            'most_common_missing': sorted(common_missing.items(), key=lambda x: x[1], reverse=True)[:10]
        },
        'individual_reports': all_reports,
        'recommendations': [
            f"Average score: {avg_score:.1f}% - {'GOOD' if avg_score >= 75 else 'NEEDS IMPROVEMENT'}",
            f"{quality_distribution['poor']} extractions need immediate attention",
            f"Most common issue: {max(common_warnings.items(), key=lambda x: x[1])[0] if common_warnings else 'None'}"
        ]
    }

if __name__ == "__main__":
    # Example usage
    validator = SubsidyQualityValidator()
    
    # Example extraction to validate
    sample_extraction = {
        "title": "Aide aux investissements en agroéquipements",
        "description": "Brief description", 
        "amount": [1000, 150000],
        "co_financing_rate": 40,
        "eligibility": "No specific criteria provided",
        "documents": []
    }
    
    quality_score = validator.validate_extraction(sample_extraction)
    report = validator.generate_quality_report(quality_score, "sample")
    
    print(json.dumps(report, indent=2, ensure_ascii=False))
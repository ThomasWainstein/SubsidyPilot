#!/usr/bin/env python3
"""
AgriTool Data Quality Validation Suite
======================================

Comprehensive data quality validation for the AgriTool pipeline:
1. Raw logs data integrity and completeness
2. Structured data field validation and normalization
3. Audit trail verification and consistency
4. Data extraction accuracy assessment
5. Performance and reliability metrics
6. Error pattern analysis and reporting

This script validates that the pipeline produces high-quality, reliable data.
"""

import os
import sys
import json
import re
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
from dataclasses import dataclass

# Dependencies
try:
    from supabase import create_client, Client
except ImportError as e:
    print(f"❌ Missing dependencies: {e}")
    print("Install with: pip install supabase")
    sys.exit(1)


@dataclass
class ValidationMetrics:
    """Data structure for validation metrics."""
    total_records: int = 0
    valid_records: int = 0
    invalid_records: int = 0
    missing_fields: Dict[str, int] = None
    field_completeness: Dict[str, float] = None
    validation_errors: List[str] = None
    
    def __post_init__(self):
        if self.missing_fields is None:
            self.missing_fields = defaultdict(int)
        if self.field_completeness is None:
            self.field_completeness = {}
        if self.validation_errors is None:
            self.validation_errors = []


class DataQualityValidator:
    """Comprehensive data quality validation system."""
    
    def __init__(self):
        """Initialize validator with Supabase connection."""
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not all([self.supabase_url, self.supabase_key]):
            raise ValueError("Missing required Supabase environment variables")
            
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        self.validation_results = {}
        self.start_time = datetime.now(timezone.utc)
        
        # Define canonical field requirements
        self.canonical_fields = [
            'url', 'title', 'description', 'eligibility', 'documents', 'deadline',
            'amount', 'program', 'agency', 'region', 'sector', 'funding_type',
            'co_financing_rate', 'project_duration', 'payment_terms', 'application_method',
            'evaluation_criteria', 'previous_acceptance_rate', 'priority_groups',
            'legal_entity_type', 'funding_source', 'reporting_requirements',
            'compliance_requirements', 'language', 'technical_support',
            'application_requirements', 'questionnaire_steps'
        ]
        
        self.required_fields = ['url', 'title', 'description', 'audit']
        
    def log_validation(self, category: str, success: bool, details: str = "", 
                      metrics: Dict = None) -> None:
        """Log validation result."""
        if category not in self.validation_results:
            self.validation_results[category] = []
            
        result = {
            'success': success,
            'details': details,
            'metrics': metrics or {},
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        self.validation_results[category].append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {category}")
        if details:
            print(f"    {details}")
        if metrics:
            for key, value in metrics.items():
                print(f"    📊 {key}: {value}")
        print()

    def validate_raw_logs_integrity(self) -> ValidationMetrics:
        """Validate raw logs data integrity and completeness."""
        print("🔍 Validating raw logs data integrity...")
        
        try:
            # Fetch all raw logs for analysis
            result = self.supabase.table('raw_logs').select('*').execute()
            raw_logs = result.data if result.data else []
            
            metrics = ValidationMetrics()
            metrics.total_records = len(raw_logs)
            
            payload_issues = []
            processing_status = {'processed': 0, 'unprocessed': 0}
            
            for log in raw_logs:
                # Check payload validity
                try:
                    payload = json.loads(log.get('payload', '{}')) if log.get('payload') else {}
                    
                    # Validate payload structure
                    if not payload.get('source_url'):
                        payload_issues.append(f"Log {log['id']}: Missing source_url")
                    
                    if not payload.get('title'):
                        payload_issues.append(f"Log {log['id']}: Missing title")
                        
                    # Check for multi-tab content
                    if 'tabs' in payload and isinstance(payload['tabs'], dict):
                        tab_count = len(payload['tabs'])
                        if tab_count == 0:
                            payload_issues.append(f"Log {log['id']}: Empty tabs object")
                    else:
                        payload_issues.append(f"Log {log['id']}: Missing or invalid tabs structure")
                    
                    # Valid record if no critical issues
                    if not any(log['id'] in issue for issue in payload_issues[-3:]):
                        metrics.valid_records += 1
                    else:
                        metrics.invalid_records += 1
                        
                except json.JSONDecodeError:
                    payload_issues.append(f"Log {log['id']}: Invalid JSON payload")
                    metrics.invalid_records += 1
                
                # Track processing status
                if log.get('processed'):
                    processing_status['processed'] += 1
                else:
                    processing_status['unprocessed'] += 1
            
            # Calculate completeness metrics
            if metrics.total_records > 0:
                validity_rate = metrics.valid_records / metrics.total_records
                processing_rate = processing_status['processed'] / metrics.total_records
            else:
                validity_rate = 0
                processing_rate = 0
            
            success = len(payload_issues) == 0 and validity_rate > 0.8
            
            self.log_validation(
                "Raw Logs Integrity",
                success,
                f"Analyzed {metrics.total_records} raw logs",
                {
                    'total_records': metrics.total_records,
                    'valid_records': metrics.valid_records,
                    'invalid_records': metrics.invalid_records,
                    'validity_rate': f"{validity_rate:.1%}",
                    'processing_rate': f"{processing_rate:.1%}",
                    'payload_issues': len(payload_issues),
                    'processed_count': processing_status['processed'],
                    'unprocessed_count': processing_status['unprocessed']
                }
            )
            
            metrics.validation_errors = payload_issues
            return metrics
            
        except Exception as e:
            self.log_validation(
                "Raw Logs Integrity",
                False,
                f"Validation failed: {str(e)}"
            )
            return ValidationMetrics()

    def validate_structured_data_quality(self) -> ValidationMetrics:
        """Validate structured data field quality and completeness."""
        print("🔍 Validating structured data quality...")
        
        try:
            # Fetch structured data for analysis
            result = self.supabase.table('subsidies_structured').select('*').execute()
            structured_data = result.data if result.data else []
            
            metrics = ValidationMetrics()
            metrics.total_records = len(structured_data)
            
            field_stats = defaultdict(int)
            field_completeness = {}
            validation_errors = []
            
            for record in structured_data:
                record_valid = True
                
                # Check required fields
                for field in self.required_fields:
                    if not record.get(field):
                        metrics.missing_fields[field] += 1
                        validation_errors.append(f"Record {record.get('id', 'unknown')}: Missing {field}")
                        record_valid = False
                    else:
                        field_stats[field] += 1
                
                # Check canonical fields completeness
                for field in self.canonical_fields:
                    if record.get(field):
                        field_stats[field] += 1
                
                # Validate specific field formats
                if record.get('deadline'):
                    if not self._validate_date_format(record['deadline']):
                        validation_errors.append(f"Record {record.get('id', 'unknown')}: Invalid deadline format")
                        record_valid = False
                
                if record.get('amount'):
                    if not self._validate_numeric_field(record['amount']):
                        validation_errors.append(f"Record {record.get('id', 'unknown')}: Invalid amount format")
                        record_valid = False
                
                # Validate audit trail
                if record.get('audit'):
                    if not self._validate_audit_structure(record['audit']):
                        validation_errors.append(f"Record {record.get('id', 'unknown')}: Invalid audit structure")
                        record_valid = False
                
                if record_valid:
                    metrics.valid_records += 1
                else:
                    metrics.invalid_records += 1
            
            # Calculate field completeness rates
            for field in self.canonical_fields:
                if metrics.total_records > 0:
                    field_completeness[field] = field_stats[field] / metrics.total_records
                else:
                    field_completeness[field] = 0
            
            metrics.field_completeness = field_completeness
            metrics.validation_errors = validation_errors
            
            # Overall quality assessment
            avg_completeness = sum(field_completeness.values()) / len(field_completeness) if field_completeness else 0
            error_rate = len(validation_errors) / metrics.total_records if metrics.total_records > 0 else 1
            
            success = (
                avg_completeness > 0.6 and  # At least 60% field completeness
                error_rate < 0.2 and  # Less than 20% error rate
                metrics.valid_records > metrics.invalid_records  # More valid than invalid
            )
            
            self.log_validation(
                "Structured Data Quality",
                success,
                f"Analyzed {metrics.total_records} structured records",
                {
                    'total_records': metrics.total_records,
                    'valid_records': metrics.valid_records,
                    'invalid_records': metrics.invalid_records,
                    'avg_field_completeness': f"{avg_completeness:.1%}",
                    'validation_errors': len(validation_errors),
                    'error_rate': f"{error_rate:.1%}",
                    'required_fields_ok': sum(1 for f in self.required_fields if field_completeness.get(f, 0) > 0.8)
                }
            )
            
            return metrics
            
        except Exception as e:
            self.log_validation(
                "Structured Data Quality",
                False,
                f"Validation failed: {str(e)}"
            )
            return ValidationMetrics()

    def validate_audit_trails(self) -> bool:
        """Validate audit trail completeness and consistency."""
        print("🔍 Validating audit trails...")
        
        try:
            # Fetch records with audit trails
            result = self.supabase.table('subsidies_structured').select('id', 'audit', 'raw_log_id').execute()
            records = result.data if result.data else []
            
            audit_issues = []
            valid_audits = 0
            
            for record in records:
                audit_data = record.get('audit')
                if not audit_data:
                    audit_issues.append(f"Record {record.get('id')}: Missing audit trail")
                    continue
                
                try:
                    # Parse audit JSON
                    if isinstance(audit_data, str):
                        audit = json.loads(audit_data)
                    else:
                        audit = audit_data
                    
                    # Validate audit structure
                    required_audit_fields = ['extraction_status', 'validation_notes']
                    missing_audit_fields = [f for f in required_audit_fields if f not in audit]
                    
                    if missing_audit_fields:
                        audit_issues.append(f"Record {record.get('id')}: Missing audit fields: {missing_audit_fields}")
                    else:
                        valid_audits += 1
                        
                except json.JSONDecodeError:
                    audit_issues.append(f"Record {record.get('id')}: Invalid audit JSON")
            
            total_records = len(records)
            audit_completeness = valid_audits / total_records if total_records > 0 else 0
            
            success = audit_completeness > 0.8 and len(audit_issues) < total_records * 0.1
            
            self.log_validation(
                "Audit Trails",
                success,
                f"Validated {total_records} audit trails",
                {
                    'total_records': total_records,
                    'valid_audits': valid_audits,
                    'audit_issues': len(audit_issues),
                    'audit_completeness': f"{audit_completeness:.1%}",
                    'issues_rate': f"{len(audit_issues) / total_records:.1%}" if total_records > 0 else "0%"
                }
            )
            
            return success
            
        except Exception as e:
            self.log_validation(
                "Audit Trails",
                False,
                f"Validation failed: {str(e)}"
            )
            return False

    def validate_extraction_accuracy(self) -> bool:
        """Validate data extraction accuracy through sampling."""
        print("🔍 Validating extraction accuracy...")
        
        try:
            # Sample recent extractions for accuracy assessment
            result = self.supabase.table('subsidies_structured').select(
                'id', 'raw_log_id', 'title', 'description', 'deadline', 'amount', 'audit'
            ).order('created_at', desc=True).limit(50).execute()
            
            sample_records = result.data if result.data else []
            
            accuracy_issues = []
            high_confidence_records = 0
            
            for record in sample_records:
                # Check for obvious extraction issues
                title = record.get('title', '')
                description = record.get('description', '')
                
                # Title validation
                if len(title) < 10:
                    accuracy_issues.append(f"Record {record.get('id')}: Title too short")
                elif 'error' in title.lower() or 'failed' in title.lower():
                    accuracy_issues.append(f"Record {record.get('id')}: Title indicates extraction error")
                
                # Description validation
                if len(description) < 50:
                    accuracy_issues.append(f"Record {record.get('id')}: Description too short")
                
                # Check audit confidence if available
                audit_data = record.get('audit')
                if audit_data:
                    try:
                        if isinstance(audit_data, str):
                            audit = json.loads(audit_data)
                        else:
                            audit = audit_data
                            
                        confidence = audit.get('confidence_score', 0)
                        if confidence > 0.8:
                            high_confidence_records += 1
                            
                    except (json.JSONDecodeError, TypeError):
                        pass
            
            total_sample = len(sample_records)
            accuracy_rate = 1 - (len(accuracy_issues) / total_sample) if total_sample > 0 else 0
            confidence_rate = high_confidence_records / total_sample if total_sample > 0 else 0
            
            success = accuracy_rate > 0.8 and confidence_rate > 0.6
            
            self.log_validation(
                "Extraction Accuracy",
                success,
                f"Analyzed {total_sample} sample records",
                {
                    'sample_size': total_sample,
                    'accuracy_issues': len(accuracy_issues),
                    'accuracy_rate': f"{accuracy_rate:.1%}",
                    'high_confidence_records': high_confidence_records,
                    'confidence_rate': f"{confidence_rate:.1%}"
                }
            )
            
            return success
            
        except Exception as e:
            self.log_validation(
                "Extraction Accuracy",
                False,
                f"Validation failed: {str(e)}"
            )
            return False

    def validate_error_patterns(self) -> bool:
        """Analyze error patterns and logging consistency."""
        print("🔍 Validating error patterns...")
        
        try:
            # Fetch recent error logs
            result = self.supabase.table('error_log').select('*').order('created_at', desc=True).limit(100).execute()
            error_logs = result.data if result.data else []
            
            error_patterns = defaultdict(int)
            critical_errors = 0
            
            for error in error_logs:
                error_type = error.get('error_type', 'unknown')
                error_message = error.get('error_message', '')
                
                error_patterns[error_type] += 1
                
                # Identify critical errors
                if any(keyword in error_message.lower() for keyword in ['critical', 'fatal', 'system', 'database']):
                    critical_errors += 1
            
            total_errors = len(error_logs)
            critical_rate = critical_errors / total_errors if total_errors > 0 else 0
            
            # Check for concerning error patterns
            concerning_patterns = []
            for error_type, count in error_patterns.items():
                if count > total_errors * 0.3:  # More than 30% of errors of one type
                    concerning_patterns.append(f"{error_type}: {count} occurrences")
            
            success = (
                critical_rate < 0.1 and  # Less than 10% critical errors
                len(concerning_patterns) == 0  # No dominating error patterns
            )
            
            self.log_validation(
                "Error Patterns",
                success,
                f"Analyzed {total_errors} error logs",
                {
                    'total_errors': total_errors,
                    'critical_errors': critical_errors,
                    'critical_rate': f"{critical_rate:.1%}",
                    'error_types': len(error_patterns),
                    'concerning_patterns': len(concerning_patterns),
                    'top_error_type': max(error_patterns.items(), key=lambda x: x[1])[0] if error_patterns else 'none'
                }
            )
            
            return success
            
        except Exception as e:
            self.log_validation(
                "Error Patterns",
                False,
                f"Validation failed: {str(e)}"
            )
            return False

    def _validate_date_format(self, date_str: Any) -> bool:
        """Validate date format."""
        if not date_str:
            return False
        
        # Check common date formats
        date_patterns = [
            r'^\d{4}-\d{2}-\d{2}$',  # YYYY-MM-DD
            r'^\d{2}/\d{2}/\d{4}$',  # DD/MM/YYYY
            r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}',  # ISO format
        ]
        
        date_str = str(date_str)
        return any(re.match(pattern, date_str) for pattern in date_patterns)

    def _validate_numeric_field(self, value: Any) -> bool:
        """Validate numeric field."""
        if value is None:
            return False
        
        try:
            if isinstance(value, (int, float)):
                return value >= 0
            
            # Try to parse as number
            str_value = str(value).replace(',', '').replace('€', '').replace('$', '').strip()
            float(str_value)
            return True
        except (ValueError, TypeError):
            return False

    def _validate_audit_structure(self, audit_data: Any) -> bool:
        """Validate audit trail structure."""
        try:
            if isinstance(audit_data, str):
                audit = json.loads(audit_data)
            else:
                audit = audit_data
            
            # Check for essential audit fields
            essential_fields = ['extraction_status', 'validation_notes']
            return all(field in audit for field in essential_fields)
            
        except (json.JSONDecodeError, TypeError):
            return False

    def generate_quality_report(self) -> Dict[str, Any]:
        """Generate comprehensive data quality report."""
        end_time = datetime.now(timezone.utc)
        duration = (end_time - self.start_time).total_seconds()
        
        # Calculate overall quality score
        total_validations = sum(len(results) for results in self.validation_results.values())
        passed_validations = sum(
            len([r for r in results if r['success']]) 
            for results in self.validation_results.values()
        )
        
        overall_score = passed_validations / total_validations if total_validations > 0 else 0
        
        # Determine quality level
        if overall_score >= 0.9:
            quality_level = "EXCELLENT"
        elif overall_score >= 0.8:
            quality_level = "GOOD"
        elif overall_score >= 0.7:
            quality_level = "ACCEPTABLE"
        elif overall_score >= 0.6:
            quality_level = "NEEDS_IMPROVEMENT"
        else:
            quality_level = "CRITICAL_ISSUES"
        
        report = {
            'validation_execution': {
                'start_time': self.start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'duration_seconds': duration,
                'total_validations': total_validations,
                'passed_validations': passed_validations,
                'overall_score': overall_score,
                'quality_level': quality_level
            },
            'validation_results': self.validation_results,
            'summary': {
                'data_quality_acceptable': overall_score >= 0.7,
                'critical_issues': self._identify_critical_issues(),
                'recommendations': self._generate_quality_recommendations()
            }
        }
        
        return report

    def _identify_critical_issues(self) -> List[str]:
        """Identify critical data quality issues."""
        critical_issues = []
        
        for category, results in self.validation_results.items():
            failed_results = [r for r in results if not r['success']]
            if failed_results:
                critical_issues.append(f"{category}: {len(failed_results)} failures")
        
        return critical_issues

    def _generate_quality_recommendations(self) -> List[str]:
        """Generate recommendations for improving data quality."""
        recommendations = []
        
        for category, results in self.validation_results.items():
            failed_results = [r for r in results if not r['success']]
            if failed_results:
                if 'Raw Logs' in category:
                    recommendations.append("Improve raw data scraping and validation before upload")
                elif 'Structured Data' in category:
                    recommendations.append("Enhance AI extraction prompts and field normalization")
                elif 'Audit Trails' in category:
                    recommendations.append("Ensure comprehensive audit logging in extraction process")
                elif 'Extraction Accuracy' in category:
                    recommendations.append("Review and improve AI model prompts and validation rules")
                elif 'Error Patterns' in category:
                    recommendations.append("Investigate recurring errors and implement preventive measures")
        
        if not recommendations:
            recommendations.append("Data quality is excellent - maintain current standards")
            
        return recommendations


def main():
    """Run comprehensive data quality validation."""
    print("🔍 === AGRITOOL DATA QUALITY VALIDATION ===")
    print(f"📅 Validation started: {datetime.now(timezone.utc).isoformat()}")
    print()
    
    try:
        # Initialize validator
        validator = DataQualityValidator()
        
        # Run validation suite
        print("🏃 Running data quality validation suite...")
        print()
        
        # Validate raw logs integrity
        raw_metrics = validator.validate_raw_logs_integrity()
        
        # Validate structured data quality
        structured_metrics = validator.validate_structured_data_quality()
        
        # Validate audit trails
        validator.validate_audit_trails()
        
        # Validate extraction accuracy
        validator.validate_extraction_accuracy()
        
        # Validate error patterns
        validator.validate_error_patterns()
        
        # Generate and save report
        report = validator.generate_quality_report()
        
        # Save report to file
        with open('data_quality_report.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        # Print summary
        print("📋 === DATA QUALITY VALIDATION SUMMARY ===")
        print(f"⏱️ Duration: {report['validation_execution']['duration_seconds']:.2f} seconds")
        print(f"📊 Validations: {report['validation_execution']['total_validations']} total")
        print(f"✅ Passed: {report['validation_execution']['passed_validations']}")
        print(f"🎯 Overall Score: {report['validation_execution']['overall_score']:.1%}")
        print(f"🏆 Quality Level: {report['validation_execution']['quality_level']}")
        print()
        
        if report['summary']['data_quality_acceptable']:
            print("🎉 DATA QUALITY ACCEPTABLE!")
            print("✅ Pipeline produces high-quality data")
        else:
            print("⚠️ DATA QUALITY ISSUES DETECTED")
            print("❌ Critical issues found:")
            for issue in report['summary']['critical_issues']:
                print(f"   - {issue}")
            print()
            print("🔧 Recommendations:")
            for rec in report['summary']['recommendations']:
                print(f"   - {rec}")
        
        print()
        print(f"📄 Detailed report saved to: data_quality_report.json")
        
        # Exit with appropriate code
        sys.exit(0 if report['summary']['data_quality_acceptable'] else 1)
        
    except Exception as e:
        print(f"💥 CRITICAL VALIDATION FAILURE: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
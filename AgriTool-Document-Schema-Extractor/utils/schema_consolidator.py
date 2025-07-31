"""
Schema consolidation utilities for merging multiple document schemas.
"""

import logging
from datetime import datetime
from typing import Dict, List, Any


class SchemaConsolidator:
    """Consolidate schemas from multiple documents into a unified schema."""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    def consolidate_schemas(self, extraction_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Consolidate schemas from multiple documents.
        
        Args:
            extraction_results: List of extraction results from documents.
            
        Returns:
            Consolidated schema with deduplication and metadata.
        """
        all_fields = []
        all_raw_unclassified = []
        document_metadata = []
        
        for result in extraction_results:
            schema = result.get('schema', {})
            all_fields.extend(schema.get('fields', []))
            all_raw_unclassified.extend(schema.get('raw_unclassified', []))
            
            # Collect metadata from each document
            doc_meta = {
                "document_url": result.get('document_url'),
                "document_type": result.get('document_type'),
                "field_count": result.get('field_count', 0),
                "coverage_percentage": result.get('coverage_percentage', 0),
                "extraction_metadata": result.get('extraction_metadata', {})
            }
            document_metadata.append(doc_meta)
        
        # Remove duplicate fields (same name)
        unique_fields = self._deduplicate_fields(all_fields)
        
        # Calculate consolidated metrics
        total_fields = len(unique_fields)
        avg_coverage = sum(r.get('coverage_percentage', 0) for r in extraction_results) / len(extraction_results) if extraction_results else 0
        
        consolidated_schema = {
            "fields": unique_fields,
            "raw_unclassified": all_raw_unclassified,
            "metadata": {
                "total_documents": len(extraction_results),
                "total_fields": total_fields,
                "average_coverage": avg_coverage,
                "extraction_timestamp": datetime.utcnow().isoformat(),
                "document_breakdown": document_metadata
            }
        }
        
        self.logger.info("Schema consolidated", extra={
            "total_documents": len(extraction_results),
            "unique_fields": total_fields,
            "raw_unclassified_items": len(all_raw_unclassified)
        })
        
        return consolidated_schema
    
    def _deduplicate_fields(self, fields: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate fields, keeping the most complete version."""
        unique_fields = {}
        
        for field in fields:
            field_name = field.get('name')
            if not field_name:
                continue
            
            if field_name not in unique_fields:
                unique_fields[field_name] = field
            else:
                # Keep the field with more information
                existing = unique_fields[field_name]
                if self._field_completeness_score(field) > self._field_completeness_score(existing):
                    unique_fields[field_name] = field
        
        return list(unique_fields.values())
    
    def _field_completeness_score(self, field: Dict[str, Any]) -> int:
        """Calculate a completeness score for field comparison."""
        score = 0
        score += 1 if field.get('label') else 0
        score += 1 if field.get('type') != 'text' else 0  # Non-default type
        score += 1 if field.get('help') else 0
        score += 1 if field.get('options') else 0
        score += 1 if field.get('required') else 0
        return score
"""
Robust Array Processing Utilities for AgriTool
Handles all forms of array input with comprehensive logging and audit trails
"""

import json
import re
import logging
from typing import Any, List, Optional, Union, Tuple
from datetime import datetime
from array_field_config import (
    get_array_fields, 
    is_array_field, 
    get_field_type,
    should_force_array
)

# Set up dedicated logger for array processing
array_logger = logging.getLogger('agritool.array_processing')
array_logger.setLevel(logging.INFO)

# Create handler if not already exists
if not array_logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    array_logger.addHandler(handler)

class ArrayCoercionResult:
    """Result of array coercion with audit information"""
    def __init__(self, value: List[Any], original: Any, method: str, 
                 field_name: str, warnings: List[str] = None):
        self.value = value
        self.original = original
        self.method = method
        self.field_name = field_name
        self.warnings = warnings or []
        self.timestamp = datetime.now().isoformat()
        self.success = True

    def to_audit_dict(self):
        """Convert to dictionary for audit logging"""
        return {
            'field_name': self.field_name,
            'original_value': self.original,
            'original_type': type(self.original).__name__,
            'coerced_value': self.value,
            'coerced_length': len(self.value),
            'method': self.method,
            'warnings': self.warnings,
            'timestamp': self.timestamp,
            'success': self.success
        }

def ensure_array(value: Any, field_name: str = 'unknown', 
                 logger: logging.Logger = None) -> ArrayCoercionResult:
    """
    Robust array coercion with comprehensive audit logging
    
    Args:
        value: Input value to coerce to array
        field_name: Name of field for audit purposes
        logger: Optional logger instance
        
    Returns:
        ArrayCoercionResult with coerced array and audit info
    """
    if logger is None:
        logger = array_logger
    
    original_value = value
    warnings = []
    
    # Log the attempt
    logger.info(f"Array coercion attempt: field='{field_name}', "
                f"value={repr(value)}, type={type(value).__name__}")
    
    try:
        # Handle None, empty, or null-like values
        if value is None:
            return ArrayCoercionResult([], original_value, 'null_handling', field_name)
        
        # Handle already-list values
        if isinstance(value, list):
            # Validate and clean existing list
            cleaned = []
            for item in value:
                if item is not None and str(item).strip():
                    cleaned.append(item)
                else:
                    warnings.append(f"Filtered empty/null item: {repr(item)}")
            
            result = ArrayCoercionResult(cleaned, original_value, 'list_cleanup', field_name, warnings)
            logger.info(f"List cleanup successful: {len(cleaned)} items")
            return result
        
        # Convert to string for processing
        str_value = str(value).strip()
        
        # Handle empty strings
        if not str_value or str_value.lower() in ['null', 'none', 'undefined', '[]', '{}']:
            return ArrayCoercionResult([], original_value, 'empty_string', field_name)
        
        # Try JSON parsing first (most reliable)
        if str_value.startswith('[') and str_value.endswith(']'):
            try:
                parsed = json.loads(str_value)
                if isinstance(parsed, list):
                    # Clean the parsed list
                    cleaned = [item for item in parsed if item is not None and str(item).strip()]
                    result = ArrayCoercionResult(cleaned, original_value, 'json_parse', field_name)
                    logger.info(f"JSON parse successful: {len(cleaned)} items")
                    return result
                else:
                    warnings.append(f"JSON parsed to non-list: {type(parsed)}")
            except json.JSONDecodeError as e:
                warnings.append(f"JSON parse failed: {str(e)}")
        
        # Try Python-style list parsing
        if str_value.startswith('[') and str_value.endswith(']'):
            try:
                # Clean up Python-style list notation
                clean_str = str_value[1:-1]  # Remove brackets
                # Handle quoted strings
                items = []
                if clean_str.strip():
                    # Split by comma, handling quotes
                    parts = re.split(r',(?=(?:[^"\']*["\'][^"\']*["\'])*[^"\']*$)', clean_str)
                    for part in parts:
                        clean_part = part.strip().strip('\'"')
                        if clean_part:
                            items.append(clean_part)
                
                result = ArrayCoercionResult(items, original_value, 'python_style', field_name, warnings)
                logger.info(f"Python-style parse successful: {len(items)} items")
                return result
            except Exception as e:
                warnings.append(f"Python-style parse failed: {str(e)}")
        
        # Handle comma-separated values
        if ',' in str_value or ';' in str_value:
            # Split by comma or semicolon
            separator = ',' if ',' in str_value else ';'
            items = []
            for item in str_value.split(separator):
                clean_item = item.strip()
                if clean_item:
                    items.append(clean_item)
            
            if items:
                result = ArrayCoercionResult(items, original_value, f'csv_split_{separator}', field_name, warnings)
                logger.info(f"CSV parse successful: {len(items)} items")
                return result
        
        # Handle numeric fields specially
        field_type = get_field_type(field_name)
        if field_type == 'numeric':
            try:
                # Try to convert to number
                if isinstance(value, (int, float)):
                    numeric_value = value
                else:
                    numeric_value = float(str_value) if '.' in str_value else int(str_value)
                
                result = ArrayCoercionResult([numeric_value], original_value, 'numeric_wrap', field_name, warnings)
                logger.info(f"Numeric wrap successful: [{numeric_value}]")
                return result
            except ValueError:
                warnings.append(f"Failed to convert to numeric: {str_value}")
        
        # Last resort: wrap as single item
        if str_value:
            result = ArrayCoercionResult([str_value], original_value, 'single_wrap', field_name, warnings)
            logger.info(f"Single wrap successful: ['{str_value}']")
            return result
        else:
            result = ArrayCoercionResult([], original_value, 'empty_fallback', field_name, warnings)
            logger.info(f"Empty fallback applied")
            return result
    
    except Exception as e:
        # Critical error - log and return empty array to prevent pipeline failure
        error_msg = f"Array coercion critical error: {str(e)}"
        logger.error(error_msg)
        warnings.append(error_msg)
        
        result = ArrayCoercionResult([], original_value, 'error_fallback', field_name, warnings)
        result.success = False
        return result

def process_record_arrays(record: dict, logger: logging.Logger = None) -> Tuple[dict, List[dict]]:
    """
    Process all array fields in a record
    
    Args:
        record: Dictionary record to process
        logger: Optional logger instance
        
    Returns:
        Tuple of (processed_record, audit_entries)
    """
    if logger is None:
        logger = array_logger
    
    processed_record = record.copy()
    audit_entries = []
    array_fields = get_array_fields()
    
    logger.info(f"Processing record with {len(array_fields)} potential array fields")
    
    for field_name in array_fields:
        if field_name in record:
            result = ensure_array(record[field_name], field_name, logger)
            processed_record[field_name] = result.value
            audit_entries.append(result.to_audit_dict())
            
            if result.warnings:
                for warning in result.warnings:
                    logger.warning(f"Field '{field_name}': {warning}")
    
    logger.info(f"Record processing complete: {len(audit_entries)} fields processed")
    return processed_record, audit_entries

def validate_array_fields(record: dict) -> List[str]:
    """
    Validate that all required array fields are properly formatted
    
    Args:
        record: Dictionary record to validate
        
    Returns:
        List of validation error messages
    """
    errors = []
    array_fields = get_array_fields()
    
    for field_name in array_fields:
        if field_name in record:
            value = record[field_name]
            if not isinstance(value, list):
                errors.append(f"Field '{field_name}' is not a list: {type(value).__name__}")
            elif field_name in record and get_field_type(field_name) == 'numeric':
                # Validate numeric arrays
                for item in value:
                    if not isinstance(item, (int, float)):
                        try:
                            float(item)
                        except (ValueError, TypeError):
                            errors.append(f"Field '{field_name}' contains non-numeric value: {repr(item)}")
    
    return errors

def get_array_statistics(records: List[dict]) -> dict:
    """
    Get statistics about array field processing
    
    Args:
        records: List of processed records
        
    Returns:
        Dictionary with processing statistics
    """
    stats = {
        'total_records': len(records),
        'fields_processed': {},
        'common_patterns': {},
        'error_count': 0
    }
    
    array_fields = get_array_fields()
    
    for field_name in array_fields:
        stats['fields_processed'][field_name] = {
            'present_count': 0,
            'empty_count': 0,
            'average_length': 0,
            'max_length': 0,
            'total_items': 0
        }
    
    for record in records:
        for field_name in array_fields:
            if field_name in record:
                field_stats = stats['fields_processed'][field_name]
                field_stats['present_count'] += 1
                
                value = record[field_name]
                if isinstance(value, list):
                    length = len(value)
                    field_stats['total_items'] += length
                    field_stats['max_length'] = max(field_stats['max_length'], length)
                    
                    if length == 0:
                        field_stats['empty_count'] += 1
    
    # Calculate averages
    for field_name in array_fields:
        field_stats = stats['fields_processed'][field_name]
        if field_stats['present_count'] > 0:
            field_stats['average_length'] = field_stats['total_items'] / field_stats['present_count']
    
    return stats
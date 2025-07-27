#!/usr/bin/env python3
"""
Comprehensive test suite for array processing utilities
Tests all known edge cases and failure scenarios
"""

import unittest
import json
from array_utils import ensure_array, process_record_arrays, validate_array_fields
from array_field_config import ARRAY_COERCION_EXAMPLES

class TestArrayUtils(unittest.TestCase):
    
    def setUp(self):
        """Set up test fixtures"""
        self.test_field = 'region'
    
    def test_empty_inputs(self):
        """Test handling of empty/null inputs"""
        test_cases = ARRAY_COERCION_EXAMPLES['empty_inputs']
        
        for input_val, expected in test_cases.items():
            with self.subTest(input_val=input_val):
                result = ensure_array(input_val, self.test_field)
                self.assertEqual(result.value, expected)
                self.assertTrue(result.success)
                self.assertIn('null_handling', result.method + result.method)  # Allow multiple methods
    
    def test_json_arrays(self):
        """Test JSON array parsing"""
        test_cases = ARRAY_COERCION_EXAMPLES['json_arrays']
        
        for input_val, expected in test_cases.items():
            with self.subTest(input_val=input_val):
                result = ensure_array(input_val, self.test_field)
                self.assertEqual(result.value, expected)
                self.assertTrue(result.success)
                self.assertEqual(result.method, 'json_parse')
    
    def test_python_style_arrays(self):
        """Test Python-style list parsing"""
        test_cases = ARRAY_COERCION_EXAMPLES['python_style']
        
        for input_val, expected in test_cases.items():
            with self.subTest(input_val=input_val):
                result = ensure_array(input_val, self.test_field)
                self.assertEqual(result.value, expected)
                self.assertTrue(result.success)
                self.assertEqual(result.method, 'python_style')
    
    def test_csv_strings(self):
        """Test comma-separated value parsing"""
        test_cases = ARRAY_COERCION_EXAMPLES['csv_strings']
        
        for input_val, expected in test_cases.items():
            with self.subTest(input_val=input_val):
                result = ensure_array(input_val, self.test_field)
                self.assertEqual(result.value, expected)
                self.assertTrue(result.success)
                self.assertIn('csv_split', result.method)
    
    def test_edge_cases(self):
        """Test edge cases and malformed inputs"""
        test_cases = ARRAY_COERCION_EXAMPLES['edge_cases']
        
        for input_val, expected in test_cases.items():
            with self.subTest(input_val=input_val):
                result = ensure_array(input_val, self.test_field)
                self.assertEqual(result.value, expected)
                self.assertTrue(result.success)
    
    def test_numeric_field_handling(self):
        """Test numeric field special handling"""
        test_cases = [
            (123, [123]),
            ('456', [456]),
            ('78.9', [78.9]),
            ('not_a_number', ['not_a_number']),  # Should fall back to single wrap
        ]
        
        for input_val, expected in test_cases:
            with self.subTest(input_val=input_val):
                result = ensure_array(input_val, 'amount')  # numeric field
                if isinstance(expected[0], (int, float)):
                    self.assertEqual(result.value, expected)
                    if result.method != 'single_wrap':  # Only check if numeric conversion succeeded
                        self.assertEqual(result.method, 'numeric_wrap')
                else:
                    # For non-numeric inputs to numeric fields
                    self.assertTrue(len(result.value) > 0)
                self.assertTrue(result.success)
    
    def test_already_array_inputs(self):
        """Test inputs that are already arrays"""
        test_cases = [
            (['foo', 'bar'], ['foo', 'bar']),
            (['single'], ['single']),
            ([], []),
            (['foo', None, '', 'bar'], ['foo', 'bar']),  # Should filter empty items
        ]
        
        for input_val, expected in test_cases:
            with self.subTest(input_val=input_val):
                result = ensure_array(input_val, self.test_field)
                self.assertEqual(result.value, expected)
                self.assertTrue(result.success)
                self.assertIn('cleanup', result.method)
    
    def test_malformed_inputs(self):
        """Test malformed inputs that should not crash the system"""
        malformed_inputs = [
            '[incomplete',
            'incomplete]',
            '["unclosed string',
            '[1, 2, 3, }',  # Mixed brackets
            '{"not": "an array"}',
            'random text with, commas',
            '   ',  # Only whitespace
            '\n\t\r',  # Various whitespace chars
        ]
        
        for input_val in malformed_inputs:
            with self.subTest(input_val=input_val):
                result = ensure_array(input_val, self.test_field)
                # Should not crash and should return an array
                self.assertIsInstance(result.value, list)
                self.assertTrue(result.success)  # Should succeed even for malformed input
    
    def test_process_record_arrays(self):
        """Test processing a complete record"""
        test_record = {
            'title': 'Test Subsidy',
            'region': 'foo, bar',
            'sector': '["agriculture", "forestry"]',
            'amount': '1000',
            'legal_entity_type': 'EARL',
            'non_array_field': 'should not be processed'
        }
        
        processed_record, audit_entries = process_record_arrays(test_record)
        
        # Check that array fields were processed
        self.assertEqual(processed_record['region'], ['foo', 'bar'])
        self.assertEqual(processed_record['sector'], ['agriculture', 'forestry'])
        self.assertEqual(processed_record['amount'], [1000])  # Should be numeric
        self.assertEqual(processed_record['legal_entity_type'], ['EARL'])
        
        # Check that non-array fields were not touched
        self.assertEqual(processed_record['non_array_field'], 'should not be processed')
        
        # Check audit entries
        self.assertTrue(len(audit_entries) >= 4)  # At least 4 array fields processed
        
        for entry in audit_entries:
            self.assertIn('field_name', entry)
            self.assertIn('method', entry)
            self.assertIn('success', entry)
            self.assertTrue(entry['success'])
    
    def test_validate_array_fields(self):
        """Test array field validation"""
        valid_record = {
            'region': ['foo', 'bar'],
            'amount': [1000, 2000],
            'sector': ['agriculture'],
        }
        
        invalid_record = {
            'region': 'not an array',
            'amount': ['not', 'numeric'],
            'sector': ['valid'],
        }
        
        # Valid record should pass
        errors = validate_array_fields(valid_record)
        self.assertEqual(len(errors), 0)
        
        # Invalid record should have errors
        errors = validate_array_fields(invalid_record)
        self.assertTrue(len(errors) > 0)
        
        # Check specific error messages
        error_text = ' '.join(errors)
        self.assertIn('region', error_text)
        self.assertIn('not an array', error_text)
        self.assertIn('amount', error_text)
        self.assertIn('non-numeric', error_text)
    
    def test_audit_trail_completeness(self):
        """Test that audit trail captures all necessary information"""
        test_value = 'foo, bar, baz'
        result = ensure_array(test_value, 'test_field')
        
        # Check all required audit fields are present
        audit_dict = result.to_audit_dict()
        required_fields = [
            'field_name', 'original_value', 'original_type',
            'coerced_value', 'coerced_length', 'method',
            'warnings', 'timestamp', 'success'
        ]
        
        for field in required_fields:
            self.assertIn(field, audit_dict)
        
        # Check specific values
        self.assertEqual(audit_dict['field_name'], 'test_field')
        self.assertEqual(audit_dict['original_value'], test_value)
        self.assertEqual(audit_dict['original_type'], 'str')
        self.assertEqual(audit_dict['coerced_value'], ['foo', 'bar', 'baz'])
        self.assertEqual(audit_dict['coerced_length'], 3)
        self.assertTrue(audit_dict['success'])
    
    def test_error_recovery(self):
        """Test that critical errors are handled gracefully"""
        # This is hard to test directly, but we can simulate by 
        # passing objects that might cause issues
        problematic_inputs = [
            {'nested': 'dict'},
            lambda x: x,  # function
            Exception('test error'),
        ]
        
        for input_val in problematic_inputs:
            with self.subTest(input_val=type(input_val).__name__):
                result = ensure_array(input_val, self.test_field)
                # Should not crash and should return an array
                self.assertIsInstance(result.value, list)
                # May or may not succeed, but should not crash

if __name__ == '__main__':
    # Run with verbose output
    unittest.main(verbosity=2)
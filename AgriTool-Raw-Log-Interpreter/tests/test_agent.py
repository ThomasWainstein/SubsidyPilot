#!/usr/bin/env python3
"""
Unit tests for the AgriTool Raw Log Interpreter Agent
"""

import pytest
import json
import os
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, date
from decimal import Decimal

# Import the agent modules
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from agent import Config, LogInterpreterAgent, CANONICAL_FIELDS

class TestConfig:
    """Test configuration management"""
    
    def test_required_env_vars_present(self):
        """Test that config loads when all required vars are present"""
        with patch.dict(os.environ, {
            'NEXT_PUBLIC_SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_SERVICE_ROLE_KEY': 'test-key',
            'SCRAPER_RAW_GPT_API': 'test-openai-key'
        }):
            config = Config()
            assert config.SUPABASE_URL == 'https://test.supabase.co'
            assert config.SUPABASE_SERVICE_KEY == 'test-key'
            assert config.OPENAI_API_KEY == 'test-openai-key'
    
    def test_missing_required_env_var_exits(self):
        """Test that missing required env var causes exit"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(SystemExit):
                Config()
    
    def test_optional_config_defaults(self):
        """Test that optional config has proper defaults"""
        with patch.dict(os.environ, {
            'NEXT_PUBLIC_SUPABASE_URL': 'https://test.supabase.co',
            'SUPABASE_SERVICE_ROLE_KEY': 'test-key',
            'SCRAPER_RAW_GPT_API': 'test-openai-key'
        }):
            config = Config()
            assert config.BATCH_SIZE == 50
            assert config.POLL_INTERVAL == 300
            assert config.LOG_LEVEL == 'INFO'
            assert config.SLACK_ALERT_THRESHOLD == 0.25

class TestLogInterpreterAgent:
    """Test the main agent functionality"""
    
    @pytest.fixture
    def mock_config(self):
        """Create a mock configuration"""
        config = Mock()
        config.SUPABASE_URL = 'https://test.supabase.co'
        config.SUPABASE_SERVICE_KEY = 'test-key'
        config.OPENAI_API_KEY = 'test-openai-key'
        config.BATCH_SIZE = 50
        config.POLL_INTERVAL = 300
        config.LOG_LEVEL = 'INFO'
        config.SLACK_WEBHOOK_URL = None
        config.SLACK_ALERT_THRESHOLD = 0.25
        config.OPENAI_MODEL = 'gpt-4o-mini'
        config.ASSISTANT_ID = 'SCRAPER_RAW_LOGS_INTERPRETER'
        return config
    
    @pytest.fixture
    def mock_agent(self, mock_config):
        """Create a mock agent instance"""
        with patch('agent.create_client'), \
             patch('agent.OpenAI'), \
             patch.object(LogInterpreterAgent, '_setup_logging'):
            agent = LogInterpreterAgent(mock_config)
            agent.supabase = Mock()
            agent.openai_client = Mock()
            agent.logger = Mock()
            return agent
    
    def test_fetch_unprocessed_logs(self, mock_agent):
        """Test fetching unprocessed logs"""
        # Mock Supabase response
        mock_response = Mock()
        mock_response.data = [
            {'id': 'test-id-1', 'payload': 'test payload 1', 'file_refs': []},
            {'id': 'test-id-2', 'payload': 'test payload 2', 'file_refs': ['file1.pdf']}
        ]
        mock_agent.supabase.table().select().eq().limit().execute.return_value = mock_response
        
        logs = mock_agent.fetch_unprocessed_logs()
        
        assert len(logs) == 2
        assert logs[0]['id'] == 'test-id-1'
        assert logs[1]['file_refs'] == ['file1.pdf']
    
    def test_validate_and_normalize_complete_data(self, mock_agent):
        """Test validation with complete valid data"""
        extracted_data = {
            'url': 'https://example.com/subsidy',
            'title': 'Test Subsidy',
            'description': 'A test subsidy program',
            'deadline': '2025-12-31',
            'amount': '10000.50',
            'documents': ['doc1.pdf', 'doc2.docx'],
            'priority_groups': ['farmers', 'small_business']
        }
        
        # Add all other canonical fields
        for field in CANONICAL_FIELDS:
            if field not in extracted_data:
                extracted_data[field] = f'test_{field}'
        
        normalized, audit = mock_agent.validate_and_normalize(extracted_data)
        
        assert len(audit['missing_fields']) == 0
        assert normalized['url'] == 'https://example.com/subsidy'
        assert normalized['deadline'] == date(2025, 12, 31)
        assert normalized['amount'] == Decimal('10000.50')
        assert isinstance(normalized['documents'], list)
    
    def test_validate_and_normalize_missing_fields(self, mock_agent):
        """Test validation with missing fields"""
        extracted_data = {
            'title': 'Test Subsidy',
            'deadline': 'invalid-date',
            'amount': 'not-a-number'
        }
        
        normalized, audit = mock_agent.validate_and_normalize(extracted_data)
        
        assert len(audit['missing_fields']) > 0
        assert 'url' in audit['missing_fields']
        assert 'deadline' in audit['missing_fields']  # Invalid date
        assert 'amount' in audit['missing_fields']    # Invalid number
        assert normalized['title'] == 'Test Subsidy'
    
    def test_call_openai_assistant(self, mock_agent):
        """Test OpenAI Assistant API call"""
        # Mock OpenAI response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps({
            'title': 'Test Subsidy',
            'url': 'https://example.com',
            'amount': 5000
        })
        mock_agent.openai_client.chat.completions.create.return_value = mock_response
        
        result = mock_agent.call_openai_assistant('test payload', 'test file content')
        
        assert result['title'] == 'Test Subsidy'
        assert result['url'] == 'https://example.com'
        assert result['amount'] == 5000
    
    def test_call_openai_assistant_with_markdown_json(self, mock_agent):
        """Test OpenAI Assistant with JSON wrapped in markdown"""
        # Mock OpenAI response with markdown
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = '''Here's the extracted data:

```json
{
    "title": "Test Subsidy",
    "url": "https://example.com",
    "amount": 5000
}
```

The extraction is complete.'''
        mock_agent.openai_client.chat.completions.create.return_value = mock_response
        
        result = mock_agent.call_openai_assistant('test payload', 'test file content')
        
        assert result['title'] == 'Test Subsidy'
        assert result['url'] == 'https://example.com'
        assert result['amount'] == 5000
    
    def test_process_single_log_success(self, mock_agent):
        """Test successful processing of a single log"""
        log_data = {
            'id': 'test-log-id',
            'payload': 'test payload',
            'file_refs': []
        }
        
        # Mock all dependencies
        mock_agent.acquire_lock.return_value = True
        mock_agent.extract_file_content.return_value = ''
        mock_agent.call_openai_assistant.return_value = {field: f'test_{field}' for field in CANONICAL_FIELDS}
        mock_agent.save_structured_data.return_value = True
        mock_agent.mark_as_processed.return_value = True
        mock_agent.release_lock.return_value = True
        
        result = mock_agent.process_single_log(log_data)
        
        assert result is True
        mock_agent.acquire_lock.assert_called_once_with('test-log-id')
        mock_agent.release_lock.assert_called_once_with('test-log-id')
    
    def test_process_single_log_lock_failed(self, mock_agent):
        """Test processing fails when lock cannot be acquired"""
        log_data = {
            'id': 'test-log-id',
            'payload': 'test payload',
            'file_refs': []
        }
        
        mock_agent.acquire_lock.return_value = False
        
        result = mock_agent.process_single_log(log_data)
        
        assert result is False
        mock_agent.acquire_lock.assert_called_once_with('test-log-id')
        mock_agent.release_lock.assert_not_called()
    
    def test_process_batch_success(self, mock_agent):
        """Test batch processing with successful results"""
        # Mock logs
        mock_agent.fetch_unprocessed_logs.return_value = [
            {'id': 'log1', 'payload': 'payload1', 'file_refs': []},
            {'id': 'log2', 'payload': 'payload2', 'file_refs': []}
        ]
        
        # Mock successful processing
        mock_agent.process_single_log.return_value = True
        
        stats = mock_agent.process_batch()
        
        assert stats['total'] == 2
        assert stats['processed'] == 2
        assert stats['failed'] == 0
    
    def test_process_batch_high_failure_rate(self, mock_agent):
        """Test batch processing with high failure rate triggers alert"""
        # Mock logs
        mock_agent.fetch_unprocessed_logs.return_value = [
            {'id': 'log1', 'payload': 'payload1', 'file_refs': []},
            {'id': 'log2', 'payload': 'payload2', 'file_refs': []}
        ]
        
        # Mock failures
        mock_agent.process_single_log.return_value = False
        mock_agent.send_alert = Mock()
        
        stats = mock_agent.process_batch()
        
        assert stats['total'] == 2
        assert stats['processed'] == 0
        assert stats['failed'] == 2
        mock_agent.send_alert.assert_called_once()
    
    def test_extract_file_content_pdf(self, mock_agent):
        """Test PDF file content extraction"""
        with patch('agent.tika_parser') as mock_tika, \
             patch('agent.requests') as mock_requests:
            
            # Mock file download
            mock_requests.get.return_value.content = b'fake pdf content'
            
            # Mock Tika parsing
            mock_tika.from_buffer.return_value = {'content': 'Extracted PDF text'}
            
            content = mock_agent.extract_file_content(['https://example.com/test.pdf'])
            
            assert 'Extracted PDF text' in content
            assert 'test.pdf' in content
    
    def test_save_structured_data(self, mock_agent):
        """Test saving structured data to database"""
        normalized_data = {
            'title': 'Test Subsidy',
            'amount': Decimal('1000'),
            'deadline': date(2025, 12, 31)
        }
        audit = {'missing_fields': [], 'validation_notes': []}
        
        # Mock successful insertion
        mock_response = Mock()
        mock_response.data = [{'id': 'new-record-id'}]
        mock_agent.supabase.table().insert().execute.return_value = mock_response
        
        result = mock_agent.save_structured_data('test-log-id', normalized_data, audit)
        
        assert result is True
    
    def test_mark_as_processed(self, mock_agent):
        """Test marking log as processed"""
        # Mock successful update
        mock_response = Mock()
        mock_response.data = [{'id': 'test-log-id', 'processed': True}]
        mock_agent.supabase.table().update().eq().execute.return_value = mock_response
        
        result = mock_agent.mark_as_processed('test-log-id')
        
        assert result is True

class TestCanonicalFields:
    """Test canonical fields schema"""
    
    def test_canonical_fields_complete(self):
        """Test that all required canonical fields are present"""
        expected_fields = [
            "url", "title", "description", "eligibility", "documents", "deadline",
            "amount", "program", "agency", "region", "sector", "funding_type",
            "co_financing_rate", "project_duration", "payment_terms", "application_method",
            "evaluation_criteria", "previous_acceptance_rate", "priority_groups",
            "legal_entity_type", "funding_source", "reporting_requirements",
            "compliance_requirements", "language", "technical_support", "matching_algorithm_score"
        ]
        
        assert set(CANONICAL_FIELDS) == set(expected_fields)
        assert len(CANONICAL_FIELDS) == len(expected_fields)

if __name__ == '__main__':
    pytest.main([__file__])
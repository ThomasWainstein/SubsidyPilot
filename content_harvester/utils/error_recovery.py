#!/usr/bin/env python3
"""
Error Recovery System
====================

Robust error handling and recovery mechanisms for content harvesting
operations with intelligent retry logic and fallback strategies.
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass
from enum import Enum


class ErrorType(Enum):
    """Types of errors that can occur during harvesting."""
    NETWORK_ERROR = "network_error"
    TIMEOUT_ERROR = "timeout_error"
    PARSING_ERROR = "parsing_error"
    ENCODING_ERROR = "encoding_error"
    CONTENT_ERROR = "content_error"
    AUTHENTICATION_ERROR = "auth_error"
    RATE_LIMIT_ERROR = "rate_limit_error"
    SERVER_ERROR = "server_error"
    UNKNOWN_ERROR = "unknown_error"


@dataclass
class ErrorContext:
    """Context information for error recovery."""
    error_type: ErrorType
    original_error: Exception
    url: str
    attempt_number: int
    total_attempts: int
    timestamp: float
    recovery_strategy: Optional[str] = None
    additional_info: Dict[str, Any] = None


class ErrorRecovery:
    """
    Intelligent error recovery system for content harvesting.
    
    Provides robust error handling with retry logic, fallback strategies,
    and detailed error reporting for debugging and monitoring.
    """
    
    def __init__(self):
        """Initialize error recovery system."""
        self.logger = logging.getLogger(__name__)
        
        # Retry configuration
        self.max_retries = 3
        self.base_delay = 1.0
        self.max_delay = 30.0
        self.backoff_multiplier = 2.0
        
        # Error tracking
        self.error_history: List[ErrorContext] = []
        self.error_statistics = {
            'total_errors': 0,
            'errors_by_type': {},
            'recovery_success_rate': 0.0
        }
    
    async def handle_content_error(
        self, 
        url: str, 
        error_message: str
    ) -> Dict[str, Any]:
        """
        Handle content processing errors with fallback content.
        
        Args:
            url: URL where the error occurred
            error_message: Error message description
            
        Returns:
            Fallback content structure
        """
        self.logger.error(f"❌ Content error for {url}: {error_message}")
        
        return {
            "source_url": url,
            "raw_html": "",
            "title": f"Error processing {url}",
            "main_content": "",
            "text_content": "",
            "structured_data": {},
            "links": [],
            "images": [],
            "tables": [],
            "lists": [],
            "headings": [],
            "metadata": {
                "error": error_message,
                "processing_status": "failed"
            },
            "content_classification": {
                "content_type": "error_page",
                "has_forms": False,
                "has_tables": False,
                "has_documents": False
            }
        }
    
    async def retry_with_backoff(
        self,
        operation: Callable,
        *args,
        error_types: Optional[List[ErrorType]] = None,
        max_retries: Optional[int] = None,
        **kwargs
    ) -> Any:
        """
        Execute operation with exponential backoff retry logic.
        
        Args:
            operation: Async function to execute
            *args: Arguments for the operation
            error_types: Specific error types to retry on
            max_retries: Override default max retries
            **kwargs: Keyword arguments for the operation
            
        Returns:
            Result of successful operation
            
        Raises:
            Last encountered exception if all retries fail
        """
        max_attempts = max_retries or self.max_retries
        last_exception = None
        
        for attempt in range(max_attempts + 1):
            try:
                if attempt > 0:
                    delay = min(
                        self.base_delay * (self.backoff_multiplier ** (attempt - 1)),
                        self.max_delay
                    )
                    self.logger.info(f"🔄 Retry attempt {attempt}/{max_attempts} after {delay:.1f}s delay")
                    await asyncio.sleep(delay)
                
                result = await operation(*args, **kwargs)
                
                if attempt > 0:
                    self.logger.info(f"✅ Operation succeeded on attempt {attempt + 1}")
                
                return result
                
            except Exception as e:
                last_exception = e
                error_type = self._classify_error(e)
                
                error_context = ErrorContext(
                    error_type=error_type,
                    original_error=e,
                    url=kwargs.get('url', 'unknown'),
                    attempt_number=attempt + 1,
                    total_attempts=max_attempts + 1,
                    timestamp=time.time()
                )
                
                self._record_error(error_context)
                
                # Check if we should retry this error type
                if error_types and error_type not in error_types:
                    self.logger.warning(f"⚠️ Error type {error_type} not in retry list, failing immediately")
                    break
                
                # Don't retry certain errors
                if error_type in [ErrorType.AUTHENTICATION_ERROR]:
                    self.logger.warning(f"⚠️ Non-retryable error: {error_type}")
                    break
                
                if attempt < max_attempts:
                    self.logger.warning(f"⚠️ Attempt {attempt + 1} failed: {e}")
                else:
                    self.logger.error(f"❌ All {max_attempts + 1} attempts failed")
        
        # All retries exhausted
        if last_exception:
            raise last_exception
        else:
            raise RuntimeError("Operation failed with unknown error")
    
    def _classify_error(self, error: Exception) -> ErrorType:
        """Classify error type for appropriate handling."""
        error_str = str(error).lower()
        error_type_name = type(error).__name__.lower()
        
        # Network-related errors
        if any(term in error_str for term in ['connection', 'network', 'dns', 'resolve']):
            return ErrorType.NETWORK_ERROR
        
        # Timeout errors
        if any(term in error_str for term in ['timeout', 'timed out']):
            return ErrorType.TIMEOUT_ERROR
        
        # Authentication errors
        if any(term in error_str for term in ['unauthorized', '401', '403', 'forbidden']):
            return ErrorType.AUTHENTICATION_ERROR
        
        # Server errors
        if any(term in error_str for term in ['500', '502', '503', '504', 'server error']):
            return ErrorType.SERVER_ERROR
        
        # Rate limiting
        if any(term in error_str for term in ['rate limit', '429', 'too many requests']):
            return ErrorType.RATE_LIMIT_ERROR
        
        # Parsing errors
        if any(term in error_type_name for term in ['parse', 'json', 'xml', 'html']):
            return ErrorType.PARSING_ERROR
        
        # Encoding errors
        if any(term in error_type_name for term in ['unicode', 'decode', 'encoding']):
            return ErrorType.ENCODING_ERROR
        
        # Content-related errors
        if any(term in error_str for term in ['content', 'empty', 'invalid']):
            return ErrorType.CONTENT_ERROR
        
        return ErrorType.UNKNOWN_ERROR
    
    def _record_error(self, error_context: ErrorContext):
        """Record error for statistics and monitoring."""
        self.error_history.append(error_context)
        self.error_statistics['total_errors'] += 1
        
        error_type_str = error_context.error_type.value
        if error_type_str not in self.error_statistics['errors_by_type']:
            self.error_statistics['errors_by_type'][error_type_str] = 0
        self.error_statistics['errors_by_type'][error_type_str] += 1
        
        # Keep only recent errors (last 1000)
        if len(self.error_history) > 1000:
            self.error_history = self.error_history[-1000:]
    
    def get_error_statistics(self) -> Dict[str, Any]:
        """Get comprehensive error statistics."""
        recent_errors = [
            error for error in self.error_history 
            if time.time() - error.timestamp < 3600  # Last hour
        ]
        
        return {
            'total_errors': self.error_statistics['total_errors'],
            'errors_by_type': self.error_statistics['errors_by_type'].copy(),
            'recent_errors_count': len(recent_errors),
            'error_rate_last_hour': len(recent_errors),
            'most_common_error_type': max(
                self.error_statistics['errors_by_type'].items(),
                key=lambda x: x[1],
                default=('none', 0)
            )[0] if self.error_statistics['errors_by_type'] else 'none',
            'error_history_size': len(self.error_history)
        }
    
    def get_recovery_suggestions(self, error_type: ErrorType) -> List[str]:
        """Get recovery suggestions for specific error types."""
        suggestions = {
            ErrorType.NETWORK_ERROR: [
                "Check internet connectivity",
                "Verify URL is accessible",
                "Try again in a few minutes",
                "Check if site is down"
            ],
            ErrorType.TIMEOUT_ERROR: [
                "Increase timeout duration",
                "Try during off-peak hours",
                "Check if site is slow",
                "Reduce concurrent requests"
            ],
            ErrorType.RATE_LIMIT_ERROR: [
                "Reduce request frequency",
                "Add delays between requests",
                "Use different IP address",
                "Contact site administrator"
            ],
            ErrorType.SERVER_ERROR: [
                "Try again later",
                "Check if site is under maintenance",
                "Contact site administrator",
                "Use alternative data source"
            ],
            ErrorType.PARSING_ERROR: [
                "Check content format",
                "Update parsing logic",
                "Handle malformed content",
                "Use alternative parser"
            ],
            ErrorType.ENCODING_ERROR: [
                "Try different encoding",
                "Check content-type header",
                "Use encoding detection",
                "Handle special characters"
            ],
            ErrorType.AUTHENTICATION_ERROR: [
                "Check credentials",
                "Verify API keys",
                "Check access permissions",
                "Contact administrator"
            ]
        }
        
        return suggestions.get(error_type, ["Contact technical support"])
    
    def create_error_report(self, url: str, error: Exception) -> Dict[str, Any]:
        """Create detailed error report for debugging."""
        error_type = self._classify_error(error)
        
        return {
            'timestamp': time.time(),
            'url': url,
            'error_type': error_type.value,
            'error_message': str(error),
            'error_class': type(error).__name__,
            'suggestions': self.get_recovery_suggestions(error_type),
            'context': {
                'total_errors_today': self.error_statistics['total_errors'],
                'similar_errors': self.error_statistics['errors_by_type'].get(error_type.value, 0)
            }
        }
"""
Structured logging setup for document extraction.
"""

import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured logging with JSON output."""
    
    def format(self, record: logging.LogRecord) -> str:
        # Create base log entry
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add any extra fields passed via the 'extra' parameter
        if hasattr(record, 'extra_fields'):
            log_entry.update(record.extra_fields)
        
        # Add specific extraction context if available
        for attr in ['subsidy_id', 'document_url', 'document_type', 'error_type', 'extraction_status']:
            if hasattr(record, attr):
                log_entry[attr] = getattr(record, attr)
        
        # Add exception information if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry, ensure_ascii=False)


class ContextAdapter(logging.LoggerAdapter):
    """Logger adapter to automatically add context to log messages."""
    
    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple:
        # Extract 'extra' from kwargs and merge with adapter's extra
        extra = kwargs.get('extra', {})
        if self.extra:
            extra.update(self.extra)
        
        # Store extra fields in a way the formatter can access them
        if extra:
            kwargs['extra'] = {'extra_fields': extra}
        
        return msg, kwargs


def setup_structured_logger(name: str = "document_extractor") -> logging.Logger:
    """
    Setup structured logger with optional file output.
    
    Args:
        name: Logger name.
        
    Returns:
        Configured logger instance.
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, os.getenv('LOG_LEVEL', 'INFO').upper()))
    
    # Clear any existing handlers
    logger.handlers.clear()
    
    # Create structured formatter
    formatter = StructuredFormatter()
    
    # Console handler (always enabled)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler (optional, based on environment variable)
    if os.getenv('LOG_TO_FILE', 'false').lower() == 'true':
        log_file_path = os.getenv('LOG_FILE_PATH', './extraction.log')
        
        # Ensure log directory exists
        Path(log_file_path).parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_file_path)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        logger.info(f"File logging enabled: {log_file_path}")
    
    # Prevent propagation to parent loggers
    logger.propagate = False
    
    return logger


def get_extraction_logger(
    subsidy_id: str = None, 
    document_url: str = None, 
    document_type: str = None
) -> logging.Logger:
    """
    Get a logger with extraction context pre-configured.
    
    Args:
        subsidy_id: Subsidy ID for context.
        document_url: Document URL for context.
        document_type: Document type for context.
        
    Returns:
        Logger adapter with extraction context.
    """
    base_logger = setup_structured_logger()
    
    context = {}
    if subsidy_id:
        context['subsidy_id'] = subsidy_id
    if document_url:
        context['document_url'] = document_url
    if document_type:
        context['document_type'] = document_type
    
    return ContextAdapter(base_logger, context)
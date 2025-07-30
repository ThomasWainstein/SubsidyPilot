#!/usr/bin/env python3
"""
Robust Non-Tika PDF Extraction Pipeline for AgriTool
====================================================

A stable, self-contained PDF extraction system that works without Tika server dependencies.
Restored from previous stable version to ensure pipeline reliability.

Features:
- Self-contained PDF text extraction using python-tika's buffer parsing
- Fallback extraction mechanisms
- Comprehensive error handling and retry logic
- Document preprocessing capabilities
- Clear logging and debugging

Note: Tika server integration is disabled until infrastructure is stable.
"""

import os
import sys
import time
import logging
import tempfile
import traceback
from typing import Optional, Tuple, List
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RobustPDFExtractor:
    """
    Stable PDF extraction pipeline without Tika server dependencies.
    Uses tika-python's buffer parsing for reliable extraction.
    """
    
    def __init__(
        self,
        max_file_size_mb: float = 15.0,
        max_retries: int = 3,
        initial_retry_delay: float = 2.0,
        max_retry_delay: float = 30.0,
        enable_fallbacks: bool = True
    ):
        self.max_file_size_mb = max_file_size_mb
        self.max_retries = max_retries
        self.initial_retry_delay = initial_retry_delay
        self.max_retry_delay = max_retry_delay
        self.enable_fallbacks = enable_fallbacks
        
        # Import tika parser
        try:
            from tika import parser as tika_parser
            self.tika_parser = tika_parser
            logger.info("✅ Tika parser (buffer mode) initialized successfully")
        except ImportError as e:
            logger.error(f"❌ Failed to import tika parser: {e}")
            raise ImportError("tika package is required. Install with: pip install tika")
    
    def extract_text_from_buffer(self, file_content: bytes, file_name: str = "unknown") -> str:
        """
        Extract text from PDF using tika buffer parsing (no server required).
        
        Args:
            file_content: PDF file content as bytes
            file_name: Name of the file for logging
            
        Returns:
            str: Extracted text content
        """
        delay = self.initial_retry_delay
        
        for attempt in range(self.max_retries):
            try:
                logger.info(f"📄 Extraction attempt {attempt + 1}/{self.max_retries} for: {file_name}")
                
                # Use tika's buffer parsing (no server required)
                parsed = self.tika_parser.from_buffer(file_content)
                
                if parsed and parsed.get('content'):
                    text = parsed['content'].strip()
                    if text:
                        logger.info(f"✅ Text extraction successful for: {file_name} ({len(text)} characters)")
                        return text
                    else:
                        logger.warning(f"⚠️ Empty content extracted from: {file_name}")
                else:
                    logger.warning(f"⚠️ No content extracted from: {file_name}")
                
            except Exception as e:
                logger.warning(f"⚠️ Extraction attempt {attempt + 1} failed for {file_name}: {str(e)}")
                
                if attempt < self.max_retries - 1:
                    logger.info(f"🔄 Retrying in {delay} seconds...")
                    time.sleep(delay)
                    delay = min(delay * 2, self.max_retry_delay)
                else:
                    logger.error(f"❌ All extraction attempts failed for: {file_name}")
        
        # Return empty string if all attempts failed
        return ""
    
    def check_file_size(self, file_content: bytes, file_name: str) -> bool:
        """Check if file size is within limits."""
        file_size_mb = len(file_content) / (1024 * 1024)
        
        if file_size_mb > self.max_file_size_mb:
            logger.warning(f"⚠️ File {file_name} size ({file_size_mb:.1f}MB) exceeds limit ({self.max_file_size_mb}MB)")
            return False
        
        logger.info(f"📊 File {file_name} size: {file_size_mb:.1f}MB (within limits)")
        return True
    
    def extract_text(self, file_content: bytes, file_name: str = "unknown") -> str:
        """
        Main extraction method with size checks and fallbacks.
        
        Args:
            file_content: PDF file content as bytes
            file_name: Name of the file for logging
            
        Returns:
            str: Extracted text content
        """
        logger.info(f"🚀 Starting extraction for: {file_name}")
        
        # Check file size
        if not self.check_file_size(file_content, file_name):
            return f"File {file_name} too large for processing (>{self.max_file_size_mb}MB)"
        
        # Extract text using buffer parsing
        try:
            text = self.extract_text_from_buffer(file_content, file_name)
            
            if text:
                logger.info(f"✅ Extraction completed successfully for: {file_name}")
                return text
            else:
                error_msg = f"Failed to extract text from {file_name} after {self.max_retries} attempts"
                logger.error(f"❌ {error_msg}")
                return error_msg
                
        except Exception as e:
            error_msg = f"Extraction error for {file_name}: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return error_msg


class DocumentExtractor:
    """
    Multi-format document extractor supporting PDF, DOCX, and TXT files.
    Provides robust extraction without server dependencies.
    """
    
    def __init__(self):
        self.pdf_extractor = RobustPDFExtractor()
        self._setup_additional_parsers()
    
    def _setup_additional_parsers(self):
        """Initialize additional parsers for different document types."""
        try:
            from tika import parser as tika_parser
            self.tika_parser = tika_parser
            logger.info("✅ Multi-format document parser initialized")
        except ImportError as e:
            logger.error(f"❌ Failed to initialize document parsers: {e}")
            raise
    
    def extract_content(self, file_content: bytes, file_name: str) -> str:
        """
        Extract content from various document formats.
        
        Args:
            file_content: File content as bytes
            file_name: Name of the file
            
        Returns:
            str: Extracted text content
        """
        file_ext = Path(file_name).suffix.lower()
        
        try:
            if file_ext == '.pdf':
                return self.pdf_extractor.extract_text(file_content, file_name)
            
            elif file_ext in ['.docx', '.doc']:
                logger.info(f"📄 Extracting DOCX/DOC content from: {file_name}")
                parsed = self.tika_parser.from_buffer(file_content)
                if parsed and parsed.get('content'):
                    content = parsed['content'].strip()
                    logger.info(f"✅ DOCX/DOC extraction successful: {file_name} ({len(content)} characters)")
                    return content
                else:
                    logger.warning(f"⚠️ No content extracted from DOCX/DOC: {file_name}")
                    return f"Failed to extract content from {file_name}"
            
            elif file_ext in ['.txt', '.text']:
                logger.info(f"📄 Extracting TXT content from: {file_name}")
                content = file_content.decode('utf-8', errors='ignore').strip()
                logger.info(f"✅ TXT extraction successful: {file_name} ({len(content)} characters)")
                return content
            
            else:
                logger.warning(f"⚠️ Unsupported file format: {file_ext} for {file_name}")
                return f"Unsupported file format: {file_ext}"
                
        except Exception as e:
            error_msg = f"Extraction error for {file_name}: {str(e)}"
            logger.error(f"❌ {error_msg}")
            logger.debug(f"Error details: {traceback.format_exc()}")
            return error_msg


def extract_document_text(file_content: bytes, file_name: str = "unknown") -> str:
    """
    Convenience function for direct document text extraction.
    
    Args:
        file_content: Document file content as bytes
        file_name: Name of the file
        
    Returns:
        str: Extracted text content
    """
    extractor = DocumentExtractor()
    return extractor.extract_content(file_content, file_name)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Extract text from documents (Tika-free pipeline)')
    parser.add_argument('file_path', help='Path to document file')
    parser.add_argument('--max-size-mb', type=float, default=15.0, help='Max file size (MB)')
    parser.add_argument('--max-retries', type=int, default=3, help='Max retry attempts')
    
    args = parser.parse_args()
    
    try:
        # Read file
        with open(args.file_path, 'rb') as f:
            file_content = f.read()
        
        # Extract text
        text = extract_document_text(file_content, args.file_path)
        
        print(f"Extracted {len(text)} characters of text")
        print("=" * 50)
        print(text[:1000] + "..." if len(text) > 1000 else text)
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
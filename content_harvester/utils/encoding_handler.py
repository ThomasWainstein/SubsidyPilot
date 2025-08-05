#!/usr/bin/env python3
"""
Encoding Handler Utility
========================

Robust character encoding detection and handling for international
content with special focus on European languages and agricultural
documentation formats.
"""

import chardet
import logging
from typing import Union, Optional


class EncodingHandler:
    """
    Robust encoding handler for international content.
    
    Handles character encoding detection and conversion with fallbacks
    for European languages commonly found in agricultural documentation.
    """
    
    def __init__(self):
        """Initialize encoding handler with European encoding preferences."""
        self.logger = logging.getLogger(__name__)
        
        # Preferred encodings for European content (in order of preference)
        self.encoding_preferences = [
            'utf-8',
            'iso-8859-1',  # Western European
            'iso-8859-2',  # Central European
            'windows-1252',  # Windows Western European
            'windows-1250',  # Windows Central European
            'cp1252',
            'latin1'
        ]
    
    def decode_content(
        self, 
        content: Union[bytes, str], 
        content_type: Optional[str] = None
    ) -> str:
        """
        Decode content with robust encoding detection.
        
        Args:
            content: Raw content bytes or string
            content_type: HTTP content-type header for encoding hints
            
        Returns:
            Decoded string content
        """
        if isinstance(content, str):
            return content
        
        if not isinstance(content, bytes):
            return str(content)
        
        # Try to extract encoding from content-type header
        declared_encoding = self._extract_encoding_from_content_type(content_type)
        
        # Try declared encoding first
        if declared_encoding:
            try:
                decoded = content.decode(declared_encoding)
                self.logger.debug(f"✅ Decoded using declared encoding: {declared_encoding}")
                return decoded
            except (UnicodeDecodeError, LookupError) as e:
                self.logger.warning(f"⚠️ Declared encoding {declared_encoding} failed: {e}")
        
        # Try to detect encoding using chardet
        detected_encoding = self._detect_encoding(content)
        if detected_encoding:
            try:
                decoded = content.decode(detected_encoding)
                self.logger.debug(f"✅ Decoded using detected encoding: {detected_encoding}")
                return decoded
            except (UnicodeDecodeError, LookupError) as e:
                self.logger.warning(f"⚠️ Detected encoding {detected_encoding} failed: {e}")
        
        # Try preferred encodings in order
        for encoding in self.encoding_preferences:
            try:
                decoded = content.decode(encoding)
                self.logger.info(f"✅ Decoded using fallback encoding: {encoding}")
                return decoded
            except (UnicodeDecodeError, LookupError):
                continue
        
        # Last resort: decode with errors='replace'
        try:
            decoded = content.decode('utf-8', errors='replace')
            self.logger.warning("⚠️ Used UTF-8 with error replacement")
            return decoded
        except Exception as e:
            self.logger.error(f"❌ All encoding attempts failed: {e}")
            return str(content, errors='replace')
    
    def _extract_encoding_from_content_type(self, content_type: Optional[str]) -> Optional[str]:
        """Extract encoding from HTTP content-type header."""
        if not content_type:
            return None
        
        content_type = content_type.lower()
        
        # Look for charset parameter
        if 'charset=' in content_type:
            try:
                charset_part = content_type.split('charset=')[1]
                encoding = charset_part.split(';')[0].strip()
                return encoding
            except (IndexError, AttributeError):
                pass
        
        return None
    
    def _detect_encoding(self, content: bytes) -> Optional[str]:
        """Detect encoding using chardet with European language bias."""
        try:
            # Use a sample of content for faster detection
            sample_size = min(10000, len(content))
            sample = content[:sample_size]
            
            detection = chardet.detect(sample)
            
            if detection and detection.get('confidence', 0) > 0.7:
                encoding = detection['encoding']
                
                # Map some common aliases to standard names
                encoding_map = {
                    'ascii': 'utf-8',
                    'ISO-8859-1': 'iso-8859-1',
                    'ISO-8859-2': 'iso-8859-2',
                    'windows-1252': 'cp1252',
                    'windows-1250': 'cp1250'
                }
                
                return encoding_map.get(encoding, encoding)
        
        except Exception as e:
            self.logger.warning(f"⚠️ Encoding detection failed: {e}")
        
        return None
    
    def normalize_text(self, text: str) -> str:
        """
        Normalize text for consistent processing.
        
        Args:
            text: Input text string
            
        Returns:
            Normalized text string
        """
        if not text:
            return ""
        
        # Normalize line endings
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Normalize unicode characters
        import unicodedata
        text = unicodedata.normalize('NFKC', text)
        
        # Remove zero-width characters
        zero_width_chars = ['\u200b', '\u200c', '\u200d', '\ufeff']
        for char in zero_width_chars:
            text = text.replace(char, '')
        
        return text
    
    def is_valid_encoding(self, content: bytes, encoding: str) -> bool:
        """
        Test if content can be decoded with the specified encoding.
        
        Args:
            content: Content bytes to test
            encoding: Encoding to test
            
        Returns:
            True if encoding is valid for the content
        """
        try:
            content.decode(encoding)
            return True
        except (UnicodeDecodeError, LookupError):
            return False
    
    def get_encoding_info(self, content: bytes) -> dict:
        """
        Get detailed encoding information for content.
        
        Args:
            content: Content bytes to analyze
            
        Returns:
            Dictionary with encoding analysis results
        """
        info = {
            'detected_encoding': None,
            'confidence': 0.0,
            'valid_encodings': [],
            'byte_length': len(content),
            'has_bom': False
        }
        
        # Check for BOM (Byte Order Mark)
        if content.startswith(b'\xef\xbb\xbf'):
            info['has_bom'] = True
            info['detected_encoding'] = 'utf-8-sig'
            content = content[3:]  # Remove BOM for further analysis
        elif content.startswith(b'\xff\xfe'):
            info['has_bom'] = True
            info['detected_encoding'] = 'utf-16-le'
        elif content.startswith(b'\xfe\xff'):
            info['has_bom'] = True
            info['detected_encoding'] = 'utf-16-be'
        
        # Detect encoding
        if not info['detected_encoding']:
            detection = chardet.detect(content[:10000])
            if detection:
                info['detected_encoding'] = detection.get('encoding')
                info['confidence'] = detection.get('confidence', 0.0)
        
        # Test all preferred encodings
        for encoding in self.encoding_preferences:
            if self.is_valid_encoding(content, encoding):
                info['valid_encodings'].append(encoding)
        
        return info
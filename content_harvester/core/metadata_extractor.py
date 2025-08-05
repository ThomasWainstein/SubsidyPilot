#!/usr/bin/env python3
"""
Metadata Extractor - Comprehensive metadata extraction and compilation
"""

import logging
from typing import Dict, Any
from urllib.parse import urlparse
from datetime import datetime


class MetadataExtractor:
    """Extracts comprehensive metadata from content and sources."""
    
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
    
    async def extract_metadata(self, url: str, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract comprehensive metadata from content.
        
        Args:
            url: Source URL
            content_data: Extracted content data
            
        Returns:
            Comprehensive metadata dictionary
        """
        parsed_url = urlparse(url)
        
        metadata = {
            'extraction_timestamp': datetime.now().isoformat(),
            'source_url': url,
            'domain': parsed_url.netloc,
            'path': parsed_url.path,
            'content_length': len(content_data.get('text_content', '')),
            'title': content_data.get('title', ''),
            'has_documents': len(content_data.get('links', [])) > 0,
            'document_count': len([link for link in content_data.get('links', []) 
                                 if any(ext in link.get('href', '') for ext in ['.pdf', '.doc', '.xls'])]),
            'table_count': len(content_data.get('tables', [])),
            'image_count': len(content_data.get('images', [])),
            'processing_method': 'universal_harvester_v1'
        }
        
        return metadata
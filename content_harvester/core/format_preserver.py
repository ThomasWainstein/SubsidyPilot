#!/usr/bin/env python3
"""
Format Preserver - Maintains original content formatting and structure
"""

import logging
from typing import Dict, Any
from bs4 import BeautifulSoup


class FormatPreserver:
    """Preserves original formatting and structure of extracted content."""
    
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
    
    async def preserve_format(self, content_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Preserve original formatting while extracting structured data.
        
        Args:
            content_data: Raw extracted content
            
        Returns:
            Content with preserved formatting metadata
        """
        if not self.config.preserve_formatting:
            return content_data
        
        # Add formatting preservation logic
        preserved_content = content_data.copy()
        
        # Extract and preserve CSS styling information
        if content_data.get('raw_html'):
            soup = BeautifulSoup(content_data['raw_html'], 'html.parser')
            
            # Extract CSS styles
            styles = []
            for style_tag in soup.find_all('style'):
                if style_tag.string:
                    styles.append(style_tag.string)
            
            # Extract inline styles
            inline_styles = {}
            for element in soup.find_all(style=True):
                tag_name = element.name
                if tag_name not in inline_styles:
                    inline_styles[tag_name] = []
                inline_styles[tag_name].append(element.get('style'))
            
            preserved_content['formatting_metadata'] = {
                'css_styles': styles,
                'inline_styles': inline_styles,
                'has_tables': bool(soup.find('table')),
                'has_lists': bool(soup.find_all(['ul', 'ol'])),
                'heading_hierarchy': len(soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']))
            }
        
        return preserved_content
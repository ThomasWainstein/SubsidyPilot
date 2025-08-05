#!/usr/bin/env python3
"""
URL Discoverer - Intelligent URL discovery from sitemaps and RSS feeds
"""

import asyncio
import aiohttp
import logging
from typing import List, Optional
from xml.etree import ElementTree


class URLDiscoverer:
    """Discovers URLs from sitemaps, RSS feeds, and site navigation."""
    
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
    
    async def discover_urls(
        self, 
        source_url: str, 
        source_type: str, 
        filters: Optional[List[str]] = None
    ) -> List[str]:
        """
        Discover URLs from various source types.
        
        Args:
            source_url: URL to discover from
            source_type: Type of source (sitemap, rss, etc.)
            filters: Optional filters for URL selection
            
        Returns:
            List of discovered URLs
        """
        if source_type == "sitemap":
            return await self._discover_from_sitemap(source_url, filters)
        elif source_type == "rss":
            return await self._discover_from_rss(source_url, filters)
        else:
            return []
    
    async def _discover_from_sitemap(self, sitemap_url: str, filters: Optional[List[str]]) -> List[str]:
        """Discover URLs from XML sitemap."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(sitemap_url) as response:
                    if response.status == 200:
                        content = await response.text()
                        root = ElementTree.fromstring(content)
                        
                        urls = []
                        for url_elem in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url'):
                            loc_elem = url_elem.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                            if loc_elem is not None:
                                url = loc_elem.text
                                if self._matches_filters(url, filters):
                                    urls.append(url)
                        
                        return urls
        except Exception as e:
            self.logger.error(f"Failed to parse sitemap {sitemap_url}: {e}")
        
        return []
    
    async def _discover_from_rss(self, rss_url: str, filters: Optional[List[str]]) -> List[str]:
        """Discover URLs from RSS feed."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(rss_url) as response:
                    if response.status == 200:
                        content = await response.text()
                        root = ElementTree.fromstring(content)
                        
                        urls = []
                        for item in root.findall('.//item'):
                            link_elem = item.find('link')
                            if link_elem is not None:
                                url = link_elem.text
                                if self._matches_filters(url, filters):
                                    urls.append(url)
                        
                        return urls
        except Exception as e:
            self.logger.error(f"Failed to parse RSS {rss_url}: {e}")
        
        return []
    
    def _matches_filters(self, url: str, filters: Optional[List[str]]) -> bool:
        """Check if URL matches any of the provided filters."""
        if not filters:
            return True
        
        url_lower = url.lower()
        return any(filter_term.lower() in url_lower for filter_term in filters)
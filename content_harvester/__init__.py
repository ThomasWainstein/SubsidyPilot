"""
Universal Content Harvester for AgriTool Enhanced Scraper System
================================================================

A comprehensive content extraction and preservation system designed for
agricultural subsidy websites across multiple European countries.

Core Components:
- Universal content extraction with format preservation
- Multi-format document processing (HTML, PDF, DOC, Excel)
- Intelligent URL discovery and relationship mapping
- Quality validation and error recovery
- Performance monitoring and optimization

Usage:
    from content_harvester import UniversalHarvester
    
    harvester = UniversalHarvester(config_path="config/romania.json")
    results = harvester.harvest_content(sources=urls)
"""

from .core.base_harvester import UniversalHarvester
from .core.content_processor import ContentProcessor
from .core.format_preserver import FormatPreserver
from .discovery.url_discoverer import URLDiscoverer

__version__ = "1.0.0"
__all__ = [
    "UniversalHarvester",
    "ContentProcessor", 
    "FormatPreserver",
    "URLDiscoverer"
]
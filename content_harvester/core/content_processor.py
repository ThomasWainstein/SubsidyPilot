#!/usr/bin/env python3
"""
Content Processor - Core content extraction and processing
==========================================================

Handles the main content extraction logic with support for multiple
content types and formats. Provides robust extraction with error handling
and quality validation.
"""

import asyncio
import aiohttp
import logging
import re
from typing import Dict, List, Optional, Any
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup, Comment
import mimetypes

from ..utils.encoding_handler import EncodingHandler
from ..utils.error_recovery import ErrorRecovery


class ContentProcessor:
    """
    Core content processing engine for web pages and documents.
    
    Handles HTML content extraction, document discovery, and content
    classification with robust error handling and quality preservation.
    """
    
    def __init__(self, config):
        """Initialize the content processor with configuration."""
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.encoding_handler = EncodingHandler()
        self.error_recovery = ErrorRecovery()
        
        # Content extraction patterns
        self.content_selectors = [
            'main', 'article', '.content', '#content',
            '.main-content', '.page-content', '.entry-content'
        ]
        
        # Document link patterns
        self.document_patterns = [
            r'\.pdf$', r'\.doc$', r'\.docx$', r'\.xls$', r'\.xlsx$',
            r'\.odt$', r'\.ods$', r'\.rtf$'
        ]
    
    async def process_content(
        self, 
        url: str, 
        custom_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process content from a web page with comprehensive extraction.
        
        Args:
            url: URL of the page to process
            custom_config: Optional custom configuration for this specific URL
            
        Returns:
            Dictionary containing extracted content and metadata
        """
        try:
            self.logger.info(f"🔄 Processing content: {url}")
            
            # Fetch the page content
            html_content, response_metadata = await self._fetch_page_content(url)
            
            if not html_content:
                raise ValueError(f"Failed to fetch content from {url}")
            
            # Parse the HTML
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Extract core content components
            content_data = {
                "source_url": url,
                "raw_html": html_content,
                "response_metadata": response_metadata,
                "title": self._extract_title(soup),
                "main_content": self._extract_main_content(soup),
                "text_content": self._extract_text_content(soup),
                "structured_data": self._extract_structured_data(soup),
                "links": self._extract_links(soup, url),
                "images": self._extract_images(soup, url),
                "tables": self._extract_tables(soup),
                "lists": self._extract_lists(soup),
                "headings": self._extract_headings(soup),
                "metadata": self._extract_page_metadata(soup),
                "content_classification": self._classify_content(soup)
            }
            
            # Apply custom processing if specified
            if custom_config:
                content_data = await self._apply_custom_processing(
                    content_data, custom_config
                )
            
            self.logger.info(f"✅ Content processed: {len(content_data['text_content'])} chars")
            return content_data
            
        except Exception as e:
            self.logger.error(f"❌ Content processing failed for {url}: {e}")
            return await self.error_recovery.handle_content_error(url, str(e))
    
    async def process_document(self, document_url: str) -> Optional[Dict[str, Any]]:
        """
        Process a document (PDF, DOC, Excel, etc.) for content extraction.
        
        Args:
            document_url: URL of the document to process
            
        Returns:
            Dictionary containing document content and metadata, or None if failed
        """
        try:
            self.logger.info(f"📄 Processing document: {document_url}")
            
            # Determine document type
            parsed_url = urlparse(document_url)
            file_extension = parsed_url.path.split('.')[-1].lower() if '.' in parsed_url.path else ''
            
            # Fetch document
            document_data, metadata = await self._fetch_document_content(document_url)
            
            if not document_data:
                return None
            
            # Process based on document type
            if file_extension == 'pdf':
                content = await self._process_pdf_document(document_data)
            elif file_extension in ['doc', 'docx']:
                content = await self._process_word_document(document_data)
            elif file_extension in ['xls', 'xlsx']:
                content = await self._process_excel_document(document_data)
            else:
                # Try to process as text
                content = await self._process_text_document(document_data)
            
            if content:
                return {
                    "url": document_url,
                    "file_name": parsed_url.path.split('/')[-1],
                    "file_extension": f".{file_extension}",
                    "content_type": metadata.get('content_type', 'unknown'),
                    "file_size": len(document_data),
                    "text_content": content.get('text', ''),
                    "structured_content": content.get('structured', {}),
                    "metadata": {
                        **metadata,
                        "processing_method": content.get('method', 'unknown')
                    }
                }
            
            return None
            
        except Exception as e:
            self.logger.error(f"❌ Document processing failed for {document_url}: {e}")
            return None
    
    def find_document_links(self, content_data: Dict[str, Any]) -> List[str]:
        """
        Find all document links in the extracted content.
        
        Args:
            content_data: Extracted content data
            
        Returns:
            List of document URLs found in the content
        """
        document_links = []
        
        # Extract from parsed links
        for link in content_data.get('links', []):
            href = link.get('href', '')
            for pattern in self.document_patterns:
                if re.search(pattern, href, re.IGNORECASE):
                    document_links.append(href)
                    break
        
        # Extract from raw HTML using regex as backup
        html_content = content_data.get('raw_html', '')
        for pattern in self.document_patterns:
            matches = re.findall(rf'href=["\']([^"\']*{pattern})["\']', html_content, re.IGNORECASE)
            for match in matches:
                full_url = urljoin(content_data.get('source_url', ''), match)
                if full_url not in document_links:
                    document_links.append(full_url)
        
        self.logger.info(f"📎 Found {len(document_links)} document links")
        return list(set(document_links))  # Remove duplicates
    
    async def _fetch_page_content(self, url: str) -> tuple[str, Dict[str, Any]]:
        """Fetch HTML content from a web page."""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
        timeout = aiohttp.ClientTimeout(total=self.config.timeout_seconds)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url, headers=headers) as response:
                if response.status != 200:
                    raise aiohttp.ClientResponseError(
                        request_info=response.request_info,
                        history=response.history,
                        status=response.status,
                        message=f"HTTP {response.status}"
                    )
                
                # Get content with proper encoding
                content_bytes = await response.read()
                content_str = self.encoding_handler.decode_content(
                    content_bytes, response.headers.get('content-type', '')
                )
                
                metadata = {
                    "status_code": response.status,
                    "content_type": response.headers.get('content-type', ''),
                    "content_length": len(content_bytes),
                    "last_modified": response.headers.get('last-modified'),
                    "server": response.headers.get('server'),
                    "response_headers": dict(response.headers)
                }
                
                return content_str, metadata
    
    async def _fetch_document_content(self, url: str) -> tuple[bytes, Dict[str, Any]]:
        """Fetch binary document content."""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        timeout = aiohttp.ClientTimeout(total=self.config.timeout_seconds)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url, headers=headers) as response:
                if response.status != 200:
                    raise aiohttp.ClientResponseError(
                        request_info=response.request_info,
                        history=response.history,
                        status=response.status
                    )
                
                content_bytes = await response.read()
                metadata = {
                    "content_type": response.headers.get('content-type', ''),
                    "content_length": len(content_bytes),
                    "last_modified": response.headers.get('last-modified')
                }
                
                return content_bytes, metadata
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract page title with fallbacks."""
        # Try different title sources
        title_sources = [
            soup.find('title'),
            soup.find('h1'),
            soup.find('meta', {'property': 'og:title'}),
            soup.find('meta', {'name': 'title'})
        ]
        
        for source in title_sources:
            if source:
                if source.name == 'meta':
                    title = source.get('content', '').strip()
                else:
                    title = source.get_text().strip()
                
                if title:
                    return title
        
        return "No title found"
    
    def _extract_main_content(self, soup: BeautifulSoup) -> str:
        """Extract main content using various selectors."""
        # Remove unwanted elements
        for element in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
            element.decompose()
        
        # Remove comments
        for comment in soup.find_all(text=lambda text: isinstance(text, Comment)):
            comment.extract()
        
        # Try content selectors in order of preference
        for selector in self.content_selectors:
            content_element = soup.select_one(selector)
            if content_element:
                return content_element.get_text(separator=' ', strip=True)
        
        # Fallback to body content
        body = soup.find('body')
        if body:
            return body.get_text(separator=' ', strip=True)
        
        # Last resort - all text
        return soup.get_text(separator=' ', strip=True)
    
    def _extract_text_content(self, soup: BeautifulSoup) -> str:
        """Extract clean text content preserving structure."""
        # Clone soup to avoid modifying original
        soup_copy = BeautifulSoup(str(soup), 'html.parser')
        
        # Remove unwanted elements
        for element in soup_copy(['script', 'style', 'nav', 'header', 'footer']):
            element.decompose()
        
        return soup_copy.get_text(separator='\n', strip=True)
    
    def _extract_structured_data(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract structured data (JSON-LD, microdata, etc.)."""
        structured = {}
        
        # JSON-LD
        json_ld_scripts = soup.find_all('script', {'type': 'application/ld+json'})
        if json_ld_scripts:
            structured['json_ld'] = []
            for script in json_ld_scripts:
                try:
                    import json
                    structured['json_ld'].append(json.loads(script.string))
                except:
                    pass
        
        # Meta tags
        meta_tags = {}
        for meta in soup.find_all('meta'):
            name = meta.get('name') or meta.get('property')
            content = meta.get('content')
            if name and content:
                meta_tags[name] = content
        
        if meta_tags:
            structured['meta_tags'] = meta_tags
        
        return structured
    
    def _extract_links(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
        """Extract all links with metadata."""
        links = []
        
        for link in soup.find_all('a', href=True):
            href = link['href']
            full_url = urljoin(base_url, href)
            
            links.append({
                "href": full_url,
                "text": link.get_text(strip=True),
                "title": link.get('title', ''),
                "rel": link.get('rel', []),
                "target": link.get('target', '')
            })
        
        return links
    
    def _extract_images(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
        """Extract all images with metadata."""
        images = []
        
        for img in soup.find_all('img', src=True):
            src = img['src']
            full_url = urljoin(base_url, src)
            
            images.append({
                "src": full_url,
                "alt": img.get('alt', ''),
                "title": img.get('title', ''),
                "width": img.get('width', ''),
                "height": img.get('height', '')
            })
        
        return images
    
    def _extract_tables(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract table data with structure preservation."""
        tables = []
        
        for table in soup.find_all('table'):
            table_data = {
                "headers": [],
                "rows": [],
                "caption": ""
            }
            
            # Extract caption
            caption = table.find('caption')
            if caption:
                table_data["caption"] = caption.get_text(strip=True)
            
            # Extract headers
            header_row = table.find('tr')
            if header_row:
                headers = header_row.find_all(['th', 'td'])
                table_data["headers"] = [h.get_text(strip=True) for h in headers]
            
            # Extract data rows
            for row in table.find_all('tr')[1:]:  # Skip header row
                cells = row.find_all(['td', 'th'])
                row_data = [cell.get_text(strip=True) for cell in cells]
                if row_data:  # Only add non-empty rows
                    table_data["rows"].append(row_data)
            
            if table_data["headers"] or table_data["rows"]:
                tables.append(table_data)
        
        return tables
    
    def _extract_lists(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract list data with structure preservation."""
        lists = []
        
        for list_elem in soup.find_all(['ul', 'ol']):
            list_data = {
                "type": list_elem.name,
                "items": []
            }
            
            for item in list_elem.find_all('li', recursive=False):
                list_data["items"].append(item.get_text(strip=True))
            
            if list_data["items"]:
                lists.append(list_data)
        
        return lists
    
    def _extract_headings(self, soup: BeautifulSoup) -> List[Dict[str, str]]:
        """Extract heading hierarchy."""
        headings = []
        
        for level in range(1, 7):  # h1 through h6
            for heading in soup.find_all(f'h{level}'):
                headings.append({
                    "level": level,
                    "text": heading.get_text(strip=True),
                    "id": heading.get('id', '')
                })
        
        return headings
    
    def _extract_page_metadata(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract page metadata."""
        metadata = {}
        
        # Meta description
        desc = soup.find('meta', {'name': 'description'})
        if desc:
            metadata['description'] = desc.get('content', '')
        
        # Meta keywords
        keywords = soup.find('meta', {'name': 'keywords'})
        if keywords:
            metadata['keywords'] = keywords.get('content', '')
        
        # Author
        author = soup.find('meta', {'name': 'author'})
        if author:
            metadata['author'] = author.get('content', '')
        
        # Language
        html = soup.find('html')
        if html and html.get('lang'):
            metadata['language'] = html.get('lang')
        
        return metadata
    
    def _classify_content(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Classify content type and characteristics."""
        classification = {
            "content_type": "unknown",
            "has_forms": False,
            "has_tables": False,
            "has_documents": False,
            "estimated_reading_time": 0,
            "complexity_score": 0
        }
        
        # Check for forms
        if soup.find('form'):
            classification["has_forms"] = True
        
        # Check for tables
        if soup.find('table'):
            classification["has_tables"] = True
        
        # Check for document links
        text_content = soup.get_text()
        for pattern in self.document_patterns:
            if re.search(pattern, text_content, re.IGNORECASE):
                classification["has_documents"] = True
                break
        
        # Estimate reading time (average 200 words per minute)
        word_count = len(text_content.split())
        classification["estimated_reading_time"] = max(1, word_count // 200)
        
        # Basic content type detection
        title_text = soup.find('title')
        title_content = title_text.get_text().lower() if title_text else ""
        
        if any(word in title_content for word in ['subsidy', 'aid', 'grant', 'funding']):
            classification["content_type"] = "subsidy_page"
        elif any(word in title_content for word in ['form', 'application', 'apply']):
            classification["content_type"] = "application_page"
        elif classification["has_documents"]:
            classification["content_type"] = "document_hub"
        
        return classification
    
    async def _apply_custom_processing(
        self, 
        content_data: Dict[str, Any], 
        custom_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply custom processing rules for specific sites."""
        # This would contain site-specific processing logic
        # For now, just return the content as-is
        return content_data
    
    async def _process_pdf_document(self, document_data: bytes) -> Dict[str, Any]:
        """Process PDF document content."""
        try:
            import io
            from ..extractors.pdf_extractor import PDFExtractor
            
            pdf_extractor = PDFExtractor()
            content = pdf_extractor.extract_content(io.BytesIO(document_data))
            
            return {
                "text": content.get("text", ""),
                "structured": content.get("tables", []),
                "method": "pdf_extraction"
            }
        except Exception as e:
            self.logger.error(f"PDF processing error: {e}")
            return {"text": "", "structured": {}, "method": "failed"}
    
    async def _process_word_document(self, document_data: bytes) -> Dict[str, Any]:
        """Process Word document content."""
        try:
            import io
            from ..extractors.document_extractor import DocumentExtractor
            
            doc_extractor = DocumentExtractor()
            content = doc_extractor.extract_word_content(io.BytesIO(document_data))
            
            return {
                "text": content.get("text", ""),
                "structured": content.get("structure", {}),
                "method": "docx_extraction"
            }
        except Exception as e:
            self.logger.error(f"Word document processing error: {e}")
            return {"text": "", "structured": {}, "method": "failed"}
    
    async def _process_excel_document(self, document_data: bytes) -> Dict[str, Any]:
        """Process Excel document content."""
        try:
            import io
            from ..extractors.document_extractor import DocumentExtractor
            
            doc_extractor = DocumentExtractor()
            content = doc_extractor.extract_excel_content(io.BytesIO(document_data))
            
            return {
                "text": content.get("text", ""),
                "structured": content.get("sheets", []),
                "method": "excel_extraction"
            }
        except Exception as e:
            self.logger.error(f"Excel document processing error: {e}")
            return {"text": "", "structured": {}, "method": "failed"}
    
    async def _process_text_document(self, document_data: bytes) -> Dict[str, Any]:
        """Process plain text document."""
        try:
            text_content = self.encoding_handler.decode_content(document_data, "text/plain")
            
            return {
                "text": text_content,
                "structured": {},
                "method": "text_extraction"
            }
        except Exception as e:
            self.logger.error(f"Text document processing error: {e}")
            return {"text": "", "structured": {}, "method": "failed"}
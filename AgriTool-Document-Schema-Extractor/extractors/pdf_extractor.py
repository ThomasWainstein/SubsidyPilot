"""
PDF document extractor with OCR fallback support.
"""

import asyncio
import os
import tempfile
from typing import Dict, Any, List
import logging

import PyPDF2
import pytesseract
from PIL import Image
import fitz  # PyMuPDF for better PDF handling


class PDFExtractor:
    """PDF document schema extractor with OCR fallback."""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    async def extract_schema(self, file_path: str) -> Dict[str, Any]:
        """
        Extract schema from PDF document.
        
        Args:
            file_path: Path to PDF file.
            
        Returns:
            Extracted schema data with metadata.
        """
        self.logger.info("Starting PDF extraction", extra={
            "file_path": file_path,
            "extractor": "PDFExtractor"
        })
        
        # Run extraction in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._extract_pdf_sync, file_path)
    
    def _extract_pdf_sync(self, file_path: str) -> Dict[str, Any]:
        """Synchronous PDF extraction."""
        fields = []
        raw_unclassified = []
        metadata = {
            "method": "text_extraction",
            "ocr_applied": False,
            "page_count": 0,
            "extractor": "PDFExtractor"
        }
        
        try:
            # First try with PyMuPDF for better text extraction
            text_content = self._extract_with_pymupdf(file_path, metadata)
            
            # If no text found, try PyPDF2
            if not text_content.strip():
                text_content = self._extract_with_pypdf2(file_path)
                metadata["method"] = "pypdf2_extraction"
            
            # If still no text, try OCR
            if not text_content.strip():
                text_content = self._extract_with_ocr(file_path, metadata)
                metadata["method"] = "ocr_extraction"
                metadata["ocr_applied"] = True
            
            # Parse text content for form fields
            if text_content.strip():
                parsed_data = self._parse_text_for_fields(text_content)
                fields.extend(parsed_data['fields'])
                raw_unclassified.extend(parsed_data['raw_unclassified'])
            else:
                raw_unclassified.append("No extractable text found in PDF")
                
        except Exception as e:
            self.logger.error("PDF extraction failed", extra={
                "file_path": file_path,
                "error": str(e),
                "error_type": type(e).__name__
            })
            raw_unclassified.append(f"PDF extraction error: {str(e)}")
        
        return {
            "fields": fields,
            "raw_unclassified": raw_unclassified,
            "metadata": metadata
        }
    
    def _extract_with_pymupdf(self, file_path: str, metadata: Dict[str, Any]) -> str:
        """Extract text using PyMuPDF (fitz)."""
        try:
            doc = fitz.open(file_path)
            text_content = ""
            metadata["page_count"] = len(doc)
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text_content += page.get_text() + "\n"
                
                # Also try to extract form fields
                widgets = page.widgets()
                for widget in widgets:
                    if widget.field_name:
                        field_name = widget.field_name
                        field_type = widget.field_type_string
                        text_content += f"\nFORM_FIELD: {field_name} (type: {field_type})\n"
            
            doc.close()
            return text_content
            
        except Exception as e:
            self.logger.warning(f"PyMuPDF extraction failed: {e}")
            return ""
    
    def _extract_with_pypdf2(self, file_path: str) -> str:
        """Extract text using PyPDF2."""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text_content = ""
                
                for page in pdf_reader.pages:
                    text_content += page.extract_text() + "\n"
                
                # Try to extract form fields if available
                if hasattr(pdf_reader, 'get_form_text_fields'):
                    form_fields = pdf_reader.get_form_text_fields()
                    if form_fields:
                        for field_name, field_value in form_fields.items():
                            text_content += f"\nFORM_FIELD: {field_name} = {field_value}\n"
                
                return text_content
                
        except Exception as e:
            self.logger.warning(f"PyPDF2 extraction failed: {e}")
            return ""
    
    def _extract_with_ocr(self, file_path: str, metadata: Dict[str, Any]) -> str:
        """Extract text using OCR as fallback."""
        try:
            # Convert PDF pages to images and run OCR
            doc = fitz.open(file_path)
            text_content = ""
            
            for page_num in range(min(len(doc), 10)):  # Limit to first 10 pages for performance
                page = doc.load_page(page_num)
                pix = page.get_pixmap()
                img_data = pix.tobytes("png")
                
                # Run OCR on the page image
                image = Image.open(io.BytesIO(img_data))
                ocr_text = pytesseract.image_to_string(image, lang='eng+fra+ron')  # Multi-language OCR
                text_content += ocr_text + "\n"
            
            doc.close()
            return text_content
            
        except Exception as e:
            self.logger.warning(f"OCR extraction failed: {e}")
            return ""
    
    def _parse_text_for_fields(self, text: str) -> Dict[str, List]:
        """Parse text content to identify form fields."""
        fields = []
        raw_unclassified = []
        
        # Import field parsing utilities
        from utils.field_parser import FieldParser
        parser = FieldParser(self.logger)
        
        return parser.parse_text_for_fields(text)
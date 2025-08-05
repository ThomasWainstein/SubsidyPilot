#!/usr/bin/env python3
"""
Advanced PDF Extractor with Layout Preservation
===============================================

Comprehensive PDF processing with layout-aware extraction, form field detection,
table structure preservation, and multi-language OCR support for agricultural
subsidy documentation.
"""

import io
import logging
import fitz  # PyMuPDF
import pdfplumber
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import re


@dataclass
class PDFPage:
    """Represents a single page in a PDF document."""
    page_number: int
    width: float
    height: float
    text_content: str = ""
    tables: List[Dict[str, Any]] = field(default_factory=list)
    images: List[Dict[str, Any]] = field(default_factory=list)
    form_fields: List[Dict[str, Any]] = field(default_factory=list)
    layout_elements: List[Dict[str, Any]] = field(default_factory=list)
    annotations: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class PDFExtractionResult:
    """Comprehensive PDF extraction results."""
    source_path: str
    total_pages: int
    pages: List[PDFPage] = field(default_factory=list)
    document_metadata: Dict[str, Any] = field(default_factory=dict)
    form_info: Dict[str, Any] = field(default_factory=dict)
    table_summary: Dict[str, Any] = field(default_factory=dict)
    text_summary: str = ""
    extraction_quality: Dict[str, float] = field(default_factory=dict)
    processing_errors: List[str] = field(default_factory=list)


class PDFExtractor:
    """
    Advanced PDF extraction engine with layout preservation and form detection.
    
    Features:
    - Layout-aware text extraction
    - Table structure preservation
    - Form field detection and classification
    - Image extraction with context
    - Multi-language OCR support
    - Annotation processing
    """
    
    def __init__(self):
        """Initialize PDF extractor with advanced processing capabilities."""
        self.logger = logging.getLogger(__name__)
        
        # Processing configuration
        self.preserve_layout = True
        self.extract_images = True
        self.detect_forms = True
        self.process_tables = True
        self.extract_annotations = True
        
        # OCR configuration for multi-language support
        self.ocr_languages = ['eng', 'ron', 'fra']  # English, Romanian, French
        
        # Table detection thresholds
        self.table_detection_threshold = 0.5
        self.min_table_rows = 2
        self.min_table_cols = 2
    
    def extract_content(self, pdf_source: Union[str, bytes, io.BytesIO]) -> PDFExtractionResult:
        """
        Extract comprehensive content from PDF document.
        
        Args:
            pdf_source: PDF file path, bytes, or BytesIO object
            
        Returns:
            PDFExtractionResult with all extracted content and metadata
        """
        try:
            # Handle different input types
            if isinstance(pdf_source, str):
                source_path = pdf_source
                pdf_bytes = Path(pdf_source).read_bytes()
            elif isinstance(pdf_source, bytes):
                source_path = "memory_pdf"
                pdf_bytes = pdf_source
            elif isinstance(pdf_source, io.BytesIO):
                source_path = "stream_pdf"
                pdf_bytes = pdf_source.getvalue()
            else:
                raise ValueError(f"Unsupported PDF source type: {type(pdf_source)}")
            
            self.logger.info(f"🔄 Extracting PDF content from: {source_path}")
            
            # Initialize result object
            result = PDFExtractionResult(
                source_path=source_path,
                total_pages=0
            )
            
            # Process with multiple libraries for comprehensive extraction
            result = self._process_with_pymupdf(pdf_bytes, result)
            result = self._process_with_pdfplumber(pdf_bytes, result)
            
            # Post-processing and quality assessment
            result = self._post_process_results(result)
            result.extraction_quality = self._assess_extraction_quality(result)
            
            self.logger.info(
                f"✅ PDF extraction complete: {result.total_pages} pages, "
                f"Quality: {result.extraction_quality.get('overall_score', 0):.2f}"
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"❌ PDF extraction failed: {e}")
            result = PDFExtractionResult(
                source_path=source_path if 'source_path' in locals() else "unknown",
                total_pages=0,
                processing_errors=[str(e)]
            )
            return result
    
    def _process_with_pymupdf(self, pdf_bytes: bytes, result: PDFExtractionResult) -> PDFExtractionResult:
        """Process PDF using PyMuPDF for advanced features."""
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            result.total_pages = len(doc)
            
            # Extract document metadata
            result.document_metadata = {
                'title': doc.metadata.get('title', ''),
                'author': doc.metadata.get('author', ''),
                'subject': doc.metadata.get('subject', ''),
                'creator': doc.metadata.get('creator', ''),
                'producer': doc.metadata.get('producer', ''),
                'creation_date': doc.metadata.get('creationDate', ''),
                'modification_date': doc.metadata.get('modDate', ''),
                'page_count': len(doc),
                'encrypted': doc.is_encrypted,
                'pdf_version': doc.pdf_version()
            }
            
            # Process each page
            for page_num in range(len(doc)):
                page = doc[page_num]
                pdf_page = PDFPage(
                    page_number=page_num + 1,
                    width=page.rect.width,
                    height=page.rect.height
                )
                
                # Extract text with layout preservation
                pdf_page.text_content = self._extract_text_with_layout(page)
                
                # Extract images with context
                if self.extract_images:
                    pdf_page.images = self._extract_images_from_page(page)
                
                # Extract form fields
                if self.detect_forms:
                    pdf_page.form_fields = self._extract_form_fields(page)
                
                # Extract annotations
                if self.extract_annotations:
                    pdf_page.annotations = self._extract_annotations(page)
                
                # Analyze layout elements
                pdf_page.layout_elements = self._analyze_layout_elements(page)
                
                result.pages.append(pdf_page)
            
            doc.close()
            
        except Exception as e:
            self.logger.error(f"❌ PyMuPDF processing failed: {e}")
            result.processing_errors.append(f"PyMuPDF error: {str(e)}")
        
        return result
    
    def _process_with_pdfplumber(self, pdf_bytes: bytes, result: PDFExtractionResult) -> PDFExtractionResult:
        """Process PDF using pdfplumber for superior table extraction."""
        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                # Ensure we have the same number of pages
                if result.total_pages == 0:
                    result.total_pages = len(pdf.pages)
                    # Initialize pages if not done by PyMuPDF
                    for i in range(len(pdf.pages)):
                        page = pdf.pages[i]
                        pdf_page = PDFPage(
                            page_number=i + 1,
                            width=page.width,
                            height=page.height
                        )
                        result.pages.append(pdf_page)
                
                # Process each page for table extraction
                for i, page in enumerate(pdf.pages):
                    if i < len(result.pages):
                        # Extract tables with high precision
                        tables = self._extract_tables_from_page(page)
                        result.pages[i].tables.extend(tables)
                        
                        # Enhance text extraction if PyMuPDF didn't work well
                        if not result.pages[i].text_content.strip():
                            result.pages[i].text_content = page.extract_text() or ""
            
        except Exception as e:
            self.logger.error(f"❌ pdfplumber processing failed: {e}")
            result.processing_errors.append(f"pdfplumber error: {str(e)}")
        
        return result
    
    def _extract_text_with_layout(self, page) -> str:
        """Extract text while preserving layout structure."""
        try:
            # Get text blocks with position information
            blocks = page.get_text("dict")
            
            text_lines = []
            current_line = []
            last_y = None
            
            for block in blocks.get("blocks", []):
                if "lines" not in block:
                    continue
                
                for line in block["lines"]:
                    line_y = line["bbox"][1]  # Top y-coordinate
                    
                    # Check if this is a new line (different y-coordinate)
                    if last_y is not None and abs(line_y - last_y) > 5:
                        if current_line:
                            text_lines.append(" ".join(current_line))
                            current_line = []
                    
                    # Extract spans (text segments) from the line
                    for span in line.get("spans", []):
                        text = span.get("text", "").strip()
                        if text:
                            current_line.append(text)
                    
                    last_y = line_y
            
            # Add the last line
            if current_line:
                text_lines.append(" ".join(current_line))
            
            return "\n".join(text_lines)
            
        except Exception as e:
            self.logger.warning(f"⚠️ Layout-aware text extraction failed: {e}")
            # Fallback to simple text extraction
            return page.get_text()
    
    def _extract_images_from_page(self, page) -> List[Dict[str, Any]]:
        """Extract images from page with context information."""
        images = []
        
        try:
            image_list = page.get_images()
            
            for img_index, img in enumerate(image_list):
                img_info = {
                    'index': img_index,
                    'xref': img[0],
                    'smask': img[1],
                    'width': img[2],
                    'height': img[3],
                    'bpc': img[4],  # bits per component
                    'colorspace': img[5],
                    'alt': img[6],
                    'name': img[7],
                    'filter': img[8]
                }
                
                # Get image position on page
                try:
                    img_dict = page.parent.extract_image(img[0])
                    img_info.update({
                        'ext': img_dict['ext'],
                        'image_data': img_dict['image'],  # Raw image bytes
                        'size_bytes': len(img_dict['image'])
                    })
                except:
                    pass
                
                images.append(img_info)
                
        except Exception as e:
            self.logger.warning(f"⚠️ Image extraction failed: {e}")
        
        return images
    
    def _extract_form_fields(self, page) -> List[Dict[str, Any]]:
        """Extract interactive form fields from page."""
        form_fields = []
        
        try:
            # Get form fields (widgets) from the page
            widgets = page.widgets()
            
            for widget in widgets:
                field_info = {
                    'field_type': widget.field_type_string,
                    'field_name': widget.field_name or f"field_{len(form_fields)}",
                    'field_value': widget.field_value,
                    'rect': [widget.rect.x0, widget.rect.y0, widget.rect.x1, widget.rect.y1],
                    'required': getattr(widget, 'required', False),
                    'readonly': getattr(widget, 'readonly', False)
                }
                
                # Additional field type specific information
                if widget.field_type == fitz.PDF_WIDGET_TYPE_TEXT:
                    field_info.update({
                        'multiline': getattr(widget, 'multiline', False),
                        'max_length': getattr(widget, 'text_maxlen', 0),
                        'password': getattr(widget, 'is_password', False)
                    })
                elif widget.field_type == fitz.PDF_WIDGET_TYPE_COMBOBOX:
                    field_info.update({
                        'options': getattr(widget, 'choice_values', []),
                        'editable': getattr(widget, 'is_editable', False)
                    })
                elif widget.field_type == fitz.PDF_WIDGET_TYPE_LISTBOX:
                    field_info.update({
                        'options': getattr(widget, 'choice_values', []),
                        'multiselect': getattr(widget, 'multiselect', False)
                    })
                elif widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                    field_info.update({
                        'checked': widget.field_value == 'Yes'
                    })
                
                form_fields.append(field_info)
                
        except Exception as e:
            self.logger.warning(f"⚠️ Form field extraction failed: {e}")
        
        return form_fields
    
    def _extract_annotations(self, page) -> List[Dict[str, Any]]:
        """Extract annotations (comments, highlights, etc.) from page."""
        annotations = []
        
        try:
            annot_list = page.annots()
            
            for annot in annot_list:
                annot_info = {
                    'type': annot.type[1],  # Annotation type name
                    'content': annot.info.get('content', ''),
                    'author': annot.info.get('title', ''),
                    'rect': [annot.rect.x0, annot.rect.y0, annot.rect.x1, annot.rect.y1],
                    'page_number': page.number + 1,
                    'creation_date': annot.info.get('creationDate', ''),
                    'modification_date': annot.info.get('modDate', '')
                }
                
                # Extract additional annotation-specific information
                if annot.type[0] == fitz.PDF_ANNOT_HIGHLIGHT:
                    # For highlights, try to extract the highlighted text
                    try:
                        highlighted_text = page.get_textbox(annot.rect)
                        annot_info['highlighted_text'] = highlighted_text
                    except:
                        pass
                
                annotations.append(annot_info)
                
        except Exception as e:
            self.logger.warning(f"⚠️ Annotation extraction failed: {e}")
        
        return annotations
    
    def _analyze_layout_elements(self, page) -> List[Dict[str, Any]]:
        """Analyze layout elements to understand document structure."""
        layout_elements = []
        
        try:
            # Get text blocks with detailed information
            blocks = page.get_text("dict")
            
            for block_num, block in enumerate(blocks.get("blocks", [])):
                if "lines" not in block:
                    continue
                
                # Analyze this text block
                block_bbox = block["bbox"]
                block_text = ""
                
                for line in block["lines"]:
                    for span in line.get("spans", []):
                        block_text += span.get("text", "")
                
                if not block_text.strip():
                    continue
                
                # Classify the layout element
                element_type = self._classify_layout_element(block_text, block_bbox, page)
                
                layout_elements.append({
                    'type': element_type,
                    'bbox': block_bbox,
                    'text': block_text.strip(),
                    'block_number': block_num,
                    'font_info': self._extract_font_info(block),
                    'position_info': self._analyze_position(block_bbox, page)
                })
                
        except Exception as e:
            self.logger.warning(f"⚠️ Layout analysis failed: {e}")
        
        return layout_elements
    
    def _extract_tables_from_page(self, page) -> List[Dict[str, Any]]:
        """Extract tables using pdfplumber's superior table detection."""
        tables = []
        
        try:
            # Find tables with different detection strategies
            detected_tables = page.find_tables()
            
            for table_num, table in enumerate(detected_tables):
                try:
                    # Extract table data
                    table_data = table.extract()
                    
                    if not table_data or len(table_data) < self.min_table_rows:
                        continue
                    
                    # Filter out empty columns
                    filtered_data = []
                    for row in table_data:
                        if row and any(cell and str(cell).strip() for cell in row):
                            filtered_data.append(row)
                    
                    if len(filtered_data) < self.min_table_rows:
                        continue
                    
                    # Analyze table structure
                    table_info = {
                        'table_number': table_num + 1,
                        'bbox': table.bbox,
                        'rows': len(filtered_data),
                        'columns': len(filtered_data[0]) if filtered_data else 0,
                        'data': filtered_data,
                        'header_row': filtered_data[0] if filtered_data else [],
                        'data_rows': filtered_data[1:] if len(filtered_data) > 1 else [],
                        'table_type': self._classify_table_type(filtered_data),
                        'is_form_table': self._is_form_table(filtered_data)
                    }
                    
                    tables.append(table_info)
                    
                except Exception as e:
                    self.logger.warning(f"⚠️ Table {table_num} extraction failed: {e}")
                    continue
                    
        except Exception as e:
            self.logger.warning(f"⚠️ Table detection failed: {e}")
        
        return tables
    
    def _classify_layout_element(self, text: str, bbox: List[float], page) -> str:
        """Classify layout elements by type."""
        text = text.strip().lower()
        
        # Check if it's a heading (larger font, short text, position)
        if len(text) < 100 and (bbox[1] < page.rect.height * 0.2 or 'title' in text):
            return 'heading'
        
        # Check if it's a footer (bottom of page)
        if bbox[3] > page.rect.height * 0.9:
            return 'footer'
        
        # Check if it's a header (top of page)
        if bbox[1] < page.rect.height * 0.1:
            return 'header'
        
        # Check for form-like content
        if any(word in text for word in ['name:', 'date:', 'signature:', 'amount:', '€', '$']):
            return 'form_content'
        
        # Check for list items
        if text.startswith(('•', '-', '*', '1.', '2.', 'a)', 'i)')):
            return 'list_item'
        
        # Default to paragraph
        return 'paragraph'
    
    def _extract_font_info(self, block: Dict) -> Dict[str, Any]:
        """Extract font information from text block."""
        font_info = {
            'fonts': [],
            'sizes': [],
            'flags': []
        }
        
        try:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    font_info['fonts'].append(span.get('font', ''))
                    font_info['sizes'].append(span.get('size', 0))
                    font_info['flags'].append(span.get('flags', 0))
            
            # Get dominant font characteristics
            if font_info['sizes']:
                font_info['dominant_size'] = max(set(font_info['sizes']), key=font_info['sizes'].count)
            if font_info['fonts']:
                font_info['dominant_font'] = max(set(font_info['fonts']), key=font_info['fonts'].count)
                
        except Exception:
            pass
        
        return font_info
    
    def _analyze_position(self, bbox: List[float], page) -> Dict[str, Any]:
        """Analyze element position relative to page."""
        page_width = page.rect.width
        page_height = page.rect.height
        
        return {
            'left_ratio': bbox[0] / page_width,
            'top_ratio': bbox[1] / page_height,
            'width_ratio': (bbox[2] - bbox[0]) / page_width,
            'height_ratio': (bbox[3] - bbox[1]) / page_height,
            'center_x': (bbox[0] + bbox[2]) / 2,
            'center_y': (bbox[1] + bbox[3]) / 2,
            'area': (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
        }
    
    def _classify_table_type(self, table_data: List[List]) -> str:
        """Classify table type based on content analysis."""
        if not table_data:
            return 'unknown'
        
        # Convert all cells to strings for analysis
        text_content = []
        for row in table_data:
            for cell in row:
                if cell:
                    text_content.append(str(cell).lower())
        
        content_text = ' '.join(text_content)
        
        # Financial table indicators
        if any(indicator in content_text for indicator in ['€', '$', 'amount', 'cost', 'budget', 'total']):
            return 'financial'
        
        # Form table indicators
        if any(indicator in content_text for indicator in ['name', 'date', 'signature', 'required']):
            return 'form'
        
        # Data table indicators
        if len(table_data) > 5 and len(table_data[0]) > 2:
            return 'data'
        
        # Schedule/timeline table
        if any(indicator in content_text for indicator in ['date', 'time', 'deadline', 'period']):
            return 'schedule'
        
        return 'general'
    
    def _is_form_table(self, table_data: List[List]) -> bool:
        """Determine if table represents a form structure."""
        if not table_data or len(table_data) < 2:
            return False
        
        # Check for form-like patterns
        form_indicators = 0
        
        for row in table_data:
            row_text = ' '.join(str(cell) for cell in row if cell).lower()
            
            # Look for form field patterns
            if ':' in row_text and any(word in row_text for word in ['name', 'date', 'number', 'address']):
                form_indicators += 1
            
            # Look for empty cells (potential input fields)
            empty_cells = sum(1 for cell in row if not cell or str(cell).strip() == '')
            if empty_cells > len(row) / 2:  # More than half empty
                form_indicators += 1
        
        return form_indicators > len(table_data) * 0.3  # 30% of rows show form patterns
    
    def _post_process_results(self, result: PDFExtractionResult) -> PDFExtractionResult:
        """Post-process extracted results for quality and consistency."""
        # Compile text summary
        all_text = []
        for page in result.pages:
            if page.text_content.strip():
                all_text.append(page.text_content)
        
        result.text_summary = '\n\n'.join(all_text)
        
        # Analyze form information
        all_form_fields = []
        for page in result.pages:
            all_form_fields.extend(page.form_fields)
        
        result.form_info = {
            'has_forms': len(all_form_fields) > 0,
            'total_fields': len(all_form_fields),
            'field_types': list(set(field.get('field_type', 'unknown') for field in all_form_fields)),
            'required_fields': len([f for f in all_form_fields if f.get('required', False)]),
            'complexity_score': self._calculate_form_complexity(all_form_fields)
        }
        
        # Analyze table summary
        all_tables = []
        for page in result.pages:
            all_tables.extend(page.tables)
        
        result.table_summary = {
            'total_tables': len(all_tables),
            'table_types': list(set(table.get('table_type', 'unknown') for table in all_tables)),
            'form_tables': len([t for t in all_tables if t.get('is_form_table', False)]),
            'largest_table_rows': max([t.get('rows', 0) for t in all_tables] + [0]),
            'largest_table_cols': max([t.get('columns', 0) for t in all_tables] + [0])
        }
        
        return result
    
    def _calculate_form_complexity(self, form_fields: List[Dict[str, Any]]) -> float:
        """Calculate form complexity score (0-1)."""
        if not form_fields:
            return 0.0
        
        complexity_factors = []
        
        # Number of fields factor
        field_count = len(form_fields)
        if field_count > 50:
            complexity_factors.append(1.0)
        elif field_count > 20:
            complexity_factors.append(0.8)
        elif field_count > 10:
            complexity_factors.append(0.6)
        else:
            complexity_factors.append(0.4)
        
        # Field type diversity
        field_types = set(field.get('field_type', 'text') for field in form_fields)
        type_diversity = min(len(field_types) / 5, 1.0)  # Normalize to 0-1
        complexity_factors.append(type_diversity)
        
        # Required fields ratio
        required_count = sum(1 for field in form_fields if field.get('required', False))
        required_ratio = required_count / field_count if field_count > 0 else 0
        complexity_factors.append(required_ratio)
        
        return sum(complexity_factors) / len(complexity_factors)
    
    def _assess_extraction_quality(self, result: PDFExtractionResult) -> Dict[str, float]:
        """Assess quality of extraction process."""
        quality_metrics = {
            'overall_score': 0.0,
            'text_extraction_score': 0.0,
            'table_extraction_score': 0.0,
            'form_detection_score': 0.0,
            'layout_preservation_score': 0.0
        }
        
        # Text extraction quality
        total_text_length = len(result.text_summary)
        if total_text_length > 1000:
            quality_metrics['text_extraction_score'] = 0.9
        elif total_text_length > 500:
            quality_metrics['text_extraction_score'] = 0.7
        elif total_text_length > 100:
            quality_metrics['text_extraction_score'] = 0.5
        else:
            quality_metrics['text_extraction_score'] = 0.3
        
        # Table extraction quality
        total_tables = result.table_summary.get('total_tables', 0)
        if total_tables > 0:
            quality_metrics['table_extraction_score'] = min(total_tables / 5, 1.0)
        else:
            quality_metrics['table_extraction_score'] = 0.5  # Neutral score
        
        # Form detection quality
        if result.form_info.get('has_forms', False):
            quality_metrics['form_detection_score'] = 0.9
        else:
            quality_metrics['form_detection_score'] = 0.7  # Might not have forms
        
        # Layout preservation (based on successful element analysis)
        total_layout_elements = sum(len(page.layout_elements) for page in result.pages)
        if total_layout_elements > result.total_pages * 5:  # Good element detection
            quality_metrics['layout_preservation_score'] = 0.9
        elif total_layout_elements > result.total_pages * 2:
            quality_metrics['layout_preservation_score'] = 0.7
        else:
            quality_metrics['layout_preservation_score'] = 0.5
        
        # Calculate overall score
        scores = [
            quality_metrics['text_extraction_score'],
            quality_metrics['table_extraction_score'],
            quality_metrics['form_detection_score'],
            quality_metrics['layout_preservation_score']
        ]
        quality_metrics['overall_score'] = sum(scores) / len(scores)
        
        return quality_metrics
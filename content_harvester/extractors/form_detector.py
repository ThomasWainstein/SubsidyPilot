#!/usr/bin/env python3
"""
Intelligent Form Detector
=========================

Advanced form field detection and classification system for automatic
conversion of PDF forms to interactive web interfaces.
"""

import logging
import re
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum


class FieldType(Enum):
    """Form field types supported by the detector."""
    TEXT = "text"
    EMAIL = "email"
    PHONE = "phone"
    NUMBER = "number"
    DATE = "date"
    CURRENCY = "currency"
    TEXTAREA = "textarea"
    CHECKBOX = "checkbox"
    RADIO = "radio"
    SELECT = "select"
    FILE = "file"
    SIGNATURE = "signature"
    UNKNOWN = "unknown"


class FieldCategory(Enum):
    """Categories of form fields for organization."""
    PERSONAL_INFO = "personal_info"
    CONTACT_INFO = "contact_info"
    FINANCIAL_INFO = "financial_info"
    TECHNICAL_INFO = "technical_info"
    LEGAL_INFO = "legal_info"
    PROJECT_INFO = "project_info"
    SUPPORTING_DOCS = "supporting_docs"
    UNKNOWN = "unknown"


@dataclass
class DetectedField:
    """Represents a detected form field with all metadata."""
    field_id: str
    field_type: FieldType
    field_category: FieldCategory
    label: str
    description: str = ""
    required: bool = False
    placeholder: str = ""
    validation_rules: Dict[str, Any] = field(default_factory=dict)
    options: List[str] = field(default_factory=list)  # For select/radio fields
    dependencies: List[str] = field(default_factory=list)  # Field dependencies
    position: Dict[str, float] = field(default_factory=dict)  # Layout position
    confidence_score: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FormSection:
    """Represents a logical section of a form."""
    section_id: str
    title: str
    description: str = ""
    fields: List[DetectedField] = field(default_factory=list)
    subsections: List['FormSection'] = field(default_factory=list)
    order: int = 0
    required: bool = False
    conditional_logic: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DetectedForm:
    """Complete detected form structure."""
    form_id: str
    title: str
    description: str = ""
    sections: List[FormSection] = field(default_factory=list)
    total_fields: int = 0
    complexity_score: float = 0.0
    estimated_completion_time: int = 0  # Minutes
    languages: List[str] = field(default_factory=list)
    form_type: str = "application"
    validation_summary: Dict[str, Any] = field(default_factory=dict)


class FormDetector:
    """
    Advanced form detection engine for agricultural subsidy documents.
    
    Automatically detects and classifies form fields, organizes them into
    logical sections, and generates interactive web form definitions.
    """
    
    def __init__(self):
        """Initialize form detector with comprehensive field recognition patterns."""
        self.logger = logging.getLogger(__name__)
        
        # Field detection patterns
        self.field_patterns = self._initialize_field_patterns()
        self.label_patterns = self._initialize_label_patterns()
        self.validation_patterns = self._initialize_validation_patterns()
        
        # Form structure analysis
        self.section_indicators = [
            'section', 'part', 'chapter', 'step', 'phase',
            'información', 'informații', 'informations'
        ]
        
        # Completion time estimation (words per minute for form filling)
        self.completion_rates = {
            FieldType.TEXT: 2,      # 2 minutes per text field
            FieldType.EMAIL: 1,     # 1 minute per email
            FieldType.PHONE: 1,     # 1 minute per phone
            FieldType.NUMBER: 1,    # 1 minute per number
            FieldType.DATE: 1,      # 1 minute per date
            FieldType.CURRENCY: 2,  # 2 minutes per currency field
            FieldType.TEXTAREA: 5,  # 5 minutes per textarea
            FieldType.CHECKBOX: 0.5, # 30 seconds per checkbox
            FieldType.RADIO: 1,     # 1 minute per radio group
            FieldType.SELECT: 1,    # 1 minute per select
            FieldType.FILE: 3,      # 3 minutes per file upload
            FieldType.SIGNATURE: 2  # 2 minutes per signature
        }
    
    def detect_forms_in_pdf(self, pdf_result) -> List[DetectedForm]:
        """
        Detect forms in PDF extraction results.
        
        Args:
            pdf_result: PDFExtractionResult from PDF extractor
            
        Returns:
            List of detected forms with complete structure
        """
        try:
            self.logger.info(f"🔍 Detecting forms in PDF with {pdf_result.total_pages} pages")
            
            detected_forms = []
            
            # Check if PDF has interactive form fields
            if pdf_result.form_info.get('has_forms', False):
                form = self._process_interactive_form(pdf_result)
                if form:
                    detected_forms.append(form)
            
            # Detect forms from text and table content
            text_forms = self._detect_forms_from_content(pdf_result)
            detected_forms.extend(text_forms)
            
            # Post-process forms for quality and completeness
            for form in detected_forms:
                form = self._enhance_form_structure(form)
                form.complexity_score = self._calculate_complexity_score(form)
                form.estimated_completion_time = self._estimate_completion_time(form)
            
            self.logger.info(f"✅ Detected {len(detected_forms)} forms")
            return detected_forms
            
        except Exception as e:
            self.logger.error(f"❌ Form detection failed: {e}")
            return []
    
    def _process_interactive_form(self, pdf_result) -> Optional[DetectedForm]:
        """Process PDF with interactive form fields."""
        try:
            all_fields = []
            
            # Collect all form fields from all pages
            for page in pdf_result.pages:
                for field_data in page.form_fields:
                    detected_field = self._convert_pdf_field(field_data, page.page_number)
                    if detected_field:
                        all_fields.append(detected_field)
            
            if not all_fields:
                return None
            
            # Create form structure
            form = DetectedForm(
                form_id=f"interactive_form_{hash(pdf_result.source_path)}",
                title=pdf_result.document_metadata.get('title', 'Application Form'),
                description="Interactive PDF form converted to web format",
                total_fields=len(all_fields)
            )
            
            # Organize fields into sections
            form.sections = self._organize_fields_into_sections(all_fields)
            
            return form
            
        except Exception as e:
            self.logger.error(f"❌ Interactive form processing failed: {e}")
            return None
    
    def _detect_forms_from_content(self, pdf_result) -> List[DetectedForm]:
        """Detect forms from text content and table structures."""
        detected_forms = []
        
        try:
            # Analyze each page for form-like content
            for page in pdf_result.pages:
                # Check tables for form structures
                for table in page.tables:
                    if table.get('is_form_table', False):
                        form = self._extract_form_from_table(table, page.page_number, pdf_result)
                        if form:
                            detected_forms.append(form)
                
                # Check text content for form patterns
                text_form = self._extract_form_from_text(page.text_content, page.page_number, pdf_result)
                if text_form:
                    detected_forms.append(text_form)
            
            # Merge related forms
            merged_forms = self._merge_related_forms(detected_forms)
            
            return merged_forms
            
        except Exception as e:
            self.logger.error(f"❌ Content form detection failed: {e}")
            return []
    
    def _convert_pdf_field(self, field_data: Dict[str, Any], page_number: int) -> Optional[DetectedField]:
        """Convert PDF form field to DetectedField."""
        try:
            field_name = field_data.get('field_name', f'field_{page_number}_{len(field_data)}')
            field_type_str = field_data.get('field_type', 'text').lower()
            
            # Map PDF field types to our FieldType enum
            field_type_mapping = {
                'text': FieldType.TEXT,
                'ch': FieldType.CHECKBOX,  # PDF checkbox
                'btn': FieldType.CHECKBOX,  # PDF button (often checkbox)
                'combobox': FieldType.SELECT,
                'listbox': FieldType.SELECT,
                'signature': FieldType.SIGNATURE
            }
            
            field_type = field_type_mapping.get(field_type_str, FieldType.UNKNOWN)
            
            # Enhance field type detection based on name and context
            field_type = self._enhance_field_type_detection(field_name, field_type)
            
            # Determine field category
            field_category = self._categorize_field(field_name, field_type)
            
            # Extract validation rules
            validation_rules = {}
            if field_data.get('required', False):
                validation_rules['required'] = True
            if field_data.get('max_length', 0) > 0:
                validation_rules['maxLength'] = field_data['max_length']
            
            # Extract options for select/radio fields
            options = field_data.get('options', [])
            
            detected_field = DetectedField(
                field_id=self._generate_field_id(field_name),
                field_type=field_type,
                field_category=field_category,
                label=self._generate_label_from_name(field_name),
                required=field_data.get('required', False),
                validation_rules=validation_rules,
                options=options,
                position={
                    'page': page_number,
                    'x': field_data.get('rect', [0])[0],
                    'y': field_data.get('rect', [0, 0])[1] if len(field_data.get('rect', [])) > 1 else 0
                },
                confidence_score=0.9,  # High confidence for PDF fields
                metadata={
                    'source': 'pdf_interactive_field',
                    'original_data': field_data
                }
            )
            
            return detected_field
            
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to convert PDF field: {e}")
            return None
    
    def _extract_form_from_table(self, table: Dict[str, Any], page_number: int, pdf_result) -> Optional[DetectedForm]:
        """Extract form structure from table data."""
        try:
            table_data = table.get('data', [])
            if not table_data or len(table_data) < 2:
                return None
            
            fields = []
            
            # Analyze table structure for form patterns
            for row_idx, row in enumerate(table_data):
                if not row or len(row) < 2:
                    continue
                
                # Look for label-value pairs
                for col_idx in range(len(row) - 1):
                    label_cell = str(row[col_idx] or '').strip()
                    value_cell = str(row[col_idx + 1] or '').strip()
                    
                    # Skip if no label
                    if not label_cell:
                        continue
                    
                    # Check if this looks like a form field
                    if self._is_form_field_pattern(label_cell, value_cell):
                        field = self._create_field_from_table_cell(
                            label_cell, value_cell, row_idx, col_idx, page_number
                        )
                        if field:
                            fields.append(field)
            
            if len(fields) < 2:  # Need at least 2 fields to be a form
                return None
            
            # Create form from detected fields
            form = DetectedForm(
                form_id=f"table_form_{page_number}_{table.get('table_number', 1)}",
                title=f"Form from Table {table.get('table_number', 1)} (Page {page_number})",
                description="Form extracted from table structure",
                total_fields=len(fields)
            )
            
            # Organize into a single section
            section = FormSection(
                section_id="main_section",
                title="Application Information",
                fields=fields,
                order=1
            )
            form.sections = [section]
            
            return form
            
        except Exception as e:
            self.logger.warning(f"⚠️ Table form extraction failed: {e}")
            return None
    
    def _extract_form_from_text(self, text_content: str, page_number: int, pdf_result) -> Optional[DetectedForm]:
        """Extract form fields from text content using pattern matching."""
        try:
            fields = []
            lines = text_content.split('\n')
            
            for line_idx, line in enumerate(lines):
                line = line.strip()
                if not line:
                    continue
                
                # Look for form field patterns in text
                for pattern_name, pattern_info in self.field_patterns.items():
                    for pattern in pattern_info['patterns']:
                        matches = re.finditer(pattern, line, re.IGNORECASE)
                        for match in matches:
                            field = self._create_field_from_text_match(
                                match, pattern_name, pattern_info, line_idx, page_number
                            )
                            if field:
                                fields.append(field)
            
            if len(fields) < 3:  # Need at least 3 fields for text-based form
                return None
            
            # Create form from detected fields
            form = DetectedForm(
                form_id=f"text_form_{page_number}",
                title=f"Form from Text Content (Page {page_number})",
                description="Form extracted from text patterns",
                total_fields=len(fields)
            )
            
            # Organize fields into sections
            form.sections = self._organize_fields_into_sections(fields)
            
            return form
            
        except Exception as e:
            self.logger.warning(f"⚠️ Text form extraction failed: {e}")
            return None
    
    def _initialize_field_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Initialize comprehensive field detection patterns."""
        return {
            'personal_name': {
                'type': FieldType.TEXT,
                'category': FieldCategory.PERSONAL_INFO,
                'patterns': [
                    r'name\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'nom\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'nume\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'apellido\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'prenume\s*[:\-_]?\s*[_\.\-]{2,}'
                ],
                'validation': {'required': True, 'minLength': 2}
            },
            'email': {
                'type': FieldType.EMAIL,
                'category': FieldCategory.CONTACT_INFO,
                'patterns': [
                    r'e?-?mail\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'email\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'correo\s*[:\-_]?\s*[_\.\-]{2,}'
                ],
                'validation': {'required': True, 'type': 'email'}
            },
            'phone': {
                'type': FieldType.PHONE,
                'category': FieldCategory.CONTACT_INFO,
                'patterns': [
                    r'phone\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'tel[éeè]fono?\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'telefon\s*[:\-_]?\s*[_\.\-]{2,}'
                ],
                'validation': {'required': False, 'pattern': r'^\+?[\d\s\-\(\)]{8,15}$'}
            },
            'date': {
                'type': FieldType.DATE,
                'category': FieldCategory.PERSONAL_INFO,
                'patterns': [
                    r'date\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'fecha\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'data\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'birth\s*date\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'nacimiento\s*[:\-_]?\s*[_\.\-]{2,}'
                ],
                'validation': {'required': False, 'type': 'date'}
            },
            'currency': {
                'type': FieldType.CURRENCY,
                'category': FieldCategory.FINANCIAL_INFO,
                'patterns': [
                    r'amount\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'suma\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'cantidad\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'euro?\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'€\s*[_\.\-]{2,}',
                    r'cost\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'budget\s*[:\-_]?\s*[_\.\-]{2,}'
                ],
                'validation': {'required': True, 'min': 0}
            },
            'signature': {
                'type': FieldType.SIGNATURE,
                'category': FieldCategory.LEGAL_INFO,
                'patterns': [
                    r'signature\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'firma\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'semnătura\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'sign\s*here\s*[:\-_]?\s*[_\.\-]{2,}'
                ],
                'validation': {'required': True}
            },
            'file_upload': {
                'type': FieldType.FILE,
                'category': FieldCategory.SUPPORTING_DOCS,
                'patterns': [
                    r'attach\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'document\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'upload\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'anexar\s*[:\-_]?\s*[_\.\-]{2,}',
                    r'anexă\s*[:\-_]?\s*[_\.\-]{2,}'
                ],
                'validation': {'required': False, 'accept': '.pdf,.doc,.docx,.jpg,.png'}
            }
        }
    
    def _initialize_label_patterns(self) -> Dict[str, List[str]]:
        """Initialize patterns for generating user-friendly labels."""
        return {
            'name': ['Full Name', 'Nom Complet', 'Numele Complet', 'Nombre Completo'],
            'email': ['Email Address', 'Adresse Email', 'Adresă Email', 'Dirección de Email'],
            'phone': ['Phone Number', 'Numéro de Téléphone', 'Număr de Telefon', 'Número de Teléfono'],
            'date': ['Date', 'Date', 'Data', 'Fecha'],
            'amount': ['Amount', 'Montant', 'Sumă', 'Cantidad'],
            'signature': ['Signature', 'Signature', 'Semnătură', 'Firma'],
            'document': ['Document', 'Document', 'Document', 'Documento']
        }
    
    def _initialize_validation_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Initialize validation rule patterns."""
        return {
            'required_indicators': [
                r'\*\s*required', r'\*\s*obligatoire', r'\*\s*obligatoriu', r'\*\s*obligatorio',
                r'required\s*\*', r'obligatoire\s*\*', r'obligatoriu\s*\*', r'obligatorio\s*\*',
                r'\(required\)', r'\(obligatoire\)', r'\(obligatoriu\)', r'\(obligatorio\)'
            ],
            'email_patterns': [
                r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            ],
            'phone_patterns': [
                r'^\+?[\d\s\-\(\)]{8,15}$'
            ],
            'currency_patterns': [
                r'^\d+([.,]\d{2})?$'
            ]
        }
    
    def _is_form_field_pattern(self, label: str, value: str) -> bool:
        """Check if label-value pair represents a form field."""
        label = label.lower().strip()
        value = value.lower().strip()
        
        # Label should end with colon or contain form field indicators
        has_field_indicator = (
            label.endswith(':') or
            any(indicator in label for indicator in ['name', 'email', 'phone', 'date', 'amount']) or
            '_' in value or '...' in value or len(value) == 0
        )
        
        # Value should be empty or look like a placeholder
        is_placeholder_value = (
            not value or
            value in ['', '_', '...', 'n/a', 'tbd'] or
            len(set(value)) == 1  # All same character (like underscores)
        )
        
        return has_field_indicator and is_placeholder_value
    
    def _create_field_from_table_cell(
        self, 
        label: str, 
        value: str, 
        row_idx: int, 
        col_idx: int, 
        page_number: int
    ) -> Optional[DetectedField]:
        """Create a DetectedField from table cell data."""
        try:
            # Clean up label
            clean_label = label.strip(' :*').title()
            
            # Detect field type based on label
            field_type = self._detect_field_type_from_label(label)
            field_category = self._categorize_field(label, field_type)
            
            # Check if field is required
            is_required = '*' in label or 'required' in label.lower()
            
            field = DetectedField(
                field_id=f"table_field_{page_number}_{row_idx}_{col_idx}",
                field_type=field_type,
                field_category=field_category,
                label=clean_label,
                required=is_required,
                position={
                    'page': page_number,
                    'row': row_idx,
                    'column': col_idx
                },
                confidence_score=0.7,
                metadata={
                    'source': 'table_extraction',
                    'original_label': label,
                    'original_value': value
                }
            )
            
            return field
            
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to create field from table cell: {e}")
            return None
    
    def _create_field_from_text_match(
        self, 
        match, 
        pattern_name: str, 
        pattern_info: Dict[str, Any], 
        line_idx: int, 
        page_number: int
    ) -> Optional[DetectedField]:
        """Create a DetectedField from text pattern match."""
        try:
            matched_text = match.group(0)
            
            field = DetectedField(
                field_id=f"text_field_{page_number}_{line_idx}_{match.start()}",
                field_type=pattern_info['type'],
                field_category=pattern_info['category'],
                label=self._generate_label_from_pattern(pattern_name, matched_text),
                required=pattern_info.get('validation', {}).get('required', False),
                validation_rules=pattern_info.get('validation', {}),
                position={
                    'page': page_number,
                    'line': line_idx,
                    'start': match.start(),
                    'end': match.end()
                },
                confidence_score=0.6,
                metadata={
                    'source': 'text_pattern_match',
                    'pattern_name': pattern_name,
                    'matched_text': matched_text
                }
            )
            
            return field
            
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to create field from text match: {e}")
            return None
    
    def _detect_field_type_from_label(self, label: str) -> FieldType:
        """Detect field type based on label content."""
        label_lower = label.lower()
        
        # Email patterns
        if any(term in label_lower for term in ['email', 'e-mail', 'correo']):
            return FieldType.EMAIL
        
        # Phone patterns
        if any(term in label_lower for term in ['phone', 'tel', 'telephone']):
            return FieldType.PHONE
        
        # Date patterns
        if any(term in label_lower for term in ['date', 'fecha', 'data', 'birth']):
            return FieldType.DATE
        
        # Currency patterns
        if any(term in label_lower for term in ['amount', 'cost', 'price', 'euro', '€', '$', 'suma']):
            return FieldType.CURRENCY
        
        # Number patterns
        if any(term in label_lower for term in ['number', 'num', 'id', 'code']):
            return FieldType.NUMBER
        
        # Signature patterns
        if any(term in label_lower for term in ['signature', 'firma', 'sign']):
            return FieldType.SIGNATURE
        
        # File upload patterns
        if any(term in label_lower for term in ['attach', 'upload', 'document', 'file']):
            return FieldType.FILE
        
        # Large text areas
        if any(term in label_lower for term in ['description', 'comment', 'note', 'detail']):
            return FieldType.TEXTAREA
        
        # Default to text
        return FieldType.TEXT
    
    def _categorize_field(self, label: str, field_type: FieldType) -> FieldCategory:
        """Categorize field based on label and type."""
        label_lower = label.lower()
        
        # Personal information
        if any(term in label_lower for term in ['name', 'age', 'birth', 'gender']):
            return FieldCategory.PERSONAL_INFO
        
        # Contact information
        if any(term in label_lower for term in ['email', 'phone', 'address', 'contact']):
            return FieldCategory.CONTACT_INFO
        
        # Financial information
        if any(term in label_lower for term in ['amount', 'cost', 'budget', 'income', 'revenue']):
            return FieldCategory.FINANCIAL_INFO
        
        # Technical information
        if any(term in label_lower for term in ['technical', 'specification', 'method', 'technology']):
            return FieldCategory.TECHNICAL_INFO
        
        # Legal information
        if any(term in label_lower for term in ['signature', 'agree', 'consent', 'legal', 'terms']):
            return FieldCategory.LEGAL_INFO
        
        # Project information
        if any(term in label_lower for term in ['project', 'proposal', 'objective', 'goal']):
            return FieldCategory.PROJECT_INFO
        
        # Supporting documents
        if field_type == FieldType.FILE or any(term in label_lower for term in ['document', 'attach', 'file']):
            return FieldCategory.SUPPORTING_DOCS
        
        return FieldCategory.UNKNOWN
    
    def _enhance_field_type_detection(self, field_name: str, current_type: FieldType) -> FieldType:
        """Enhance field type detection based on field name analysis."""
        name_lower = field_name.lower()
        
        # Override based on name patterns
        if any(term in name_lower for term in ['email', 'mail']):
            return FieldType.EMAIL
        elif any(term in name_lower for term in ['phone', 'tel']):
            return FieldType.PHONE
        elif any(term in name_lower for term in ['date', 'birth']):
            return FieldType.DATE
        elif any(term in name_lower for term in ['amount', 'cost', 'price']):
            return FieldType.CURRENCY
        elif any(term in name_lower for term in ['signature', 'sign']):
            return FieldType.SIGNATURE
        
        return current_type
    
    def _generate_field_id(self, field_name: str) -> str:
        """Generate a clean field ID from field name."""
        # Remove special characters and convert to snake_case
        clean_name = re.sub(r'[^\w\s]', '', field_name.lower())
        clean_name = re.sub(r'\s+', '_', clean_name.strip())
        return clean_name or 'unnamed_field'
    
    def _generate_label_from_name(self, field_name: str) -> str:
        """Generate a user-friendly label from field name."""
        # Clean up and format the name
        clean_name = field_name.replace('_', ' ').replace('-', ' ')
        clean_name = re.sub(r'[^\w\s]', '', clean_name)
        return clean_name.title().strip()
    
    def _generate_label_from_pattern(self, pattern_name: str, matched_text: str) -> str:
        """Generate label from pattern name and matched text."""
        # Use predefined labels if available
        label_options = self.label_patterns.get(pattern_name, [pattern_name.title()])
        return label_options[0]  # Use first (English) option by default
    
    def _organize_fields_into_sections(self, fields: List[DetectedField]) -> List[FormSection]:
        """Organize fields into logical sections."""
        # Group fields by category
        sections_map = {}
        
        for field in fields:
            category = field.field_category.value
            if category not in sections_map:
                sections_map[category] = FormSection(
                    section_id=category,
                    title=self._get_section_title(field.field_category),
                    fields=[],
                    order=self._get_section_order(field.field_category)
                )
            sections_map[category].fields.append(field)
        
        # Convert to sorted list
        sections = list(sections_map.values())
        sections.sort(key=lambda s: s.order)
        
        return sections
    
    def _get_section_title(self, category: FieldCategory) -> str:
        """Get user-friendly title for field category."""
        titles = {
            FieldCategory.PERSONAL_INFO: "Personal Information",
            FieldCategory.CONTACT_INFO: "Contact Information",
            FieldCategory.FINANCIAL_INFO: "Financial Information",
            FieldCategory.TECHNICAL_INFO: "Technical Details",
            FieldCategory.LEGAL_INFO: "Legal Information",
            FieldCategory.PROJECT_INFO: "Project Information",
            FieldCategory.SUPPORTING_DOCS: "Supporting Documents",
            FieldCategory.UNKNOWN: "Additional Information"
        }
        return titles.get(category, category.value.title())
    
    def _get_section_order(self, category: FieldCategory) -> int:
        """Get display order for field category."""
        order_map = {
            FieldCategory.PERSONAL_INFO: 1,
            FieldCategory.CONTACT_INFO: 2,
            FieldCategory.PROJECT_INFO: 3,
            FieldCategory.TECHNICAL_INFO: 4,
            FieldCategory.FINANCIAL_INFO: 5,
            FieldCategory.SUPPORTING_DOCS: 6,
            FieldCategory.LEGAL_INFO: 7,
            FieldCategory.UNKNOWN: 8
        }
        return order_map.get(category, 9)
    
    def _merge_related_forms(self, forms: List[DetectedForm]) -> List[DetectedForm]:
        """Merge forms that appear to be related or duplicated."""
        if len(forms) <= 1:
            return forms
        
        # Simple merging logic - can be enhanced
        # For now, just return the forms as-is
        return forms
    
    def _enhance_form_structure(self, form: DetectedForm) -> DetectedForm:
        """Enhance form structure with additional analysis."""
        # Add form type detection
        form.form_type = self._detect_form_type(form)
        
        # Add language detection
        form.languages = self._detect_form_languages(form)
        
        # Add validation summary
        form.validation_summary = self._create_validation_summary(form)
        
        return form
    
    def _detect_form_type(self, form: DetectedForm) -> str:
        """Detect the type of form based on field analysis."""
        field_categories = set()
        for section in form.sections:
            for field in section.fields:
                field_categories.add(field.field_category)
        
        # Determine form type based on field categories
        if FieldCategory.FINANCIAL_INFO in field_categories and FieldCategory.PROJECT_INFO in field_categories:
            return "subsidy_application"
        elif FieldCategory.FINANCIAL_INFO in field_categories:
            return "financial_form"
        elif FieldCategory.PROJECT_INFO in field_categories:
            return "project_proposal"
        elif FieldCategory.SUPPORTING_DOCS in field_categories:
            return "document_submission"
        else:
            return "general_application"
    
    def _detect_form_languages(self, form: DetectedForm) -> List[str]:
        """Detect languages used in the form."""
        # Simple language detection based on common words
        # This could be enhanced with proper language detection
        all_text = form.title + " " + form.description
        for section in form.sections:
            all_text += " " + section.title + " " + section.description
            for field in section.fields:
                all_text += " " + field.label + " " + field.description
        
        text_lower = all_text.lower()
        
        languages = []
        if any(word in text_lower for word in ['name', 'email', 'phone', 'date']):
            languages.append('en')
        if any(word in text_lower for word in ['nom', 'téléphone', 'adresse']):
            languages.append('fr')
        if any(word in text_lower for word in ['nume', 'telefon', 'adresă']):
            languages.append('ro')
        if any(word in text_lower for word in ['nombre', 'teléfono', 'dirección']):
            languages.append('es')
        
        return languages or ['en']  # Default to English
    
    def _create_validation_summary(self, form: DetectedForm) -> Dict[str, Any]:
        """Create validation summary for the form."""
        required_fields = 0
        optional_fields = 0
        fields_with_validation = 0
        
        for section in form.sections:
            for field in section.fields:
                if field.required:
                    required_fields += 1
                else:
                    optional_fields += 1
                
                if field.validation_rules:
                    fields_with_validation += 1
        
        return {
            'total_fields': form.total_fields,
            'required_fields': required_fields,
            'optional_fields': optional_fields,
            'fields_with_validation': fields_with_validation,
            'completion_required': required_fields / form.total_fields if form.total_fields > 0 else 0
        }
    
    def _calculate_complexity_score(self, form: DetectedForm) -> float:
        """Calculate form complexity score (0-1)."""
        complexity_factors = []
        
        # Number of fields factor
        field_count = form.total_fields
        if field_count > 50:
            complexity_factors.append(1.0)
        elif field_count > 20:
            complexity_factors.append(0.8)
        elif field_count > 10:
            complexity_factors.append(0.6)
        else:
            complexity_factors.append(0.4)
        
        # Number of sections factor
        section_count = len(form.sections)
        if section_count > 5:
            complexity_factors.append(0.9)
        elif section_count > 3:
            complexity_factors.append(0.7)
        else:
            complexity_factors.append(0.5)
        
        # Field type diversity
        field_types = set()
        for section in form.sections:
            for field in section.fields:
                field_types.add(field.field_type)
        
        type_diversity = min(len(field_types) / 8, 1.0)  # Normalize to 0-1
        complexity_factors.append(type_diversity)
        
        # Required fields ratio
        required_count = form.validation_summary.get('required_fields', 0)
        required_ratio = required_count / field_count if field_count > 0 else 0
        complexity_factors.append(required_ratio)
        
        return sum(complexity_factors) / len(complexity_factors)
    
    def _estimate_completion_time(self, form: DetectedForm) -> int:
        """Estimate completion time in minutes."""
        total_time = 0
        
        for section in form.sections:
            for field in section.fields:
                field_time = self.completion_rates.get(field.field_type, 2)
                total_time += field_time
        
        # Add overhead for form navigation and review
        overhead = max(form.total_fields * 0.2, 5)  # At least 5 minutes overhead
        
        return int(total_time + overhead)
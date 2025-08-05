"""
Field parsing utilities for extracting form fields from text content.
"""

import re
import logging
from typing import Dict, List, Any


class FieldParser:
    """Utility class for parsing text content to identify form fields."""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
        
        # Enhanced field patterns
        self.field_patterns = [
            r'(.+?):\s*_+',  # Label followed by underlines
            r'(.+?)\s*\[\s*\]',  # Label with checkbox
            r'(.+?)\s*\(\s*\)',  # Label with parentheses
            r'(\d+\.\s*.+?)(?=\d+\.|$)',  # Numbered questions
            r'(.+?)\s*\*\s*$',  # Required fields with asterisk
            r'(.+?)\s*\?\s*$',  # Questions ending with ?
            r'(.+?)\s*:\s*$',  # Simple labels ending with colon
            r'FORM_FIELD:\s*(.+?)\s*\(type:\s*(.+?)\)',  # Extracted form fields
        ]
        
        # Enhanced type inference patterns
        self.type_patterns = {
            'date': [
                r'\b(date|datum|data|deadline|échéance|termin|scadenta)\b',
                r'\b(birth|naiss|nascere|geboren)\b',
                r'\b(expir|valid|until|jusqu|până|bis)\b'
            ],
            'email': [
                r'\b(email|e-mail|courriel|adres.*electric)\b',
                r'\b(contact.*electronic|electronic.*contact)\b'
            ],
            'tel': [
                r'\b(phone|tel|telephone|telefon|număr.*telefon)\b',
                r'\b(mobile|cell|gsm|portable)\b',
                r'\b(fax|télécopie)\b'
            ],
            'number': [
                r'\b(number|numéro|nummer|număr|nr\.?)\b',
                r'\b(amount|montant|sumă|betrag)\b',
                r'\b(quantity|quantité|cantitate|menge)\b',
                r'\b(price|prix|preț|preis)\b',
                r'\b(budget|buget|budget)\b',
                r'\b(surface|suprafață|fläche|m2|hectare)\b'
            ],
            'textarea': [
                r'\b(description|descriere|beschreibung|descript)\b',
                r'\b(details|détails|detalii|einzelheiten)\b',
                r'\b(explanation|explication|explicație|erklärung)\b',
                r'\b(comment|commentaire|comentariu|kommentar)\b',
                r'\b(motivation|motivație|begründung)\b'
            ],
            'select': [
                r'\b(select|sélectionn|selecta|auswähl)\b',
                r'\b(choose|choisir|alege|wähl)\b',
                r'\b(option|choix|opțiune|option)\b',
                r'\b(type|typ|tip)\b',
                r'\b(category|catégorie|categorie|kategorie)\b',
                r'\b(status|statut|stare|status)\b'
            ],
            'checkbox': [
                r'\b(checkbox|case.*cocher|bifează|ankreuzen)\b',
                r'\b(check|cocher|verifică|prüf)\b',
                r'\b(tick|coch|bifare|häkchen)\b',
                r'\b(yes.*no|oui.*non|da.*nu|ja.*nein)\b'
            ],
            'file': [
                r'\b(upload|télécharg|încarcă|hochladen)\b',
                r'\b(attach|joindre|atașează|anhäng)\b',
                r'\b(document|fichier|document|dokument)\b',
                r'\b(file|fișier|datei)\b',
                r'\b(certificate|certificat|certificat|zertifikat)\b'
            ],
            'url': [
                r'\b(website|site.*web|site.*internet)\b',
                r'\b(url|link|lien|legătură)\b',
                r'\b(homepage|page.*accueil|pagină.*principală)\b'
            ]
        }
        
        # Required field indicators
        self.required_indicators = [
            r'\*',  # Asterisk
            r'\brequired\b',
            r'\bobligatoire\b',
            r'\bobligatoriu\b',
            r'\bmandatory\b',
            r'\bpflicht\b',
            r'\bnecessary\b',
            r'\bnécessaire\b',
            r'\bnecesar\b'
        ]
    
    def parse_text_for_fields(self, text: str) -> Dict[str, List]:
        """
        Parse text content to identify form fields.
        
        Args:
            text: Text content to parse.
            
        Returns:
            Dictionary with fields and raw_unclassified lists.
        """
        fields = []
        raw_unclassified = []
        seen_fields = set()  # Prevent duplicates
        
        self.logger.debug(f"Parsing text content ({len(text)} characters)")
        
        # Split text into lines and process each
        lines = text.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            if not line or len(line) < 3:
                continue
            
            # Try each pattern
            field_found = False
            for pattern in self.field_patterns:
                matches = re.finditer(pattern, line, re.IGNORECASE | re.MULTILINE)
                for match in matches:
                    if match.group(1):
                        label = match.group(1).strip()
                        field_type = match.group(2).strip() if len(match.groups()) > 1 else None
                        
                        # Filter out very short or very long labels
                        if len(label) < 3 or len(label) > 200:
                            continue
                        
                        # Skip if we've already seen this field
                        field_key = self.normalize_field_name(label)
                        if field_key in seen_fields:
                            continue
                        
                        # Create field
                        field = self._create_field(label, field_type, line_num)
                        if field:
                            fields.append(field)
                            seen_fields.add(field_key)
                            field_found = True
                            break
                
                if field_found:
                    break
            
            # If no field pattern matched, check if it's unclassified content
            if not field_found and len(line) > 20:
                # Skip obvious non-field content
                if not self._is_likely_field_content(line):
                    raw_unclassified.append(line)
        
        self.logger.debug(f"Extracted {len(fields)} fields and {len(raw_unclassified)} unclassified items")
        
        return {
            "fields": fields,
            "raw_unclassified": raw_unclassified
        }
    
    def _create_field(self, label: str, explicit_type: str = None, line_num: int = None) -> Dict[str, Any]:
        """Create a field dictionary from label and type information."""
        # Clean up label
        clean_label = re.sub(r'[*:\(\)\[\]]+$', '', label).strip()
        
        if len(clean_label) < 2:
            return None
        
        field = {
            "name": self.normalize_field_name(clean_label),
            "label": clean_label,
            "type": explicit_type or self.infer_field_type(clean_label),
            "required": self.is_field_required(label),
            "help": "",
            "source_line": line_num
        }
        
        # Add options if it's a select field and we can detect them
        if field["type"] == "select":
            options = self._extract_options_from_context(label)
            if options:
                field["options"] = options
        
        return field
    
    def normalize_field_name(self, label: str) -> str:
        """
        Normalize field label to create a valid field name.
        
        Args:
            label: Original field label.
            
        Returns:
            Normalized field name.
        """
        # Remove special characters and normalize
        name = re.sub(r'[^\w\s]', '', label)
        name = re.sub(r'\s+', '_', name.strip())
        name = name.lower()
        
        # Ensure it starts with a letter
        if name and not name[0].isalpha():
            name = 'field_' + name
        
        return name or 'unknown_field'
    
    def infer_field_type(self, label: str) -> str:
        """
        Infer field type from label text using enhanced patterns.
        
        Args:
            label: Field label text.
            
        Returns:
            Inferred field type.
        """
        label_lower = label.lower()
        
        # Check each type pattern
        for field_type, patterns in self.type_patterns.items():
            for pattern in patterns:
                if re.search(pattern, label_lower):
                    return field_type
        
        # Default fallback based on length and content
        if len(label_lower) > 100:
            return 'textarea'
        else:
            return 'text'
    
    def is_field_required(self, label: str) -> bool:
        """
        Determine if field is required based on label indicators.
        
        Args:
            label: Field label text.
            
        Returns:
            True if field appears to be required.
        """
        for pattern in self.required_indicators:
            if re.search(pattern, label, re.IGNORECASE):
                return True
        return False
    
    def _is_likely_field_content(self, line: str) -> bool:
        """Check if a line is likely to contain field-related content."""
        # Skip lines that are clearly not fields
        skip_patterns = [
            r'^(page|section|chapter|partie|chapitre)',
            r'^(instructions|note|remarque|observație)',
            r'^(copyright|©)',
            r'^(version|v\d+)',
            r'^\d+$',  # Just numbers
            r'^[A-Z\s]+$'  # All caps (likely headers)
        ]
        
        for pattern in skip_patterns:
            if re.match(pattern, line.strip(), re.IGNORECASE):
                return False
        
        return True
    
    def _extract_options_from_context(self, label: str) -> List[str]:
        """Try to extract select options from the label or surrounding context."""
        # This could be enhanced to look for parenthetical options
        # e.g., "Legal status (SARL, SAS, EURL)"
        options_match = re.search(r'\(([^)]+)\)', label)
        if options_match:
            options_text = options_match.group(1)
            if ',' in options_text:
                return [opt.strip() for opt in options_text.split(',')]
        
        return []
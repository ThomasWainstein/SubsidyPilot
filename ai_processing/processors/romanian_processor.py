#!/usr/bin/env python3
"""
Romanian Subsidy Processor
==========================

Specialized AI processor for Romanian agricultural subsidies with
PNDR-specific intelligence and Romanian language optimization.
"""

import logging
from typing import Dict, List, Any, Optional
import re

from .base_processor import BaseProcessor


class RomanianProcessor(BaseProcessor):
    """
    Romanian-specific AI processor for subsidy data extraction.
    
    Optimized for:
    - Romanian language and diacritics
    - PNDR (National Rural Development Program) structure
    - Romanian administrative divisions (județe)
    - RON to EUR currency conversion
    - Romanian agricultural terminology
    """
    
    def __init__(self, config):
        """Initialize Romanian processor."""
        super().__init__(config)
        self.logger = logging.getLogger(__name__)
        
        # Romanian-specific patterns and mappings
        self.county_mappings = self._initialize_county_mappings()
        self.pndr_measure_codes = self._initialize_pndr_codes()
        self.romanian_terms = self._initialize_romanian_terms()
        
        # Currency conversion (simplified - would use real API)
        self.ron_to_eur_rate = 0.20  # Approximate rate
    
    async def extract_subsidy_data(
        self, 
        content: Dict[str, Any], 
        documents: List[Any], 
        metadata: Dict[str, Any],
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract subsidy data with Romanian-specific intelligence."""
        try:
            self.logger.info("🇷🇴 Processing Romanian subsidy content")
            
            text_content = content.get('text_content', '')
            
            # Extract core information
            extraction = {
                'title': self._extract_romanian_title(text_content),
                'description': self._extract_description(text_content),
                'financial_info': self._extract_financial_info(text_content),
                'eligibility': self._extract_eligibility_criteria(text_content),
                'deadlines': self._extract_deadlines(text_content),
                'geographic_scope': self._extract_geographic_scope(text_content),
                'documents': self._extract_document_requirements(text_content, documents),
                'pndr_info': self._extract_pndr_specific_info(text_content),
                'contact_info': self._extract_contact_information(text_content),
                'country': 'romania',
                'language': 'ro'
            }
            
            # Enhance with document analysis
            if documents:
                extraction = await self._enhance_with_documents(extraction, documents)
            
            return extraction
            
        except Exception as e:
            self.logger.error(f"❌ Romanian extraction failed: {e}")
            return {'error': str(e), 'country': 'romania'}
    
    def _extract_romanian_title(self, text: str) -> Dict[str, str]:
        """Extract Romanian title with proper diacritic handling."""
        # Look for title patterns in Romanian
        title_patterns = [
            r'(?:TITLU|Titlu|DENUMIRE|Denumire)[:\s]*([^\n]+)',
            r'(?:MĂSURA|Măsura|SUBMĂSURA|Submăsura)[:\s]*([^\n]+)',
            r'^([A-ZĂÂÎȘȚ][a-zăâîșț\s\-–]{10,80})$'  # Romanian title pattern
        ]
        
        for pattern in title_patterns:
            match = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
            if match:
                title = match.group(1).strip()
                return {
                    'ro': title,
                    'en': self._translate_to_english(title)  # Would use real translation
                }
        
        return {'ro': 'Titlu nedeterminat', 'en': 'Undetermined title'}
    
    def _extract_financial_info(self, text: str) -> Dict[str, Any]:
        """Extract financial information with RON/EUR handling."""
        financial_info = {}
        
        # Look for Romanian currency patterns
        ron_patterns = [
            r'(\d+(?:\.\d+)?(?:\,\d+)?)\s*(?:lei|RON|ron)',
            r'(?:lei|RON|ron)\s*(\d+(?:\.\d+)?(?:\,\d+)?)',
            r'(\d+(?:\.\d+)?(?:\,\d+)?)\s*milioane\s*(?:lei|RON)',
        ]
        
        eur_patterns = [
            r'(\d+(?:\.\d+)?(?:\,\d+)?)\s*(?:EUR|euro|€)',
            r'(?:EUR|euro|€)\s*(\d+(?:\.\d+)?(?:\,\d+)?)',
        ]
        
        # Extract amounts
        for pattern in ron_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                ron_amount = self._parse_romanian_number(matches[0])
                financial_info['amount_ron'] = ron_amount
                financial_info['amount_eur'] = ron_amount * self.ron_to_eur_rate
                break
        
        for pattern in eur_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                eur_amount = self._parse_romanian_number(matches[0])
                financial_info['amount_eur'] = eur_amount
                break
        
        # Extract co-financing rates
        cofinancing_pattern = r'(?:cofinanțare|cofinantare)[:\s]*(\d+)%'
        match = re.search(cofinancing_pattern, text, re.IGNORECASE)
        if match:
            financial_info['eu_cofinancing_rate'] = int(match.group(1)) / 100
        
        return financial_info
    
    def _extract_geographic_scope(self, text: str) -> List[str]:
        """Extract Romanian counties (județe) and regions."""
        regions = []
        
        # Look for county names
        for county_code, county_names in self.county_mappings.items():
            for name in county_names:
                if name.lower() in text.lower():
                    regions.append(county_code)
                    break
        
        # Look for regional patterns
        region_patterns = [
            r'(?:județul|judetul)\s+([A-ZĂÂÎȘȚ][a-zăâîșț]+)',
            r'(?:regiunea|zona)\s+([A-ZĂÂÎȘȚ][a-zăâîșț\s]+)',
        ]
        
        for pattern in region_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            regions.extend(matches)
        
        return list(set(regions))  # Remove duplicates
    
    def _extract_pndr_specific_info(self, text: str) -> Dict[str, Any]:
        """Extract PNDR-specific information."""
        pndr_info = {}
        
        # Look for PNDR measure codes
        measure_pattern = r'(?:MĂSURA|Măsura|SUBMĂSURA|Submăsura)\s+(\d+(?:\.\d+)?)'
        match = re.search(measure_pattern, text)
        if match:
            measure_code = match.group(1)
            pndr_info['measure_code'] = measure_code
            pndr_info['measure_name'] = self.pndr_measure_codes.get(measure_code, 'Unknown measure')
        
        # Look for PNDR references
        pndr_refs = re.findall(r'PNDR\s+(\d{4}-\d{4}|\d{4}-\d{2})', text)
        if pndr_refs:
            pndr_info['pndr_period'] = pndr_refs[0]
        
        return pndr_info
    
    def _initialize_county_mappings(self) -> Dict[str, List[str]]:
        """Initialize Romanian county mappings."""
        return {
            'AB': ['Alba', 'Alba Iulia'],
            'AR': ['Arad'],
            'AG': ['Argeș', 'Arges', 'Pitești', 'Pitesti'],
            'BC': ['Bacău', 'Bacau'],
            'BH': ['Bihor', 'Oradea'],
            'BN': ['Bistrița-Năsăud', 'Bistrita-Nasaud', 'Bistrița', 'Bistrita'],
            'BT': ['Botoșani', 'Botosani'],
            'BR': ['Brăila', 'Braila'],
            'BV': ['Brașov', 'Brasov'],
            'BZ': ['Buzău', 'Buzau'],
            'CL': ['Călărași', 'Calarasi'],
            'CS': ['Caraș-Severin', 'Caras-Severin'],
            'CJ': ['Cluj', 'Cluj-Napoca'],
            'CT': ['Constanța', 'Constanta'],
            'CV': ['Covasna'],
            'DB': ['Dâmbovița', 'Dambovita', 'Târgoviște', 'Targoviste'],
            'DJ': ['Dolj', 'Craiova'],
            'GL': ['Galați', 'Galati'],
            'GR': ['Giurgiu'],
            'GJ': ['Gorj', 'Târgu Jiu'],
            'HR': ['Harghita', 'Miercurea Ciuc'],
            'HD': ['Hunedoara', 'Deva'],
            'IL': ['Ialomița', 'Ialomita', 'Slobozia'],
            'IS': ['Iași', 'Iasi'],
            'IF': ['Ilfov'],
            'MM': ['Maramureș', 'Maramures', 'Baia Mare'],
            'MH': ['Mehedinți', 'Mehedinti', 'Drobeta-Turnu Severin'],
            'MS': ['Mureș', 'Mures', 'Târgu Mureș', 'Targu Mures'],
            'NT': ['Neamț', 'Neamt', 'Piatra Neamț', 'Piatra Neamt'],
            'OT': ['Olt', 'Slatina'],
            'PH': ['Prahova', 'Ploiești', 'Ploiesti'],
            'SJ': ['Sălaj', 'Salaj', 'Zalău', 'Zalau'],
            'SM': ['Satu Mare'],
            'SB': ['Sibiu'],
            'SV': ['Suceava'],
            'TR': ['Teleorman', 'Alexandria'],
            'TM': ['Timiș', 'Timis', 'Timișoara', 'Timisoara'],
            'TL': ['Tulcea'],
            'VL': ['Vâlcea', 'Valcea', 'Râmnicu Vâlcea'],
            'VS': ['Vaslui'],
            'VN': ['Vrancea', 'Focșani', 'Focsani'],
            'B': ['București', 'Bucuresti', 'Bucharest']
        }
    
    def _initialize_pndr_codes(self) -> Dict[str, str]:
        """Initialize PNDR measure codes and names."""
        return {
            '1': 'Transfer de cunoștințe și acțiuni de informare',
            '2': 'Servicii de consiliere, servicii de gestionare a exploatației agricole și servicii de înlocuire în cadrul exploatației',
            '3': 'Sisteme de calitate pentru produsele agricole și alimentare',
            '4': 'Investiții în active fizice',
            '5': 'Refacerea potențialului de producție agricolă',
            '6': 'Dezvoltarea exploatațiilor și a întreprinderilor',
            '7': 'Servicii de bază și reînnoirea satelor în zonele rurale',
            '8': 'Investiții în dezvoltarea zonelor forestiere și îmbunătățirea viabilității pădurilor',
            '9': 'Înființarea de grupuri de producători',
            '10': 'Plăți pentru agricultura ecologică',
            '11': 'Plăți pentru zonele care se confruntă cu constrângeri naturale sau cu alte constrângeri specifice',
            '12': 'Plăți Natura 2000 și plăți legate de Directiva-cadru Apă',
            '13': 'Plăți pentru zonele care se confruntă cu dezavantaje naturale',
            '14': 'Bunăstarea animalelor',
            '15': 'Servicii de silvi-mediu și climatice și conservarea pădurilor',
            '16': 'Cooperare',
            '19': 'Sprijin pentru dezvoltarea locală LEADER'
        }
    
    def _initialize_romanian_terms(self) -> Dict[str, str]:
        """Initialize Romanian agricultural terminology mappings."""
        return {
            'exploatație agricolă': 'agricultural holding',
            'fermier': 'farmer',
            'producător agricol': 'agricultural producer',
            'cooperativă agricolă': 'agricultural cooperative',
            'grup de producători': 'producer group',
            'întreprindere mică și mijlocie': 'small and medium enterprise',
            'zonă defavorizată': 'less favoured area',
            'agricultură ecologică': 'organic farming',
            'dezvoltare rurală': 'rural development',
            'diversificare': 'diversification',
            'inovare': 'innovation',
            'sustenabilitate': 'sustainability',
            'mediu înconjos': 'environment',
            'schimbări climatice': 'climate change',
            'biodiversitate': 'biodiversity'
        }
    
    def _parse_romanian_number(self, number_str: str) -> float:
        """Parse Romanian number format (comma as decimal separator)."""
        try:
            # Replace comma with dot for decimal parsing
            cleaned = number_str.replace('.', '').replace(',', '.')
            return float(cleaned)
        except ValueError:
            return 0.0
    
    def _translate_to_english(self, romanian_text: str) -> str:
        """Translate Romanian text to English (placeholder)."""
        # In real implementation, would use translation API
        return f"[EN] {romanian_text}"
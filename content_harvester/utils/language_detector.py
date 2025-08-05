#!/usr/bin/env python3
"""
Language Detection Utility
==========================

Provides robust language detection for multi-language content
with support for European languages commonly used in agricultural
subsidy documentation.
"""

import re
from typing import Dict, Optional, List


class LanguageDetector:
    """
    Multi-language detection for European agricultural content.
    
    Optimized for detecting Romanian, French, English, Spanish, Polish,
    and other European languages commonly found in subsidy documentation.
    """
    
    def __init__(self):
        """Initialize language detector with European language patterns."""
        
        # Language patterns based on common words and character usage
        self.language_patterns = {
            'ro': {
                'common_words': [
                    'și', 'de', 'cu', 'în', 'la', 'pentru', 'pe', 'din', 'este', 'sunt',
                    'agricultura', 'subvenție', 'ajutor', 'fond', 'măsura', 'proiect',
                    'beneficiar', 'cerere', 'aplicație', 'document', 'anexa'
                ],
                'char_patterns': r'[ăâîșțĂÂÎȘȚ]',
                'name': 'Romanian'
            },
            'fr': {
                'common_words': [
                    'et', 'de', 'le', 'la', 'les', 'des', 'du', 'une', 'un', 'est',
                    'agriculture', 'subvention', 'aide', 'fonds', 'mesure', 'projet',
                    'bénéficiaire', 'demande', 'dossier', 'document', 'annexe'
                ],
                'char_patterns': r'[àâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]',
                'name': 'French'
            },
            'en': {
                'common_words': [
                    'and', 'the', 'of', 'to', 'in', 'for', 'with', 'on', 'is', 'are',
                    'agriculture', 'subsidy', 'aid', 'fund', 'measure', 'project',
                    'beneficiary', 'application', 'request', 'document', 'annex'
                ],
                'char_patterns': r'[a-zA-Z]',
                'name': 'English'
            },
            'es': {
                'common_words': [
                    'y', 'de', 'el', 'la', 'los', 'las', 'del', 'una', 'un', 'es',
                    'agricultura', 'subvención', 'ayuda', 'fondo', 'medida', 'proyecto',
                    'beneficiario', 'solicitud', 'petición', 'documento', 'anexo'
                ],
                'char_patterns': r'[áéíóúüñÁÉÍÓÚÜÑ]',
                'name': 'Spanish'
            },
            'pl': {
                'common_words': [
                    'i', 'w', 'na', 'z', 'do', 'się', 'że', 'nie', 'jest', 'są',
                    'rolnictwo', 'dotacja', 'pomoc', 'fundusz', 'środek', 'projekt',
                    'beneficjent', 'wniosek', 'aplikacja', 'dokument', 'załącznik'
                ],
                'char_patterns': r'[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]',
                'name': 'Polish'
            }
        }
    
    def detect_language(self, text: str) -> Dict[str, any]:
        """
        Detect the primary language of the given text.
        
        Args:
            text: Text content to analyze
            
        Returns:
            Dictionary containing language code, confidence, and metadata
        """
        if not text or len(text.strip()) < 10:
            return {
                'language': 'unknown',
                'confidence': 0.0,
                'name': 'Unknown',
                'detected_languages': []
            }
        
        # Normalize text for analysis
        normalized_text = self._normalize_text(text)
        
        # Calculate scores for each language
        language_scores = {}
        
        for lang_code, lang_data in self.language_patterns.items():
            score = self._calculate_language_score(normalized_text, lang_data)
            language_scores[lang_code] = score
        
        # Find the best match
        best_language = max(language_scores, key=language_scores.get)
        best_score = language_scores[best_language]
        
        # Sort all languages by score for detailed results
        sorted_languages = sorted(
            language_scores.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        # Build detailed results
        detected_languages = []
        for lang_code, score in sorted_languages:
            if score > 0:
                detected_languages.append({
                    'language': lang_code,
                    'name': self.language_patterns[lang_code]['name'],
                    'confidence': score
                })
        
        return {
            'language': best_language,
            'confidence': best_score,
            'name': self.language_patterns[best_language]['name'],
            'detected_languages': detected_languages,
            'text_length': len(text),
            'analysis_method': 'pattern_matching'
        }
    
    def detect_multiple_languages(self, text: str, threshold: float = 0.1) -> List[Dict[str, any]]:
        """
        Detect multiple languages in text (for multilingual documents).
        
        Args:
            text: Text content to analyze
            threshold: Minimum confidence threshold for language detection
            
        Returns:
            List of detected languages above the threshold
        """
        result = self.detect_language(text)
        
        # Filter languages above threshold
        detected = []
        for lang_info in result.get('detected_languages', []):
            if lang_info['confidence'] >= threshold:
                detected.append(lang_info)
        
        return detected
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text for language analysis."""
        # Convert to lowercase
        normalized = text.lower()
        
        # Remove excessive whitespace
        normalized = re.sub(r'\s+', ' ', normalized)
        
        # Remove numbers and special characters for word matching
        # but keep them for character pattern matching
        return normalized.strip()
    
    def _calculate_language_score(self, text: str, lang_data: Dict) -> float:
        """Calculate language score based on patterns and common words."""
        score = 0.0
        total_weight = 0.0
        
        # Weight 1: Common words frequency
        word_score = self._score_common_words(text, lang_data['common_words'])
        score += word_score * 0.6
        total_weight += 0.6
        
        # Weight 2: Character patterns
        char_score = self._score_character_patterns(text, lang_data['char_patterns'])
        score += char_score * 0.4
        total_weight += 0.4
        
        # Normalize score
        if total_weight > 0:
            return score / total_weight
        return 0.0
    
    def _score_common_words(self, text: str, common_words: List[str]) -> float:
        """Score based on frequency of common words."""
        if not text:
            return 0.0
        
        # Split text into words
        words = re.findall(r'\b\w+\b', text.lower())
        
        if not words:
            return 0.0
        
        # Count matches
        matches = 0
        for word in words:
            if word in common_words:
                matches += 1
        
        # Return ratio of matches to total words
        return min(matches / len(words), 1.0)
    
    def _score_character_patterns(self, text: str, char_pattern: str) -> float:
        """Score based on language-specific character patterns."""
        if not text:
            return 0.0
        
        # Count special characters
        special_chars = len(re.findall(char_pattern, text))
        
        # For English (basic Latin), give a baseline score
        if char_pattern == r'[a-zA-Z]':
            # English gets a moderate baseline score
            return 0.3
        
        # For languages with special characters, score based on frequency
        if special_chars == 0:
            return 0.1  # Minimal score if no special chars found
        
        # Calculate ratio but cap it to avoid overweighting short texts
        char_ratio = special_chars / len(text)
        
        # Scale the ratio to a reasonable score (0-1)
        if char_ratio > 0.05:  # High presence of special chars
            return min(char_ratio * 10, 1.0)
        elif char_ratio > 0.01:  # Moderate presence
            return char_ratio * 5
        else:  # Low presence
            return char_ratio * 2
    
    def get_language_name(self, language_code: str) -> str:
        """Get full language name from language code."""
        if language_code in self.language_patterns:
            return self.language_patterns[language_code]['name']
        return 'Unknown'
    
    def is_supported_language(self, language_code: str) -> bool:
        """Check if a language code is supported."""
        return language_code in self.language_patterns
    
    def get_supported_languages(self) -> List[Dict[str, str]]:
        """Get list of all supported languages."""
        return [
            {
                'code': code,
                'name': data['name']
            }
            for code, data in self.language_patterns.items()
        ]
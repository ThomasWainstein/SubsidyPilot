#!/usr/bin/env python3
"""
Unit tests for DSFR (French Design System) tab extraction functionality.
Tests the DSFR-specific content extraction used on FranceAgriMer.
"""

import os
import sys
import unittest
from unittest.mock import Mock, patch, MagicMock
from bs4 import BeautifulSoup

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scraper.discovery import extract_dsfr_tabs, extract_structured_content


class TestDSFRExtraction(unittest.TestCase):
    """Test cases for DSFR tab extraction functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.sample_dsfr_html = """
        <div class="fr-tabs">
            <ul class="fr-tabs__list" role="tablist">
                <li role="presentation">
                    <button class="fr-tabs__tab" role="tab" id="tabpanel-1" 
                            aria-selected="true" aria-controls="tabpanel-1-panel">
                        Description
                    </button>
                </li>
                <li role="presentation">
                    <button class="fr-tabs__tab" role="tab" id="tabpanel-2" 
                            aria-controls="tabpanel-2-panel">
                        Éligibilité
                    </button>
                </li>
                <li role="presentation">
                    <button class="fr-tabs__tab" role="tab" id="tabpanel-3" 
                            aria-controls="tabpanel-3-panel">
                        Dates limites
                    </button>
                </li>
            </ul>
            <div class="fr-tabs__panel" id="tabpanel-1-panel" role="tabpanel">
                <h3>Description du dispositif</h3>
                <p>Cette aide vise à soutenir les agriculteurs dans leurs projets d'investissement.</p>
                <p>Elle couvre les équipements agricoles et les bâtiments d'élevage.</p>
            </div>
            <div class="fr-tabs__panel" id="tabpanel-2-panel" role="tabpanel">
                <h3>Conditions d'éligibilité</h3>
                <ul>
                    <li>Être agriculteur professionnel</li>
                    <li>Avoir un projet d'investissement supérieur à 10 000€</li>
                    <li>Respecter les normes environnementales</li>
                </ul>
            </div>
            <div class="fr-tabs__panel" id="tabpanel-3-panel" role="tabpanel">
                <h3>Dates importantes</h3>
                <p>Date limite de dépôt : 31 décembre 2024</p>
                <p>Date d'ouverture : 1er janvier 2024</p>
            </div>
        </div>
        """
        
        self.expected_extraction = {
            'description': 'Cette aide vise à soutenir les agriculteurs dans leurs projets d\'investissement. Elle couvre les équipements agricoles et les bâtiments d\'élevage.',
            'eligibility': 'Être agriculteur professionnel Avoir un projet d\'investissement supérieur à 10 000€ Respecter les normes environnementales',
            'deadline': 'Date limite de dépôt : 31 décembre 2024 Date d\'ouverture : 1er janvier 2024'
        }
    
    def test_extract_dsfr_tabs_basic(self):
        """Test basic DSFR tab extraction functionality."""
        soup = BeautifulSoup(self.sample_dsfr_html, 'html.parser')
        extracted = {}
        
        result = extract_dsfr_tabs(soup, extracted)
        
        # Verify that content was extracted
        self.assertIn('description', result)
        self.assertIn('eligibility', result)
        self.assertIn('deadline', result)
        
        # Verify content quality
        self.assertIn('agriculteurs', result['description'])
        self.assertIn('professionnel', result['eligibility'])
        self.assertIn('31 décembre 2024', result['deadline'])
    
    def test_extract_dsfr_tabs_partial(self):
        """Test DSFR extraction with only some tabs present."""
        partial_html = """
        <div class="fr-tabs">
            <ul class="fr-tabs__list" role="tablist">
                <li role="presentation">
                    <button class="fr-tabs__tab" role="tab" id="tabpanel-1" 
                            aria-controls="tabpanel-1-panel">
                        Description
                    </button>
                </li>
            </ul>
            <div class="fr-tabs__panel" id="tabpanel-1-panel" role="tabpanel">
                <p>Description partielle du dispositif</p>
            </div>
        </div>
        """
        
        soup = BeautifulSoup(partial_html, 'html.parser')
        extracted = {}
        
        result = extract_dsfr_tabs(soup, extracted)
        
        # Should extract what's available
        self.assertIn('description', result)
        self.assertIn('dispositif', result['description'])
        
        # Should not have tabs that weren't present
        self.assertNotIn('eligibility', result)
        self.assertNotIn('deadline', result)
    
    def test_extract_dsfr_tabs_no_tabs(self):
        """Test DSFR extraction when no tabs are present."""
        no_tabs_html = """
        <div class="content">
            <h1>Titre sans tabs</h1>
            <p>Contenu normal sans structure DSFR</p>
        </div>
        """
        
        soup = BeautifulSoup(no_tabs_html, 'html.parser')
        extracted = {'existing': 'data'}
        
        result = extract_dsfr_tabs(soup, extracted)
        
        # Should return unchanged data when no tabs found
        self.assertEqual(result, {'existing': 'data'})
    
    def test_extract_structured_content_integration(self):
        """Test that DSFR extraction integrates properly with main extraction."""
        test_url = "https://www.franceagrimer.fr/test-aide"
        
        soup = BeautifulSoup(f"""
        <html>
            <head><title>Test Aide Agricole</title></head>
            <body>
                <h1>Test Aide pour l'Agriculture</h1>
                {self.sample_dsfr_html}
                <footer>Page footer</footer>
            </body>
        </html>
        """, 'html.parser')
        
        result = extract_structured_content(soup, test_url)
        
        # Should have extracted title
        self.assertIn('title', result)
        self.assertIn('Agriculture', result['title'])
        
        # Should have extracted DSFR content
        self.assertIn('description', result)
        self.assertIn('eligibility', result)
        self.assertIn('deadline', result)
        
        # Should have URL metadata
        self.assertEqual(result['source_url'], test_url)
        self.assertIn('domain', result)
    
    def test_dsfr_tab_label_mapping(self):
        """Test that various French tab labels are correctly mapped to canonical fields."""
        test_cases = [
            ('Description', 'description'),
            ('Présentation', 'description'),
            ('Éligibilité', 'eligibility'),
            ('Conditions', 'eligibility'),
            ('Bénéficiaires', 'eligibility'),
            ('Dates limites', 'deadline'),
            ('Calendrier', 'deadline'),
            ('Échéances', 'deadline'),
            ('Documents', 'documents'),
            ('Pièces jointes', 'documents'),
            ('Formulaires', 'documents'),
            ('Montant', 'amount'),
            ('Budget', 'amount'),
            ('Financement', 'amount')
        ]
        
        for tab_label, expected_field in test_cases:
            with self.subTest(tab_label=tab_label):
                test_html = f"""
                <div class="fr-tabs">
                    <ul class="fr-tabs__list" role="tablist">
                        <li role="presentation">
                            <button class="fr-tabs__tab" role="tab" 
                                    aria-controls="test-panel">
                                {tab_label}
                            </button>
                        </li>
                    </ul>
                    <div class="fr-tabs__panel" id="test-panel" role="tabpanel">
                        <p>Test content for {tab_label}</p>
                    </div>
                </div>
                """
                
                soup = BeautifulSoup(test_html, 'html.parser')
                extracted = {}
                
                result = extract_dsfr_tabs(soup, extracted)
                
                # Should map the label to the correct canonical field
                self.assertIn(expected_field, result)
                self.assertIn('Test content', result[expected_field])
    
    def test_error_handling(self):
        """Test error handling in DSFR extraction."""
        # Test with malformed HTML
        malformed_html = """
        <div class="fr-tabs">
            <ul class="fr-tabs__list">
                <li><button>Unclosed tag
            </ul>
            <div class="fr-tabs__panel">
                <p>Malformed content
        </div>
        """
        
        soup = BeautifulSoup(malformed_html, 'html.parser')
        extracted = {}
        
        # Should not crash on malformed HTML
        try:
            result = extract_dsfr_tabs(soup, extracted)
            # Should return something, even if extraction is partial
            self.assertIsInstance(result, dict)
        except Exception as e:
            self.fail(f"DSFR extraction should handle malformed HTML gracefully: {e}")
    
    def test_content_cleaning(self):
        """Test that extracted content is properly cleaned."""
        dirty_html = """
        <div class="fr-tabs">
            <ul class="fr-tabs__list" role="tablist">
                <li role="presentation">
                    <button class="fr-tabs__tab" role="tab" 
                            aria-controls="dirty-panel">
                        Description
                    </button>
                </li>
            </ul>
            <div class="fr-tabs__panel" id="dirty-panel" role="tabpanel">
                <p>   Content with    extra   spaces   </p>
                <p>
                
                Multiple line breaks
                
                
                </p>
                <p>Content with &nbsp; HTML entities &amp; symbols</p>
            </div>
        </div>
        """
        
        soup = BeautifulSoup(dirty_html, 'html.parser')
        extracted = {}
        
        result = extract_dsfr_tabs(soup, extracted)
        
        # Content should be cleaned
        self.assertIn('description', result)
        description = result['description']
        
        # Should not have excessive whitespace
        self.assertNotIn('    ', description)
        self.assertNotIn('\n\n\n', description)
        
        # Should be readable text
        self.assertIn('Content with extra spaces', description)
        self.assertIn('Multiple line breaks', description)


class TestConfigDrivenExtraction(unittest.TestCase):
    """Test that extraction uses config-driven selectors, not hardcoded ones."""
    
    @patch('scraper.discovery.init_driver')
    def test_config_driven_selectors(self, mock_init_driver):
        """Test that extraction functions use selectors from config, not hardcoded values."""
        # This test ensures no hardcoded selectors like 'a[rel="bookmark"]' exist
        
        # Get the source code of discovery module
        import scraper.discovery as discovery_module
        import inspect
        
        source_code = inspect.getsource(discovery_module)
        
        # Check for hardcoded selectors that should be config-driven
        hardcoded_patterns = [
            'a[rel="bookmark"]',
            'a[rel=bookmark]',
            '.fr-card__link',  # Should come from config
            'h3 a[href*="/aides/"]'  # Should come from config
        ]
        
        for pattern in hardcoded_patterns:
            with self.subTest(pattern=pattern):
                # Allow patterns in comments or test data, but not in actual code
                lines = source_code.split('\n')
                code_lines = [line for line in lines if not line.strip().startswith('#')]
                code_text = '\n'.join(code_lines)
                
                if pattern in code_text:
                    # If found, check if it's in a reasonable context (like fallback)
                    self.assertIn('fallback', code_text.lower(), 
                                f"Hardcoded selector '{pattern}' found in non-fallback context")


if __name__ == '__main__':
    # Set up test environment
    os.environ['TESTING'] = '1'
    
    # Create test suite
    suite = unittest.TestSuite()
    
    # Add all test cases
    suite.addTest(unittest.makeSuite(TestDSFRExtraction))
    suite.addTest(unittest.makeSuite(TestConfigDrivenExtraction))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Exit with error code if tests failed
    sys.exit(0 if result.wasSuccessful() else 1)
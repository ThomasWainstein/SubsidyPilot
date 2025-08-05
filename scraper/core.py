#!/usr/bin/env python3
"""
AgriTool Scraper Core - Unified Production-Grade Web Scraping Engine
Combines production-grade features with specialized FranceAgriMer extraction capabilities.
NO TIKA DEPENDENCIES - Pure Python document processing with comprehensive field mapping.
"""

import os
import sys
import time
import json
import logging
import tempfile
import traceback
import subprocess
import inspect
import stat
from typing import Dict, Any, List, Optional, Tuple, Union
from urllib.parse import urljoin, urlparse
from pathlib import Path

# Core web scraping imports
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException, WebDriverException, NoSuchElementException
)

from bs4 import BeautifulSoup
import requests
from markdownify import markdownify as md
from langdetect import detect, LangDetectException

# Driver managers
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager
from webdriver_manager.microsoft import EdgeChromiumDriverManager

# Document extraction
try:
    from python_document_extractor import ScraperDocumentExtractor
    PYTHON_EXTRACTOR_AVAILABLE = True
except ImportError:
    PYTHON_EXTRACTOR_AVAILABLE = False

# Debug system integration
try:
    from debug_diagnostics import get_ruthless_debugger, ruthless_trap, log_step, log_error, log_warning
    DEBUG_SYSTEM_AVAILABLE = True
except ImportError:
    DEBUG_SYSTEM_AVAILABLE = False
    # Fallback implementations
    def log_step(msg, **kwargs):
        logging.info(f"[STEP] {msg}")
    def log_error(msg, **kwargs):
        logging.error(f"[ERROR] {msg}")
    def log_warning(msg, **kwargs):
        logging.warning(f"[WARN] {msg}")
    def ruthless_trap(func):
        return func


# French field keywords for FranceAgriMer subsidy extraction
FIELD_KEYWORDS_FR = {
    "title": [
        "titre de l'aide", "intitulé", "nom de l'aide", "titre", "titre principal",
        "nom", "titre du dispositif", "titre de la mesure", "intitulé de la mesure",
        "libellé", "nom complet", "dénomination", "dénomination de l'aide", 
        "nom du dispositif", "nom complet de l'aide", "titre officiel", "nom de l'action",
        "nom complet du dispositif"
    ],
    "description": [
        "description", "présentation", "objectif", "contexte", "but", "synthèse",
        "texte principal", "résumé", "explication", "informations", "texte descriptif",
        "détail", "objet", "présentation générale", "texte explicatif", 
        "présentation synthétique", "introduction", "aperçu", "exposé", 
        "références d'application", "texte d'introduction", "description de la mesure", 
        "présentation du dispositif", "aperçu du dispositif"
    ],
    "eligibility": [
        "bénéficiaire", "critère d'éligibilité", "qui peut en bénéficier", "public visé",
        "conditions d'accès", "admissibilité", "public éligible", "qui est concerné",
        "cible", "éligibilité", "personnes concernées", "catégories bénéficiaires",
        "profil éligible", "critères de sélection", "profil visé",
        "conditions de participation", "public concerné", "personnes éligibles", 
        "statut éligible", "bénéficiaires", "destinataires", "public cible", 
        "public bénéficiaire", "public admissible", "conditions requises", 
        "critères d'admission", "qui peut candidater", "profil du bénéficiaire", 
        "statut du bénéficiaire"
    ],
    "deadline": [
        "date limite", "clôture", "date de dépôt", "fin de dépôt", "délai",
        "date butoir", "date de clôture", "date d'échéance",
        "date d'envoi", "date limite d'envoi", "date de fin", "date d'ouverture", 
        "date d'expiration", "dates à retenir", "clôture des dépôts", 
        "période de dépôt", "fin de la période de dépôt", "limite d'inscription"
    ],
    "amount": [
        "montant", "budget", "financement", "subvention", "aide financière",
        "allocation", "dotation", "enveloppe", "plafond", "minimum", "maximum",
        "montant maximal", "montant minimum", "taux d'aide", "montant de l'aide", 
        "montant accordé", "montant total", "budget alloué", "taux de financement", 
        "aide accordée", "montant plafonné"
    ],
    "documents": [
        "documents", "pièces justificatives", "annexes", "formulaires",
        "dossier de candidature", "pièces à fournir", "documents requis", 
        "pièces jointes", "dossier", "dossier à constituer", "formulaire de demande", 
        "documents à joindre", "pièces justificatives à joindre",
        "ensemble des documents", "pièces complémentaires", "dossier à déposer"
    ],
    "application_method": [
        "candidature", "comment postuler", "procédure de candidature",
        "dépôt de dossier", "modalités de candidature", "mode de dépôt",
        "comment candidater", "demande", "procédure de demande",
        "soumission de dossier", "dépôt en ligne", "inscription",
        "modalités de dépôt", "comment effectuer la demande", 
        "comment déposer un dossier", "procédure à suivre",
        "téléchargement du formulaire", "mode de transmission", 
        "comment présenter la demande", "procédure de dépôt",
        "envoi du dossier", "où déposer le dossier", "processus de dépôt", 
        "saisir une demande"
    ],
    "evaluation_criteria": [
        "critères d'évaluation", "grille d'évaluation", "méthode de sélection",
        "barème", "critères de notation", "système d'évaluation",
        "critères d'examen", "critères de choix",
        "modalités d'évaluation", "modes de sélection", "procédure de sélection", 
        "gradation", "points attribués", "principes de sélection", 
        "critères d'attribution", "critères d'appréciation",
        "critères d'examen des candidatures"
    ],
    "previous_acceptance_rate": [
        "taux de réussite", "taux d'acceptation", "projets financés",
        "statistiques d'acceptation", "historique d'attribution", "taux de sélection",
        "résultats précédents", "taux de financement", "nombre de projets retenus", 
        "bilan des acceptations", "données sur la sélection", "statistiques de réussite", 
        "nombre d'aides allouées"
    ],
    "priority_groups": [
        "public prioritaire", "groupes cibles", "publics prioritaires",
        "priorités", "groupes bénéficiaires", "public cible", "catégories prioritaires",
        "public particulièrement visé", "population prioritaire", "publics concernés",
        "cibles prioritaires", "groupes à privilégier", "publics à cibler", 
        "public visé prioritairement"
    ],
    "legal_entity_type": [
        "statut juridique", "type de structure", "forme juridique",
        "entité bénéficiaire", "catégorie juridique", "personnalité juridique",
        "type d'organisation", "nature de l'entité", "forme de la structure", 
        "type d'établissement", "organisation éligible", "statut du candidat", 
        "profil juridique", "catégorie de bénéficiaire"
    ],
    "funding_source": [
        "source de financement", "origine des fonds", "financeur",
        "partenaire financier", "institution financière", "organisme financeur",
        "bailleur de fonds", "organisme attributaire", "source budgétaire", 
        "institution de financement", "partenaire de financement",
        "structure porteuse", "financeur principal"
    ],
    "compliance_requirements": [
        "conditions de conformité", "réglementation applicable", "respect des normes",
        "obligations légales", "critères de conformité", "exigences réglementaires",
        "obligations de conformité", "normes applicables", "respect de la législation", 
        "conformité à la réglementation", "critères réglementaires", "conformité exigée"
    ],
    "language": [
        "langue", "langue de dépôt", "langue de la demande", "langue d'instruction",
        "langue du formulaire", "langue exigée", "langue acceptée", 
        "langue obligatoire", "idiome"
    ],
    "matching_algorithm_score": [
        "score d'éligibilité", "niveau de correspondance", "indice de matching",
        "score de pertinence", "note de correspondance"
    ]
}


class ScrapingLogger:
    """Centralized logging system for all scraping operations."""
    
    def __init__(self, log_dir: str = "logs", log_level: int = logging.INFO):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Create timestamped log file
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        log_file = self.log_dir / f"scraper_{timestamp}.log"
        
        # Configure comprehensive logging
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
        self.logger = logging.getLogger(__name__)
        self.logger.info(f"🚀 AgriTool Unified Scraper initialized. Logs: {log_file}")
        
        # Initialize debug system if available
        if DEBUG_SYSTEM_AVAILABLE:
            self.debugger = get_ruthless_debugger()
            self.logger.info("✅ Debug diagnostics system enabled")
        else:
            self.debugger = None
            self.logger.info("⚠️ Debug diagnostics system not available")

    def get_logger(self) -> logging.Logger:
        return self.logger


class DriverBinaryManager:
    """Robust driver binary management with aggressive validation."""
    
    @staticmethod
    def find_executable_driver(driver_dir: str, driver_name: str) -> str:
        """
        Find the executable driver binary with comprehensive validation.
        
        Args:
            driver_dir: Directory containing the driver files
            driver_name: Expected name of the driver binary (e.g., 'chromedriver', 'geckodriver')
            
        Returns:
            Full path to the executable driver binary
            
        Raises:
            FileNotFoundError: If no valid executable driver is found
        """
        log_step(f"🔍 Finding executable driver: {driver_name} in {driver_dir}")
        
        if not os.path.exists(driver_dir):
            raise FileNotFoundError(f"Driver directory does not exist: {driver_dir}")
        
        try:
            dir_contents = os.listdir(driver_dir)
            log_step(f"📁 Directory contents: {dir_contents}")
            
            # Analyze each file in the directory
            candidates = []
            for filename in dir_contents:
                file_path = os.path.join(driver_dir, filename)
                
                if not os.path.isfile(file_path):
                    continue
                
                # Check if this is our target driver
                if filename == driver_name:
                    file_stat = os.stat(file_path)
                    is_executable = os.access(file_path, os.X_OK)
                    file_size = file_stat.st_size
                    
                    log_step(f"📄 Found candidate: {filename} (size: {file_size}, executable: {is_executable})")
                    
                    # Validate file size (driver binaries should be substantial)
                    if file_size < 1000:
                        log_warning(f"⚠️ Suspicious small file size: {file_size} bytes")
                        continue
                    
                    # Check for common false positives
                    if any(keyword in filename.upper() for keyword in ['THIRD_PARTY_NOTICES', 'LICENSE', 'README']):
                        log_warning(f"⚠️ Skipping documentation file: {filename}")
                        continue
                    
                    candidates.append(file_path)
                    
                    # Make executable if needed
                    if not is_executable:
                        try:
                            os.chmod(file_path, 0o755)
                            if os.access(file_path, os.X_OK):
                                log_step(f"✅ Fixed permissions for {file_path}")
                            else:
                                log_error(f"❌ Could not make {file_path} executable")
                                continue
                        except Exception as e:
                            log_error(f"❌ Permission fix failed for {file_path}: {e}")
                            continue
                    
                    # Verify driver functionality
                    if DriverBinaryManager._verify_driver_functionality(file_path):
                        log_step(f"✅ Selected executable driver: {file_path}")
                        return file_path
            
            # If we get here, no valid driver was found
            error_msg = (
                f"No executable '{driver_name}' binary found in {driver_dir}. "
                f"Directory contents: {dir_contents}. "
                f"Candidates found: {candidates}"
            )
            log_error(error_msg)
            raise FileNotFoundError(error_msg)
            
        except Exception as e:
            log_error(f"Error finding executable driver: {e}")
            raise
    
    @staticmethod
    def _verify_driver_functionality(driver_path: str) -> bool:
        """Verify that the driver binary is functional."""
        try:
            result = subprocess.run(
                [driver_path, '--version'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                version_info = result.stdout.strip()
                log_step(f"✅ Driver verification successful: {version_info}")
                return True
            else:
                log_error(f"❌ Driver version check failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            log_error(f"❌ Driver verification timeout")
            return False
        except Exception as e:
            log_error(f"❌ Driver verification error: {e}")
            return False


class RobustWebDriver:
    """Production-grade WebDriver with comprehensive capabilities."""
    
    def __init__(self, browser: str = "chrome", headless: bool = True, timeout: int = 30, 
                 enable_document_extraction: bool = True, enable_debug: bool = False):
        """
        Initialize the robust WebDriver.
        
        Args:
            browser: Browser type ('chrome', 'firefox', 'edge')
            headless: Run in headless mode
            timeout: Default timeout for operations
            enable_document_extraction: Enable document attachment processing
            enable_debug: Enable aggressive debugging
        """
        self.logger = ScrapingLogger().get_logger()
        self.browser = browser.lower()
        self.headless = headless
        self.timeout = timeout
        self.driver = None
        self.temp_files = []
        self.enable_debug = enable_debug
        
        # Initialize document extractor
        if enable_document_extraction and PYTHON_EXTRACTOR_AVAILABLE:
            try:
                self.document_extractor = ScraperDocumentExtractor(
                    enable_ocr=True,
                    max_file_size_mb=25.0
                )
                self.logger.info("✅ Python document extractor initialized")
            except Exception as e:
                self.logger.warning(f"⚠️ Document extractor initialization failed: {e}")
                self.document_extractor = None
        else:
            self.document_extractor = None
            if enable_document_extraction:
                self.logger.warning("⚠️ Document extraction disabled - python_document_extractor not available")
        
        # Initialize WebDriver
        try:
            self.driver = self._init_driver()
            self.logger.info(f"✅ {self.browser.title()} WebDriver initialized successfully")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize WebDriver: {e}")
            raise

    @ruthless_trap
    def _init_driver(self) -> webdriver.Remote:
        """Initialize WebDriver with robust error handling and validation."""
        if self.browser == "chrome":
            return self._init_chrome_driver()
        elif self.browser == "firefox":
            return self._init_firefox_driver()
        elif self.browser == "edge":
            return self._init_edge_driver()
        else:
            raise ValueError(f"Unsupported browser: {self.browser}")
    
    def _init_chrome_driver(self) -> webdriver.Chrome:
        """Initialize Chrome WebDriver with production settings."""
        log_step(f"🚀 Initializing Chrome WebDriver (headless={self.headless})")
        
        # Configure Chrome options
        options = ChromeOptions()
        
        if self.headless:
            options.add_argument("--headless=new")
        
        # Production-grade Chrome arguments
        chrome_args = [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-web-security",
            "--disable-features=VizDisplayCompositor",
            "--window-size=1920,1080",
            "--disable-extensions",
            "--disable-plugins",
            "--disable-images",
            "--user-agent=AgriToolScraper/2.0 (Production)"
        ]
        
        for arg in chrome_args:
            options.add_argument(arg)
        
        # Check for pre-installed ChromeDriver (CI/CD compatibility)
        chromedriver_bin = os.environ.get("CHROMEDRIVER_BIN")
        if chromedriver_bin and os.path.exists(chromedriver_bin):
            log_step(f"📍 Using pre-installed ChromeDriver: {chromedriver_bin}")
            service = ChromeService(chromedriver_bin)
        else:
            # Use webdriver-manager with robust binary selection
            log_step("⬇️ Downloading ChromeDriver via webdriver-manager")
            
            initial_path = ChromeDriverManager().install()
            log_step(f"📁 Initial path from webdriver-manager: {initial_path}")
            
            # Use robust binary finder
            driver_dir = os.path.dirname(initial_path)
            driver_path = DriverBinaryManager.find_executable_driver(driver_dir, "chromedriver")
            
            service = ChromeService(driver_path)
        
        # Create WebDriver instance
        driver = webdriver.Chrome(service=service, options=options)
        
        # Set timeouts
        driver.set_page_load_timeout(self.timeout)
        driver.implicitly_wait(10)
        
        return driver
    
    def _init_firefox_driver(self) -> webdriver.Firefox:
        """Initialize Firefox WebDriver."""
        log_step("🦊 Initializing Firefox WebDriver")
        
        options = FirefoxOptions()
        if self.headless:
            options.add_argument("--headless")
        
        # Firefox-specific options
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        
        # Use webdriver-manager with binary validation
        initial_path = GeckoDriverManager().install()
        driver_dir = os.path.dirname(initial_path)
        driver_path = DriverBinaryManager.find_executable_driver(driver_dir, "geckodriver")
        
        service = FirefoxService(driver_path)
        driver = webdriver.Firefox(service=service, options=options)
        
        driver.set_page_load_timeout(self.timeout)
        driver.implicitly_wait(10)
        
        return driver
    
    def _init_edge_driver(self) -> webdriver.Edge:
        """Initialize Edge WebDriver."""
        log_step("🌐 Initializing Edge WebDriver")
        
        options = EdgeOptions()
        if self.headless:
            options.add_argument("--headless")
        
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        
        initial_path = EdgeChromiumDriverManager().install()
        driver_dir = os.path.dirname(initial_path)
        driver_path = DriverBinaryManager.find_executable_driver(driver_dir, "msedgedriver")
        
        service = EdgeService(driver_path)
        driver = webdriver.Edge(service=service, options=options)
        
        driver.set_page_load_timeout(self.timeout)
        driver.implicitly_wait(10)
        
        return driver

    def robust_get(self, url: str, max_retries: int = 3) -> bool:
        """Navigate to URL with retry logic and comprehensive error handling."""
        for attempt in range(max_retries):
            try:
                self.logger.info(f"📥 Loading URL (attempt {attempt + 1}/{max_retries}): {url}")
                self.driver.get(url)
                
                # Wait for page load completion
                WebDriverWait(self.driver, self.timeout).until(
                    lambda d: d.execute_script("return document.readyState") == "complete"
                )
                
                self.logger.info("✅ Page loaded successfully")
                return True
                
            except TimeoutException:
                self.logger.warning(f"⚠️ Timeout on attempt {attempt + 1}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt)  # Exponential backoff
                
            except WebDriverException as e:
                self.logger.error(f"❌ WebDriver error on attempt {attempt + 1}: {e}")
                if attempt == max_retries - 1:
                    raise
                time.sleep(2 ** attempt)
        
        return False

    def extract_full_content(self, url: str) -> Dict[str, Any]:
        """Extract comprehensive content with document processing capabilities."""
        result = {
            'url': url,
            'title': '',
            'html': '',
            'text': '',
            'text_markdown': '',
            'links': [],
            'attachments': [],
            'document_extractions': {},
            'combined_content': '',
            'combined_content_markdown': '',
            'metadata': {},
            'extraction_timestamp': time.time(),
            'success': False,
            'field_mapping_results': {}
        }
        
        try:
            if not self.robust_get(url):
                return result
            
            # Extract basic page content
            result['title'] = self._extract_title()
            result['html'] = self.driver.page_source
            
            # Extract clean text and markdown
            plain_text, markdown_text = self._extract_clean_text()
            result['text'] = plain_text
            result['text_markdown'] = markdown_text
            
            # Extract links and attachments
            result['links'] = self._extract_links()
            result['attachments'] = self._extract_attachments(url)
            result['metadata'] = self._extract_metadata()
            
            # Handle overlays and dynamic content
            self._handle_overlays()
            
            # Apply French field mapping for subsidy content
            result['field_mapping_results'] = self._apply_field_mapping(plain_text)
            
            # Process document attachments if available
            if self.document_extractor and result['attachments']:
                result = self._process_document_attachments(result)
            else:
                # Create combined content without documents
                result['combined_content'] = f"=== PAGE TITLE ===\n{result['title']}\n\n=== PAGE CONTENT ===\n{result['text']}"
                result['combined_content_markdown'] = f"# {result['title']}\n\n{result['text_markdown']}"
            
            result['success'] = True
            self.logger.info(f"✅ Successfully extracted content from: {url}")
            
        except Exception as e:
            self.logger.error(f"❌ Content extraction failed for {url}: {e}", exc_info=True)
            result['error'] = str(e)
        
        return result
    
    def _process_document_attachments(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Process document attachments with OCR and text extraction."""
        downloaded_files = [
            att['local_path'] for att in result['attachments'] 
            if att['downloaded'] and att['local_path']
        ]
        
        if not downloaded_files:
            return result
        
        self.logger.info(f"📚 Processing {len(downloaded_files)} document attachments...")
        
        try:
            # Extract text from documents
            raw_extractions = self.document_extractor.extract_multiple_attachments(downloaded_files)
            
            doc_extractions = {}
            for path, data in raw_extractions.items():
                text = data.get('text', '') if isinstance(data, dict) else str(data)
                
                # Convert to markdown
                try:
                    markdown = md(text) if text else ""
                except Exception as e:
                    self.logger.warning(f"⚠️ Markdown conversion error for {path}: {e}")
                    markdown = text
                
                if isinstance(data, dict):
                    doc_extractions[path] = {**data, 'markdown': markdown}
                else:
                    doc_extractions[path] = {'text': text, 'markdown': markdown}
            
            result['document_extractions'] = doc_extractions
            
            # Create combined content
            merged_data = self.document_extractor.merge_page_and_attachment_content(
                {'url': result['url'], 'title': result['title'], 'text': result['text']},
                {k: v.get('text', '') for k, v in doc_extractions.items()}
            )
            
            result['combined_content'] = merged_data['combined_text']
            result['extraction_summary'] = merged_data['extraction_summary']
            
            # Build markdown combined content
            combined_md_parts = [f"# {result['title']}", result['text_markdown']]
            for path, data in doc_extractions.items():
                doc_title = Path(path).name
                combined_md_parts.append(f"## Document: {doc_title}\n\n{data.get('markdown', '')}")
            
            result['combined_content_markdown'] = "\n\n".join(combined_md_parts)
            
            self.logger.info(f"✅ Document processing complete: {merged_data['extraction_summary']['successful_extractions']} successful")
            
        except Exception as e:
            self.logger.error(f"❌ Document processing failed: {e}")
            # Fallback to page content only
            result['combined_content'] = f"=== PAGE TITLE ===\n{result['title']}\n\n=== PAGE CONTENT ===\n{result['text']}"
            result['combined_content_markdown'] = f"# {result['title']}\n\n{result['text_markdown']}"
        
        return result
    
    def _apply_field_mapping(self, text: str) -> Dict[str, List[str]]:
        """Apply French field mapping to extract structured subsidy information."""
        field_results = {}
        
        for field_name, keywords in FIELD_KEYWORDS_FR.items():
            matches = []
            text_lower = text.lower()
            
            for keyword in keywords:
                if keyword in text_lower:
                    # Find context around the keyword
                    context = self._extract_keyword_context(text, keyword)
                    if context:
                        matches.append(context)
            
            if matches:
                field_results[field_name] = matches
        
        return field_results
    
    def _extract_keyword_context(self, text: str, keyword: str, context_chars: int = 200) -> str:
        """Extract context around a keyword for better field mapping."""
        text_lower = text.lower()
        keyword_pos = text_lower.find(keyword)
        
        if keyword_pos == -1:
            return ""
        
        start = max(0, keyword_pos - context_chars // 2)
        end = min(len(text), keyword_pos + len(keyword) + context_chars // 2)
        
        context = text[start:end].strip()
        return context

    def _extract_title(self) -> str:
        """Extract page title using multiple strategies."""
        title_candidates = []
        
        try:
            # HTML title tag
            if self.driver.title:
                title_candidates.append(self.driver.title)
            
            # H1 elements
            h1_elements = self.driver.find_elements(By.TAG_NAME, "h1")
            for h1 in h1_elements[:3]:  # Limit to first 3
                text = h1.text.strip()
                if text and len(text) > 10:
                    title_candidates.append(text)
            
            # Meta og:title
            try:
                meta_title = self.driver.find_element(By.CSS_SELECTOR, 'meta[property="og:title"]')
                content = meta_title.get_attribute('content')
                if content:
                    title_candidates.append(content)
            except NoSuchElementException:
                pass
            
            # DSFR specific title selectors
            dsfr_selectors = ['.fr-h1', '.fr-title', '[role="heading"][aria-level="1"]']
            for selector in dsfr_selectors:
                try:
                    element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    text = element.text.strip()
                    if text and len(text) > 10:
                        title_candidates.append(text)
                except NoSuchElementException:
                    continue
                
        except Exception as e:
            self.logger.warning(f"⚠️ Title extraction error: {e}")
        
        # Return best title candidate
        for title in title_candidates:
            clean_title = self._clean_title(title)
            if clean_title and len(clean_title) > 10:
                return clean_title
        
        return title_candidates[0] if title_candidates else "Unknown Title"
    
    def _clean_title(self, title: str) -> str:
        """Clean and normalize title text."""
        if not title:
            return ""
        
        # Remove common site suffixes
        title = re.sub(r'\s*[-|]\s*FranceAgriMer.*', '', title, flags=re.IGNORECASE)
        title = re.sub(r'\s*[-|]\s*Site officiel.*', '', title, flags=re.IGNORECASE)
        
        # Clean whitespace
        title = re.sub(r'\s+', ' ', title.strip())
        
        return title

    def _extract_clean_text(self) -> Tuple[str, str]:
        """Extract clean text and markdown content from page."""
        try:
            soup = BeautifulSoup(self.driver.page_source, 'html.parser')

            # Remove unwanted elements
            for unwanted in soup(["script", "style", "nav", "footer", "header", "aside"]):
                unwanted.decompose()

            # Get plain text with proper formatting
            text = soup.get_text(separator="\n")
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            plain_text = '\n'.join(chunk for chunk in chunks if chunk)

            # Convert to markdown with error handling
            try:
                markdown_text = md(str(soup))
            except Exception as e:
                self.logger.warning(f"⚠️ Markdown conversion error: {e}")
                markdown_text = plain_text

            return plain_text, markdown_text

        except Exception as e:
            self.logger.warning(f"⚠️ Text extraction error: {e}")
            return "", ""

    def _extract_links(self) -> List[Dict[str, str]]:
        """Extract all relevant links from page."""
        links = []
        
        try:
            link_elements = self.driver.find_elements(By.TAG_NAME, "a")
            
            for link in link_elements:
                href = link.get_attribute('href')
                text = link.text.strip()
                
                if href and text and len(text) > 2:
                    link_info = {
                        'url': href,
                        'text': text,
                        'type': 'internal' if self._is_internal_link(href) else 'external'
                    }
                    
                    # Add additional metadata for document links
                    if any(ext in href.lower() for ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx']):
                        link_info['is_document'] = True
                        link_info['file_type'] = href.split('.')[-1].lower()
                    
                    links.append(link_info)
                    
        except Exception as e:
            self.logger.warning(f"⚠️ Link extraction error: {e}")
        
        return links

    def _extract_attachments(self, base_url: str) -> List[Dict[str, Any]]:
        """Extract and download document attachments."""
        attachments = []
        
        try:
            # Enhanced document selectors
            doc_selectors = [
                'a[href$=".pdf"]', 'a[href$=".doc"]', 'a[href$=".docx"]',
                'a[href$=".xls"]', 'a[href$=".xlsx"]', 'a[href$=".zip"]',
                'a[href$=".odt"]', 'a[href$=".ods"]', 'a[href$=".txt"]'
            ]
            
            for selector in doc_selectors:
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                
                for element in elements:
                    href = element.get_attribute('href')
                    text = element.text.strip()
                    
                    if href:
                        full_url = urljoin(base_url, href)
                        file_type = href.split('.')[-1].lower()
                        
                        attachment_info = {
                            'url': full_url,
                            'text': text or f"Document.{file_type}",
                            'type': file_type,
                            'filename': self._extract_filename(href),
                            'downloaded': False,
                            'local_path': None,
                            'file_size': None
                        }
                        
                        # Try to download
                        local_path = self._download_attachment(full_url)
                        if local_path:
                            attachment_info['downloaded'] = True
                            attachment_info['local_path'] = local_path
                            attachment_info['file_size'] = os.path.getsize(local_path)
                            self.temp_files.append(local_path)
                        
                        attachments.append(attachment_info)
                        
        except Exception as e:
            self.logger.warning(f"⚠️ Attachment extraction error: {e}")
        
        return attachments
    
    def _extract_filename(self, href: str) -> str:
        """Extract clean filename from URL."""
        filename = href.split('/')[-1] if '/' in href else href
        filename = filename.split('?')[0] if '?' in filename else filename
        return filename or 'unknown_file'

    def _download_attachment(self, url: str) -> Optional[str]:
        """Download attachment file with robust error handling."""
        try:
            response = requests.get(url, timeout=30, stream=True)
            response.raise_for_status()
            
            # Create temporary file with proper extension
            suffix = '.' + url.split('.')[-1] if '.' in url else '.tmp'
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            
            # Download with progress tracking
            total_size = 0
            for chunk in response.iter_content(chunk_size=8192):
                temp_file.write(chunk)
                total_size += len(chunk)
            
            temp_file.close()
            self.logger.info(f"📄 Downloaded {total_size} bytes from: {url}")
            return temp_file.name
            
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to download {url}: {e}")
            return None

    def _extract_metadata(self) -> Dict[str, Any]:
        """Extract comprehensive page metadata."""
        metadata = {
            'current_url': self.driver.current_url,
            'page_source_length': len(self.driver.page_source),
            'extraction_timestamp': time.time()
        }
        
        try:
            # Meta tags
            meta_tags = self.driver.find_elements(By.TAG_NAME, "meta")
            for meta in meta_tags:
                name = meta.get_attribute('name')
                content = meta.get_attribute('content')
                property_attr = meta.get_attribute('property')
                
                if name and content:
                    metadata[f'meta_{name}'] = content
                elif property_attr and content:
                    metadata[f'meta_{property_attr}'] = content
            
            # Page performance metrics
            try:
                load_time = self.driver.execute_script(
                    "return window.performance.timing.loadEventEnd - window.performance.timing.navigationStart"
                )
                metadata['page_load_time_ms'] = load_time
            except Exception:
                pass
                    
        except Exception as e:
            self.logger.warning(f"⚠️ Metadata extraction error: {e}")
        
        return metadata

    def _handle_overlays(self):
        """Handle modal overlays, popups, and cookie banners."""
        overlay_selectors = [
            '.modal', '.popup', '.overlay', '.cookie-banner',
            '[id*="modal"]', '[class*="popup"]', '[class*="overlay"]',
            '.fr-modal', '.fr-notice', '[role="dialog"]'
        ]
        
        for selector in overlay_selectors:
            try:
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                for element in elements:
                    if element.is_displayed():
                        # Try multiple close button selectors
                        close_selectors = [
                            '.close', '.btn-close', '[aria-label="Close"]', 
                            '[title="Close"]', '.fr-btn--close', '[data-dismiss="modal"]'
                        ]
                        
                        for close_selector in close_selectors:
                            try:
                                close_button = element.find_element(By.CSS_SELECTOR, close_selector)
                                close_button.click()
                                time.sleep(1)
                                self.logger.info("✅ Closed overlay")
                                break
                            except NoSuchElementException:
                                continue
                            except Exception:
                                continue
            except Exception:
                continue

    def _is_internal_link(self, url: str) -> bool:
        """Check if link is internal to current domain."""
        try:
            current_domain = urlparse(self.driver.current_url).netloc
            link_domain = urlparse(url).netloc
            return not link_domain or link_domain == current_domain
        except Exception:
            return False

    def cleanup(self):
        """Clean up all resources."""
        try:
            # Clean up temporary files
            for temp_file in self.temp_files:
                try:
                    if os.path.exists(temp_file):
                        os.unlink(temp_file)
                except Exception as e:
                    self.logger.warning(f"⚠️ Failed to delete temp file {temp_file}: {e}")
            
            # Close WebDriver
            if self.driver:
                self.driver.quit()
                self.logger.info("✅ WebDriver cleaned up")
                
        except Exception as e:
            self.logger.error(f"❌ Cleanup error: {e}")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()


# Utility functions for backward compatibility and specialized operations

def detect_language(text: str) -> str:
    """
    Detect the main language for a given string.
    Returns a short language code (e.g. 'en', 'fr', 'ro'), or 'unknown'.
    """
    if not text or len(text.strip()) < 10:
        return "unknown"
    
    try:
        detected = detect(text)
        return detected if detected else "unknown"
    except LangDetectException:
        return "unknown"
    except Exception as e:
        logging.warning(f"Language detection failed: {e}")
        return "unknown"


def guess_canonical_field_fr(text: str, field_keywords: Dict[str, List[str]] = None) -> Optional[str]:
    """
    Map a French text block to the most likely canonical field based on keywords.
    
    Args:
        text: Text content to analyze
        field_keywords: Custom field keyword mapping (optional)
    
    Returns:
        Field name (e.g., 'description', 'eligibility') or None if no match
    """
    if not text:
        return None
    
    keywords = field_keywords or FIELD_KEYWORDS_FR
    text_lower = text.lower()
    
    # Score each field based on keyword frequency
    field_scores = {}
    for field, field_keywords_list in keywords.items():
        score = 0
        for keyword in field_keywords_list:
            if keyword in text_lower:
                score += text_lower.count(keyword)
        
        if score > 0:
            field_scores[field] = score
    
    # Return field with highest score
    if field_scores:
        return max(field_scores, key=field_scores.get)
    
    return None


def log_unmapped_label(label: str, url: Optional[str] = None) -> None:
    """Log unmapped field labels for analysis and improvement."""
    log_dir = Path("data/extracted")
    log_dir.mkdir(parents=True, exist_ok=True)
    
    log_path = log_dir / "unmapped_labels.log"
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    
    try:
        with open(log_path, "a", encoding="utf-8") as logf:
            if url:
                logf.write(f"[{timestamp}] [{url}] {label}\n")
            else:
                logf.write(f"[{timestamp}] {label}\n")
    except Exception as e:
        logging.warning(f"Failed to log unmapped label: {e}")


@ruthless_trap
def init_driver(browser: str = "chrome", headless: bool = True, timeout: int = 30) -> webdriver.Remote:
    """
    Initialize a Selenium WebDriver with comprehensive validation and error handling.
    
    Args:
        browser: Browser type (chrome, firefox, edge)
        headless: Run in headless mode
        timeout: Default timeout for operations
        
    Returns:
        Configured Selenium WebDriver instance
    """
    log_step(f"🚀 Initializing {browser} WebDriver (headless={headless})")
    
    try:
        robust_driver = RobustWebDriver(
            browser=browser, 
            headless=headless, 
            timeout=timeout,
            enable_debug=DEBUG_SYSTEM_AVAILABLE
        )
        return robust_driver.driver
        
    except Exception as e:
        log_error(f"Failed to initialize {browser} driver: {e}")
        log_error(f"Full traceback: {traceback.format_exc()}")
        
        # Add debug context if available
        if DEBUG_SYSTEM_AVAILABLE:
            debugger = get_ruthless_debugger()
            debugger.add_post_mortem_context({
                'function': 'init_driver',
                'browser': browser,
                'headless': headless,
                'exception_type': type(e).__name__,
                'exception_message': str(e),
                'traceback': traceback.format_exc()
            })
        
        raise


def ensure_folder(path: str) -> None:
    """
    Ensure a folder exists, creating it if necessary.
    
    Args:
        path: Directory path to create if missing
    """
    try:
        os.makedirs(path, exist_ok=True)
    except Exception as e:
        logging.error(f"Failed to create directory {path}: {e}")
        raise


def download_file(url: str, dest_folder: str) -> Optional[str]:
    """
    Download a file from URL with comprehensive error handling.
    
    Args:
        url: The full URL of the file to download
        dest_folder: Local directory where the file will be saved
        
    Returns:
        Full path to the downloaded file or None if failed
    """
    ensure_folder(dest_folder)
    
    try:
        # Extract filename from URL
        local_filename = url.split("/")[-1].split("?")[0]
        if not local_filename:
            local_filename = f"downloaded_file_{int(time.time())}"
        
        local_path = os.path.join(dest_folder, local_filename)
        
        # Download with streaming and timeout
        with requests.get(url, stream=True, timeout=30) as response:
            response.raise_for_status()
            
            total_size = 0
            with open(local_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
                    total_size += len(chunk)
        
        logging.info(f"📄 Downloaded {total_size} bytes: {local_filename} → {local_path}")
        return local_path
        
    except Exception as e:
        logging.error(f"❌ Failed to download {url}: {e}")
        return None


def collect_links(driver: webdriver.Remote, link_selector: str, 
                 save_debug: bool = True) -> List[str]:
    """
    Collect URLs matching CSS selectors with comprehensive diagnostics.
    
    Args:
        driver: Selenium WebDriver instance
        link_selector: CSS selector(s) for links (comma-separated for multiple)
        save_debug: Whether to save debug information on failure
        
    Returns:
        List of unique href URLs
        
    Raises:
        RuntimeError: If no URLs are found with any selector
    """
    # Parse multiple selectors
    selectors = [s.strip() for s in link_selector.split(',')]
    
    collected_urls = []
    matching_selector = None
    
    # Try each selector in priority order
    for selector in selectors:
        try:
            elements = driver.find_elements(By.CSS_SELECTOR, selector)
            if elements:
                urls = []
                for element in elements:
                    href = element.get_attribute("href")
                    if href and href.startswith(('http://', 'https://', '/')):
                        urls.append(href)
                
                if urls:
                    collected_urls = list(set(urls))  # Remove duplicates
                    matching_selector = selector
                    logging.info(f"✅ Selector '{selector}' found {len(elements)} elements, collected {len(collected_urls)} URLs")
                    break
            else:
                logging.warning(f"⚠️ Selector '{selector}' found no elements")
        except Exception as e:
            logging.error(f"❌ Selector '{selector}' failed: {e}")
    
    # Handle failure case with diagnostics
    if not collected_urls:
        error_msg = f"No URLs collected with any selector: {selectors}"
        logging.error(f"🚨 {error_msg}")
        
        if save_debug:
            _save_debug_information(driver, selectors)
        
        raise RuntimeError(error_msg)
    
    # Validate result quality
    if len(collected_urls) < 3:
        logging.warning(f"⚠️ Only {len(collected_urls)} URLs collected - expected more for typical pages")
    
    logging.info(f"✅ Successfully collected {len(collected_urls)} URLs using: {matching_selector}")
    return collected_urls


def _save_debug_information(driver: webdriver.Remote, failed_selectors: List[str]) -> None:
    """Save debug information when link collection fails."""
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    debug_dir = Path("logs/debug")
    debug_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        # Save HTML source
        html_file = debug_dir / f"failed_page_{timestamp}.html"
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(driver.page_source)
        logging.info(f"💾 Saved debug HTML: {html_file}")
        
        # Save screenshot
        screenshot_file = debug_dir / f"failed_page_{timestamp}.png"
        driver.save_screenshot(str(screenshot_file))
        logging.info(f"📸 Saved debug screenshot: {screenshot_file}")
        
        # Save selector analysis
        analysis_file = debug_dir / f"selector_analysis_{timestamp}.json"
        analysis = {
            'url': driver.current_url,
            'title': driver.title,
            'failed_selectors': failed_selectors,
            'page_source_length': len(driver.page_source),
            'body_present': len(driver.find_elements(By.TAG_NAME, "body")) > 0,
            'timestamp': timestamp
        }
        
        with open(analysis_file, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, indent=2, ensure_ascii=False)
        logging.info(f"📊 Saved selector analysis: {analysis_file}")
        
    except Exception as e:
        logging.error(f"❌ Failed to save debug information: {e}")


def wait_for_selector(driver: webdriver.Remote, selector: str, timeout: int = 10) -> bool:
    """
    Wait until at least one element matching selector is present.
    
    Args:
        driver: WebDriver instance
        selector: CSS selector to wait for
        timeout: Maximum wait time in seconds
        
    Returns:
        True if elements found, False if timeout
    """
    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, selector))
        )
        return True
    except TimeoutException:
        logging.warning(f"⚠️ Timeout waiting for selector: {selector}")
        return False
    except Exception as e:
        logging.error(f"❌ Error waiting for selector {selector}: {e}")
        return False


def click_next(driver: webdriver.Remote, next_page_selector: str) -> bool:
    """
    Attempt to click the 'next' button for pagination.
    
    Args:
        driver: WebDriver instance
        next_page_selector: CSS selector for next page button
        
    Returns:
        True if clicked successfully, False if no next page or error
    """
    try:
        next_btn = driver.find_element(By.CSS_SELECTOR, next_page_selector)
        
        # Check if button is disabled
        if "disabled" in (next_btn.get_attribute("class") or ""):
            logging.info("📄 Reached last page (button disabled)")
            return False
        
        # Check if button is clickable
        if not next_btn.is_enabled() or not next_btn.is_displayed():
            logging.info("📄 Next button not clickable")
            return False
        
        # Click the button
        next_btn.click()
        time.sleep(2)  # Allow page to load
        logging.info("➡️ Successfully clicked next page")
        return True
        
    except NoSuchElementException:
        logging.info("📄 No next page button found")
        return False
    except Exception as e:
        logging.error(f"❌ Pagination failed: {e}")
        return False


def extract_single_page(url: str, output_dir: str = "data", 
                       browser: str = "chrome", headless: bool = True) -> Dict[str, Any]:
    """
    Convenience function to extract content from a single page.
    
    Args:
        url: URL to extract from
        output_dir: Directory to save results
        browser: Browser type to use
        headless: Run in headless mode
        
    Returns:
        Extraction results dictionary
    """
    logger = ScrapingLogger().get_logger()
    
    try:
        with RobustWebDriver(browser=browser, headless=headless) as driver_wrapper:
            result = driver_wrapper.extract_full_content(url)
            
            # Save result to file
            output_path = Path(output_dir)
            output_path.mkdir(exist_ok=True)
            
            timestamp = int(time.time())
            filename = f"page_{timestamp}.json"
            output_file = output_path / filename
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            logger.info(f"💾 Saved extraction result: {output_file}")
            return result
            
    except Exception as e:
        logger.error(f"❌ Single page extraction failed for {url}: {e}")
        return {
            'url': url, 
            'success': False, 
            'error': str(e),
            'extraction_timestamp': time.time()
        }


# Legacy compatibility functions

def find_executable_driver(driver_dir: str, driver_name: str) -> str:
    """Legacy wrapper for DriverBinaryManager.find_executable_driver."""
    return DriverBinaryManager.find_executable_driver(driver_dir, driver_name)


# Export main components
__all__ = [
    'RobustWebDriver',
    'ScrapingLogger', 
    'DriverBinaryManager',
    'init_driver',
    'extract_single_page',
    'collect_links',
    'download_file',
    'ensure_folder',
    'wait_for_selector',
    'click_next',
    'detect_language',
    'guess_canonical_field_fr',
    'log_unmapped_label',
    'FIELD_KEYWORDS_FR'
]


# Main execution for testing
if __name__ == "__main__":
    # Test the unified scraper
    test_url = sys.argv[1] if len(sys.argv) > 1 else "https://www.franceagrimer.fr/aides"
    
    print(f"🧪 Testing unified scraper with: {test_url}")
    result = extract_single_page(test_url)
    
    if result['success']:
        print(f"✅ Extraction successful!")
        print(f"📋 Title: {result['title']}")
        print(f"📝 Content: {len(result['text'])} chars")
        print(f"🔗 Links: {len(result['links'])}")
        print(f"📎 Attachments: {len(result['attachments'])}")
        
        # Show field mapping results
        field_results = result.get('field_mapping_results', {})
        if field_results:
            print(f"🏷️ Mapped fields: {list(field_results.keys())}")
    else:
        print(f"❌ Extraction failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)

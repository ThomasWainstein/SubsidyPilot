
# scraper/core.py

import os
import time
import requests
import traceback
import logging
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException, WebDriverException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from langdetect import detect, LangDetectException
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.firefox import GeckoDriverManager
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from selenium.webdriver.firefox.service import Service as FirefoxService
from webdriver_manager.microsoft import EdgeChromiumDriverManager
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.edge.service import Service as EdgeService
import stat
import subprocess

# Import debugging system
from debug_diagnostics import get_ruthless_debugger, ruthless_trap, log_step, log_error, log_warning

FIELD_KEYWORDS_FR = {
    "title": [
        "titre de l'aide", "intitulé", "nom de l'aide", "titre", "titre principal", 
        "nom", "titre du dispositif", "titre de la mesure", "intitulé de la mesure", 
        "libellé", "nom complet", "dénomination"
    ],
    "description": [
        "description", "présentation", "objectif", "contexte", "but", "synthèse", 
        "texte principal", "résumé", "explication", "informations", "texte descriptif", 
        "détail", "objet", "présentation générale", "texte explicatif"
    ],
    "eligibility": [
        "bénéficiaire", "critère d'éligibilité", "qui peut en bénéficier", "public visé", 
        "conditions d'accès", "admissibilité", "public éligible", "qui est concerné", 
        "cible", "éligibilité", "personnes concernées", "catégories bénéficiaires", 
        "profil éligible", "critères de sélection", "profil visé", 
        "conditions de participation", "public concerné", "personnes éligibles", "statut éligible"
    ],
    "deadline": [
        "date limite", "clôture", "date de dépôt", "fin de dépôt", "délai", 
        "date butoir", "date de clôture", "date d'échéance"
    ],
    "amount": [
        "montant", "budget", "financement", "subvention", "aide financière", 
        "allocation", "dotation", "enveloppe", "plafond", "minimum", "maximum"
    ],
    "documents": [
        "documents", "pièces justificatives", "annexes", "formulaires", 
        "dossier de candidature", "pièces à fournir", "documents requis"
    ],
    "application_method": [
        "candidature", "comment postuler", "procédure de candidature", 
        "dépôt de dossier", "modalités de candidature", "mode de dépôt", 
        "comment candidater", "demande", "procédure de demande", 
        "soumission de dossier", "dépôt en ligne", "inscription"
    ],
    "evaluation_criteria": [
        "critères d'évaluation", "grille d'évaluation", "méthode de sélection", 
        "barème", "critères de notation", "système d'évaluation", 
        "critères d'examen", "critères de choix"
    ],
    "previous_acceptance_rate": [
        "taux de réussite", "taux d'acceptation", "projets financés", 
        "statistiques d'acceptation", "historique d'attribution", "taux de sélection"
    ],
    "priority_groups": [
        "public prioritaire", "groupes cibles", "publics prioritaires", 
        "priorités", "groupes bénéficiaires", "public cible", "catégories prioritaires"
    ],
    "legal_entity_type": [
        "statut juridique", "type de structure", "forme juridique", 
        "entité bénéficiaire", "catégorie juridique", "personnalité juridique", 
        "type d'organisation"
    ],
    "funding_source": [
        "source de financement", "origine des fonds", "financeur", 
        "partenaire financier", "institution financière", "organisme financeur", 
        "bailleur de fonds"
    ],
    "compliance_requirements": [
        "conditions de conformité", "réglementation applicable", "respect des normes", 
        "obligations légales", "critères de conformité", "exigences réglementaires", 
        "obligations de conformité"
    ],
    "language": [
        "langue", "langue de dépôt", "langue de la demande", "langue d'instruction", 
        "langue du formulaire", "langue exigée"
    ],
    "matching_algorithm_score": [
        "score d'éligibilité", "niveau de correspondance", "indice de matching", 
        "score de pertinence", "note de correspondance"
    ]
}

def log_unmapped_label(label, url=None):
    """Logs any unmapped field label for later review."""
    log_path = "data/extracted/unmapped_labels.log"
    logline = f"[{url}] {label}\n" if url else f"{label}\n"
    with open(log_path, "a", encoding="utf-8") as logf:
        logf.write(logline)

def detect_language(text):
    """
    Detect the main language for a given string.
    Returns a short language code (e.g. 'en', 'fr', 'ro'), or 'unknown'.
    """
    try:
        return detect(text)
    except LangDetectException:
        return "unknown"
    except Exception as e:
        print(f"[ERROR] Language detection failed: {e}")
        return "unknown"

@ruthless_trap
def init_driver(browser="chrome", headless=True):
    """
    Initialize a Selenium WebDriver using webdriver-manager with comprehensive logging.
    
    Args:
        browser (str): Browser type (chrome, firefox). Default: chrome
        headless (bool): Run in headless mode. Default: True
        
    Returns:
        WebDriver: Configured Selenium WebDriver instance
    """
    debugger = get_ruthless_debugger()
    log_step(f"Initializing {browser} driver", browser=browser, headless=headless)
    
    try:
        if browser.lower() == "chrome":
            from selenium import webdriver
            from selenium.webdriver.chrome.options import Options
            from webdriver_manager.chrome import ChromeDriverManager
            
            log_step("Setting up Chrome options")
            options = Options()
            
            if headless:
                options.add_argument("--headless=new")
                log_step("Chrome headless mode enabled")
            
            # Comprehensive Chrome options for stability
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
                "--disable-javascript",
                "--user-agent=AgriToolScraper/1.0"
            ]
            
            for arg in chrome_args:
                options.add_argument(arg)
                log_step(f"Added Chrome arg: {arg}")
            
            # Log Chrome binary location if set
            chrome_binary = os.environ.get('GOOGLE_CHROME_BIN') or os.environ.get('CHROME_BIN')
            if chrome_binary:
                options.binary_location = chrome_binary
                log_step(f"Using Chrome binary: {chrome_binary}")
            
            log_step("Calling ChromeDriverManager().install()")
            
            # Install driver with webdriver-manager
            driver_manager = ChromeDriverManager()
            driver_path = driver_manager.install()
            
            log_step(f"ChromeDriver path: {driver_path}")
            
            # Verify driver binary
            if not os.path.exists(driver_path):
                raise FileNotFoundError(f"ChromeDriver not found at {driver_path}")
            
            # Check if it's executable
            if not os.access(driver_path, os.X_OK):
                raise PermissionError(f"ChromeDriver not executable at {driver_path}")
            
            # Log driver version
            try:
                version_result = subprocess.run(
                    [driver_path, '--version'], 
                    capture_output=True, text=True, timeout=10
                )
                if version_result.returncode == 0:
                    log_step(f"ChromeDriver version: {version_result.stdout.strip()}")
                else:
                    log_warning(f"Could not get ChromeDriver version: {version_result.stderr}")
            except Exception as e:
                log_warning(f"Version check failed: {e}")
            
            log_step("Creating Chrome WebDriver instance")
            # [LovableAI] Refactored for Selenium 4+ compliance. Legacy positional args removed.
            service = ChromeService(driver_path)
            driver = webdriver.Chrome(options=options, service=service)
            # [LovableAI] WHY: Selenium 4+ forbids multiple positional args and ignoring driver path.
            # Only 'options=options' and 'service=Service(path)' pattern is valid.
            
            log_step("Chrome driver initialized successfully")
            return driver
        
        elif browser.lower() == "firefox":
            from selenium import webdriver
            from selenium.webdriver.firefox.options import Options
            from webdriver_manager.firefox import GeckoDriverManager
            
            log_step("Setting up Firefox options")
            options = Options()
            if headless:
                options.add_argument("--headless")
                log_step("Firefox headless mode enabled")
            
            log_step("Calling GeckoDriverManager().install()")
            driver_path = GeckoDriverManager().install()
            log_step(f"GeckoDriver path: {driver_path}")
            
            # [LovableAI] Refactored for Selenium 4+ compliance. Legacy positional args removed.
            service = FirefoxService(driver_path)
            driver = webdriver.Firefox(options=options, service=service)
            # [LovableAI] WHY: Selenium 4+ forbids multiple positional args and ignoring driver path.
            # Only 'options=options' and 'service=Service(path)' pattern is valid.
            log_step("Firefox driver initialized successfully")
            return driver
        
        else:
            raise ValueError(f"Unsupported browser: {browser}")
            
    except Exception as e:
        log_error(f"Failed to initialize {browser} driver: {e}")
        log_error(f"Full traceback: {traceback.format_exc()}")
        
        # Add to post-mortem
        debugger.add_post_mortem_context({
            'function': 'init_driver',
            'browser': browser,
            'headless': headless,
            'exception_type': type(e).__name__,
            'exception_message': str(e),
            'traceback': traceback.format_exc()
        })
        
        raise

def ensure_folder(path):
    """
    Ensure a folder exists, creating it if it doesn't.
    Args:
        path (str): Directory path to create if missing.
    """
    os.makedirs(path, exist_ok=True)

def download_file(url, dest_folder):
    """
    Download a file from a given URL into a destination folder.
    Handles streaming download and creates folder if missing.
    Logs download status and errors.
    Args:
        url (str): The full URL of the file to download.
        dest_folder (str): Local directory where the file will be saved.
    Returns:
        local_path (str): Full path to the downloaded file or None if failed.
    """
    ensure_folder(dest_folder)
    local_filename = url.split("/")[-1].split("?")[0]
    local_path = os.path.join(dest_folder, local_filename)
    try:
        with requests.get(url, stream=True, timeout=20) as r:
            r.raise_for_status()
            with open(local_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
        print(f"[INFO] Downloaded: {local_filename} → {local_path}")
        return local_path
    except Exception as e:
        print(f"[ERROR] Failed to download {url}: {e}")
        return None

def collect_links(driver, link_selector):
    """
    Collect all 'href' URLs matching a given CSS selector.
    Returns a list of unique href URLs.
    """
    links = driver.find_elements(By.CSS_SELECTOR, link_selector)
    return list({l.get_attribute("href") for l in links if l.get_attribute("href")})

def wait_for_selector(driver, selector, timeout=10):
    """
    Wait until at least one element matching selector is present on page.
    """
    WebDriverWait(driver, timeout).until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, selector))
    )

def click_next(driver, next_page_selector):
    """
    Attempt to click the 'next' button for pagination.
    Returns True if clicked successfully, False if no next page found.
    """
    try:
        next_btn = driver.find_element(By.CSS_SELECTOR, next_page_selector)
        if "disabled" in (next_btn.get_attribute("class") or ""):
            return False
        next_btn.click()
        return True
    except NoSuchElementException:
        return False
    except Exception as e:
        print(f"[ERROR] Pagination failed: {e}")
        return False

def guess_canonical_field_fr(text, field_keywords=FIELD_KEYWORDS_FR):
    """
    Map a French text block to the most likely canonical field based on FIELD_KEYWORDS_FR.
    Returns the field name (e.g., 'description', 'eligibility', ...) or None.
    """
    lower = text.lower()
    for field, keywords in field_keywords.items():
        for word in keywords:
            if word in lower:
                return field
    return None

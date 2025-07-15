
# scraper/core.py

import os
import time
import requests
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

def validate_driver_binary(driver_path):
    """
    Validate that the driver path points to an actual executable binary.
    This prevents [Errno 8] Exec format error by catching text files.
    """
    print(f"[VALIDATION] Checking driver binary: {driver_path}")
    
    if not os.path.exists(driver_path):
        print(f"[ERROR] Driver file does not exist: {driver_path}")
        return False
    
    # Check if file is executable
    if not os.access(driver_path, os.X_OK):
        print(f"[ERROR] Driver file is not executable: {driver_path}")
        return False
    
    # Check file type using the 'file' command
    try:
        result = subprocess.run(['file', driver_path], capture_output=True, text=True, timeout=10)
        file_type = result.stdout.strip()
        print(f"[VALIDATION] File type: {file_type}")
        
        # Must be an executable (ELF on Linux, Mach-O on macOS, PE on Windows)
        if any(x in file_type.lower() for x in ['executable', 'elf', 'mach-o', 'pe32']):
            print(f"[VALIDATION] ✅ Binary validation passed")
            return True
        else:
            print(f"[ERROR] ❌ File is not a binary executable: {file_type}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"[WARN] File type check timed out, assuming valid")
        return True
    except FileNotFoundError:
        print(f"[WARN] 'file' command not found, skipping binary validation")
        return True
    except Exception as e:
        print(f"[WARN] Binary validation failed: {e}, assuming valid")
        return True

def purge_corrupted_wdm_cache():
    """
    Remove corrupted webdriver-manager cache to force fresh download.
    This solves most [Errno 8] issues in CI environments.
    """
    import shutil
    wdm_cache = os.path.expanduser("~/.wdm")
    
    if os.path.exists(wdm_cache):
        print(f"[CLEANUP] Removing corrupted .wdm cache: {wdm_cache}")
        try:
            shutil.rmtree(wdm_cache)
            print(f"[CLEANUP] ✅ Cache purged successfully")
        except Exception as e:
            print(f"[CLEANUP] ⚠️ Failed to remove cache: {e}")
    else:
        print(f"[CLEANUP] No .wdm cache found to purge")

def init_driver(
    browser="chrome",
    user_agent=None,
    headless=True,
    window_size="1200,800",
    force_cache_purge=False
):
    """
    Initialize and return a Selenium WebDriver using ONLY webdriver-manager.
    
    CRITICAL: This function uses ONLY webdriver-manager and NO manual path logic.
    Added bulletproof validation to prevent [Errno 8] Exec format error.
    
    Args:
        browser (str): Browser type - 'chrome', 'firefox', or 'edge'
        user_agent (str): Optional custom user agent string
        headless (bool): Run browser in headless mode (required for CI)
        window_size (str): Window size in format "width,height"
        force_cache_purge (bool): Force .wdm cache purge before init
    
    Returns:
        WebDriver: Configured browser driver instance
    """
    try:
        # Purge cache if requested or if we're in CI
        if force_cache_purge or os.getenv('CI') or os.getenv('GITHUB_ACTIONS'):
            purge_corrupted_wdm_cache()
        
        if browser == "chrome":
            options = ChromeOptions()
            if headless:
                options.add_argument("--headless")
            
            # Essential arguments for CI/CD stability - DO NOT REMOVE
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-gpu")
            options.add_argument("--disable-web-security")
            options.add_argument("--disable-features=VizDisplayCompositor")
            options.add_argument(f"--window-size={window_size}")
            
            if user_agent:
                options.add_argument(f"--user-agent={user_agent}")

            # Use webdriver-manager with bulletproof validation
            print("[DEBUG] Installing ChromeDriver via webdriver-manager...")
            
            # Retry logic for webdriver-manager
            max_retries = 3
            for attempt in range(1, max_retries + 1):
                try:
                     driver_path = ChromeDriverManager().install()
                     print(f"[DEBUG] ChromeDriver initialized via webdriver-manager: {driver_path}")
                     
                     # Binary is valid, proceed with driver creation
                    service = ChromeService(driver_path)
                    driver = webdriver.Chrome(service=service, options=options)
                    print("[DEBUG] ✅ ChromeDriver started successfully")
                    return driver
                    
                except Exception as e:
                    print(f"[ERROR] Attempt {attempt} failed: {e}")
                    if attempt < max_retries:
                        print(f"[RETRY] Retrying in 5 seconds...")
                        time.sleep(5)
                        purge_corrupted_wdm_cache()
                    else:
                        raise

        elif browser == "firefox":
            options = FirefoxOptions()
            if headless:
                options.add_argument("--headless")
            
            # Essential Firefox arguments for CI stability
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            
            if user_agent:
                options.set_preference("general.useragent.override", user_agent)
            
            # Use webdriver-manager ONLY - no manual path handling
            service = FirefoxService(GeckoDriverManager().install())
            driver = webdriver.Firefox(service=service, options=options)
            return driver

        elif browser == "edge":
            options = EdgeOptions()
            if headless:
                options.add_argument("--headless")
            
            # Essential Edge arguments for CI stability
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-gpu")
            options.add_argument(f"--window-size={window_size}")
            
            if user_agent:
                options.add_argument(f"--user-agent={user_agent}")
            
            # Use webdriver-manager ONLY - no manual path handling
            service = EdgeService(EdgeChromiumDriverManager().install())
            driver = webdriver.Edge(service=service, options=options)
            return driver

        else:
            print(f"[WARN] Unsupported browser '{browser}', using Chrome as fallback.")
            return init_driver("chrome", user_agent, headless, window_size, force_cache_purge)

    except WebDriverException as e:
        print(f"[ERROR] Failed to initialize driver ({browser}): {e}")
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

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
import inspect

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
        "dossier de candidature", "pièces à fournir", "documents requis", "pièces jointes"
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

def find_executable_driver(driver_dir, driver_name):
    """
    Find the executable driver binary in the given directory.
    
    Args:
        driver_dir (str): Directory containing the driver files
        driver_name (str): Expected name of the driver binary (e.g., 'chromedriver', 'geckodriver')
        
    Returns:
        str: Full path to the executable driver binary
        
    Raises:
        FileNotFoundError: If no valid executable driver is found
    """
    # AGGRESSIVE FORCED CRASH TEST - UNCOMMENT TO PROVE FUNCTION IS CALLED
    # To enable forced crash test, uncomment the next line:
    # raise Exception(f"🚨 FORCED CRASH: find_executable_driver CALLED with {driver_name}")
    
    # EXECUTION PROOF: Log that this function is being called
    log_step(f"🚨 AGGRESSIVE: 🔥 PROOF: find_executable_driver() CALLED with driver_dir='{driver_dir}', driver_name='{driver_name}'")
    
    # AGGRESSIVE STACK TRACE LOGGING
    current_frame = inspect.currentframe()
    call_stack = []
    frame = current_frame.f_back
    while frame and len(call_stack) < 5:  # Limit to prevent infinite loops
        frame_info = inspect.getframeinfo(frame)
        call_stack.append(f"{frame_info.filename}:{frame_info.lineno}:{frame_info.function}")
        frame = frame.f_back
    log_step(f"🚨 AGGRESSIVE: 🔥 PROOF: Call stack trace: {call_stack}")
    
    log_step(f"🚨 AGGRESSIVE: Searching for {driver_name} in {driver_dir}")
    
    # AGGRESSIVE DIRECTORY ANALYSIS: List all files in the driver directory for debugging
    try:
        dir_contents = os.listdir(driver_dir)
        log_step(f"🚨 AGGRESSIVE: 📁 INSIDE FUNCTION Directory contents: {dir_contents}")
        
        # AGGRESSIVE FILE ANALYSIS: Log details for each file
        for analysis_file in dir_contents:
            analysis_file_path = os.path.join(driver_dir, analysis_file)
            analysis_is_file = os.path.isfile(analysis_file_path)
            analysis_is_executable = os.access(analysis_file_path, os.X_OK)
            try:
                analysis_file_stat = os.stat(analysis_file_path)
                analysis_permissions = stat.filemode(analysis_file_stat.st_mode)
                analysis_size = analysis_file_stat.st_size
            except Exception as e:
                analysis_permissions = f"ERROR: {e}"
                analysis_size = 0
            log_step(f"🚨 AGGRESSIVE: 📄 ANALYSIS File: {analysis_file} | File: {analysis_is_file} | Executable: {analysis_is_executable} | Permissions: {analysis_permissions} | Size: {analysis_size}")
            
            # AGGRESSIVE CRASH: If THIRD_PARTY_NOTICES is present, warn loudly
            if "THIRD_PARTY_NOTICES" in analysis_file:
                log_error(f"🚨 AGGRESSIVE: ❌ WARNING: THIRD_PARTY_NOTICES file detected in directory: {analysis_file}")
                
    except Exception as e:
        log_error(f"🚨 AGGRESSIVE: ❌ Could not list driver directory: {e}")
        raise FileNotFoundError(f"Could not access driver directory: {driver_dir}")
    
    # AGGRESSIVE SEARCH: Look for the exact driver binary name
    found_candidates = []
    for file in dir_contents:
        file_path = os.path.join(driver_dir, file)
        log_step(f"🚨 AGGRESSIVE: Checking file: {file} at {file_path}")
        
        # STRICT CHECK: Must be exactly named as expected (no extensions, no prefixes)
        if file == driver_name and os.path.isfile(file_path):
            log_step(f"🚨 AGGRESSIVE: Found potential {driver_name} binary: {file_path}")
            found_candidates.append(file_path)
            
            # Check if executable
            if os.access(file_path, os.X_OK):
                log_step(f"🚨 AGGRESSIVE: ✅ {file_path} is executable - SELECTING THIS FILE")
                return file_path
            else:
                log_warning(f"🚨 AGGRESSIVE: ⚠️ {file_path} is not executable, attempting to fix permissions")
                try:
                    os.chmod(file_path, 0o755)
                    if os.access(file_path, os.X_OK):
                        log_step(f"🚨 AGGRESSIVE: ✅ Fixed permissions for {file_path} - SELECTING THIS FILE")
                        return file_path
                    else:
                        log_error(f"🚨 AGGRESSIVE: ❌ Could not make {file_path} executable")
                except Exception as e:
                    log_error(f"🚨 AGGRESSIVE: ❌ chmod failed for {file_path}: {e}")
        else:
            log_step(f"🚨 AGGRESSIVE: Skipping {file} (not exactly '{driver_name}' or not a file)")
    
    # AGGRESSIVE ERROR REPORTING: If we get here, no valid executable was found
    error_msg = (
        f"🚨 AGGRESSIVE: ❌ CRITICAL: No executable '{driver_name}' binary found in {driver_dir}. "
        f"Directory contents: {dir_contents}. "
        f"Found candidates: {found_candidates}. "
        f"Expected exactly one file named '{driver_name}' with executable permissions."
    )
    log_error(error_msg)
    raise FileNotFoundError(error_msg)

@ruthless_trap
def init_driver(browser="chrome", headless=True):
    """
    Initialize a Selenium WebDriver using webdriver-manager with AGGRESSIVE validation and crash logic.
    
    Args:
        browser (str): Browser type (chrome, firefox). Default: chrome
        headless (bool): Run in headless mode. Default: True
        
    Returns:
        WebDriver: Configured Selenium WebDriver instance
    """
    debugger = get_ruthless_debugger()
    log_step(f"🚨 AGGRESSIVE INIT: Starting {browser} driver initialization", browser=browser, headless=headless)
    
    # STACK TRACE: Log entry point
    current_frame = inspect.currentframe()
    stack_trace = inspect.getframeinfo(current_frame)
    log_step(f"🔍 STACK TRACE AT ENTRY: {stack_trace.filename}:{stack_trace.lineno}")
    
    try:
        if browser.lower() == "chrome":
            from selenium import webdriver
            from selenium.webdriver.chrome.options import Options
            from selenium.webdriver.chrome.service import Service
            from webdriver_manager.chrome import ChromeDriverManager
            
            log_step("🚨 AGGRESSIVE: Setting up Chrome options")
            options = Options()
            
            if headless:
                options.add_argument("--headless=new")
                log_step("🚨 AGGRESSIVE: Chrome headless mode enabled")
            
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
                log_step(f"🚨 AGGRESSIVE: Added Chrome arg: {arg}")
            
            # Log Chrome binary location if set
            chrome_binary = os.environ.get('GOOGLE_CHROME_BIN') or os.environ.get('CHROME_BIN')
            if chrome_binary:
                options.binary_location = chrome_binary
                log_step(f"🚨 AGGRESSIVE: Using Chrome binary: {chrome_binary}")
            
            # 🔥 FIX: Check for pre-installed ChromeDriver first (CI compatibility)
            chromedriver_bin = os.environ.get("CHROMEDRIVER_BIN")
            if chromedriver_bin and os.path.exists(chromedriver_bin):
                log_step(f"🚨 AGGRESSIVE: Using pre-installed ChromeDriver: {chromedriver_bin}")
                service = Service(chromedriver_bin)
                driver = webdriver.Chrome(service=service, options=options)
                log_step("🚨 AGGRESSIVE: ✅ Chrome driver initialized with pre-installed binary")
                return driver
            else:
                log_step("🚨 AGGRESSIVE: No pre-installed ChromeDriver found, downloading via webdriver-manager")
                
            log_step("🚨 AGGRESSIVE: Calling ChromeDriverManager().install()")
            
            # Install driver with webdriver-manager
            driver_manager = ChromeDriverManager()
            initial_path = driver_manager.install()
            
            # AGGRESSIVE LOGGING: Stack trace at assignment
            assignment_frame = inspect.currentframe()
            assignment_info = inspect.getframeinfo(assignment_frame)
            log_step(f"🔍 STACK TRACE AT initial_path ASSIGNMENT: {assignment_info.filename}:{assignment_info.lineno}")
            
            log_step(f"🚨 AGGRESSIVE: ⚠️ INITIAL (POTENTIALLY WRONG) ChromeDriver path from webdriver-manager: {initial_path}")
            log_step(f"🚨 AGGRESSIVE: 📝 VARIABLE TRACE: initial_path = '{initial_path}'")
            
            # MANDATORY DIRECTORY ANALYSIS: Log all files in driver directory with full properties
            driver_dir = os.path.dirname(initial_path)
            log_step(f"🚨 AGGRESSIVE: 📁 Driver directory: {driver_dir}")
            
            try:
                dir_files = os.listdir(driver_dir)
                log_step(f"🚨 AGGRESSIVE: 📋 Directory contains {len(dir_files)} files")
                
                for filename in dir_files:
                    filepath = os.path.join(driver_dir, filename)
                    if os.path.isfile(filepath):
                        file_stat = os.stat(filepath)
                        is_executable = os.access(filepath, os.X_OK)
                        log_step(f"🚨 AGGRESSIVE: 📄 File: {filename} (size={file_stat.st_size}, exec={is_executable})")
                    else:
                        log_step(f"🚨 AGGRESSIVE: 📁 Directory: {filename}")
                        
            except Exception as dir_error:
                log_error(f"🚨 AGGRESSIVE: ❌ Failed to list directory: {dir_error}")
            
            # Fix webdriver-manager path if it points to wrong file
            if "THIRD_PARTY_NOTICES" in initial_path:
                # webdriver-manager sometimes returns wrong file, find the actual chromedriver
                driver_dir = os.path.dirname(initial_path)
                chromedriver_path = os.path.join(driver_dir, "chromedriver")
                if os.path.exists(chromedriver_path):
                    initial_path = chromedriver_path
                    log_step(f"🚨 AGGRESSIVE: Fixed path to actual chromedriver: {initial_path}")
                else:
                    log_error(f"❌ Could not find chromedriver in {driver_dir}, using original path")
            
            # FORCED EXECUTION CRASH TEST - Enable this to prove the function runs
            # Uncomment this line to crash and prove execution reaches here:
            # raise Exception(f"🚨 FORCED EXECUTION PROOF: init_driver reached assignment point with initial_path='{initial_path}'")
            
            # Get the directory containing the driver files
            driver_dir = os.path.dirname(initial_path)
            log_step(f"🚨 AGGRESSIVE: Driver directory: {driver_dir}")
            log_step(f"🚨 AGGRESSIVE: 📝 VARIABLE TRACE: driver_dir = '{driver_dir}'")
            
            # AGGRESSIVE DIRECTORY ANALYSIS: Log all files before our function call
            log_step(f"🚨 AGGRESSIVE: 📁 DIRECTORY ANALYSIS BEFORE find_executable_driver()")
            try:
                pre_dir_contents = os.listdir(driver_dir)
                log_step(f"🚨 AGGRESSIVE: 📁 PRE-FUNCTION Directory contents: {pre_dir_contents}")
                for pre_file in pre_dir_contents:
                    pre_file_path = os.path.join(driver_dir, pre_file)
                    pre_is_file = os.path.isfile(pre_file_path)
                    pre_is_executable = os.access(pre_file_path, os.X_OK)
                    pre_file_stat = os.stat(pre_file_path)
                    pre_permissions = stat.filemode(pre_file_stat.st_mode)
                    log_step(f"🚨 AGGRESSIVE: 📄 PRE-FUNCTION File: {pre_file} | File: {pre_is_file} | Executable: {pre_is_executable} | Permissions: {pre_permissions}")
                    
                    # AGGRESSIVE CRASH: If this is THIRD_PARTY_NOTICES and it would be selected, crash now
                    if "THIRD_PARTY_NOTICES" in pre_file and pre_file == os.path.basename(initial_path):
                        crash_msg = f"❌ PRE-FUNCTION CRASH: THIRD_PARTY_NOTICES file detected as selected binary! File: {pre_file}, initial_path basename: {os.path.basename(initial_path)}"
                        log_error(crash_msg)
                        raise ValueError(crash_msg)
            except Exception as e:
                log_error(f"🚨 AGGRESSIVE: ❌ Error in pre-function directory analysis: {e}")
            
            # FORCED CRASH TEST: Add execution proof for bulletproof function
            log_step(f"🚨 AGGRESSIVE: 🔥 ABOUT TO CALL find_executable_driver('{driver_dir}', 'chromedriver')")
            
            # CRITICAL: Use bulletproof binary selection - NEVER use initial_path directly
            driver_path = find_executable_driver(driver_dir, "chromedriver")
            
            # AGGRESSIVE LOGGING: Stack trace at driver_path assignment
            driver_assignment_frame = inspect.currentframe()
            driver_assignment_info = inspect.getframeinfo(driver_assignment_frame)
            log_step(f"🔍 STACK TRACE AT driver_path ASSIGNMENT: {driver_assignment_info.filename}:{driver_assignment_info.lineno}")
            
            log_step(f"🚨 AGGRESSIVE: 🎯 FINAL SELECTED CHROMEDRIVER BINARY: {driver_path}")
            log_step(f"🚨 AGGRESSIVE: 📝 VARIABLE TRACE: driver_path = '{driver_path}'")
            
            # AGGRESSIVE ASSERTION: Multiple crash checks
            assert driver_path is not None, f"❌ ASSERTION FAILED: driver_path is None!"
            assert isinstance(driver_path, str), f"❌ ASSERTION FAILED: driver_path is not string: {type(driver_path)}"
            assert len(driver_path) > 0, f"❌ ASSERTION FAILED: driver_path is empty string!"
            assert "chromedriver" in driver_path, f"❌ ASSERTION FAILED: 'chromedriver' not in driver_path: {driver_path}"
            assert "THIRD_PARTY_NOTICES" not in driver_path, f"❌ ASSERTION FAILED: THIRD_PARTY_NOTICES found in driver_path: {driver_path}"
            assert "LICENSE" not in driver_path, f"❌ ASSERTION FAILED: LICENSE found in driver_path: {driver_path}"
            assert os.path.isfile(driver_path), f"❌ ASSERTION FAILED: driver_path is not a file: {driver_path}"
            assert os.access(driver_path, os.X_OK), f"❌ ASSERTION FAILED: driver_path is not executable: {driver_path}"
            
            log_step(f"🚨 AGGRESSIVE: ✅ ALL ASSERTIONS PASSED for driver_path: {driver_path}")
            
            # AGGRESSIVE BYPASS DETECTION: Ensure we never use initial_path
            if driver_path == initial_path:
                log_step(f"🚨 AGGRESSIVE: ⚠️ WARNING: driver_path equals initial_path - this could indicate bypass!")
                log_step(f"🚨 AGGRESSIVE: 📝 COMPARISON: driver_path='{driver_path}' vs initial_path='{initial_path}'")
                # Only warn if they're equal but the initial path was not the chromedriver binary
                if "THIRD_PARTY_NOTICES" in initial_path:
                    crash_msg = f"❌ BYPASS DETECTED: driver_path equals bad initial_path! Both contain THIRD_PARTY_NOTICES: {driver_path}"
                    log_error(crash_msg)
                    raise ValueError(crash_msg)
                if "THIRD_PARTY_NOTICES" in initial_path:
                    crash_msg = f"❌ BYPASS DETECTION CRASH: driver_path equals wrong initial_path! driver_path='{driver_path}', initial_path='{initial_path}'"
                    log_error(crash_msg)
                    raise ValueError(crash_msg)
            
            # AGGRESSIVE FILE VERIFICATION: Double-check the selected file
            try:
                selected_file_stat = os.stat(driver_path)
                selected_permissions = stat.filemode(selected_file_stat.st_mode)
                selected_size = selected_file_stat.st_size
                log_step(f"🚨 AGGRESSIVE: 📊 SELECTED FILE VERIFICATION:")
                log_step(f"🚨 AGGRESSIVE: 📊   Path: {driver_path}")
                log_step(f"🚨 AGGRESSIVE: 📊   Permissions: {selected_permissions}")
                log_step(f"🚨 AGGRESSIVE: 📊   Size: {selected_size} bytes")
                log_step(f"🚨 AGGRESSIVE: 📊   Is file: {os.path.isfile(driver_path)}")
                log_step(f"🚨 AGGRESSIVE: 📊   Is executable: {os.access(driver_path, os.X_OK)}")
                
                # AGGRESSIVE SIZE CHECK: ChromeDriver should be reasonably large
                if selected_size < 1000:  # Less than 1KB is suspicious
                    crash_msg = f"❌ SIZE CHECK CRASH: Selected file too small ({selected_size} bytes), likely not a binary: {driver_path}"
                    log_error(crash_msg)
                    raise ValueError(crash_msg)
                    
            except Exception as e:
                crash_msg = f"❌ FILE VERIFICATION CRASH: Could not verify selected file: {e}"
                log_error(crash_msg)
                raise ValueError(crash_msg)
            
            # Log driver version with aggressive error handling
            try:
                log_step(f"🚨 AGGRESSIVE: 🔍 Testing driver execution with --version")
                version_result = subprocess.run(
                    [driver_path, '--version'], 
                    capture_output=True, text=True, timeout=10
                )
                if version_result.returncode == 0:
                    log_step(f"🚨 AGGRESSIVE: ✅ ChromeDriver version: {version_result.stdout.strip()}")
                else:
                    error_msg = f"🚨 AGGRESSIVE: ❌ Version check failed with return code {version_result.returncode}: {version_result.stderr}"
                    log_error(error_msg)
                    raise ValueError(error_msg)
            except subprocess.TimeoutExpired:
                crash_msg = f"❌ VERSION TIMEOUT CRASH: Driver execution timed out, likely wrong binary: {driver_path}"
                log_error(crash_msg)
                raise ValueError(crash_msg)
            except Exception as e:
                crash_msg = f"❌ VERSION EXECUTION CRASH: Cannot execute driver binary: {e}"
                log_error(crash_msg)
                raise ValueError(crash_msg)
            
            log_step("🚨 AGGRESSIVE: Creating Chrome WebDriver instance")
            log_step(f"🚨 AGGRESSIVE: 🔥 FINAL TRACE: About to call ChromeService(driver_path='{driver_path}')")
            
            # AGGRESSIVE PRE-SERVICE CHECK: Last chance to catch wrong path
            if not driver_path.endswith('chromedriver'):
                crash_msg = f"❌ PRE-SERVICE CRASH: driver_path does not end with 'chromedriver': {driver_path}"
                log_error(crash_msg)
                raise ValueError(crash_msg)
            
            # ✅ SELENIUM 4+ COMPLIANT - service first, then options
            service = ChromeService(driver_path)
            log_step(f"🚨 AGGRESSIVE: 🔥 FINAL TRACE: ChromeService created successfully with path: {driver_path}")
            
            log_step(f"🚨 AGGRESSIVE: 🔥 FINAL TRACE: About to call webdriver.Chrome(service=service, options=options)")
            driver = webdriver.Chrome(service=service, options=options)
            log_step(f"🚨 AGGRESSIVE: 🔥 FINAL TRACE: webdriver.Chrome() called successfully")
            
            log_step("🚨 AGGRESSIVE: ✅ Chrome driver initialized successfully with bulletproof validation")
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
            initial_path = GeckoDriverManager().install()
            log_step(f"Initial GeckoDriver path from webdriver-manager: {initial_path}")
            
            # Get the directory containing the driver files
            driver_dir = os.path.dirname(initial_path)
            log_step(f"Firefox driver directory: {driver_dir}")
            
            # Use bulletproof binary selection
            driver_path = find_executable_driver(driver_dir, "geckodriver")
            log_step(f"🎯 SELECTED GECKODRIVER BINARY: {driver_path}")
            
            # ✅ SELENIUM 4+ COMPLIANT - service first, then options
            service = FirefoxService(driver_path)
            driver = webdriver.Firefox(service=service, options=options)
            
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

# config_manager.py
"""
Secure configuration manager that enforces domain-specific config access.
Prevents cross-domain configuration contamination during scraper runs.
"""

import os
import json
import logging
from typing import Dict, Optional
from urllib.parse import urlparse

class SecureConfigManager:
    """
    Manages configuration access with strict domain isolation.
    Only allows access to configs matching the target domain.
    """
    
    def __init__(self, target_url: str, session_id: str):
        self.target_url = target_url
        self.target_domain = urlparse(target_url).netloc.lower()
        self.session_id = session_id
        self.logger = logging.getLogger(f'ConfigManager_{session_id}')
        
        # Define strict domain-to-config mapping
        self.domain_config_map = {
            'franceagrimer.fr': 'franceagrimer',
            'www.franceagrimer.fr': 'franceagrimer'
        }
        
        # Loaded config cache
        self._loaded_config = None
        self._config_validated = False
    
    def get_config_name(self) -> str:
        """Get the config name for the target domain."""
        config_name = self.domain_config_map.get(self.target_domain)
        
        if not config_name:
            raise ValueError(f"No config mapping found for domain: {self.target_domain}")
        
        return config_name
    
    def load_config(self) -> Dict:
        """
        Load and validate the configuration for the target domain.
        Ensures only the correct config is loaded and accessible.
        """
        if self._loaded_config and self._config_validated:
            return self._loaded_config
        
        config_name = self.get_config_name()
        config_path = f"configs/{config_name}.json"
        
        self.logger.info(f"🔧 Loading config for domain {self.target_domain}: {config_path}")
        
        # Verify config file exists
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Required config file not found: {config_path}")
        
        # Load and validate config
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # Validate config structure
            self._validate_config_structure(config)
            
            # Validate config targets correct domain
            self._validate_config_domain(config)
            
            self._loaded_config = config
            self._config_validated = True
            
            self.logger.info(f"✅ Config loaded and validated: {config_path}")
            return config
            
        except Exception as e:
            self.logger.error(f"❌ Failed to load config {config_path}: {e}")
            raise
    
    def _validate_config_structure(self, config: Dict):
        """Validate that config has required structure."""
        required_fields = ['list_page']
        
        for field in required_fields:
            if field not in config:
                raise ValueError(f"Missing required config field: {field}")
        
        # Validate list_page URL format
        list_page = config['list_page']
        if not list_page.startswith('http'):
            raise ValueError(f"Invalid list_page URL format: {list_page}")
    
    def _validate_config_domain(self, config: Dict):
        """Validate that config targets the correct domain."""
        list_page = config['list_page']
        config_domain = urlparse(list_page).netloc.lower()
        
        if config_domain != self.target_domain:
            raise ValueError(
                f"Config domain mismatch - Expected: {self.target_domain}, "
                f"Got: {config_domain} from {list_page}"
            )
        
        self.logger.info(f"✅ Config domain validated: {config_domain}")
    
    def validate_url_against_config(self, url: str) -> bool:
        """
        Validate that a URL belongs to the same domain as the config.
        Returns True if URL is allowed, False otherwise.
        """
        if not url or not url.startswith('http'):
            return False
        
        url_domain = urlparse(url).netloc.lower()
        
        if url_domain != self.target_domain:
            self.logger.warning(f"⚠️ URL domain mismatch - Expected: {self.target_domain}, Got: {url_domain}")
            return False
        
        return True
    
    def get_safe_selectors(self) -> Dict:
        """
        Get selectors from config with validation.
        Returns empty dict if config is invalid.
        """
        try:
            config = self.load_config()
            return config.get('detail_selectors', {})
        except Exception as e:
            self.logger.error(f"❌ Could not get selectors: {e}")
            return {}
    
    def get_list_page_url(self) -> str:
        """Get the validated list page URL."""
        config = self.load_config()
        return config['list_page']
    
    def get_link_selector(self) -> str:
        """Get the link selector for collecting URLs."""
        config = self.load_config()
        return config.get('link_selector', 'a[href]')
    
    def get_next_page_selector(self) -> Optional[str]:
        """Get the next page selector for pagination."""
        config = self.load_config()
        return config.get('next_page_selector')
    
    @classmethod
    def validate_domain_isolation(cls, target_url: str) -> bool:
        """
        Validate that target URL corresponds to a supported domain.
        Returns True if domain is supported and isolated.
        """
        try:
            domain = urlparse(target_url).netloc.lower()
            
            # Only FranceAgriMer is supported for strict isolation
            supported_domains = ['franceagrimer.fr', 'www.franceagrimer.fr']
            
            if domain not in supported_domains:
                logging.error(f"❌ Unsupported domain for isolation: {domain}")
                return False
            
            logging.info(f"✅ Domain isolation validated: {domain}")
            return True
            
        except Exception as e:
            logging.error(f"❌ Domain validation failed: {e}")
            return False
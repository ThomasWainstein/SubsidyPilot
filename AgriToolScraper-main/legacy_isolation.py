# legacy_isolation.py
"""
Isolated wrappers for legacy functions to prevent cross-domain contamination.
Ensures legacy scraper functions respect domain isolation boundaries.
"""

import os
import logging
from typing import List, Dict, Optional
from urllib.parse import urlparse

from config_manager import SecureConfigManager
from utils.run_isolation import RunIsolationManager

class LegacyFunctionBlocker:
    """
    Blocks or redirects legacy function calls that could bypass domain isolation.
    """
    
    def __init__(self, target_domain: str, session_id: str):
        self.target_domain = target_domain
        self.session_id = session_id
        self.logger = logging.getLogger(f'LegacyBlocker_{session_id}')
    
    def block_cross_domain_function(self, function_name: str, attempted_domain: str = None):
        """Block legacy function calls that could contaminate domain isolation."""
        self.logger.error(
            f"🚫 LEGACY FUNCTION BLOCKED: {function_name} "
            f"attempted during {self.target_domain} run"
        )
        
        if attempted_domain and attempted_domain != self.target_domain:
            self.logger.error(
                f"🚨 CROSS-DOMAIN CONTAMINATION PREVENTED: "
                f"Attempted {attempted_domain}, Expected {self.target_domain}"
            )
        
        raise RuntimeError(
            f"Legacy function '{function_name}' blocked to prevent cross-domain contamination. "
            f"Use domain-isolated scraper methods instead."
        )
    
    def validate_legacy_config_access(self, site_name: str) -> bool:
        """Validate that legacy config access matches target domain."""
        expected_site_name = self._get_expected_site_name()
        
        if site_name != expected_site_name:
            self.logger.error(
                f"🚫 INVALID CONFIG ACCESS: Requested '{site_name}', "
                f"Expected '{expected_site_name}' for domain {self.target_domain}"
            )
            return False
        
        return True
    
    def _get_expected_site_name(self) -> str:
        """Get expected site name for the target domain."""
        domain_to_site = {
            'franceagrimer.fr': 'franceagrimer',
            'www.franceagrimer.fr': 'franceagrimer'
        }
        return domain_to_site.get(self.target_domain, 'unknown')

# Global isolation blocker (set during isolated runs)
_active_isolation_blocker: Optional[LegacyFunctionBlocker] = None

def set_active_isolation(target_domain: str, session_id: str):
    """Set active domain isolation for legacy function blocking."""
    global _active_isolation_blocker
    _active_isolation_blocker = LegacyFunctionBlocker(target_domain, session_id)

def clear_active_isolation():
    """Clear active domain isolation."""
    global _active_isolation_blocker
    _active_isolation_blocker = None

def validate_legacy_function_call(function_name: str, site_name: str = None, urls: List[str] = None):
    """
    Validate that a legacy function call respects domain isolation.
    Raises RuntimeError if isolation would be violated.
    """
    if not _active_isolation_blocker:
        # No active isolation - allow call
        return
    
    # Block known contaminating functions during isolated runs
    contaminating_functions = [
        'run_discovery',
        'run_extract_links', 
        'run_fetch_and_extract_smart'
    ]
    
    if function_name in contaminating_functions:
        _active_isolation_blocker.block_cross_domain_function(function_name)
    
    # Validate config access
    if site_name and not _active_isolation_blocker.validate_legacy_config_access(site_name):
        _active_isolation_blocker.block_cross_domain_function(function_name, site_name)
    
    # Validate URL domains
    if urls:
        for url in urls:
            if url and url.startswith('http'):
                url_domain = urlparse(url).netloc.lower()
                if url_domain != _active_isolation_blocker.target_domain:
                    _active_isolation_blocker.block_cross_domain_function(function_name, url_domain)

def isolated_config_loader(site_name: str) -> Dict:
    """
    Domain-isolated config loader that prevents cross-domain config access.
    """
    validate_legacy_function_call('load_config', site_name=site_name)
    
    # If we reach here, the site_name is validated for the active domain
    config_path = f"configs/{site_name}.json"
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Config file not found: {config_path}")
    
    import json
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)
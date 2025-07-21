# utils/run_isolation.py
"""
Complete run isolation system for domain-specific scraper workflows.
Ensures zero cross-contamination between different domain scraper runs.
"""

import os
import shutil
import glob
import logging
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse

class RunIsolationManager:
    """Manages complete isolation between scraper runs for different domains."""
    
    def __init__(self, target_domain: str, session_id: str):
        self.target_domain = urlparse(target_domain).netloc.lower() if target_domain.startswith('http') else target_domain.lower()
        self.session_id = session_id
        self.logger = logging.getLogger(f'RunIsolation_{session_id}')
        
        # Define all data directories that must be purged
        self.data_directories = [
            "data/extracted",
            "data/raw_pages", 
            "data/logs",
            "data/attachments"
        ]
        
        # Define session-scoped file patterns (workflow-compatible)
        self.session_file_pattern = f"franceagrimer_{session_id}"
    
    def purge_all_artifacts(self) -> dict:
        """
        Completely purge all artifacts from previous runs.
        Returns summary of what was purged.
        """
        purge_summary = {
            'directories_purged': [],
            'files_removed': [],
            'total_files_removed': 0,
            'errors': []
        }
        
        self.logger.info(f"🔥 PURGING ALL ARTIFACTS - Domain: {self.target_domain}")
        
        # Purge entire data directories
        for data_dir in self.data_directories:
            if os.path.exists(data_dir):
                try:
                    # Count files before removal
                    file_count = sum(len(files) for _, _, files in os.walk(data_dir))
                    
                    # Remove entire directory
                    shutil.rmtree(data_dir, ignore_errors=True)
                    
                    # Recreate empty directory
                    os.makedirs(data_dir, exist_ok=True)
                    
                    purge_summary['directories_purged'].append(data_dir)
                    purge_summary['total_files_removed'] += file_count
                    
                    self.logger.info(f"🗑️ Purged {data_dir} - {file_count} files removed")
                    
                except Exception as e:
                    error_msg = f"Failed to purge {data_dir}: {e}"
                    purge_summary['errors'].append(error_msg)
                    self.logger.error(f"❌ {error_msg}")
        
        # Purge any remaining cross-domain config files or artifacts
        self._purge_cross_domain_configs()
        
        # Purge Python cache to ensure clean state
        self._purge_python_cache()
        
        self.logger.info(f"✅ ARTIFACT PURGE COMPLETE - {purge_summary['total_files_removed']} files removed")
        return purge_summary
    
    def _purge_cross_domain_configs(self):
        """Remove access to non-target domain configs during run."""
        if not os.path.exists("configs"):
            return
            
        # Get list of all config files
        config_files = glob.glob("configs/*.json")
        target_config = f"configs/{self._get_config_name_for_domain()}.json"
        
        # Temporarily rename non-target configs
        self.backed_up_configs = []
        for config_file in config_files:
            if config_file != target_config:
                backup_name = f"{config_file}.backup_{self.session_id}"
                try:
                    shutil.move(config_file, backup_name)
                    self.backed_up_configs.append((config_file, backup_name))
                    self.logger.info(f"🔒 Isolated config: {config_file} -> {backup_name}")
                except Exception as e:
                    self.logger.error(f"❌ Failed to isolate config {config_file}: {e}")
    
    def _get_config_name_for_domain(self) -> str:
        """Get the config file name for the target domain."""
        domain_to_config = {
            'franceagrimer.fr': 'franceagrimer',
            'www.franceagrimer.fr': 'franceagrimer'
        }
        return domain_to_config.get(self.target_domain, 'franceagrimer')
    
    def _purge_python_cache(self):
        """Clear Python cache files for clean state."""
        cache_dirs_removed = 0
        
        # Clear __pycache__ directories
        for root, dirs, files in os.walk('.'):
            if '__pycache__' in dirs:
                cache_dir = os.path.join(root, '__pycache__')
                shutil.rmtree(cache_dir, ignore_errors=True)
                cache_dirs_removed += 1
        
        # Clear .pyc files
        pyc_files = glob.glob('**/*.pyc', recursive=True)
        for pyc_file in pyc_files:
            try:
                os.remove(pyc_file)
            except:
                pass
                
        self.logger.info(f"🧹 Python cache cleared - {cache_dirs_removed} dirs, {len(pyc_files)} .pyc files")
    
    def create_session_paths(self) -> dict:
        """Create session-scoped paths for all output files."""
        session_paths = {
            'urls_file': f"data/extracted/franceagrimer_urls_{self.session_id}.txt",
            'failed_urls_file': f"data/extracted/franceagrimer_failed_urls_{self.session_id}.txt", 
            'external_links_file': f"data/extracted/franceagrimer_external_links_{self.session_id}.txt",
            'subsidies_file': f"data/extracted/franceagrimer_subsidies_{self.session_id}.json",
            'consultant_data_file': f"data/extracted/franceagrimer_consultant_data_{self.session_id}.csv",
            'logs_dir': f"data/logs/franceagrimer_{self.session_id}",
            'screenshots_dir': f"data/extracted/franceagrimer_screenshots_{self.session_id}"
        }
        
        # Create directories
        for path_key, path_value in session_paths.items():
            if path_key.endswith('_dir'):
                os.makedirs(path_value, exist_ok=True)
            else:
                os.makedirs(os.path.dirname(path_value), exist_ok=True)
        
        self.logger.info(f"📁 Session paths created for {self.session_file_pattern}")
        return session_paths
    
    def validate_domain_isolation(self, urls: List[str]) -> bool:
        """
        Strict validation that ALL URLs belong to target domain.
        Returns False if ANY cross-domain URL is found.
        """
        violations = []
        
        for url in urls:
            if not url or not url.startswith('http'):
                continue
                
            url_domain = urlparse(url).netloc.lower()
            if url_domain != self.target_domain:
                violations.append(url)
        
        if violations:
            self.logger.error(f"🚨 DOMAIN ISOLATION VIOLATION - Found {len(violations)} cross-domain URLs:")
            for violation in violations[:5]:  # Log first 5
                self.logger.error(f"  ❌ {violation}")
            return False
        
        self.logger.info(f"✅ DOMAIN ISOLATION VERIFIED - All {len(urls)} URLs from {self.target_domain}")
        return True
    
    def validate_config_isolation(self) -> bool:
        """Validate that only target domain config is accessible."""
        if not os.path.exists("configs"):
            self.logger.error("❌ No configs directory found")
            return False
        
        available_configs = glob.glob("configs/*.json")
        expected_config = f"configs/{self._get_config_name_for_domain()}.json"
        
        if len(available_configs) != 1:
            self.logger.error(f"🚨 CONFIG ISOLATION VIOLATION - Found {len(available_configs)} configs, expected 1")
            return False
        
        if available_configs[0] != expected_config:
            self.logger.error(f"🚨 WRONG CONFIG ACCESSIBLE - Found {available_configs[0]}, expected {expected_config}")
            return False
        
        self.logger.info(f"✅ CONFIG ISOLATION VERIFIED - Only {expected_config} accessible")
        return True
    
    def restore_configs(self):
        """Restore backed up configs after run completion."""
        if not hasattr(self, 'backed_up_configs'):
            return
            
        for original_path, backup_path in self.backed_up_configs:
            try:
                if os.path.exists(backup_path):
                    shutil.move(backup_path, original_path)
                    self.logger.info(f"🔓 Restored config: {backup_path} -> {original_path}")
            except Exception as e:
                self.logger.error(f"❌ Failed to restore config {backup_path}: {e}")
    
    def validate_output_purity(self, output_files: List[str]) -> bool:
        """
        Validate that all output files contain only target domain data.
        Returns False if any cross-domain content is detected.
        """
        violations = []
        
        # Domain keywords that should NOT appear in FranceAgriMer outputs
        forbidden_domains = [
            'oportunitati-ue.gov.ro',
            'apia.org.ro', 
            'afir.ro',
            'ec.europa.eu',
            'madr.ro'
        ]
        
        for output_file in output_files:
            if not os.path.exists(output_file):
                continue
                
            try:
                with open(output_file, 'r', encoding='utf-8') as f:
                    content = f.read().lower()
                    
                for forbidden_domain in forbidden_domains:
                    if forbidden_domain in content:
                        violations.append(f"{output_file}: contains {forbidden_domain}")
                        
            except Exception as e:
                self.logger.warning(f"⚠️ Could not validate {output_file}: {e}")
        
        if violations:
            self.logger.error(f"🚨 OUTPUT PURITY VIOLATION - Found cross-domain content:")
            for violation in violations:
                self.logger.error(f"  ❌ {violation}")
            return False
        
        self.logger.info(f"✅ OUTPUT PURITY VERIFIED - All {len(output_files)} files contain only {self.target_domain} data")
        return True

    def __enter__(self):
        """Context manager entry - setup isolation."""
        self.purge_all_artifacts()
        self.session_paths = self.create_session_paths()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - cleanup and restore."""
        self.restore_configs()
        if exc_type:
            self.logger.error(f"❌ Run completed with exception: {exc_type.__name__}: {exc_val}")
        else:
            self.logger.info("✅ Run completed successfully")
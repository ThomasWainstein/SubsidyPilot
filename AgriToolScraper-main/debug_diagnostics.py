# debug_diagnostics.py
"""
Ruthless debugging and diagnostics system for AgriToolScraper.
Comprehensive environment checks, system profiling, and artifact collection.
"""

import os
import sys
import json
import time
import traceback
import inspect
import subprocess
import shutil
import platform
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any


class RuthlessDebugger:
    """Comprehensive debugging and diagnostics system."""
    
    def __init__(self, session_id: str = None):
        self.session_id = session_id or datetime.now().strftime("%Y%m%d_%H%M%S")
        self.diagnostics = {
            'session_id': self.session_id,
            'start_time': datetime.utcnow().isoformat(),
            'environment': {},
            'system': {},
            'dependencies': {},
            'browsers': {},
            'drivers': {},
            'errors': [],
            'warnings': [],
            'artifacts': [],
            'post_mortem': {}
        }
        
        # Create logs directory
        self.logs_dir = Path("data/logs")
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        
        # Setup ruthless logging
        self.setup_ruthless_logging()
        
        # Start diagnostic collection
        self.collect_preflight_diagnostics()
    
    def setup_ruthless_logging(self):
        """Setup comprehensive logging configuration."""
        log_file = self.logs_dir / f"ruthless_debug_{self.session_id}.log"
        
        # Configure root logger for DEBUG level
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler(sys.stdout)
            ],
            force=True
        )
        
        # Set all known loggers to DEBUG
        loggers_to_debug = [
            'selenium',
            'webdriver_manager',
            'urllib3',
            'requests',
            'selenium.webdriver.remote.remote_connection',
            'webdriver_manager.chrome',
            'webdriver_manager.firefox',
            'webdriver_manager.core',
        ]
        
        for logger_name in loggers_to_debug:
            logger = logging.getLogger(logger_name)
            logger.setLevel(logging.DEBUG)
        
        # Enable webdriver-manager verbose logging
        os.environ['WDM_LOG'] = '1'
        os.environ['WDM_LOG_LEVEL'] = 'DEBUG'
        
        self.logger = logging.getLogger(f'RuthlessDebugger_{self.session_id}')
        self.logger.info(f"🔥 RUTHLESS DEBUGGING ACTIVATED - Session: {self.session_id}")
        self.logger.info(f"📝 Debug log: {log_file}")
    
    def log_with_context(self, level: str, message: str, **kwargs):
        """Log with full context including file and line number."""
        frame = inspect.currentframe().f_back
        filename = frame.f_code.co_filename
        line_number = frame.f_lineno
        function_name = frame.f_code.co_name
        
        context_msg = f"[{Path(filename).name}:{line_number}:{function_name}] {message}"
        
        if kwargs:
            context_msg += f" | Context: {kwargs}"
        
        getattr(self.logger, level.lower())(context_msg)
    
    def collect_preflight_diagnostics(self):
        """Collect comprehensive system and environment diagnostics."""
        self.logger.info("🚀 Starting preflight diagnostics collection")
        
        try:
            # Environment variables
            self.diagnostics['environment'] = dict(os.environ)
            self.log_environment_details()
            
            # System information
            self.collect_system_info()
            
            # Python and dependency information
            self.collect_dependency_info()
            
            # Browser and driver availability
            self.collect_browser_info()
            
            # Network connectivity
            self.collect_network_info()
            
            # Display/X11 information
            self.collect_display_info()
            
        except Exception as e:
            self.logger.error(f"❌ Preflight diagnostics failed: {e}")
            self.logger.error(traceback.format_exc())
    
    def log_environment_details(self):
        """Log critical environment variables."""
        critical_vars = [
            'DISPLAY', 'BROWSER', 'WDM_LOG', 'HOME', 'PATH',
            'DB_GITHUB_SCRAPER', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TARGET_URL',
            'MAX_PAGES', 'DRY_RUN', 'CHROME_BIN', 'GOOGLE_CHROME_BIN'
        ]
        
        self.logger.info("🔧 Environment Variables:")
        for var in critical_vars:
            value = os.environ.get(var, 'NOT_SET')
            # Mask sensitive variables
            if 'KEY' in var or 'SECRET' in var:
                value = '***MASKED***' if value != 'NOT_SET' else 'NOT_SET'
            self.logger.info(f"  {var}={value}")
    
    def collect_system_info(self):
        """Collect system information."""
        try:
            self.diagnostics['system'] = {
                'platform': platform.platform(),
                'system': platform.system(),
                'release': platform.release(),
                'version': platform.version(),
                'machine': platform.machine(),
                'processor': platform.processor(),
                'python_version': sys.version,
                'python_executable': sys.executable,
                'working_directory': os.getcwd(),
                'user': os.environ.get('USER', 'unknown'),
                'home': os.environ.get('HOME', 'unknown')
            }
            
            self.logger.info(f"💻 System: {platform.platform()}")
            self.logger.info(f"🐍 Python: {sys.version}")
            self.logger.info(f"📁 Working Dir: {os.getcwd()}")
            
        except Exception as e:
            self.logger.error(f"❌ System info collection failed: {e}")
    
    def collect_dependency_info(self):
        """Collect Python package and dependency information."""
        try:
            # Get pip freeze output
            result = subprocess.run(
                [sys.executable, '-m', 'pip', 'freeze'],
                capture_output=True, text=True, timeout=30
            )
            
            if result.returncode == 0:
                packages = {}
                for line in result.stdout.split('\n'):
                    if '==' in line:
                        name, version = line.split('==', 1)
                        packages[name] = version
                
                self.diagnostics['dependencies'] = packages
                
                # Log critical packages
                critical_packages = ['selenium', 'webdriver-manager', 'requests', 'urllib3']
                self.logger.info("📦 Critical Packages:")
                for pkg in critical_packages:
                    version = packages.get(pkg, 'NOT_INSTALLED')
                    self.logger.info(f"  {pkg}=={version}")
                
                # Save full package list
                freeze_file = self.logs_dir / f"pip_freeze_{self.session_id}.txt"
                with open(freeze_file, 'w') as f:
                    f.write(result.stdout)
                self.diagnostics['artifacts'].append(str(freeze_file))
            
        except Exception as e:
            self.logger.error(f"❌ Dependency info collection failed: {e}")
    
    def collect_browser_info(self):
        """Collect browser and driver information."""
        browsers = {}
        
        # Check Chromium
        for binary in ['chromium-browser', 'google-chrome', 'chromium', 'chrome']:
            try:
                result = subprocess.run(
                    ['which', binary], capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0:
                    path = result.stdout.strip()
                    # Get version
                    version_result = subprocess.run(
                        [binary, '--version'], capture_output=True, text=True, timeout=10
                    )
                    version = version_result.stdout.strip() if version_result.returncode == 0 else 'unknown'
                    
                    browsers[binary] = {
                        'path': path,
                        'version': version,
                        'exists': True
                    }
                    self.logger.info(f"🌐 Found browser: {binary} at {path} ({version})")
                else:
                    browsers[binary] = {'exists': False}
            except Exception as e:
                browsers[binary] = {'exists': False, 'error': str(e)}
                self.logger.warning(f"⚠️ Browser check failed for {binary}: {e}")
        
        self.diagnostics['browsers'] = browsers
        
        # Check driver paths and permissions
        self.check_driver_locations()
    
    def check_driver_locations(self):
        """Check common driver locations and .wdm cache."""
        driver_info = {}
        
        # Check .wdm directory
        wdm_dir = Path.home() / '.wdm'
        if wdm_dir.exists():
            self.logger.info(f"📂 Found .wdm directory at {wdm_dir}")
            
            # List all files in .wdm
            try:
                for root, dirs, files in os.walk(wdm_dir):
                    for file in files:
                        file_path = Path(root) / file
                        stat_info = file_path.stat()
                        
                        # Check if it's an executable
                        is_executable = bool(stat_info.st_mode & 0o111)
                        
                        # Get file type
                        try:
                            file_result = subprocess.run(
                                ['file', str(file_path)], capture_output=True, text=True, timeout=5
                            )
                            file_type = file_result.stdout.strip() if file_result.returncode == 0 else 'unknown'
                        except:
                            file_type = 'unknown'
                        
                        driver_info[str(file_path)] = {
                            'size': stat_info.st_size,
                            'permissions': oct(stat_info.st_mode)[-3:],
                            'is_executable': is_executable,
                            'file_type': file_type,
                            'modified': datetime.fromtimestamp(stat_info.st_mtime).isoformat()
                        }
                        
                        self.logger.debug(f"📄 {file_path}: {file_type} | {stat_info.st_size} bytes | {oct(stat_info.st_mode)[-3:]} | exec={is_executable}")
            
            except Exception as e:
                self.logger.error(f"❌ Failed to analyze .wdm directory: {e}")
        else:
            self.logger.info("📂 No .wdm directory found")
        
        self.diagnostics['drivers'] = driver_info
    
    def collect_network_info(self):
        """Collect network connectivity information."""
        try:
            # Test basic connectivity
            test_urls = ['https://www.google.com', 'https://github.com']
            
            for url in test_urls:
                try:
                    result = subprocess.run(
                        ['curl', '-I', '--max-time', '10', url],
                        capture_output=True, text=True, timeout=15
                    )
                    if result.returncode == 0:
                        self.logger.info(f"🌐 Network test OK: {url}")
                    else:
                        self.logger.warning(f"⚠️ Network test failed: {url}")
                except Exception as e:
                    self.logger.warning(f"⚠️ Network test error for {url}: {e}")
        
        except Exception as e:
            self.logger.error(f"❌ Network info collection failed: {e}")
    
    def collect_display_info(self):
        """Collect display and X11 information."""
        try:
            display = os.environ.get('DISPLAY', 'NOT_SET')
            self.logger.info(f"🖥️ DISPLAY={display}")
            
            if display != 'NOT_SET':
                # Test display availability
                try:
                    result = subprocess.run(
                        ['xdpyinfo'], capture_output=True, text=True, timeout=10
                    )
                    if result.returncode == 0:
                        self.logger.info("🖥️ Display server responding")
                    else:
                        self.logger.warning(f"⚠️ Display server not responding: {result.stderr}")
                except Exception as e:
                    self.logger.warning(f"⚠️ Display test failed: {e}")
        
        except Exception as e:
            self.logger.error(f"❌ Display info collection failed: {e}")
    
    def wrap_with_exception_trap(self, func, *args, **kwargs):
        """Wrap any function with comprehensive exception handling."""
        func_name = getattr(func, '__name__', str(func))
        self.logger.info(f"🎯 Entering function: {func_name}")
        
        try:
            result = func(*args, **kwargs)
            self.logger.info(f"✅ Function completed: {func_name}")
            return result
        
        except Exception as e:
            # Capture full exception context
            exc_info = {
                'function': func_name,
                'args': str(args)[:200],  # Limit arg length
                'kwargs': str(kwargs)[:200],
                'exception_type': type(e).__name__,
                'exception_message': str(e),
                'traceback': traceback.format_exc(),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            self.diagnostics['errors'].append(exc_info)
            
            self.logger.error(f"❌ EXCEPTION in {func_name}: {type(e).__name__}: {e}")
            self.logger.error(f"📍 Full traceback:\n{traceback.format_exc()}")
            
            # Add to post-mortem
            self.add_post_mortem_context(exc_info)
            
            raise
    
    def add_post_mortem_context(self, exc_info: Dict):
        """Add context for post-mortem analysis."""
        post_mortem = {
            'exception_details': exc_info,
            'system_state': {
                'memory_usage': self.get_memory_usage(),
                'disk_usage': self.get_disk_usage(),
                'process_list': self.get_running_processes()
            },
            'environment_snapshot': dict(os.environ),
            'recent_logs': self.get_recent_logs()
        }
        
        self.diagnostics['post_mortem'] = post_mortem
        
        self.logger.error("🏥 POST-MORTEM CONTEXT CAPTURED")
        self.logger.error(f"Memory: {post_mortem['system_state']['memory_usage']}")
        self.logger.error(f"Disk: {post_mortem['system_state']['disk_usage']}")
    
    def get_memory_usage(self) -> str:
        """Get current memory usage."""
        try:
            result = subprocess.run(['free', '-h'], capture_output=True, text=True, timeout=5)
            return result.stdout if result.returncode == 0 else 'unknown'
        except:
            return 'unknown'
    
    def get_disk_usage(self) -> str:
        """Get current disk usage."""
        try:
            result = subprocess.run(['df', '-h'], capture_output=True, text=True, timeout=5)
            return result.stdout if result.returncode == 0 else 'unknown'
        except:
            return 'unknown'
    
    def get_running_processes(self) -> str:
        """Get running processes related to browsers/drivers."""
        try:
            result = subprocess.run(
                ['ps', 'aux'], capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                # Filter for relevant processes
                lines = result.stdout.split('\n')
                relevant = [line for line in lines if any(
                    keyword in line.lower() for keyword in 
                    ['chrome', 'chromium', 'firefox', 'driver', 'xvfb']
                )]
                return '\n'.join(relevant)
            return 'unknown'
        except:
            return 'unknown'
    
    def get_recent_logs(self) -> List[str]:
        """Get recent log entries."""
        try:
            log_file = self.logs_dir / f"ruthless_debug_{self.session_id}.log"
            if log_file.exists():
                with open(log_file, 'r') as f:
                    lines = f.readlines()
                    return lines[-50:]  # Last 50 lines
            return []
        except:
            return []
    
    def save_final_diagnostics(self, success: bool = False):
        """Save comprehensive diagnostics report."""
        self.diagnostics['end_time'] = datetime.utcnow().isoformat()
        self.diagnostics['success'] = success
        self.diagnostics['total_errors'] = len(self.diagnostics['errors'])
        self.diagnostics['total_warnings'] = len(self.diagnostics['warnings'])
        
        # Save main diagnostics
        diagnostics_file = self.logs_dir / f"diagnostics_{self.session_id}.json"
        with open(diagnostics_file, 'w', encoding='utf-8') as f:
            json.dump(self.diagnostics, f, indent=2, default=str)
        
        # Create summary report
        summary_file = self.logs_dir / f"summary_{self.session_id}.txt"
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write(f"RUTHLESS DIAGNOSTICS SUMMARY - Session: {self.session_id}\n")
            f.write("=" * 80 + "\n")
            f.write(f"Success: {success}\n")
            f.write(f"Errors: {len(self.diagnostics['errors'])}\n")
            f.write(f"Warnings: {len(self.diagnostics['warnings'])}\n")
            f.write(f"Artifacts: {len(self.diagnostics['artifacts'])}\n")
            f.write(f"Start: {self.diagnostics['start_time']}\n")
            f.write(f"End: {self.diagnostics['end_time']}\n")
            f.write("\n")
            
            if self.diagnostics['errors']:
                f.write("ERRORS:\n")
                for i, error in enumerate(self.diagnostics['errors'][-5:], 1):
                    f.write(f"{i}. {error['function']}: {error['exception_message']}\n")
                f.write("\n")
            
            f.write("ARTIFACTS:\n")
            for artifact in self.diagnostics['artifacts']:
                f.write(f"- {artifact}\n")
        
        # Mark success or failure clearly
        status = "SUCCESS" if success else "FAILED"
        status_file = self.logs_dir / f"status_{self.session_id}.txt"
        with open(status_file, 'w') as f:
            f.write(f"{status}\n")
            f.write(f"Session: {self.session_id}\n")
            f.write(f"Time: {datetime.utcnow().isoformat()}\n")
        
        self.logger.info(f"🎯 FINAL STATUS: {status}")
        self.logger.info(f"📊 Diagnostics saved: {diagnostics_file}")
        self.logger.info(f"📋 Summary saved: {summary_file}")
        
        return {
            'diagnostics_file': str(diagnostics_file),
            'summary_file': str(summary_file),
            'status_file': str(status_file),
            'status': status
        }


# Global debugger instance
_global_debugger: Optional[RuthlessDebugger] = None


def get_ruthless_debugger(session_id: str = None) -> RuthlessDebugger:
    """Get or create global debugger instance."""
    global _global_debugger
    if _global_debugger is None:
        _global_debugger = RuthlessDebugger(session_id)
    return _global_debugger


def ruthless_trap(func):
    """Decorator to wrap functions with ruthless exception handling."""
    def wrapper(*args, **kwargs):
        debugger = get_ruthless_debugger()
        return debugger.wrap_with_exception_trap(func, *args, **kwargs)
    return wrapper


def log_step(message: str, **kwargs):
    """Log a pipeline step with context."""
    debugger = get_ruthless_debugger()
    debugger.log_with_context('info', f"🔄 STEP: {message}", **kwargs)


def log_error(message: str, **kwargs):
    """Log an error with context."""
    debugger = get_ruthless_debugger()
    debugger.log_with_context('error', f"❌ ERROR: {message}", **kwargs)


def log_warning(message: str, **kwargs):
    """Log a warning with context."""
    debugger = get_ruthless_debugger()
    debugger.log_with_context('warning', f"⚠️ WARNING: {message}", **kwargs)
#!/usr/bin/env python3
"""
Tika Server Manager - Utility to start, stop, and manage Apache Tika server
for the AgriTool PDF extraction pipeline.

Usage:
    python tika_server_manager.py start    # Start Tika server
    python tika_server_manager.py stop     # Stop Tika server  
    python tika_server_manager.py status   # Check server status
    python tika_server_manager.py restart  # Restart server
"""

import sys
import subprocess
import requests
import time
import logging
import signal
import os
from pathlib import Path


class TikaServerManager:
    def __init__(self, port=9998, jar_path=None):
        self.port = port
        self.jar_path = jar_path or self._download_tika_jar()
        self.server_url = f"http://localhost:{port}"
        self.pid_file = Path("/tmp/tika-server.pid")
        
        # Set up logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)

    def _download_tika_jar(self):
        """Download Tika server JAR if not present"""
        jar_path = Path("/tmp/tika-server.jar")
        
        if not jar_path.exists():
            self.logger.info("📥 Downloading Tika server JAR...")
            import urllib.request
            
            # Download latest stable Tika server
            tika_url = "https://archive.apache.org/dist/tika/3.1.0/tika-server-standard-3.1.0.jar"
            urllib.request.urlretrieve(tika_url, jar_path)
            self.logger.info(f"✅ Downloaded Tika server to {jar_path}")
        
        return str(jar_path)

    def start_server(self):
        """Start the Tika server"""
        if self.is_running():
            self.logger.info("✅ Tika server is already running")
            return True

        try:
            self.logger.info(f"🚀 Starting Tika server on port {self.port}...")
            
            # Start Tika server with proper configuration
            cmd = [
                "java",
                "-jar", self.jar_path,
                "--port", str(self.port),
                "--host", "localhost"
            ]
            
            # Start process in background
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid  # Create new process group
            )
            
            # Save PID for later management
            with open(self.pid_file, 'w') as f:
                f.write(str(process.pid))
            
            # Wait for server to start (up to 30 seconds)
            for attempt in range(30):
                time.sleep(1)
                if self.is_running():
                    self.logger.info("✅ Tika server started successfully")
                    return True
                    
            self.logger.error("❌ Tika server failed to start within 30 seconds")
            return False
            
        except Exception as e:
            self.logger.error(f"❌ Failed to start Tika server: {e}")
            return False

    def stop_server(self):
        """Stop the Tika server"""
        if not self.pid_file.exists():
            self.logger.info("ℹ️ No PID file found, server may not be running")
            return True

        try:
            with open(self.pid_file, 'r') as f:
                pid = int(f.read().strip())
            
            self.logger.info(f"🛑 Stopping Tika server (PID: {pid})...")
            
            # Try graceful shutdown first
            os.killpg(pid, signal.SIGTERM)
            
            # Wait up to 10 seconds for graceful shutdown
            for _ in range(10):
                time.sleep(1)
                if not self.is_running():
                    break
            else:
                # Force kill if still running
                self.logger.warning("⚠️ Forcing server shutdown...")
                os.killpg(pid, signal.SIGKILL)
            
            # Clean up PID file
            self.pid_file.unlink()
            self.logger.info("✅ Tika server stopped")
            return True
            
        except (ProcessLookupError, FileNotFoundError):
            self.logger.info("ℹ️ Server was not running")
            if self.pid_file.exists():
                self.pid_file.unlink()
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to stop server: {e}")
            return False

    def is_running(self):
        """Check if Tika server is running and responsive"""
        try:
            response = requests.get(f"{self.server_url}/tika/version", timeout=5)
            return response.status_code == 200
        except:
            return False

    def get_status(self):
        """Get detailed server status"""
        if self.is_running():
            try:
                response = requests.get(f"{self.server_url}/tika/version", timeout=5)
                version = response.text.strip()
                self.logger.info(f"✅ Tika server is running (version: {version})")
                return True
            except Exception as e:
                self.logger.error(f"⚠️ Server running but not responding properly: {e}")
                return False
        else:
            self.logger.info("❌ Tika server is not running")
            return False

    def restart_server(self):
        """Restart the Tika server"""
        self.logger.info("🔄 Restarting Tika server...")
        self.stop_server()
        time.sleep(2)
        return self.start_server()


def main():
    """Command line interface for Tika server management"""
    if len(sys.argv) != 2:
        print("Usage: python tika_server_manager.py {start|stop|status|restart}")
        sys.exit(1)
    
    manager = TikaServerManager()
    command = sys.argv[1].lower()
    
    if command == "start":
        success = manager.start_server()
    elif command == "stop":
        success = manager.stop_server()
    elif command == "status":
        success = manager.get_status()
    elif command == "restart":
        success = manager.restart_server()
    else:
        print(f"Unknown command: {command}")
        print("Usage: python tika_server_manager.py {start|stop|status|restart}")
        sys.exit(1)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
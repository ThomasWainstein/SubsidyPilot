#!/usr/bin/env python3
"""
Enhanced FranceAgriMer Scraper Job Controller
Manages execution of Selenium compliance and scraper operations
"""

import sys
import subprocess
import json
import time
from datetime import datetime
from typing import Dict, Any

def print_banner(message: str, symbol: str = "🔥"):
    """Print formatted banner message"""
    print(f"\n{symbol} {message}")
    print("=" * 80)

def run_command(command: list, description: str) -> tuple[bool, str]:
    """
    Run a command and return success status with output
    """
    print_banner(f"EXECUTING: {description}")
    print(f"Command: {' '.join(command)}")
    
    try:
        result = subprocess.run(
            command, 
            capture_output=True, 
            text=True, 
            timeout=300
        )
        
        if result.returncode == 0:
            print(f"✅ {description} - SUCCESS")
            return True, result.stdout
        else:
            print(f"❌ {description} - FAILED")
            print(f"STDERR: {result.stderr}")
            print(f"STDOUT: {result.stdout}")
            return False, result.stderr
            
    except subprocess.TimeoutExpired:
        print(f"⏰ {description} - TIMEOUT")
        return False, "Command timed out"
    except Exception as e:
        print(f"💥 {description} - EXCEPTION: {e}")
        return False, str(e)

def main():
    """
    Main job controller - executes complete DevOps pipeline
    """
    start_time = datetime.now()
    job_log = {
        "start_time": start_time.isoformat(),
        "steps": [],
        "status": "RUNNING"
    }
    
    print_banner("AUTOMATED DEVOPS PIPELINE STARTING", "🚀")
    print(f"Start Time: {start_time}")
    
    # Step 1: Selenium 4+ Compliance Enforcement
    step1_success, step1_output = run_command(
        [sys.executable, "AgriToolScraper-main/validate_selenium_compliance.py"],
        "SELENIUM 4+ COMPLIANCE VALIDATION"
    )
    job_log["steps"].append({
        "step": "selenium_compliance",
        "success": step1_success,
        "output": step1_output[:1000]  # Truncate for log size
    })
    
    if not step1_success:
        print_banner("PIPELINE FAILED - SELENIUM 4+ VIOLATIONS", "❌")
        job_log["status"] = "FAILED"
        job_log["failure_reason"] = "Selenium 4+ compliance violations detected"
        print(json.dumps(job_log, indent=2))
        sys.exit(1)
    
    # Step 2: Cache Clear
    step2_success, step2_output = run_command(
        [sys.executable, "AgriToolScraper-main/clear_cache.py"],
        "PYTHON CACHE CLEARING"
    )
    job_log["steps"].append({
        "step": "cache_clear", 
        "success": step2_success,
        "output": step2_output[:1000]
    })
    
    if not step2_success:
        print_banner("PIPELINE FAILED - CACHE CLEAR ERROR", "❌")
        job_log["status"] = "FAILED"
        job_log["failure_reason"] = "Python cache clearing failed"
        print(json.dumps(job_log, indent=2))
        sys.exit(1)
    
    # Step 3: Driver Compliance Test
    step3_success, step3_output = run_command(
        [sys.executable, "AgriToolScraper-main/test_driver_compliance.py"],
        "DRIVER INITIALIZATION TEST"
    )
    job_log["steps"].append({
        "step": "driver_test",
        "success": step3_success, 
        "output": step3_output[:1000]
    })
    
    if not step3_success:
        print_banner("PIPELINE FAILED - DRIVER TEST ERROR", "❌")
        job_log["status"] = "FAILED"
        job_log["failure_reason"] = "Driver initialization test failed"
        print(json.dumps(job_log, indent=2))
        sys.exit(1)
    
    # Step 4: FranceAgriMer Scraper Execution
    scraper_command = [
        sys.executable, 
        "AgriToolScraper-main/main.py",
        "--target-url", "https://www.afir.info/",
        "--max-pages", "0"
    ]
    
    step4_success, step4_output = run_command(
        scraper_command,
        "FRANCEAGRIMER SCRAPER EXECUTION"
    )
    job_log["steps"].append({
        "step": "scraper_execution",
        "success": step4_success,
        "output": step4_output[:2000]  # Larger output for scraper
    })
    
    # Final Status
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    job_log["end_time"] = end_time.isoformat()
    job_log["duration_seconds"] = duration
    
    if step4_success:
        job_log["status"] = "SUCCESS"
        print_banner("PIPELINE COMPLETED SUCCESSFULLY", "🎉")
        print(f"✅ All steps completed")
        print(f"⏱️ Total duration: {duration:.2f} seconds")
        print(f"🇫🇷 FranceAgriMer scraper executed successfully")
        sys.exit(0)
    else:
        job_log["status"] = "FAILED"
        job_log["failure_reason"] = "FranceAgriMer scraper execution failed"
        print_banner("PIPELINE FAILED - SCRAPER ERROR", "❌")
        print(f"❌ Scraper execution failed")
        print(f"⏱️ Duration before failure: {duration:.2f} seconds")
        sys.exit(1)
    
    # Save job log
    finally:
        with open("job_execution_log.json", "w") as f:
            json.dump(job_log, f, indent=2)
        print(f"\n📋 Job log saved to: job_execution_log.json")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Ensures all required log files and artifacts exist for CI/CD upload
Run this at the start of every pipeline job to guarantee artifact availability
"""

import os
from pathlib import Path
from datetime import datetime


def ensure_pipeline_artifacts():
    """Create all required directories and stub files for pipeline artifacts"""
    
    # Required directories
    directories = [
        "logs",
        "data/logs", 
        "data/raw_pages",
        "data/attachments",
        "artifacts"
    ]
    
    # Required log files (will be created if missing)
    log_files = [
        "logs/ci_stub.log",
        "logs/scraper.log",
        "logs/uploader.log",
        "logs/ai_extractor.log",
        "logs/qa_results.log",
        "logs/pipeline_status.log",
        "data/logs/scraper.log",
        "data/logs/uploader.log",
        "data/logs/ai_extractor.log"
    ]
    
    # Required marker files
    marker_files = [
        "data/raw_pages/.gitkeep",
        "data/attachments/.gitkeep",
        "artifacts/.gitkeep"
    ]
    
    timestamp = datetime.now().isoformat()
    
    print("🔧 Ensuring pipeline artifacts exist...")
    
    # Create directories
    for directory in directories:
        path = Path(directory)
        path.mkdir(parents=True, exist_ok=True)
        print(f"✅ Directory: {directory}")
    
    # Create log files
    for log_file in log_files:
        path = Path(log_file)
        if not path.exists():
            with open(path, 'w') as f:
                f.write(f"# {path.stem} log file created for CI/CD at {timestamp}\n")
                f.write(f"# This ensures artifact upload compatibility\n")
        print(f"✅ Log file: {log_file}")
    
    # Create marker files
    for marker_file in marker_files:
        path = Path(marker_file)
        path.touch()
        print(f"✅ Marker file: {marker_file}")
    
    # Create pipeline start marker
    with open("logs/pipeline_started.txt", "w") as f:
        f.write(f"Pipeline started at {timestamp}\n")
        f.write(f"All required artifacts initialized\n")
    
    print("✅ All pipeline artifacts ensured!")


if __name__ == "__main__":
    ensure_pipeline_artifacts()
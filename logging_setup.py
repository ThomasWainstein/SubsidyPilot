#!/usr/bin/env python3
"""
Minimal logging setup stub for CI/CD compatibility
Prevents import failures in QA jobs when full scraper module is not available
"""

import logging
import os
from pathlib import Path
from datetime import datetime


def setup_pipeline_logging(component_name: str, log_level: str = "INFO") -> logging.Logger:
    """
    Minimal logging setup for CI/CD environments
    
    Args:
        component_name: Name of the component
        log_level: Logging level
    
    Returns:
        Basic logger instance
    """
    # Ensure logs directory exists
    log_dir = Path("logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Create basic log file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"{component_name}_{timestamp}.log"
    
    # Configure logger
    logger = logging.getLogger(component_name)
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # File handler
    file_handler = logging.FileHandler(log_file, mode='w')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    logger.addHandler(file_handler)
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, log_level.upper()))
    console_handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
    logger.addHandler(console_handler)
    
    logger.info(f"=== {component_name.upper()} STARTED ===")
    return logger


def ensure_artifact_files():
    """Ensure minimum log files exist for CI upload"""
    required_paths = [
        "logs/ci_stub.log",
        "logs/qa_results.log",
        "logs/pipeline_status.log"
    ]
    
    for file_path in required_paths:
        path = Path(file_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        if not path.exists():
            with open(path, 'w') as f:
                f.write(f"# CI/CD stub log created at {datetime.now()}\n")


def log_pipeline_stats(logger: logging.Logger, stats: dict, component: str):
    """Log pipeline statistics"""
    logger.info(f"=== {component.upper()} STATISTICS ===")
    for key, value in stats.items():
        logger.info(f"{key}: {value}")


if __name__ == "__main__":
    ensure_artifact_files()
    logger = setup_pipeline_logging("test_ci")
    logger.info("CI/CD logging setup test completed")
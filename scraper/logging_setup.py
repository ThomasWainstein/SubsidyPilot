#!/usr/bin/env python3
"""
Centralized logging setup for AgriTool scraper pipeline
Ensures consistent log file creation and artifact compatibility
"""

import os
import logging
from pathlib import Path
from datetime import datetime
import sys


def setup_pipeline_logging(component_name: str, log_level: str = "INFO") -> logging.Logger:
    """
    Setup standardized logging for scraper pipeline components
    
    Args:
        component_name: Name of the component (e.g., 'scraper', 'uploader', 'ai_extractor')
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
    
    Returns:
        Configured logger instance
    """
    # Ensure required directories exist
    log_dir = Path("data/logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    
    data_dir = Path("data")
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # Create timestamped log file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = log_dir / f"{component_name}_{timestamp}.log"
    
    # Also create a general component log (for artifact upload patterns)
    general_log_file = log_dir / f"{component_name}.log"
    
    # Configure logger
    logger = logging.getLogger(component_name)
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Remove existing handlers to avoid duplicates
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    simple_formatter = logging.Formatter(
        '%(levelname)s: %(message)s'
    )
    
    # File handler (detailed logs)
    file_handler = logging.FileHandler(log_file, mode='w')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(detailed_formatter)
    logger.addHandler(file_handler)
    
    # General file handler (for artifact patterns)
    general_file_handler = logging.FileHandler(general_log_file, mode='w')
    general_file_handler.setLevel(logging.INFO)
    general_file_handler.setFormatter(detailed_formatter)
    logger.addHandler(general_file_handler)
    
    # Console handler (simple format)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, log_level.upper()))
    console_handler.setFormatter(simple_formatter)
    logger.addHandler(console_handler)
    
    # Log initial setup info
    logger.info(f"=== {component_name.upper()} PIPELINE STARTED ===")
    logger.info(f"Log file: {log_file}")
    logger.info(f"General log: {general_log_file}")
    logger.info(f"Log level: {log_level}")
    
    return logger


def ensure_artifact_files():
    """
    Ensure minimum artifact files exist for CI upload patterns
    Creates empty files if none exist to prevent upload warnings
    """
    required_paths = [
        "data/logs/scraper.log",
        "data/logs/uploader.log", 
        "data/logs/ai_extractor.log",
        "data/raw_pages/.gitkeep",
        "data/attachments/.gitkeep"
    ]
    
    for file_path in required_paths:
        path = Path(file_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        if not path.exists():
            if path.suffix == '.log':
                # Create minimal log file
                with open(path, 'w') as f:
                    f.write(f"# {path.stem} log file created at {datetime.now()}\n")
                    f.write("# This file ensures artifact upload compatibility\n")
            else:
                # Create empty marker file
                path.touch()


def log_pipeline_stats(logger: logging.Logger, stats: dict, component: str):
    """
    Log standardized pipeline statistics
    
    Args:
        logger: Logger instance
        stats: Statistics dictionary
        component: Component name
    """
    logger.info(f"=== {component.upper()} STATISTICS ===")
    for key, value in stats.items():
        logger.info(f"{key}: {value}")
    
    # Write summary to dedicated stats file
    stats_file = Path("data/logs") / f"{component}_stats.log"
    with open(stats_file, 'w') as f:
        f.write(f"=== {component.upper()} FINAL STATISTICS ===\n")
        for key, value in stats.items():
            f.write(f"{key}: {value}\n")


if __name__ == "__main__":
    # Test logging setup
    logger = setup_pipeline_logging("test_component")
    logger.info("Test log message")
    logger.warning("Test warning message")
    logger.error("Test error message")
    
    ensure_artifact_files()
    
    test_stats = {
        "processed": 100,
        "success": 95,
        "errors": 5,
        "success_rate": 95.0
    }
    log_pipeline_stats(logger, test_stats, "test")
    
    print("✅ Logging setup test completed")
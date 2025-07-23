#!/usr/bin/env python3
"""
Test fixtures and utilities for AgriToolScraper test suite
Handles missing test data gracefully
"""

import os
import csv
import pytest

def ensure_test_csv_exists(csv_path: str, default_data: list = None):
    """
    Ensure a test CSV file exists, creating it with default data if missing
    """
    if not os.path.exists(csv_path):
        if default_data:
            print(f"📁 Creating missing test file: {csv_path}")
            os.makedirs(os.path.dirname(csv_path), exist_ok=True)
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerows(default_data)
        else:
            pytest.skip(f"Test data file missing: {csv_path} - run scraper first or provide default data")

def check_consultant_csv():
    """Check for consultant_data.csv and create dummy data if missing"""
    csv_path = "data/extracted/consultant_data.csv"
    default_data = [
        ["Name", "Email", "Specialization", "Experience"],
        ["Test Consultant", "test@example.com", "Agricultural Development", "5 years"],
        ["Demo Expert", "demo@example.com", "Subsidy Applications", "3 years"]
    ]
    ensure_test_csv_exists(csv_path, default_data)
    return csv_path

def skip_if_no_env_vars(*var_names):
    """Decorator to skip test if required environment variables are missing"""
    def decorator(test_func):
        def wrapper(*args, **kwargs):
            missing = [var for var in var_names if not os.environ.get(var)]
            if missing:
                pytest.skip(f"Required environment variables missing: {missing}")
            return test_func(*args, **kwargs)
        return wrapper
    return decorator
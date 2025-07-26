#!/usr/bin/env python3
"""
AgriTool QA Report Generator
============================

Generates comprehensive quality assurance reports for the AgriTool pipeline,
consolidating results from scraping, AI processing, and data validation.
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone
from typing import Dict, Any

def generate_qa_report(scrape_records: int, processed_records: int, run_id: str) -> Dict[str, Any]:
    """Generate comprehensive QA report."""
    
    # Load test results if available
    test_results = {}
    try:
        if os.path.exists('end_to_end_test_report.json'):
            with open('end_to_end_test_report.json', 'r') as f:
                test_results = json.load(f)
    except:
        pass
    
    # Load data quality results if available
    quality_results = {}
    try:
        if os.path.exists('data_quality_report.json'):
            with open('data_quality_report.json', 'r') as f:
                quality_results = json.load(f)
    except:
        pass
    
    # Calculate pipeline efficiency
    processing_rate = processed_records / scrape_records if scrape_records > 0 else 0
    
    # Generate comprehensive report
    report = {
        'report_metadata': {
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'run_id': run_id,
            'report_version': '1.0'
        },
        'pipeline_metrics': {
            'scraped_records': scrape_records,
            'processed_records': processed_records,
            'processing_rate': processing_rate,
            'pipeline_efficiency': 'HIGH' if processing_rate > 0.9 else 'MEDIUM' if processing_rate > 0.7 else 'LOW'
        },
        'test_results': test_results,
        'quality_results': quality_results,
        'overall_status': {
            'pipeline_healthy': processing_rate > 0.8,
            'tests_passed': test_results.get('summary', {}).get('pipeline_ready', False),
            'quality_acceptable': quality_results.get('summary', {}).get('data_quality_acceptable', False)
        }
    }
    
    return report

def main():
    parser = argparse.ArgumentParser(description='Generate AgriTool QA Report')
    parser.add_argument('--scrape-records', type=int, default=0, help='Number of scraped records')
    parser.add_argument('--processed-records', type=int, default=0, help='Number of processed records')
    parser.add_argument('--run-id', type=str, default='unknown', help='Pipeline run ID')
    
    args = parser.parse_args()
    
    print("📊 Generating QA Report...")
    
    report = generate_qa_report(args.scrape_records, args.processed_records, args.run_id)
    
    # Save JSON report
    with open('qa_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    # Generate HTML report
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><title>AgriTool QA Report</title></head>
    <body>
        <h1>AgriTool QA Report</h1>
        <h2>Pipeline Metrics</h2>
        <p>Scraped: {report['pipeline_metrics']['scraped_records']}</p>
        <p>Processed: {report['pipeline_metrics']['processed_records']}</p>
        <p>Rate: {report['pipeline_metrics']['processing_rate']:.1%}</p>
        <h2>Status: {'✅ HEALTHY' if report['overall_status']['pipeline_healthy'] else '❌ ISSUES'}</h2>
    </body>
    </html>
    """
    
    with open('qa_report.html', 'w') as f:
        f.write(html_content)
    
    print("✅ QA Report generated successfully")

if __name__ == "__main__":
    main()
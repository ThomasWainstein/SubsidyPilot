#!/usr/bin/env python3
"""
Generate comprehensive pipeline summary from all job artifacts
Creates final summary for notifications and debugging
"""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any


def collect_job_results() -> Dict[str, Any]:
    """Collect results from all pipeline jobs"""
    
    results = {
        'timestamp': datetime.now().isoformat(),
        'jobs': {},
        'overall_status': 'unknown',
        'summary': [],
        'artifacts_found': [],
        'artifacts_missing': []
    }
    
    # Expected artifacts from each job
    expected_artifacts = {
        'scraper': [
            'logs/scraper.log',
            'data/logs/scraper.log',
            'data/raw_pages'
        ],
        'ai_interpreter': [
            'logs/ai_extractor.log',
            'data/logs/ai_extractor.log'
        ],
        'qa': [
            'logs/qa_results.log',
            'logs/qa_detailed_results.json',
            'logs/pipeline_status.log'
        ]
    }
    
    # Check each job's artifacts
    for job_name, artifacts in expected_artifacts.items():
        job_status = 'success'
        job_details = {
            'artifacts_found': [],
            'artifacts_missing': [],
            'status': 'success'
        }
        
        for artifact in artifacts:
            if Path(artifact).exists():
                job_details['artifacts_found'].append(artifact)
                results['artifacts_found'].append(artifact)
            else:
                job_details['artifacts_missing'].append(artifact)
                results['artifacts_missing'].append(artifact)
                job_status = 'partial' if job_status == 'success' else 'failure'
        
        job_details['status'] = job_status
        results['jobs'][job_name] = job_details
    
    # Check for specific status indicators
    if Path('logs/pipeline_failure_summary.txt').exists():
        results['overall_status'] = 'failure'
        with open('logs/pipeline_failure_summary.txt', 'r') as f:
            results['failure_details'] = f.read()
    elif Path('logs/qa_completed.txt').exists():
        with open('logs/qa_completed.txt', 'r') as f:
            content = f.read()
            if 'SUCCESS' in content:
                results['overall_status'] = 'success'
            else:
                results['overall_status'] = 'failure'
    else:
        results['overall_status'] = 'incomplete'
    
    return results


def generate_summary_report(results: Dict[str, Any]) -> str:
    """Generate human-readable summary report"""
    
    report_lines = [
        "AGRITOOL PIPELINE EXECUTION SUMMARY",
        "=" * 50,
        f"Timestamp: {results['timestamp']}",
        f"Overall Status: {results['overall_status'].upper()}",
        ""
    ]
    
    # Job-by-job status
    report_lines.extend([
        "JOB STATUS:",
        "-" * 20
    ])
    
    for job_name, job_data in results['jobs'].items():
        status_icon = {
            'success': '✅',
            'partial': '⚠️',
            'failure': '❌'
        }.get(job_data['status'], '❓')
        
        report_lines.append(f"{status_icon} {job_name.upper()}: {job_data['status'].upper()}")
        
        if job_data['artifacts_missing']:
            report_lines.append(f"   Missing: {', '.join(job_data['artifacts_missing'])}")
    
    report_lines.append("")
    
    # Artifacts summary
    report_lines.extend([
        "ARTIFACTS SUMMARY:",
        "-" * 20,
        f"✅ Found: {len(results['artifacts_found'])} artifacts",
        f"❌ Missing: {len(results['artifacts_missing'])} artifacts"
    ])
    
    if results['artifacts_missing']:
        report_lines.extend([
            "",
            "MISSING ARTIFACTS:",
            "-" * 20
        ])
        for artifact in results['artifacts_missing']:
            report_lines.append(f"• {artifact}")
    
    # Failure details if available
    if results['overall_status'] == 'failure' and 'failure_details' in results:
        report_lines.extend([
            "",
            "FAILURE DETAILS:",
            "-" * 20,
            results['failure_details']
        ])
    
    # Recommendations
    report_lines.extend([
        "",
        "RECOMMENDATIONS:",
        "-" * 20
    ])
    
    if results['overall_status'] == 'success':
        report_lines.append("✅ Pipeline completed successfully - all systems operational")
    elif results['overall_status'] == 'partial':
        report_lines.extend([
            "⚠️ Pipeline completed with warnings:",
            "• Check missing artifacts for potential issues",
            "• Review job logs for detailed error information"
        ])
    elif results['overall_status'] == 'failure':
        report_lines.extend([
            "❌ Pipeline failed - immediate attention required:",
            "• Check logs/pipeline_failure_summary.txt for details",
            "• Verify all dependencies and credentials",
            "• Review individual job logs for specific errors"
        ])
    else:
        report_lines.extend([
            "❓ Pipeline status unclear - investigation needed:",
            "• Check if all jobs completed",
            "• Review logs for any hung processes",
            "• Verify artifact upload completed"
        ])
    
    return "\n".join(report_lines)


def main():
    """Generate and save pipeline summary"""
    print("📊 Generating pipeline summary...")
    
    # Collect all results
    results = collect_job_results()
    
    # Generate human-readable report
    summary_report = generate_summary_report(results)
    
    # Save detailed JSON results
    with open("logs/pipeline_summary.json", "w") as f:
        json.dump(results, f, indent=2)
    
    # Save human-readable summary
    with open("logs/pipeline_summary.txt", "w") as f:
        f.write(summary_report)
    
    # Print summary to console
    print("\n" + summary_report)
    
    # Return exit code based on overall status
    if results['overall_status'] == 'success':
        return 0
    elif results['overall_status'] in ['partial', 'incomplete']:
        return 1
    else:  # failure
        return 2


if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
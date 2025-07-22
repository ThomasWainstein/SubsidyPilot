#!/usr/bin/env python3
"""
Complete contamination purge for FranceAgriMer isolation.
Removes all non-FranceAgriMer artifacts and ensures clean state.
Only runs when FORCE_PURGE environment variable is set.
"""

import os
import sys
import shutil
import glob
import logging

def purge_cross_domain_artifacts():
    """Remove all cross-domain contamination artifacts."""
    
    print("🔥 PURGING ALL CROSS-DOMAIN CONTAMINATION")
    
    # Files containing Romanian or other domain data
    contaminated_files = [
        "data/extracted/afir_external_links.txt",
        "data/extracted/apia_procurements_external_links.txt", 
        "data/extracted/oportunitati_ue_external_links.txt",
        "data/extracted/failed_urls.txt",
        "data/extracted/consultant_data.csv"
    ]
    
    removed_count = 0
    for file_path in contaminated_files:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"🗑️ Removed contaminated file: {file_path}")
                removed_count += 1
            except Exception as e:
                print(f"⚠️ Could not remove {file_path}: {e}")
        else:
            print(f"ℹ️ File not found (already clean): {file_path}")
    
    # Remove any files with cross-domain content
    data_dirs_checked = 0
    for data_dir in ["data/extracted", "data/raw_pages", "data/logs"]:
        if os.path.exists(data_dir):
            data_dirs_checked += 1
            print(f"🔍 Scanning {data_dir} for cross-domain contamination...")
            files_in_dir = glob.glob(f"{data_dir}/*")
            
            for file_path in files_in_dir:
                try:
                    if os.path.isfile(file_path):
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read().lower()
                        
                        # Check for cross-domain contamination
                        contamination_domains = [
                            'oportunitati-ue.gov.ro',
                            'apia.org.ro', 
                            'afir.ro',
                            'madr.ro',
                            'fonduri-structurale.ro'
                        ]
                        
                        for domain in contamination_domains:
                            if domain in content:
                                os.remove(file_path)
                                print(f"🗑️ Removed contaminated file: {file_path} (contained {domain})")
                                removed_count += 1
                                break
                                
                except Exception as e:
                    # Skip files we can't read/process (binary, locked, etc.)
                    print(f"⚠️ Could not scan {file_path}: {e}")
        else:
            print(f"ℹ️ Directory not found: {data_dir}")
    
    if data_dirs_checked == 0:
        print("ℹ️ No data directories found to scan")
    
    # Isolate all non-FranceAgriMer config files during run
    configs_isolated = 0
    if os.path.exists("configs"):
        config_files = glob.glob("configs/*.json")
        print(f"🔍 Found {len(config_files)} config files")
        
        for config_file in config_files:
            if "franceagrimer" not in config_file.lower():
                backup_name = f"{config_file}.contamination_backup"
                try:
                    shutil.move(config_file, backup_name)
                    print(f"🔒 Isolated non-FranceAgriMer config: {config_file}")
                    configs_isolated += 1
                except Exception as e:
                    print(f"⚠️ Could not isolate config {config_file}: {e}")
            else:
                print(f"✅ Keeping FranceAgriMer config: {config_file}")
    else:
        print("ℹ️ No configs directory found")
    
    print(f"✅ CONTAMINATION PURGE COMPLETE")
    print(f"   📊 {removed_count} contaminated files removed")
    print(f"   📊 {configs_isolated} config files isolated")
    print(f"   📊 {data_dirs_checked} data directories scanned")
    
    return removed_count

if __name__ == "__main__":
    # Check if purge is explicitly requested
    force_purge = os.environ.get('FORCE_PURGE', '').lower() in ['true', '1', 'yes']
    
    if not force_purge and '--force' not in sys.argv:
        print("🛑 CONTAMINATION PURGE SKIPPED")
        print("💡 Use FORCE_PURGE=true environment variable or --force flag to enable")
        print("✅ PURGE SCRIPT COMPLETE (no action taken)")
        exit(0)
    
    if '--force' in sys.argv:
        print("🔥 FORCE FLAG DETECTED - Running contamination purge")
    else:
        print("🔥 FORCE_PURGE=true DETECTED - Running contamination purge")
    
    try:
        removed_count = purge_cross_domain_artifacts()
        print("✅ CONTAMINATION PURGE SCRIPT COMPLETE")
        exit(0)
    except Exception as e:
        print(f"⚠️ Contamination purge completed with warnings: {e}")
        print("✅ CONTAMINATION PURGE SCRIPT COMPLETE (with warnings)")
        exit(0)  # Never fail the pipeline for purge issues
#!/usr/bin/env python3
"""
Complete contamination purge for FranceAgriMer isolation.
Removes all non-FranceAgriMer artifacts and ensures clean state.
"""

import os
import shutil
import glob
import logging

def purge_romanian_artifacts():
    """Remove all Romanian and cross-domain contamination artifacts."""
    
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
                print(f"❌ Failed to remove {file_path}: {e}")
    
    # Remove any files with Romanian domains in content
    for data_dir in ["data/extracted", "data/raw_pages", "data/logs"]:
        if os.path.exists(data_dir):
            for file_path in glob.glob(f"{data_dir}/*"):
                try:
                    if os.path.isfile(file_path):
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read().lower()
                        
                        # Check for Romanian domain contamination
                        romanian_domains = [
                            'oportunitati-ue.gov.ro',
                            'apia.org.ro',
                            'afir.ro',
                            'madr.ro'
                        ]
                        
                        for domain in romanian_domains:
                            if domain in content:
                                os.remove(file_path)
                                print(f"🗑️ Removed contaminated file: {file_path} (contained {domain})")
                                removed_count += 1
                                break
                                
                except Exception as e:
                    # Skip files we can't read/process
                    pass
    
    # Remove all non-FranceAgriMer config files during run
    if os.path.exists("configs"):
        config_files = glob.glob("configs/*.json")
        for config_file in config_files:
            if "franceagrimer" not in config_file:
                backup_name = f"{config_file}.contamination_backup"
                try:
                    shutil.move(config_file, backup_name)
                    print(f"🔒 Isolated non-FranceAgriMer config: {config_file}")
                except Exception as e:
                    print(f"❌ Failed to isolate config {config_file}: {e}")
    
    print(f"✅ CONTAMINATION PURGE COMPLETE - {removed_count} files removed/isolated")
    return removed_count

if __name__ == "__main__":
    purge_romanian_artifacts()
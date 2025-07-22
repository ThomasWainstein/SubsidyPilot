#!/usr/bin/env python3
"""
Analyze the ChromeDriver directory to see exactly what files are present.
This will help us understand why THIRD_PARTY_NOTICES.chromedriver is being selected.
"""

import os
import stat
from webdriver_manager.chrome import ChromeDriverManager

def analyze_chrome_driver_directory():
    """Analyze the Chrome driver directory and log all file details."""
    print("🔥 ANALYZING CHROME DRIVER DIRECTORY")
    
    try:
        # Get the path from webdriver-manager
        driver_manager = ChromeDriverManager()
        initial_path = driver_manager.install()
        print(f"📁 Initial path from webdriver-manager: {initial_path}")
        
        # Get the directory
        driver_dir = os.path.dirname(initial_path)
        print(f"📁 Driver directory: {driver_dir}")
        
        # List all files and their properties
        print(f"📁 Directory contents:")
        
        try:
            files = os.listdir(driver_dir)
            print(f"📁 Files found: {files}")
            
            for file in files:
                file_path = os.path.join(driver_dir, file)
                
                # Get file stats
                file_stat = os.stat(file_path)
                is_file = os.path.isfile(file_path)
                is_executable = os.access(file_path, os.X_OK)
                file_mode = stat.filemode(file_stat.st_mode)
                file_size = file_stat.st_size
                
                print(f"  📄 {file}:")
                print(f"      Path: {file_path}")
                print(f"      Is file: {is_file}")
                print(f"      Is executable: {is_executable}")
                print(f"      Permissions: {file_mode}")
                print(f"      Size: {file_size} bytes")
                
                # Check if this matches expected driver name
                if file == "chromedriver":
                    print(f"      ✅ This is the expected driver binary!")
                elif "chromedriver" in file:
                    print(f"      ⚠️ This contains 'chromedriver' but is not exactly 'chromedriver'")
                
                print()
                
        except Exception as e:
            print(f"❌ Error listing directory: {e}")
            
    except Exception as e:
        print(f"❌ Error analyzing driver directory: {e}")
        import traceback
        print(f"❌ Full traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    analyze_chrome_driver_directory()
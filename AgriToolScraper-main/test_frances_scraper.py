#!/usr/bin/env python3
"""
Quick test script for FranceAgriMer scraper with environment variable setup.
"""

import os
import sys

def setup_environment():
    """Set up environment variables for scraper."""
    print("🔧 Setting up environment variables...")
    
    # Set Supabase credentials
    os.environ['SUPABASE_URL'] = 'https://gvfgvbztagafjykncwto.supabase.co'
    os.environ['SUPABASE_SERVICE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODcwODE3MywiZXhwIjoyMDY0Mjg0MTczfQ.j3KEkFJLrDKbmyCHPPHW67zjzMlua4Gff4hzvqW_LZY'
    
    print("✅ Environment variables set")

def test_scraper():
    """Test the FranceAgriMer scraper."""
    print("🚀 Testing FranceAgriMer scraper...")
    
    # Import after setting environment
    from scraper_main import AgriToolScraper
    
    target_url = "https://www.franceagrimer.fr/Accompagner/Dispositifs-par-filiere/Aides-nationales"
    
    try:
        # Create scraper instance
        scraper = AgriToolScraper(target_url, dry_run=True)
        
        # Test URL collection (limited pages for quick test)
        print("📋 Testing URL collection...")
        urls = scraper.collect_subsidy_urls(max_pages=1)
        
        print(f"✅ Collected {len(urls)} URLs")
        
        if urls:
            print("📄 Sample URLs:")
            for i, url in enumerate(urls[:3]):
                print(f"  {i+1}. {url}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main test function."""
    print("🧪 FranceAgriMer Scraper Test")
    print("=" * 50)
    
    setup_environment()
    
    success = test_scraper()
    
    if success:
        print("\n✅ Test completed successfully!")
        print("💡 To run full scraper: python scraper_main.py --url https://www.franceagrimer.fr/Accompagner/Dispositifs-par-filiere/Aides-nationales")
    else:
        print("\n❌ Test failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
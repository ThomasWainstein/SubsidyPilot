#!/usr/bin/env python3
"""
Quick test script for FranceAgriMer scraper with environment variable setup.
"""

import os
import sys

def setup_environment():
    """Set up environment variables for scraper."""
    print("🔧 Checking environment variables...")
    
    # Check if required environment variables are set
    if not os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or not os.environ.get('SUPABASE_SERVICE_ROLE_KEY'):
        raise EnvironmentError(
            "Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
        )
    
    print("✅ Environment variables set")

def test_scraper():
    """Test the FranceAgriMer scraper."""
    print("🚀 Testing FranceAgriMer scraper...")
    
    # Import after setting environment
    from scraper_main import AgriToolScraper
    
    target_url = "https://www.franceagrimer.fr/rechercher-une-aide"
    
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
        print("💡 To run full scraper: python scraper_main.py --url https://www.franceagrimer.fr/rechercher-une-aide")
    else:
        print("\n❌ Test failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
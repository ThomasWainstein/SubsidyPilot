"""Simple scraper using extract_raw_page."""
import argparse

from scraper.discovery import extract_raw_page


def main() -> None:
    parser = argparse.ArgumentParser(description="Raw page scraper")
    parser.add_argument('url', nargs='+', help='URL(s) to scrape')
    args = parser.parse_args()

    for url in args.url:
        print(f"Scraping {url}...")
        result = extract_raw_page(url)
        print(f"Saved raw page for {url} with {len(result['raw_text'])} characters")


if __name__ == '__main__':
    main()

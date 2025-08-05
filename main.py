import argparse
from core import run_scraper
from ai_extractor import run_ai_pipeline


def run_demo():
    """Run a demo pipeline using placeholder logic."""
    run_scraper("franceagrimer", 1, True)
    run_ai_pipeline()


def main():
    parser = argparse.ArgumentParser(description="AgriTool CLI entry point")
    parser.add_argument("--mode", choices=["scraping", "ai-processing", "demo"], required=True)
    parser.add_argument("--site", default="franceagrimer", help="Target site to scrape")
    parser.add_argument("--max-pages", type=int, default=5, help="Maximum number of pages to scrape")
    parser.add_argument("--dry-run", action="store_true", help="Enable dry-run mode")

    parser.add_argument("--batch-folder", default="batches", help="Folder containing AI batches")
    parser.add_argument("--model-name", default="gpt-4", help="Model name for AI processing")
    parser.add_argument("--language", default="fr", help="Language for prompt selection")
    args = parser.parse_args()

    if args.mode == "scraping":
        run_scraper(args.site, args.max_pages, args.dry_run)
    elif args.mode == "ai-processing":
        run_ai_pipeline(
            batch_folder=args.batch_folder,
            model_name=args.model_name,
            language=args.language,
        )
    elif args.mode == "demo":
        run_demo()
    else:
        parser.error("Unknown mode")


if __name__ == "__main__":
    main()

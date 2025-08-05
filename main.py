import argparse
from core import run_scraper
from ai_extractor import run_ai_pipeline


def run_demo():
    """Run a demo pipeline using placeholder logic."""
    run_scraper("franceagrimer", 1, True)
    run_ai_pipeline()


def main():
    parser = argparse.ArgumentParser(description="AgriTool CLI entry point")
    parser.add_argument(
        "--mode", choices=["scraping", "ai-processing", "demo"], required=True
    )
    parser.add_argument("--site", default="franceagrimer", help="Target site to scrape")
    parser.add_argument(
        "--max-pages", type=int, default=5, help="Maximum number of pages to scrape"
    )
    parser.add_argument("--dry-run", action="store_true", help="Enable dry-run mode")
    parser.add_argument(
        "--save-db",
        action="store_true",
        help="Save scraped results to Supabase",
    )

    parser.add_argument(
        "--batch-path",
        default="batches/sample_batch.json",
        help="Path to AI batch file",
    )
    parser.add_argument("--model-name", default="gpt-4", help="Model name for AI processing")
    parser.add_argument("--language", default="fr", help="Language for prompt selection")
    parser.add_argument(
        "--qa-report",
        action="store_true",
        help="Generate qa_report.json during AI processing",
    )
    args = parser.parse_args()

    if args.mode == "scraping":
        results = run_scraper(args.site, args.max_pages, args.dry_run)
        if args.save_db:
            from datastore import save_subsidy

            for item in results:
                save_subsidy(item)
    elif args.mode == "ai-processing":
        run_ai_pipeline(
            batch_path=args.batch_path,
            model=args.model_name,
            language=args.language,
            dry_run=args.dry_run,
            qa_report=args.qa_report,
        )
    elif args.mode == "demo":
        run_demo()
    else:
        parser.error("Unknown mode")


if __name__ == "__main__":
    main()

"""Validate CLI arguments and environment for the scraper pipeline."""

import argparse
import os
import sys

REQUIRED_ENV_VARS = ["OPENAI_API_KEY", "SUPABASE_URL"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate pipeline inputs")
    parser.add_argument("--mode", choices=["scraping", "ai-processing", "demo"], required=True)
    parser.add_argument("--site", required=True)
    parser.add_argument("--max-pages", type=int, required=True)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def validate_env() -> None:
    missing = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
    if missing:
        raise EnvironmentError(f"Missing environment variables: {', '.join(missing)}")


def validate_args(args: argparse.Namespace) -> None:
    if args.max_pages <= 0:
        raise ValueError("--max-pages must be greater than zero")


def main() -> None:
    try:
        args = parse_args()
        validate_args(args)
        validate_env()
        os.makedirs("output", exist_ok=True)
        print("Validation successful")
    except Exception as exc:
        print(f"Validation failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()

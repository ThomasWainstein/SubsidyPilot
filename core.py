import os
from typing import Optional


def run_scraper(site: str, max_pages: int, dry_run: bool) -> Optional[str]:
    """Run a placeholder scraping routine.

    Creates a dummy JSON file under the ``output`` directory containing
    placeholder data. The function returns the path to the generated file
    when ``dry_run`` is False.
    """
    if max_pages <= 0:
        raise ValueError("max_pages must be greater than zero")

    print(f"Scraping {site}... max_pages={max_pages}, dry_run={dry_run}")
    os.makedirs("output", exist_ok=True)
    output_path = os.path.join("output", f"{site}_dummy_output.json")

    if not dry_run:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write('{"status": "success", "data": "Dummy data placeholder"}')
        print(f"Output saved to {output_path}")
        return output_path
    else:
        print("Dry run enabled; no output written")
        return None

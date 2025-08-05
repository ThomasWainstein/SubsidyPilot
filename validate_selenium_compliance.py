"""Ensure Selenium and headless Chrome are available."""

import shutil
import sys

try:
    import selenium
except Exception as exc:  # pragma: no cover - import error path
    print(f"Selenium import failed: {exc}")
    sys.exit(1)


def main() -> None:
    version = tuple(int(part) for part in selenium.__version__.split('.')[:2])
    if version < (4, 0):
        print("Selenium 4+ required")
        sys.exit(1)

    if not shutil.which("chromium-browser") and not shutil.which("google-chrome"):
        print("Chromium or Chrome not found")
        sys.exit(1)

    print("Selenium compliance check passed")


if __name__ == "__main__":
    main()

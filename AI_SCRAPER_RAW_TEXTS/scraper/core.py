import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager


def init_driver(headless: bool = True) -> webdriver.Chrome:
    """Initialize a simple Chrome WebDriver."""
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver


def ensure_folder(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def download_file(url: str, dest_folder: str) -> str | None:
    import requests
    ensure_folder(dest_folder)
    local_filename = url.split("/")[-1].split("?")[0]
    local_path = os.path.join(dest_folder, local_filename)
    try:
        r = requests.get(url, stream=True, timeout=30)
        r.raise_for_status()
        with open(local_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        return local_path
    except Exception:
        return None

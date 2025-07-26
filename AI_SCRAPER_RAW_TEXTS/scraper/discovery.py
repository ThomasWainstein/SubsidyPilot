import json
import uuid
from urllib.parse import urljoin
from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from .core import init_driver, ensure_folder, download_file


def extract_raw_page(url: str) -> dict:
    """Load a page, remove common layout elements and return raw content."""
    driver = init_driver()
    try:
        driver.get(url)
        WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        # remove headers, footers and navs
        driver.execute_script("document.querySelectorAll('header,footer,nav').forEach(el => el.remove());")
        full_html = driver.page_source
    finally:
        driver.quit()

    soup = BeautifulSoup(full_html, "html.parser")
    for tag in soup(['script', 'style', 'noscript']):
        tag.decompose()
    visible_text = soup.get_text(separator=' ', strip=True)

    attachments = []
    dest = "data/raw_pages/attachments"
    for link in soup.find_all('a', href=True):
        href = link['href']
        if any(href.lower().endswith(ext) for ext in ['.pdf', '.doc', '.docx', '.xls', '.xlsx']):
            file_url = urljoin(url, href)
            local_path = download_file(file_url, dest)
            if local_path:
                attachments.append(local_path)

    result = {
        "url": url,
        "html": full_html,
        "raw_text": visible_text,
        "attachments": attachments,
    }
    ensure_folder("data/raw_pages")
    unique_id = uuid.uuid4().hex
    with open(f"data/raw_pages/{unique_id}.json", "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    return result

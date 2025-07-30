import subprocess
import tempfile
import time
from pathlib import Path
from typing import Tuple, List, Optional
import requests
from tika import parser as tika_parser
import logging
import shutil


class PDFExtractionPipeline:
    """
    Robust PDF extraction pipeline with Tika server health checks,
    PDF optimization using Ghostscript, OCR capabilities, and retry logic.
    """
    
    def __init__(
        self,
        tika_url: str = "http://localhost:9998",
        max_file_size_mb: float = 10.0,
        max_retries: int = 3,
        initial_retry_delay: float = 5.0,
        max_retry_delay: float = 60.0,
        enable_ocr: bool = True,
        ocr_timeout: int = 300
    ):
        self.tika_url = tika_url
        self.max_file_size_bytes = int(max_file_size_mb * 1024 * 1024)
        self.max_retries = max_retries
        self.initial_retry_delay = initial_retry_delay
        self.max_retry_delay = max_retry_delay
        self.enable_ocr = enable_ocr
        self.ocr_timeout = ocr_timeout
        
        # Set up logging
        self.logger = logging.getLogger(__name__)
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

    def check_tika_health(self) -> bool:
        """
        Check if Tika server is responsive and healthy using proper GET request.
        
        Returns:
            bool: True if Tika server is healthy, False otherwise
        """
        try:
            self.logger.info("🔍 Checking Tika server health...")
            
            # Use GET request to /tika/version endpoint for health check
            response = requests.get(f"{self.tika_url}/tika/version", timeout=10)
            
            if response.status_code == 200:
                self.logger.info(f"✅ Tika server is healthy (version: {response.text.strip()})")
                return True
            else:
                self.logger.warning(f"⚠️ Tika server responded with status {response.status_code}")
                return False
                
        except requests.exceptions.ConnectionError as e:
            self.logger.error(f"❌ Tika server health check failed: {e}")
            return False
        except requests.exceptions.Timeout:
            self.logger.error("❌ Tika server health check timed out")
            return False
        except requests.exceptions.RequestException as e:
            self.logger.error(f"❌ Tika server health check failed: {e}")
            return False

    def optimize_pdf_with_ghostscript(self, input_path: str, output_path: str) -> bool:
        """
        Optimize PDF using Ghostscript to reduce file size and complexity.
        
        Args:
            input_path (str): Path to input PDF
            output_path (str): Path to optimized output PDF
            
        Returns:
            bool: True if optimization successful, False otherwise
        """
        try:
            self.logger.info(f"🔧 Optimizing PDF with Ghostscript...")
            
            cmd = [
                "gs",
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.4",
                "-dPDFSETTINGS=/ebook",  # Good balance of size and quality
                "-dNOPAUSE",
                "-dQUIET",
                "-dBATCH",
                f"-sOutputFile={output_path}",
                input_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                input_size = Path(input_path).stat().st_size
                output_size = Path(output_path).stat().st_size
                reduction = (1 - output_size / input_size) * 100
                self.logger.info(f"✅ PDF optimized ({reduction:.1f}% size reduction)")
                return True
            else:
                self.logger.warning(f"⚠️ Ghostscript optimization failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            self.logger.warning("⏰ Ghostscript optimization timed out")
            return False
        except Exception as e:
            self.logger.warning(f"⚠️ Ghostscript optimization error: {e}")
            return False

    def detect_scanned_pdf(self, file_path: str) -> bool:
        """
        Heuristically detect if a PDF is primarily scanned images.
        
        Args:
            file_path (str): Path to PDF file
            
        Returns:
            bool: True if likely scanned, False otherwise
        """
        try:
            # Try quick text extraction to see if there's readable text
            parsed = tika_parser.from_file(file_path)
            text = parsed.get("content", "").strip()
            
            file_size = Path(file_path).stat().st_size
            text_length = len(text)
            
            # Heuristic: if very little text relative to file size, likely scanned
            if file_size > 1024 * 1024:  # > 1MB
                if text_length < 100:  # < 100 chars
                    self.logger.info("📷 Detected scanned PDF (large file, minimal text)")
                    return True
            
            # Also check text-to-size ratio
            ratio = text_length / (file_size / 1024)  # chars per KB
            if ratio < 0.5:  # Less than 0.5 chars per KB
                self.logger.info("📷 Detected likely scanned PDF (low text density)")
                return True
                
            return False
            
        except Exception as e:
            self.logger.warning(f"⚠️ Could not detect PDF type: {e}")
            return False

    def run_ocr_with_tesseract(self, input_path: str, output_path: str) -> bool:
        """
        Run OCR on a PDF using ocrmypdf and Tesseract.
        
        Args:
            input_path (str): Path to input PDF
            output_path (str): Path to OCR'd output PDF
            
        Returns:
            bool: True if OCR successful, False otherwise
        """
        try:
            self.logger.info("🔍 Running OCR with Tesseract...")
            
            cmd = [
                "ocrmypdf",
                "--force-ocr",
                "--optimize", "1",
                "--timeout", str(self.ocr_timeout),
                input_path,
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=self.ocr_timeout + 30)
            
            if result.returncode == 0:
                self.logger.info("✅ OCR completed successfully")
                return True
            else:
                self.logger.warning(f"⚠️ OCR failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            self.logger.warning("⏰ OCR process timed out")
            return False
        except Exception as e:
            self.logger.warning(f"⚠️ OCR error: {e}")
            return False

    def extract_text_from_tika(self, file_path: str) -> str:
        """
        Extract text from PDF using Tika server with proper PUT request and retry mechanism.
        
        Args:
            file_path (str): Path to the PDF file
            
        Returns:
            str: Extracted text content
            
        Raises:
            Exception: If extraction fails after all retries
        """
        for attempt in range(self.max_retries):
            try:
                self.logger.info(f"📄 Extracting text from {file_path} (attempt {attempt + 1}/{self.max_retries})")
                
                # Read file as binary data
                with open(file_path, 'rb') as file:
                    file_content = file.read()
                
                # Use PUT request to /tika endpoint with proper headers as required by Apache Tika
                response = requests.put(
                    f"{self.tika_url}/tika",
                    data=file_content,
                    headers={
                        'Content-Type': 'application/pdf',
                        'Accept': 'text/plain'
                    },
                    timeout=120  # 2 minute timeout for large files
                )
                
                if response.status_code == 200:
                    extracted_text = response.text
                    self.logger.info(f"✅ Successfully extracted {len(extracted_text)} characters")
                    return extracted_text
                elif response.status_code == 405:
                    raise Exception(f"Tika server HTTP 405 error - Check server configuration and endpoint")
                else:
                    raise Exception(f"Tika server returned status {response.status_code}: {response.text}")
                
            except requests.exceptions.ConnectionError as e:
                retry_delay = min(
                    self.initial_retry_delay * (2 ** attempt),
                    self.max_retry_delay
                )
                
                if attempt < self.max_retries - 1:
                    self.logger.warning(f"🔌 Connection failed, retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    raise Exception(f"Connection failed after {self.max_retries} attempts: {e}")
                
            except requests.exceptions.Timeout as e:
                retry_delay = min(
                    self.initial_retry_delay * (2 ** attempt),
                    self.max_retry_delay
                )
                
                if attempt < self.max_retries - 1:
                    self.logger.warning(f"⏰ Extraction timed out, retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    raise Exception(f"Extraction timed out after {self.max_retries} attempts: {e}")
                    
            except requests.exceptions.RequestException as e:
                retry_delay = min(
                    self.initial_retry_delay * (2 ** attempt),
                    self.max_retry_delay
                )
                
                if attempt < self.max_retries - 1:
                    self.logger.warning(f"🔄 Request failed, retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    raise Exception(f"Request failed after {self.max_retries} attempts: {e}")
            
            except Exception as e:
                retry_delay = min(
                    self.initial_retry_delay * (2 ** attempt),
                    self.max_retry_delay
                )
                
                if attempt < self.max_retries - 1:
                    self.logger.warning(f"💥 Extraction failed, retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    raise Exception(f"Extraction failed after {self.max_retries} attempts: {e}")
        
        raise Exception(f"Extraction failed after {self.max_retries} attempts")

    def preprocess_pdf(self, file_path: str) -> str:
        """
        Preprocess PDF before extraction (optimization and OCR if needed).
        
        Args:
            file_path (str): Path to original PDF
            
        Returns:
            str: Path to preprocessed PDF (may be same as input)
        """
        try:
            file_size = Path(file_path).stat().st_size
            
            # If file is large, try optimization
            if file_size > self.max_file_size_bytes:
                self.logger.info(f"📏 File size ({file_size / 1024 / 1024:.1f}MB) exceeds limit, optimizing...")
                
                with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                    temp_path = temp_file.name
                
                if self.optimize_pdf_with_ghostscript(file_path, temp_path):
                    optimized_size = Path(temp_path).stat().st_size
                    if optimized_size <= self.max_file_size_bytes:
                        self.logger.info("✅ Optimization successful, using optimized file")
                        return temp_path
                    else:
                        self.logger.warning("⚠️ File still too large after optimization")
                        Path(temp_path).unlink()
                else:
                    Path(temp_path).unlink()
            
            # Check if OCR is needed and enabled
            if self.enable_ocr and self.detect_scanned_pdf(file_path):
                with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                    ocr_path = temp_file.name
                
                if self.run_ocr_with_tesseract(file_path, ocr_path):
                    self.logger.info("✅ OCR completed, using OCR'd file")
                    return ocr_path
                else:
                    Path(ocr_path).unlink()
            
            return file_path
            
        except Exception as e:
            self.logger.warning(f"⚠️ Preprocessing failed: {e}")
            return file_path

    def extract_text(self, pdf_path: str) -> Tuple[str, list]:
        """
        Main extraction method that orchestrates the entire pipeline.
        
        Args:
            pdf_path (str): Path to PDF file
            
        Returns:
            Tuple[str, list]: (extracted_text, temp_files_to_cleanup)
        """
        temp_files = []
        
        try:
            # Check Tika server health first
            if not self.check_tika_health():
                raise Exception("Tika server is not available")
            
            # Preprocess PDF if needed
            processed_pdf = self.preprocess_pdf(pdf_path)
            if processed_pdf != pdf_path:
                temp_files.append(processed_pdf)
            
            # Extract text using Tika
            extracted_text = self.extract_text_from_tika(processed_pdf)
            
            return extracted_text, temp_files
            
        except Exception as e:
            # Clean up temp files on failure
            self.cleanup_temp_files(temp_files)
            self.logger.error(f"💥 PDF extraction pipeline failed: {e}")
            raise

    def cleanup_temp_files(self, temp_files: list):
        """
        Clean up temporary files created during processing.
        
        Args:
            temp_files (list): List of temporary file paths to delete
        """
        for temp_file in temp_files:
            try:
                if Path(temp_file).exists():
                    Path(temp_file).unlink()
                    self.logger.debug(f"🗑️ Cleaned up temporary file: {temp_file}")
            except Exception as e:
                self.logger.warning(f"⚠️ Failed to clean up {temp_file}: {e}")


def extract_pdf_text(
    pdf_path: str,
    tika_url: str = "http://localhost:9998",
    max_file_size_mb: float = 10.0,
    max_retries: int = 3,
    enable_ocr: bool = True
) -> str:
    """
    Convenience function for direct PDF text extraction.
    
    Args:
        pdf_path (str): Path to PDF file
        tika_url (str): Tika server URL
        max_file_size_mb (float): Maximum file size in MB
        max_retries (int): Maximum retry attempts
        enable_ocr (bool): Enable OCR for scanned documents
        
    Returns:
        str: Extracted text content
        
    Raises:
        Exception: If extraction fails
    """
    pipeline = PDFExtractionPipeline(
        tika_url=tika_url,
        max_file_size_mb=max_file_size_mb,
        max_retries=max_retries,
        enable_ocr=enable_ocr
    )
    
    try:
        extracted_text, temp_files = pipeline.extract_text(pdf_path)
        pipeline.cleanup_temp_files(temp_files)
        return extracted_text
    except Exception as e:
        pipeline.logger.error(f"❌ Extraction failed: {e}")
        raise


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python pdf_extraction_pipeline.py <pdf_file_path>")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    
    try:
        text = extract_pdf_text(pdf_file)
        print(f"✅ Extracted {len(text)} characters from {pdf_file}")
        print("\n--- First 500 characters ---")
        print(text[:500])
    except Exception as e:
        print(f"❌ Failed to extract text: {e}")
        sys.exit(1)
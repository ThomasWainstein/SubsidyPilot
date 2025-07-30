#!/usr/bin/env python3
"""
Robust PDF Extraction Pipeline with Tika Server
===============================================

A lovable, reliable PDF extraction system with preprocessing, OCR, and intelligent retry mechanisms.
Features:
- Tika server health checks
- PDF size optimization via Ghostscript
- Optional OCR for scanned documents
- Exponential backoff retry mechanism
- Clear, friendly logging
"""

import os
import time
import requests
import subprocess
import tempfile
from typing import Optional, Tuple
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class PDFExtractionPipeline:
    """A robust PDF extraction pipeline with preprocessing and retry capabilities."""
    
    def __init__(
        self,
        tika_url: str = "http://localhost:9998/tika",
        max_file_size_mb: float = 5.0,
        max_retries: int = 3,
        initial_retry_delay: float = 5.0,
        max_retry_delay: float = 60.0,
        enable_ocr: bool = False,
        ghostscript_quality: str = "/screen"  # /screen, /ebook, /printer, /prepress
    ):
        self.tika_url = tika_url
        self.max_file_size_mb = max_file_size_mb
        self.max_retries = max_retries
        self.initial_retry_delay = initial_retry_delay
        self.max_retry_delay = max_retry_delay
        self.enable_ocr = enable_ocr
        self.ghostscript_quality = ghostscript_quality
        
    def check_tika_health(self) -> bool:
        """Check if Tika server is healthy and responsive."""
        try:
            logger.info("🔍 Checking Tika server health...")
            response = requests.get(f"{self.tika_url}/version", timeout=10)
            if response.status_code == 200:
                logger.info("✅ Tika server is healthy and ready!")
                return True
            else:
                logger.warning(f"⚠️ Tika server responded with status {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Tika server health check failed: {e}")
            return False
    
    def get_file_size_mb(self, file_path: str) -> float:
        """Get file size in MB."""
        return os.path.getsize(file_path) / (1024 * 1024)
    
    def optimize_pdf_with_ghostscript(self, input_path: str, output_path: str) -> bool:
        """Optimize PDF using Ghostscript to reduce size and complexity."""
        try:
            logger.info("🔧 Optimizing PDF with Ghostscript...")
            cmd = [
                "gs",
                "-sDEVICE=pdfwrite",
                "-dCompatibilityLevel=1.4",
                f"-dPDFSETTINGS={self.ghostscript_quality}",
                "-dNOPAUSE",
                "-dQUIET",
                "-dBATCH",
                f"-sOutputFile={output_path}",
                input_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            if result.returncode == 0:
                original_size = self.get_file_size_mb(input_path)
                optimized_size = self.get_file_size_mb(output_path)
                logger.info(f"✅ PDF optimized: {original_size:.1f}MB → {optimized_size:.1f}MB")
                return True
            else:
                logger.warning(f"⚠️ Ghostscript optimization failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.warning("⚠️ Ghostscript optimization timed out")
            return False
        except FileNotFoundError:
            logger.warning("⚠️ Ghostscript not found - skipping optimization")
            return False
        except Exception as e:
            logger.warning(f"⚠️ Ghostscript optimization error: {e}")
            return False
    
    def detect_scanned_pdf(self, file_path: str) -> bool:
        """Detect if PDF is likely scanned (contains mostly images)."""
        # Simple heuristic: if Tika extracts very little text, it's likely scanned
        try:
            with open(file_path, 'rb') as f:
                response = requests.put(
                    f"{self.tika_url}/text",
                    data=f,
                    headers={'Content-Type': 'application/pdf'},
                    timeout=30
                )
            
            if response.status_code == 200:
                text = response.text.strip()
                # If less than 100 characters, likely scanned
                return len(text) < 100
        except Exception:
            pass
        
        return False
    
    def run_ocr_with_tesseract(self, input_path: str, output_path: str) -> bool:
        """Run OCR on PDF using Tesseract to make it searchable."""
        try:
            logger.info("🔍 Running OCR with Tesseract...")
            cmd = [
                "ocrmypdf",
                "--force-ocr",
                "--optimize", "1",
                "--pdfa-image-compression", "jpeg",
                input_path,
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            if result.returncode == 0:
                logger.info("✅ OCR completed successfully!")
                return True
            else:
                logger.warning(f"⚠️ OCR failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.warning("⚠️ OCR timed out")
            return False
        except FileNotFoundError:
            logger.warning("⚠️ ocrmypdf not found - skipping OCR")
            return False
        except Exception as e:
            logger.warning(f"⚠️ OCR error: {e}")
            return False
    
    def extract_text_from_tika(self, file_path: str) -> str:
        """Extract text from PDF using Tika server with retry mechanism."""
        delay = self.initial_retry_delay
        
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"📄 Extracting text from PDF (attempt {attempt}/{self.max_retries})...")
                
                with open(file_path, 'rb') as f:
                    response = requests.put(
                        f"{self.tika_url}/text",
                        data=f,
                        headers={'Content-Type': 'application/pdf'},
                        timeout=120  # 2 minute timeout
                    )
                
                if response.status_code == 200:
                    text = response.text.strip()
                    logger.info(f"✅ Successfully extracted {len(text)} characters of text!")
                    return text
                else:
                    raise requests.exceptions.HTTPError(f"Tika returned status {response.status_code}")
                    
            except (requests.exceptions.RequestException, requests.exceptions.HTTPError) as e:
                logger.warning(f"⚠️ Extraction attempt {attempt} failed: {e}")
                
                if attempt < self.max_retries:
                    logger.info(f"⏳ Waiting {delay:.1f}s before retry...")
                    time.sleep(delay)
                    delay = min(delay * 2, self.max_retry_delay)  # Exponential backoff
                else:
                    raise RuntimeError(f"PDF extraction failed after {self.max_retries} attempts: {e}")
        
        raise RuntimeError("Unexpected error in extraction retry loop")
    
    def preprocess_pdf(self, file_path: str) -> str:
        """Preprocess PDF with optimization and optional OCR."""
        current_file = file_path
        temp_files = []
        
        try:
            file_size_mb = self.get_file_size_mb(file_path)
            logger.info(f"📋 Processing PDF: {file_size_mb:.1f}MB")
            
            # Step 1: Optimize if file is too large
            if file_size_mb > self.max_file_size_mb:
                logger.info(f"📦 File size ({file_size_mb:.1f}MB) exceeds threshold ({self.max_file_size_mb}MB)")
                
                temp_optimized = tempfile.NamedTemporaryFile(suffix='_optimized.pdf', delete=False)
                temp_optimized.close()
                temp_files.append(temp_optimized.name)
                
                if self.optimize_pdf_with_ghostscript(current_file, temp_optimized.name):
                    current_file = temp_optimized.name
                else:
                    logger.info("📋 Continuing with original file...")
            
            # Step 2: OCR if enabled and needed
            if self.enable_ocr:
                is_scanned = self.detect_scanned_pdf(current_file)
                if is_scanned:
                    logger.info("📸 Detected scanned PDF - running OCR...")
                    
                    temp_ocr = tempfile.NamedTemporaryFile(suffix='_ocr.pdf', delete=False)
                    temp_ocr.close()
                    temp_files.append(temp_ocr.name)
                    
                    if self.run_ocr_with_tesseract(current_file, temp_ocr.name):
                        current_file = temp_ocr.name
                    else:
                        logger.info("📋 Continuing without OCR...")
                else:
                    logger.info("📄 PDF appears to contain searchable text - skipping OCR")
            
            return current_file
            
        except Exception as e:
            # Clean up temp files on error
            for temp_file in temp_files:
                try:
                    os.unlink(temp_file)
                except Exception:
                    pass
            raise e
    
    def extract_text(self, pdf_path: str) -> Tuple[str, list]:
        """
        Main extraction method that orchestrates the entire pipeline.
        
        Returns:
            Tuple[str, list]: (extracted_text, temp_files_to_cleanup)
        """
        temp_files = []
        
        try:
            # Step 1: Health check
            if not self.check_tika_health():
                raise RuntimeError("Tika server is not available")
            
            # Step 2: Preprocess PDF
            processed_file = self.preprocess_pdf(pdf_path)
            
            # Track temp files for cleanup
            if processed_file != pdf_path:
                temp_files.append(processed_file)
            
            # Step 3: Extract text with retries
            text = self.extract_text_from_tika(processed_file)
            
            logger.info("🎉 PDF extraction pipeline completed successfully!")
            return text, temp_files
            
        except Exception as e:
            # Clean up temp files on error
            for temp_file in temp_files:
                try:
                    os.unlink(temp_file)
                except Exception:
                    pass
            
            logger.error(f"💥 PDF extraction pipeline failed: {e}")
            raise RuntimeError(f"PDF extraction failed: {e}")
    
    def cleanup_temp_files(self, temp_files: list):
        """Clean up temporary files created during processing."""
        for temp_file in temp_files:
            try:
                os.unlink(temp_file)
                logger.debug(f"🗑️ Cleaned up temp file: {temp_file}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to clean up temp file {temp_file}: {e}")


def extract_pdf_text(
    pdf_path: str,
    tika_url: str = "http://localhost:9998/tika",
    max_file_size_mb: float = 5.0,
    enable_ocr: bool = False
) -> str:
    """
    Convenience function for simple PDF text extraction.
    
    Args:
        pdf_path: Path to the PDF file
        tika_url: Tika server URL
        max_file_size_mb: Size threshold for optimization
        enable_ocr: Whether to enable OCR for scanned PDFs
    
    Returns:
        str: Extracted text
    """
    pipeline = PDFExtractionPipeline(
        tika_url=tika_url,
        max_file_size_mb=max_file_size_mb,
        enable_ocr=enable_ocr
    )
    
    try:
        text, temp_files = pipeline.extract_text(pdf_path)
        pipeline.cleanup_temp_files(temp_files)
        return text
    except Exception as e:
        logger.error(f"Failed to extract text from {pdf_path}: {e}")
        raise


if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) != 2:
        print("Usage: python pdf_extraction_pipeline.py <pdf_file>")
        sys.exit(1)
    
    pdf_file = sys.argv[1]
    
    if not os.path.exists(pdf_file):
        print(f"File not found: {pdf_file}")
        sys.exit(1)
    
    try:
        text = extract_pdf_text(pdf_file, enable_ocr=True)
        print(f"\n{'='*50}")
        print("EXTRACTED TEXT:")
        print('='*50)
        print(text[:1000] + "..." if len(text) > 1000 else text)
        print(f"\n{'='*50}")
        print(f"Total characters extracted: {len(text)}")
    except Exception as e:
        print(f"Extraction failed: {e}")
        sys.exit(1)
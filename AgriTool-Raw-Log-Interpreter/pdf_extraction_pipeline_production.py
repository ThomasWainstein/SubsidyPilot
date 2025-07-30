#!/usr/bin/env python3
"""
Production-ready PDF Extraction Pipeline for AgriTool
Implements robust PDF extraction with Tika server, preprocessing, and error handling.
"""

import os
import sys
import json
import time
import logging
import requests
import tempfile
import subprocess
from typing import Tuple, List, Optional
from pathlib import Path

class PDFExtractionPipeline:
    """
    Production-ready PDF extraction pipeline with Tika server integration,
    preprocessing (optimization, OCR), and robust error handling.
    """
    
    def __init__(
        self,
        tika_url: str = "http://localhost:9998",
        max_file_size_mb: int = 10,
        enable_ocr: bool = True,
        max_retries: int = 3,
        initial_delay: float = 5.0,
        max_delay: float = 60.0,
        backoff_factor: float = 2.0
    ):
        """
        Initialize the PDF extraction pipeline.
        
        Args:
            tika_url: Base URL for Tika server
            max_file_size_mb: File size threshold for optimization
            enable_ocr: Whether to perform OCR on scanned PDFs
            max_retries: Number of retry attempts for failed extractions
            initial_delay: Initial delay between retries (seconds)
            max_delay: Maximum delay between retries (seconds)
            backoff_factor: Exponential backoff multiplier
        """
        self.tika_url = tika_url
        self.max_file_size_bytes = max_file_size_mb * 1024 * 1024
        self.enable_ocr = enable_ocr
        self.max_retries = max_retries
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def check_tika_health(self) -> bool:
        """
        Check if Tika server is running and responsive.
        
        Returns:
            bool: True if server is healthy, False otherwise
        """
        try:
            health_url = f"{self.tika_url}/tika/version"
            response = requests.get(health_url, timeout=10)
            
            if response.status_code == 200:
                version = response.text.strip()
                self.logger.info(f"✅ Tika server healthy - Version: {version}")
                return True
            else:
                self.logger.warning(f"⚠️ Tika server returned status {response.status_code}")
                return False
                
        except requests.exceptions.ConnectionError:
            self.logger.error("❌ Tika server health check failed - Connection refused (server not running?)")
            return False
        except requests.exceptions.Timeout:
            self.logger.error("❌ Tika server health check failed - Request timeout")
            return False
        except Exception as e:
            self.logger.error(f"❌ Tika server health check failed - {str(e)}")
            return False
    
    def optimize_pdf_with_ghostscript(self, input_path: str, output_path: str) -> bool:
        """
        Optimize PDF file size using Ghostscript.
        
        Args:
            input_path: Path to input PDF
            output_path: Path for optimized PDF
            
        Returns:
            bool: True if optimization succeeded, False otherwise
        """
        try:
            cmd = [
                'gs', '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.4',
                '-dPDFSETTINGS=/screen', '-dNOPAUSE', '-dQUIET', '-dBATCH',
                f'-sOutputFile={output_path}', input_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            
            if result.returncode == 0:
                original_size = os.path.getsize(input_path)
                optimized_size = os.path.getsize(output_path)
                reduction = ((original_size - optimized_size) / original_size) * 100
                
                self.logger.info(f"📉 PDF optimized - Size reduced by {reduction:.1f}% "
                               f"({original_size/1024/1024:.1f}MB → {optimized_size/1024/1024:.1f}MB)")
                return True
            else:
                self.logger.warning(f"⚠️ Ghostscript optimization failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            self.logger.error("❌ PDF optimization timeout")
            return False
        except FileNotFoundError:
            self.logger.error("❌ Ghostscript not found - install with: sudo apt-get install ghostscript")
            return False
        except Exception as e:
            self.logger.error(f"❌ PDF optimization error: {str(e)}")
            return False
    
    def detect_scanned_pdf(self, file_path: str) -> bool:
        """
        Heuristically detect if PDF is likely scanned (minimal text content).
        
        Args:
            file_path: Path to PDF file
            
        Returns:
            bool: True if PDF appears to be scanned, False otherwise
        """
        try:
            file_size = os.path.getsize(file_path)
            
            # Quick text extraction attempt
            with open(file_path, 'rb') as f:
                response = requests.put(
                    f"{self.tika_url}/tika",
                    headers={'Accept': 'text/plain', 'Content-Type': 'application/pdf'},
                    data=f.read(),
                    timeout=30
                )
            
            if response.status_code == 200:
                text_length = len(response.text.strip())
                text_to_size_ratio = text_length / file_size if file_size > 0 else 0
                
                # If ratio is very low, likely scanned
                is_scanned = text_to_size_ratio < 0.001
                
                self.logger.info(f"📄 PDF analysis - Text/size ratio: {text_to_size_ratio:.6f}, "
                               f"Scanned: {is_scanned}")
                return is_scanned
            else:
                self.logger.warning("⚠️ Could not analyze PDF for scanned content")
                return False
                
        except Exception as e:
            self.logger.warning(f"⚠️ PDF scan detection failed: {str(e)}")
            return False
    
    def run_ocr_with_tesseract(self, input_path: str, output_path: str) -> bool:
        """
        Perform OCR on PDF using ocrmypdf and Tesseract.
        
        Args:
            input_path: Path to input PDF
            output_path: Path for OCR'd PDF
            
        Returns:
            bool: True if OCR succeeded, False otherwise
        """
        try:
            cmd = [
                'ocrmypdf', '--force-ocr', '--optimize', '1',
                '--jpeg-quality', '80', '--png-quality', '80',
                input_path, output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                self.logger.info("🔍 OCR completed successfully")
                return True
            else:
                self.logger.warning(f"⚠️ OCR failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            self.logger.error("❌ OCR timeout")
            return False
        except FileNotFoundError:
            self.logger.error("❌ ocrmypdf not found - install with: pip install ocrmypdf")
            return False
        except Exception as e:
            self.logger.error(f"❌ OCR error: {str(e)}")
            return False
    
    def extract_text_from_tika(self, file_path: str) -> str:
        """
        Extract text from PDF using Tika server with retry logic.
        
        Args:
            file_path: Path to PDF file
            
        Returns:
            str: Extracted text content
            
        Raises:
            Exception: If all retry attempts fail
        """
        delay = self.initial_delay
        
        for attempt in range(self.max_retries):
            try:
                self.logger.info(f"📄 Extraction attempt {attempt + 1}/{self.max_retries}")
                
                with open(file_path, 'rb') as f:
                    response = requests.put(
                        f"{self.tika_url}/tika",
                        headers={
                            'Accept': 'text/plain',
                            'Content-Type': 'application/pdf'
                        },
                        data=f.read(),
                        timeout=120
                    )
                
                if response.status_code == 200:
                    text = response.text.strip()
                    self.logger.info(f"✅ Text extraction successful - {len(text)} characters")
                    return text
                
                elif response.status_code == 405:
                    self.logger.warning(f"⚠️ HTTP 405 Method Not Allowed - retrying in {delay}s")
                else:
                    self.logger.warning(f"⚠️ HTTP {response.status_code} - retrying in {delay}s")
                
            except requests.exceptions.ConnectionError:
                self.logger.warning(f"⚠️ Connection refused - retrying in {delay}s")
            except requests.exceptions.Timeout:
                self.logger.warning(f"⚠️ Request timeout - retrying in {delay}s")
            except Exception as e:
                self.logger.warning(f"⚠️ Extraction error: {str(e)} - retrying in {delay}s")
            
            if attempt < self.max_retries - 1:
                time.sleep(delay)
                delay = min(delay * self.backoff_factor, self.max_delay)
        
        raise Exception(f"Text extraction failed after {self.max_retries} attempts")
    
    def preprocess_pdf(self, file_path: str) -> str:
        """
        Preprocess PDF with optimization and OCR if needed.
        
        Args:
            file_path: Path to input PDF
            
        Returns:
            str: Path to preprocessed PDF (may be same as input)
        """
        file_size = os.path.getsize(file_path)
        temp_files = []
        current_path = file_path
        
        try:
            # Optimize if file is too large
            if file_size > self.max_file_size_bytes:
                self.logger.info(f"📦 File size {file_size/1024/1024:.1f}MB exceeds threshold, optimizing...")
                
                optimized_path = tempfile.mktemp(suffix='_optimized.pdf')
                temp_files.append(optimized_path)
                
                if self.optimize_pdf_with_ghostscript(current_path, optimized_path):
                    current_path = optimized_path
            
            # Run OCR if enabled and PDF appears scanned
            if self.enable_ocr and self.detect_scanned_pdf(current_path):
                self.logger.info("🔍 Running OCR on scanned PDF...")
                
                ocr_path = tempfile.mktemp(suffix='_ocr.pdf')
                temp_files.append(ocr_path)
                
                if self.run_ocr_with_tesseract(current_path, ocr_path):
                    current_path = ocr_path
            
            return current_path, temp_files
            
        except Exception as e:
            self.logger.error(f"❌ Preprocessing failed: {str(e)}")
            return file_path, temp_files
    
    def extract_text(self, pdf_path: str) -> Tuple[str, List[str]]:
        """
        Main extraction method - orchestrates preprocessing and text extraction.
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            tuple: (extracted_text, temp_files_for_cleanup)
        """
        self.logger.info(f"🚀 Starting PDF extraction: {pdf_path}")
        
        # Verify Tika server health
        if not self.check_tika_health():
            raise Exception("Tika server is not available")
        
        # Preprocess PDF
        processed_path, temp_files = self.preprocess_pdf(pdf_path)
        
        try:
            # Extract text
            text = self.extract_text_from_tika(processed_path)
            self.logger.info(f"✅ Extraction completed successfully")
            return text, temp_files
            
        except Exception as e:
            self.logger.error(f"❌ Extraction failed: {str(e)}")
            raise
    
    def cleanup_temp_files(self, temp_files: List[str]) -> None:
        """
        Clean up temporary files created during processing.
        
        Args:
            temp_files: List of temporary file paths to remove
        """
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                    self.logger.info(f"🧹 Cleaned up temp file: {temp_file}")
            except Exception as e:
                self.logger.warning(f"⚠️ Failed to cleanup {temp_file}: {str(e)}")


def extract_pdf_text(
    pdf_path: str,
    tika_url: str = "http://localhost:9998",
    max_file_size_mb: int = 10,
    enable_ocr: bool = True
) -> str:
    """
    Convenience function for direct PDF text extraction.
    
    Args:
        pdf_path: Path to PDF file
        tika_url: Tika server URL
        max_file_size_mb: File size threshold for optimization
        enable_ocr: Whether to perform OCR on scanned PDFs
        
    Returns:
        str: Extracted text content
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
    except Exception:
        pipeline.cleanup_temp_files(temp_files if 'temp_files' in locals() else [])
        raise


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Extract text from PDF using production pipeline')
    parser.add_argument('pdf_path', help='Path to PDF file')
    parser.add_argument('--tika-url', default='http://localhost:9998', help='Tika server URL')
    parser.add_argument('--max-size-mb', type=int, default=10, help='Max file size for optimization (MB)')
    parser.add_argument('--no-ocr', action='store_true', help='Disable OCR')
    
    args = parser.parse_args()
    
    try:
        text = extract_pdf_text(
            args.pdf_path,
            tika_url=args.tika_url,
            max_file_size_mb=args.max_size_mb,
            enable_ocr=not args.no_ocr
        )
        print(f"Extracted {len(text)} characters of text")
        print("=" * 50)
        print(text[:1000] + "..." if len(text) > 1000 else text)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
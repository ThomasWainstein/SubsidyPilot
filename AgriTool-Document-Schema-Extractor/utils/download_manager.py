"""
Download manager with retry logic and exponential backoff.
"""

import asyncio
import logging
import tempfile
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import aiohttp
import aiofiles


class DownloadManager:
    """Download manager with robust retry logic and error handling."""
    
    def __init__(self, timeout: int = 30, max_retries: int = 3, logger: Optional[logging.Logger] = None):
        self.timeout = timeout
        self.max_retries = max_retries
        self.logger = logger or logging.getLogger(__name__)
    
    async def download_document(self, url: str) -> str:
        """
        Download a document from URL to temporary file with retry logic.
        
        Args:
            url: Document URL to download.
            
        Returns:
            Path to downloaded temporary file.
            
        Raises:
            Exception: If download fails after all retries.
        """
        for attempt in range(self.max_retries):
            try:
                self.logger.info("Downloading document", extra={
                    "url": url,
                    "attempt": attempt + 1,
                    "max_retries": self.max_retries
                })
                
                # Calculate exponential backoff delay
                if attempt > 0:
                    delay = min(2 ** attempt, 30)  # Cap at 30 seconds
                    self.logger.info(f"Waiting {delay}s before retry", extra={
                        "url": url,
                        "delay_seconds": delay
                    })
                    await asyncio.sleep(delay)
                
                # Create session with timeout
                timeout = aiohttp.ClientTimeout(total=self.timeout)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.get(url) as response:
                        if response.status == 200:
                            # Create temporary file with appropriate extension
                            suffix = Path(urlparse(url).path).suffix or '.tmp'
                            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
                            temp_path = temp_file.name
                            temp_file.close()
                            
                            # Download file content
                            async with aiofiles.open(temp_path, 'wb') as f:
                                async for chunk in response.content.iter_chunked(8192):
                                    await f.write(chunk)
                            
                            self.logger.info("Document downloaded successfully", extra={
                                "url": url,
                                "temp_path": temp_path,
                                "file_size": Path(temp_path).stat().st_size,
                                "attempt": attempt + 1
                            })
                            
                            return temp_path
                        
                        else:
                            raise aiohttp.ClientResponseError(
                                request_info=response.request_info,
                                history=response.history,
                                status=response.status,
                                message=f"HTTP {response.status}: {response.reason}"
                            )
            
            except asyncio.TimeoutError as e:
                self.logger.warning("Download timeout", extra={
                    "url": url,
                    "attempt": attempt + 1,
                    "timeout": self.timeout,
                    "error": str(e)
                })
                if attempt == self.max_retries - 1:
                    raise Exception(f"Download timeout after {self.max_retries} attempts")
            
            except aiohttp.ClientError as e:
                self.logger.warning("Download client error", extra={
                    "url": url,
                    "attempt": attempt + 1,
                    "error": str(e),
                    "error_type": type(e).__name__
                })
                if attempt == self.max_retries - 1:
                    raise Exception(f"Download failed after {self.max_retries} attempts: {str(e)}")
            
            except Exception as e:
                self.logger.error("Download unexpected error", extra={
                    "url": url,
                    "attempt": attempt + 1,
                    "error": str(e),
                    "error_type": type(e).__name__
                })
                if attempt == self.max_retries - 1:
                    raise Exception(f"Download failed after {self.max_retries} attempts: {str(e)}")
        
        raise Exception(f"Download failed after {self.max_retries} attempts")
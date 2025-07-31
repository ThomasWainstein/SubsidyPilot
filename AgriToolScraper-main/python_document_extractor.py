#!/usr/bin/env python3
"""
Python Document Extraction Pipeline for AgriTool Scraper
========================================================

Pure Python document extraction system integrated with the AgriTool scraping pipeline.
Replaces Tika completely with Python-native libraries.
"""

import os
import sys
import logging
from pathlib import Path

# Add the AgriTool-Raw-Log-Interpreter directory to the path to import the extractor
current_dir = Path(__file__).parent
agritool_dir = current_dir.parent / "AgriTool-Raw-Log-Interpreter"
sys.path.insert(0, str(agritool_dir))

try:
    from python_document_extractor import (
        PythonDocumentExtractor, 
        DocumentExtractionResult,
        extract_document_text
    )
except ImportError as e:
    logging.error(f"❌ Failed to import python_document_extractor: {e}")
    logging.error("Make sure AgriTool-Raw-Log-Interpreter/python_document_extractor.py exists")
    raise


class ScraperDocumentExtractor:
    """Document extractor integrated with the scraper pipeline"""
    
    def __init__(self, enable_ocr: bool = True, max_file_size_mb: float = 25.0):
        self.extractor = PythonDocumentExtractor(
            enable_ocr=enable_ocr,
            max_file_size_mb=max_file_size_mb,
            ocr_language='eng+fra+ron'  # English, French, Romanian for AgriTool
        )
        self.logger = logging.getLogger(__name__)
        
    def extract_attachment_text(self, attachment_path: str) -> dict:
        """
        Extract text from a downloaded attachment.
        
        Args:
            attachment_path: Path to the downloaded attachment file
            
        Returns:
            Dict with extraction results
        """
        try:
            result = self.extractor.extract_document(attachment_path)
            
            # Convert to dict with additional scraper-specific fields
            extraction_data = result.to_dict()
            extraction_data['extracted_for_scraper'] = True
            extraction_data['attachment_path'] = attachment_path
            
            if result.success:
                self.logger.info(f"✅ Extracted {result.character_count} chars from {result.file_name}")
            else:
                self.logger.warning(f"⚠️ Failed to extract from {result.file_name}: {result.error}")
                
            return extraction_data
            
        except Exception as e:
            self.logger.error(f"❌ Document extraction failed for {attachment_path}: {e}")
            return {
                'file_path': attachment_path,
                'file_name': os.path.basename(attachment_path),
                'success': False,
                'error': str(e),
                'text_content': '',
                'extraction_method': 'failed',
                'extracted_for_scraper': True
            }
            
    def extract_multiple_attachments(self, attachment_paths: list) -> dict:
        """
        Extract text from multiple attachment files.
        
        Args:
            attachment_paths: List of paths to attachment files
            
        Returns:
            Dict mapping file paths to extraction results
        """
        results = {}
        
        self.logger.info(f"📚 Extracting text from {len(attachment_paths)} attachments...")
        
        for attachment_path in attachment_paths:
            results[attachment_path] = self.extract_attachment_text(attachment_path)
            
        successful = sum(1 for r in results.values() if r['success'])
        self.logger.info(f"✅ Successfully extracted {successful}/{len(attachment_paths)} attachments")
        
        return results
        
    def merge_page_and_attachment_content(self, page_data: dict, attachment_results: dict) -> dict:
        """
        Merge webpage content with extracted attachment content.
        
        Args:
            page_data: Raw page data from scraper
            attachment_results: Results from extract_multiple_attachments
            
        Returns:
            Combined content dictionary
        """
        # Start with page content
        combined_text_parts = []
        
        # Add page title and text
        if page_data.get('title'):
            combined_text_parts.append(f"=== PAGE TITLE ===\n{page_data['title']}")
            
        if page_data.get('text') or page_data.get('raw_text'):
            page_text = page_data.get('text') or page_data.get('raw_text')
            combined_text_parts.append(f"=== PAGE CONTENT ===\n{page_text}")
        
        # Add attachment content
        attachment_metadata = []
        successful_extractions = 0
        failed_extractions = 0
        
        for file_path, extraction_result in attachment_results.items():
            file_name = os.path.basename(file_path)
            
            if extraction_result['success'] and extraction_result['text_content'].strip():
                combined_text_parts.append(
                    f"=== ATTACHMENT: {file_name} ===\n{extraction_result['text_content']}"
                )
                successful_extractions += 1
            else:
                error_msg = extraction_result.get('error', 'Unknown error')
                combined_text_parts.append(
                    f"=== ATTACHMENT: {file_name} (EXTRACTION FAILED) ===\n"
                    f"Error: {error_msg}\n"
                    f"File type: {extraction_result.get('file_type', 'unknown')}\n"
                    f"File size: {extraction_result.get('file_size', 0)} bytes"
                )
                failed_extractions += 1
                
            # Collect metadata
            attachment_metadata.append({
                'file_name': file_name,
                'file_path': file_path,
                'file_type': extraction_result.get('file_type'),
                'file_size': extraction_result.get('file_size'),
                'extraction_method': extraction_result.get('extraction_method'),
                'success': extraction_result['success'],
                'character_count': extraction_result.get('character_count', 0),
                'extraction_time': extraction_result.get('extraction_time', 0),
                'error': extraction_result.get('error'),
                'warnings': extraction_result.get('warnings', [])
            })
        
        # Create merged result
        merged_content = {
            'url': page_data.get('url', ''),
            'title': page_data.get('title', ''),
            'combined_text': '\n\n'.join(combined_text_parts),
            'page_text': page_data.get('text') or page_data.get('raw_text', ''),
            'attachment_count': len(attachment_results),
            'successful_extractions': successful_extractions,
            'failed_extractions': failed_extractions,
            'attachment_metadata': attachment_metadata,
            'extraction_summary': {
                'total_characters': sum(len(part) for part in combined_text_parts),
                'page_characters': len(page_data.get('text') or page_data.get('raw_text', '')),
                'attachment_characters': sum(
                    r.get('character_count', 0) for r in attachment_results.values() if r['success']
                ),
                'extraction_methods_used': list(set(
                    r.get('extraction_method') for r in attachment_results.values() 
                    if r.get('extraction_method') and r['success']
                ))
            }
        }
        
        self.logger.info(
            f"📋 Merged content: {merged_content['extraction_summary']['total_characters']} total chars "
            f"({successful_extractions} successful, {failed_extractions} failed attachments)"
        )
        
        return merged_content


# Convenience functions for backward compatibility
def extract_pdf_text_python(pdf_path: str, **kwargs) -> str:
    """Extract text from PDF using Python libraries (replaces Tika)"""
    result = extract_document_text(pdf_path, **kwargs)
    if result['success']:
        return result['text_content']
    else:
        raise RuntimeError(f"PDF extraction failed: {result['error']}")


def extract_document_python(file_path: str, **kwargs) -> str:
    """Extract text from any supported document using Python libraries"""
    result = extract_document_text(file_path, **kwargs)
    if result['success']:
        return result['text_content']
    else:
        raise RuntimeError(f"Document extraction failed: {result['error']}")


if __name__ == "__main__":
    # Test the scraper document extractor
    import tempfile
    
    if len(sys.argv) > 1:
        test_file = sys.argv[1]
        
        extractor = ScraperDocumentExtractor()
        result = extractor.extract_attachment_text(test_file)
        
        print(f"\n{'='*60}")
        print("SCRAPER DOCUMENT EXTRACTION TEST")
        print('='*60)
        print(json.dumps(result, indent=2, ensure_ascii=False)[:1000])
        print('='*60)
        
    else:
        print("Usage: python python_document_extractor.py <document_file>")
        print("This is the scraper-integrated version of the document extractor.")
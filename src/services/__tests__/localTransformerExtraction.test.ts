/**
 * Tests for Local Transformer-Based Extraction Service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLocalExtractor, extractLocallyFromText } from '../localTransformerExtraction'
import { mockPipeline } from '@/test/mocks/transformers'

// Mock the transformers module
vi.mock('@huggingface/transformers', () => ({
  pipeline: mockPipeline,
  env: {
    allowLocalModels: false,
    useBrowserCache: true,
  },
}))

describe('LocalTransformerExtractionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('HuggingFaceLocalExtractor', () => {
    it('should initialize extractor successfully', async () => {
      const extractor = getLocalExtractor()
      expect(extractor).toBeDefined()
    })

    it('should extract fields from financial document', async () => {
      const text = `
        Invoice Number: INV-2024-001
        Date: 2024-01-15
        Total Amount: €1,500.00
        Vendor: Green Valley Supplies
        Due Date: 2024-02-15
      `
      
      const result = await extractLocallyFromText(text, 'financial')
      
      expect(result).toMatchObject({
        extractedFields: expect.any(Array),
        overallConfidence: expect.any(Number),
        processingTime: expect.any(Number),
        modelUsed: expect.any(String),
        fallbackRecommended: expect.any(Boolean)
      })
      
      expect(result.extractedFields.length).toBeGreaterThan(0)
      expect(result.overallConfidence).toBeGreaterThan(0)
      expect(result.overallConfidence).toBeLessThanOrEqual(1)
    })

    it('should extract fields from legal document', async () => {
      const text = `
        Contract Agreement
        Party A: John Smith Farm LLC
        Party B: Equipment Rental Corp
        Contract Date: 2024-01-01
        Expiry Date: 2024-12-31
        Value: €25,000
      `
      
      const result = await extractLocallyFromText(text, 'legal')
      
      expect(result.extractedFields.length).toBeGreaterThan(0)
      expect(result.modelUsed).toContain('local')
    })

    it('should recommend fallback for low confidence results', async () => {
      const extractor = getLocalExtractor()
      extractor.setConfidenceThreshold(0.95) // Very high threshold
      
      const poorQualityText = 'unclear text with no clear structure'
      
      const result = await extractLocallyFromText(poorQualityText, 'financial')
      
      expect(result.fallbackRecommended).toBe(true)
      expect(result.overallConfidence).toBeLessThan(0.95)
    })

    it('should handle extraction errors gracefully', async () => {
      // Mock pipeline to throw error during NER
      mockPipeline.mockRejectedValueOnce(new Error('Pipeline failed'))
      
      const text = 'Test document content'
      
      const result = await extractLocallyFromText(text, 'financial')
      
      expect(result.errorMessage).toBeDefined()
      expect(result.extractedFields).toHaveLength(0)
      expect(result.fallbackRecommended).toBe(true)
    })

    it('should process confidence thresholds correctly', async () => {
      const extractor = getLocalExtractor()
      
      // Test default threshold
      expect(extractor.getConfidenceThreshold()).toBe(0.7)
      
      // Test setting new threshold
      extractor.setConfidenceThreshold(0.8)
      expect(extractor.getConfidenceThreshold()).toBe(0.8)
      
      // Test threshold validation
      extractor.setConfidenceThreshold(1.5) // Invalid value
      expect(extractor.getConfidenceThreshold()).toBe(0.8) // Should not change
    })

    it('should handle different document types', async () => {
      const documentTypes = ['financial', 'legal', 'technical', 'environmental', 'certification']
      const text = 'Sample document with various information'
      
      for (const docType of documentTypes) {
        const result = await extractLocallyFromText(text, docType)
        expect(result).toBeDefined()
        expect(result.extractedFields).toBeDefined()
      }
    })

    it('should measure processing time accurately', async () => {
      const text = 'Invoice INV-001 for €1000 dated 2024-01-01'
      
      const startTime = Date.now()
      const result = await extractLocallyFromText(text, 'financial')
      const endTime = Date.now()
      
      expect(result.processingTime).toBeGreaterThan(0)
      expect(result.processingTime).toBeLessThan(endTime - startTime + 100) // Small buffer
    })

    it('should extract entities with proper structure', async () => {
      const text = 'Contract for John Doe at Green Farm LLC, value €5000'
      
      const result = await extractLocallyFromText(text, 'legal')
      
      result.extractedFields.forEach(field => {
        expect(field).toMatchObject({
          field: expect.any(String),
          value: expect.any(String),
          confidence: expect.any(Number)
        })
        expect(field.confidence).toBeGreaterThan(0)
        expect(field.confidence).toBeLessThanOrEqual(1)
      })
    })
  })

  describe('Field pattern matching', () => {
    it('should extract financial fields correctly', async () => {
      const text = `
        Invoice: INV-2024-001
        Amount: €2,500.00
        Date: 2024-01-15
        Supplier: Farm Equipment Ltd
        Payment Due: 2024-02-15
      `
      
      const result = await extractLocallyFromText(text, 'financial')
      
      const extractedFieldNames = result.extractedFields.map(f => f.field)
      expect(extractedFieldNames).toContain('invoice_number')
      expect(extractedFieldNames).toContain('total_amount')
    })

    it('should extract legal fields correctly', async () => {
      const text = `
        Agreement between parties
        Contractor: Smith Farms Inc
        Client: Agricultural Services Corp
        Contract Value: €15,000
        Start Date: 2024-01-01
        End Date: 2024-12-31
      `
      
      const result = await extractLocallyFromText(text, 'legal')
      
      const extractedFieldNames = result.extractedFields.map(f => f.field)
      expect(extractedFieldNames).toContain('contract_parties')
      expect(extractedFieldNames).toContain('contract_value')
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle empty text input', async () => {
      const result = await extractLocallyFromText('', 'financial')
      
      expect(result.extractedFields).toHaveLength(0)
      expect(result.overallConfidence).toBe(0)
      expect(result.fallbackRecommended).toBe(true)
    })

    it('should handle very long text input', async () => {
      const longText = 'Invoice details: ' + 'A'.repeat(50000) + ' Amount: €1000'
      
      const result = await extractLocallyFromText(longText, 'financial')
      
      expect(result).toBeDefined()
      expect(result.processingTime).toBeGreaterThan(0)
    })

    it('should handle invalid document type', async () => {
      const text = 'Sample document content'
      
      const result = await extractLocallyFromText(text, 'invalid_type')
      
      expect(result.extractedFields).toHaveLength(0)
      expect(result.fallbackRecommended).toBe(true)
    })
  })
})
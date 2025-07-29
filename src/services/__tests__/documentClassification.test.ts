/**
 * Tests for Document Classification Service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDocumentClassifier, classifyDocumentText } from '../documentClassification'
import { mockPipeline } from '@/test/mocks/transformers'

// Mock the transformers module
vi.mock('@huggingface/transformers', () => ({
  pipeline: mockPipeline,
  env: {
    allowLocalModels: false,
    useBrowserCache: true,
  },
}))

describe('DocumentClassificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('HuggingFaceDocumentClassifier', () => {
    it('should initialize classifier successfully', async () => {
      const classifier = getDocumentClassifier()
      expect(classifier).toBeDefined()
    })

    it('should classify financial document correctly', async () => {
      const text = 'Invoice number INV-2024-001 for farming equipment purchase'
      const fileName = 'invoice_2024.pdf'
      
      const result = await classifyDocumentText(text, fileName)
      
      expect(result).toMatchObject({
        category: expect.any(String),
        confidence: expect.any(Number),
        model: expect.any(String),
        alternatives: expect.any(Array)
      })
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('should handle rule-based classification for file extensions', async () => {
      const text = 'Contract for land lease agreement'
      const fileName = 'contract.pdf'
      
      const result = await classifyDocumentText(text, fileName)
      
      expect(result.category).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should provide alternatives in classification result', async () => {
      const text = 'Environmental impact assessment report'
      const fileName = 'environmental_report.docx'
      
      const result = await classifyDocumentText(text, fileName)
      
      expect(result.alternatives).toHaveLength(4) // Top 4 alternatives
      expect(result.alternatives[0]).toMatchObject({
        category: expect.any(String),
        confidence: expect.any(Number)
      })
    })

    it('should handle empty text gracefully', async () => {
      const text = ''
      const fileName = 'empty.txt'
      
      const result = await classifyDocumentText(text, fileName)
      
      expect(result.category).toBe('other')
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should handle classification errors gracefully', async () => {
      // Mock pipeline to throw error
      mockPipeline.mockRejectedValueOnce(new Error('Classification failed'))
      
      const text = 'Test document content'
      const fileName = 'test.pdf'
      
      const result = await classifyDocumentText(text, fileName)
      
      // Should fallback to rule-based classification
      expect(result.category).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should prioritize filename patterns over content', async () => {
      const text = 'This could be anything'
      const fileName = 'invoice_123.pdf'
      
      const result = await classifyDocumentText(text, fileName)
      
      // Should be classified as financial due to filename pattern
      expect(result.category).toBe('financial')
    })

    it('should handle long text content appropriately', async () => {
      const longText = 'A'.repeat(10000) + ' invoice payment due'
      const fileName = 'document.pdf'
      
      const result = await classifyDocumentText(longText, fileName)
      
      expect(result).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
    })
  })

  describe('Rule-based classification fallback', () => {
    it('should classify based on filename keywords', async () => {
      const testCases = [
        { fileName: 'contract_2024.pdf', expectedCategory: 'legal' },
        { fileName: 'invoice_jan.xlsx', expectedCategory: 'financial' },
        { fileName: 'certification_organic.docx', expectedCategory: 'certification' },
        { fileName: 'environmental_impact.pdf', expectedCategory: 'environmental' },
        { fileName: 'technical_manual.pdf', expectedCategory: 'technical' },
      ]

      for (const testCase of testCases) {
        const result = await classifyDocumentText('Generic content', testCase.fileName)
        expect(result.category).toBe(testCase.expectedCategory)
      }
    })

    it('should classify based on content keywords', async () => {
      const testCases = [
        { text: 'This is a legal agreement for farm lease', expectedCategory: 'legal' },
        { text: 'Payment invoice for agricultural supplies', expectedCategory: 'financial' },
        { text: 'Environmental sustainability report', expectedCategory: 'environmental' },
        { text: 'Technical specifications for equipment', expectedCategory: 'technical' },
        { text: 'Organic certification document', expectedCategory: 'certification' },
      ]

      for (const testCase of testCases) {
        const result = await classifyDocumentText(testCase.text, 'document.pdf')
        expect(result.category).toBe(testCase.expectedCategory)
      }
    })
  })
})
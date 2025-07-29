/**
 * HuggingFace Transformers mock utilities for testing
 */
import { vi } from 'vitest'

export const createMockClassifier = () => ({
  predict: vi.fn().mockResolvedValue([
    { label: 'financial', score: 0.95 },
    { label: 'legal', score: 0.85 },
    { label: 'technical', score: 0.75 },
    { label: 'environmental', score: 0.65 },
    { label: 'certification', score: 0.55 }
  ])
})

export const createMockNERPipeline = () => ({
  predict: vi.fn().mockResolvedValue([
    {
      entity: 'B-PER',
      score: 0.9998,
      index: 1,
      word: 'John',
      start: 0,
      end: 4
    },
    {
      entity: 'I-PER',
      score: 0.9995,
      index: 2,
      word: 'Doe',
      start: 5,
      end: 8
    },
    {
      entity: 'B-ORG',
      score: 0.9992,
      index: 5,
      word: 'Test',
      start: 15,
      end: 19
    },
    {
      entity: 'I-ORG',
      score: 0.9990,
      index: 6,
      word: 'Farm',
      start: 20,
      end: 24
    }
  ])
})

export const createMockQAPipeline = () => ({
  predict: vi.fn().mockImplementation(({ question, context }) => {
    // Mock responses based on question type
    if (question.includes('invoice number')) {
      return { answer: 'INV-2024-001', score: 0.95 }
    }
    if (question.includes('total amount')) {
      return { answer: '€1,500.00', score: 0.92 }
    }
    if (question.includes('farm name')) {
      return { answer: 'Green Valley Farm', score: 0.88 }
    }
    if (question.includes('owner name')) {
      return { answer: 'John Smith', score: 0.90 }
    }
    
    return { answer: 'Unknown', score: 0.1 }
  })
})

export const mockPipeline = vi.fn().mockImplementation((task: string, model?: string) => {
  switch (task) {
    case 'text-classification':
      return Promise.resolve(createMockClassifier())
    case 'ner':
    case 'token-classification':
      return Promise.resolve(createMockNERPipeline())
    case 'question-answering':
      return Promise.resolve(createMockQAPipeline())
    default:
      return Promise.resolve({
        predict: vi.fn().mockResolvedValue([])
      })
  }
})

export const mockTransformersEnv = {
  allowLocalModels: false,
  useBrowserCache: true,
}
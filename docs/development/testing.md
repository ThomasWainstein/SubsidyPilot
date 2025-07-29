# Testing Guide

Comprehensive testing strategy and implementation guide for AgriTool.

## Testing Philosophy

AgriTool follows a multi-layered testing approach:
- **Unit Tests**: Individual functions and components
- **Integration Tests**: Feature workflows and API interactions  
- **End-to-End Tests**: Complete user journeys
- **Performance Tests**: Load and stress testing
- **Security Tests**: Vulnerability and penetration testing

## Test Environment Setup

### Prerequisites

```bash
# Install test dependencies (handled automatically)
npm install
```

### Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
})
```

## Running Tests

### Command Line Interface

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test document-classification.test.ts

# Run tests matching pattern
npm test -- --grep "classification"
```

### Test Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test"
  }
}
```

## Test Categories

### Unit Tests

#### Component Testing

```typescript
// Example component test
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentCard } from '@/components/farm/DocumentCard'
import { mockDocumentData } from '@/test/mocks/supabase'

describe('DocumentCard', () => {
  it('should display document information correctly', () => {
    render(<DocumentCard document={mockDocumentData} />)
    
    expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
    expect(screen.getByText('financial')).toBeInTheDocument()
  })

  it('should handle click events', () => {
    const onClickMock = vi.fn()
    render(<DocumentCard document={mockDocumentData} onClick={onClickMock} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(onClickMock).toHaveBeenCalledWith(mockDocumentData.id)
  })
})
```

#### Service Testing

```typescript
// Example service test
import { classifyDocumentText } from '@/services/documentClassification'
import { mockPipeline } from '@/test/mocks/transformers'

describe('Document Classification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should classify financial documents', async () => {
    const result = await classifyDocumentText(
      'Invoice INV-2024-001 for €1,500',
      'invoice.pdf'
    )
    
    expect(result.category).toBe('financial')
    expect(result.confidence).toBeGreaterThan(0.8)
  })
})
```

#### Hook Testing

```typescript
// Example hook test
import { renderHook, act } from '@testing-library/react'
import { useDocumentReview } from '@/hooks/useDocumentReview'
import { createTestWrapper } from '@/test/utils'

describe('useDocumentReview', () => {
  it('should submit review corrections', async () => {
    const wrapper = createTestWrapper()
    const { result } = renderHook(() => useDocumentReview(), { wrapper })

    await act(async () => {
      await result.current.submitCorrection(mockCorrectionData)
    })

    expect(result.current.isSuccess).toBe(true)
  })
})
```

### Integration Tests

#### API Integration

```typescript
// Example API integration test
describe('Training Pipeline API', () => {
  it('should extract training data', async () => {
    const response = await fetch('/api/training/extract', {
      method: 'POST',
      body: JSON.stringify({
        farmId: 'test-farm-id',
        dateRange: { start: '2024-01-01', end: '2024-01-31' }
      })
    })

    expect(response.ok).toBe(true)
    const data = await response.json()
    expect(data.recordCount).toBeGreaterThan(0)
  })
})
```

#### Database Integration

```typescript
// Example database integration test
describe('Document Extraction Database', () => {
  it('should store extraction results', async () => {
    const extractionData = {
      document_id: 'test-doc-id',
      extracted_data: { farm_name: 'Test Farm' },
      confidence_score: 0.85
    }

    const { data, error } = await supabase
      .from('document_extractions')
      .insert(extractionData)

    expect(error).toBeNull()
    expect(data).toBeDefined()
  })
})
```

### End-to-End Tests

#### User Journey Testing

```typescript
// Example E2E test with Playwright
import { test, expect } from '@playwright/test'

test('complete document processing workflow', async ({ page }) => {
  // Upload document
  await page.goto('/farm/test-farm-id/documents')
  await page.setInputFiles('input[type="file"]', 'test-document.pdf')
  
  // Verify classification
  await expect(page.locator('[data-testid="document-category"]')).toContainText('financial')
  
  // Review extraction
  await page.click('[data-testid="review-extraction"]')
  await page.fill('[data-testid="farm-name-input"]', 'Corrected Farm Name')
  await page.click('[data-testid="submit-correction"]')
  
  // Verify success
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
})
```

## Test Utilities and Mocks

### Mock Data

```typescript
// src/test/mocks/supabase.ts
export const mockDocumentData = {
  id: 'test-document-id',
  farm_id: 'test-farm-id',
  file_name: 'test-document.pdf',
  document_type: 'financial',
  confidence_score: 0.85
}

export const mockExtractionData = {
  id: 'test-extraction-id',
  document_id: 'test-document-id',
  extracted_data: {
    farm_name: 'Test Farm',
    owner_name: 'John Doe'
  }
}
```

### Test Utilities

```typescript
// src/test/utils.ts
export const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

export const waitForAsyncUpdates = () => {
  return act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}
```

### Mock Services

```typescript
// src/test/mocks/transformers.ts
export const mockPipeline = vi.fn().mockImplementation((task: string) => {
  switch (task) {
    case 'text-classification':
      return Promise.resolve({
        predict: vi.fn().mockResolvedValue([
          { label: 'financial', score: 0.95 }
        ])
      })
    case 'question-answering':
      return Promise.resolve({
        predict: vi.fn().mockResolvedValue({ answer: 'Test Answer', score: 0.9 })
      })
  }
})
```

## Coverage Requirements

### Coverage Targets

- **Statements**: 80% minimum, 90% target
- **Branches**: 80% minimum, 85% target  
- **Functions**: 80% minimum, 90% target
- **Lines**: 80% minimum, 90% target

### Coverage Reporting

```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/index.html

# Coverage summary
npm run test:coverage -- --reporter=text-summary
```

### Critical Path Coverage

High-priority areas requiring 95%+ coverage:
- Document classification logic
- Data extraction algorithms
- Security and authentication
- Payment processing
- Audit logging

## Test Data Management

### Test Database

```sql
-- Setup test data
INSERT INTO farms (id, name) VALUES ('test-farm-id', 'Test Farm');
INSERT INTO documents (id, farm_id, file_name, document_type) 
VALUES ('test-doc-id', 'test-farm-id', 'test.pdf', 'financial');
```

### Data Fixtures

```typescript
// src/test/fixtures/documents.ts
export const documentFixtures = {
  financial: {
    text: 'Invoice INV-2024-001 Total: €1,500',
    expectedCategory: 'financial',
    expectedConfidence: 0.95
  },
  legal: {
    text: 'Contract Agreement between parties',
    expectedCategory: 'legal',
    expectedConfidence: 0.88
  }
}
```

## Performance Testing

### Load Testing

```typescript
// Example load test
describe('Classification Performance', () => {
  it('should handle concurrent classifications', async () => {
    const promises = Array(50).fill(0).map(() => 
      classifyDocumentText('Test document', 'test.pdf')
    )
    
    const startTime = Date.now()
    const results = await Promise.all(promises)
    const endTime = Date.now()
    
    expect(results).toHaveLength(50)
    expect(endTime - startTime).toBeLessThan(5000) // 5 second max
  })
})
```

### Memory Testing

```typescript
// Memory usage monitoring
describe('Memory Usage', () => {
  it('should not leak memory during classification', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0
    
    // Perform 100 classifications
    for (let i = 0; i < 100; i++) {
      await classifyDocumentText('Test', 'test.pdf')
    }
    
    // Force garbage collection if available
    if (global.gc) global.gc()
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0
    const memoryIncrease = finalMemory - initialMemory
    
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // Max 50MB increase
  })
})
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

### Quality Gates

- All tests must pass
- Coverage thresholds must be met
- No critical security vulnerabilities
- Performance benchmarks must pass

## Debugging Tests

### Test Debugging

```typescript
// Debug failing tests
describe('Debug Example', () => {
  it('should debug classification', async () => {
    // Enable debug logging
    console.log('Input text:', text)
    console.log('Classification result:', result)
    
    // Use debugger
    debugger
    
    // Detailed assertions
    expect(result).toMatchObject({
      category: expect.any(String),
      confidence: expect.any(Number)
    })
  })
})
```

### Visual Debugging

```typescript
// Screenshot testing for UI components
import { screen } from '@testing-library/react'

it('should render correctly', () => {
  render(<Component />)
  
  // Debug DOM structure
  screen.debug()
  
  // Get element for inspection
  const element = screen.getByTestId('test-element')
  console.log('Element HTML:', element.innerHTML)
})
```

## Best Practices

### Test Organization

1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the scenario
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Keep tests independent** and avoid shared state
5. **Use beforeEach/afterEach** for setup/cleanup

### Mock Strategy

1. **Mock external dependencies** (APIs, databases)
2. **Keep mocks simple** and focused
3. **Update mocks** when APIs change
4. **Document mock behavior** clearly

### Performance

1. **Minimize test setup** overhead
2. **Use parallel execution** where possible
3. **Clean up resources** after tests
4. **Monitor test execution time**

---

## Related Documentation

- [Development Setup](./setup.md) - Initial development environment
- [Contributing Guide](./contributing.md) - Contribution guidelines
- [Troubleshooting](../troubleshooting/testing.md) - Test troubleshooting
- [CI/CD Guide](./cicd.md) - Continuous integration setup
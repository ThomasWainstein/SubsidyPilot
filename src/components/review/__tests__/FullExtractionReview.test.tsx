import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FullExtractionReview from '../FullExtractionReview';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}));

const mockExtraction = {
  id: 'ext1',
  extracted_data: {
    farmName: 'Test Farm',
    ownerName: 'John Doe',
    address: '123 Farm Road',
    totalHectares: '50',
    confidence: 0.85
  },
  farm_documents: {
    file_name: 'test-document.pdf',
    file_url: 'https://example.com/test.pdf'
  }
};

const mockProps = {
  documentId: 'doc1',
  extraction: mockExtraction,
  farmId: 'farm1',
  onSave: vi.fn(),
  onApplyToForm: vi.fn()
};

describe('FullExtractionReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render extracted fields correctly', () => {
    render(<FullExtractionReview {...mockProps} />);
    
    expect(screen.getByDisplayValue('Test Farm')).toBeDefined();
    expect(screen.getByDisplayValue('John Doe')).toBeDefined();
    expect(screen.getByDisplayValue('123 Farm Road')).toBeDefined();
    expect(screen.getByDisplayValue('50')).toBeDefined();
  });

  it('should have apply to form button', () => {
    render(<FullExtractionReview {...mockProps} />);
    
    const applyButton = screen.getByRole('button', { name: /apply to form/i });
    expect(applyButton).toBeDefined();
  });

  it('should show document information', () => {
    render(<FullExtractionReview {...mockProps} />);
    
    expect(screen.getByText('test-document.pdf')).toBeDefined();
  });

  it('should handle valid data application', () => {
    render(<FullExtractionReview {...mockProps} />);
    
    const applyButton = screen.getByRole('button', { name: /apply to form/i });
    applyButton.click();
    
    expect(mockProps.onApplyToForm).toHaveBeenCalled();
  });

  it('should show confidence indicators', () => {
    render(<FullExtractionReview {...mockProps} />);
    
    // Should show confidence badge
    expect(screen.getByText('85%')).toBeDefined();
  });

  it('should handle empty extraction data', () => {
    const emptyExtraction = {
      ...mockExtraction,
      extracted_data: {}
    };
    
    render(<FullExtractionReview {...mockProps} extraction={emptyExtraction} />);
    
    const applyButton = screen.getByRole('button', { name: /apply to form/i });
    expect(applyButton).toBeDefined();
  });

  it('should render export button', () => {
    render(<FullExtractionReview {...mockProps} />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDefined();
  });

  it('should render view document button', () => {
    render(<FullExtractionReview {...mockProps} />);

    const viewButton = screen.getByRole('button', { name: /view document/i });
    expect(viewButton).toBeDefined();
  });

  // RESOLVED: prefer to test accessible edit controls for fields
  it('has accessible edit controls for fields', () => {
    render(<FullExtractionReview {...mockProps} />);

    const editButton = screen.getByLabelText(/edit farm name field/i);
    expect(editButton).toBeDefined();
  });
});
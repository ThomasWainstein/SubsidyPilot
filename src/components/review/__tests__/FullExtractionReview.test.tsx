import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render extracted fields correctly', () => {
    render(<FullExtractionReview {...mockProps} />);
    
    expect(screen.getByDisplayValue('Test Farm')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Farm Road')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('should enable field editing when edit button is clicked', async () => {
    render(<FullExtractionReview {...mockProps} />);
    
    const farmNameInput = screen.getByDisplayValue('Test Farm');
    expect(farmNameInput).toBeDisabled();
    
    const editButtons = screen.getAllByLabelText(/Edit.*field/);
    await user.click(editButtons[0]);
    
    await waitFor(() => {
      expect(farmNameInput).not.toBeDisabled();
    });
  });

  it('should save field changes correctly', async () => {
    render(<FullExtractionReview {...mockProps} />);
    
    // Edit farm name
    const editButtons = screen.getAllByLabelText(/Edit.*field/);
    await user.click(editButtons[0]);
    
    const farmNameInput = screen.getByDisplayValue('Test Farm');
    await user.clear(farmNameInput);
    await user.type(farmNameInput, 'Updated Farm Name');
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: /save.*field/i });
    await user.click(saveButton);
    
    expect(screen.getByDisplayValue('Updated Farm Name')).toBeInTheDocument();
  });

  it('should handle field validation errors', async () => {
    render(<FullExtractionReview {...mockProps} />);
    
    // Edit hectares field with invalid value
    const editButtons = screen.getAllByLabelText(/Edit.*field/);
    await user.click(editButtons[3]); // Assuming hectares is 4th field
    
    const hectaresInput = screen.getByDisplayValue('50');
    await user.clear(hectaresInput);
    await user.type(hectaresInput, '-10'); // Invalid negative value
    
    // Try to apply to form
    const applyButton = screen.getByRole('button', { name: /apply to form/i });
    await user.click(applyButton);
    
    // Should show validation error
    expect(mockProps.onApplyToForm).not.toHaveBeenCalled();
  });

  it('should apply valid data to form', async () => {
    const { toast } = await import('@/hooks/use-toast');
    render(<FullExtractionReview {...mockProps} />);
    
    const applyButton = screen.getByRole('button', { name: /apply to form/i });
    await user.click(applyButton);
    
    expect(mockProps.onApplyToForm).toHaveBeenCalledWith({
      name: 'Test Farm',
      ownerName: 'John Doe',
      address: '123 Farm Road',
      total_hectares: 50
    });
    
    expect(toast).toHaveBeenCalledWith({
      title: 'Applied to Form',
      description: expect.stringContaining('4 fields')
    });
  });

  it('should handle empty field values correctly', async () => {
    const extractionWithEmptyFields = {
      ...mockExtraction,
      extracted_data: {
        farmName: 'Test Farm',
        ownerName: '', // Empty field
        address: null, // Null field
        totalHectares: '50'
      }
    };
    
    render(<FullExtractionReview {...mockProps} extraction={extractionWithEmptyFields} />);
    
    const applyButton = screen.getByRole('button', { name: /apply to form/i });
    await user.click(applyButton);
    
    // Should only apply non-empty fields
    expect(mockProps.onApplyToForm).toHaveBeenCalledWith({
      name: 'Test Farm',
      total_hectares: 50
    });
  });

  it('should show document preview when view document is clicked', async () => {
    render(<FullExtractionReview {...mockProps} />);
    
    const viewDocButton = screen.getByRole('button', { name: /view document/i });
    await user.click(viewDocButton);
    
    // Should open document preview modal
    expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
  });

  it('should handle adding custom fields', async () => {
    render(<FullExtractionReview {...mockProps} />);
    
    const addFieldButton = screen.getByRole('button', { name: /add custom field/i });
    await user.click(addFieldButton);
    
    // Should add a new empty field
    const customFieldInputs = screen.getAllByDisplayValue('');
    expect(customFieldInputs.length).toBeGreaterThan(0);
  });

  it('should export data correctly', async () => {
    // Mock URL.createObjectURL and click simulation
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
    const clickSpy = vi.fn();
    
    const originalCreateElement = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = originalCreateElement.call(document, tagName);
      if (tagName === 'a') {
        element.click = clickSpy;
      }
      return element;
    });
    
    render(<FullExtractionReview {...mockProps} />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);
    
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    
    // Cleanup
    createObjectURLSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('should handle bulk field operations', async () => {
    render(<FullExtractionReview {...mockProps} />);
    
    // Select multiple fields
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);
    
    // Bulk accept should be available
    const bulkAcceptButton = screen.getByRole('button', { name: /accept selected/i });
    expect(bulkAcceptButton).not.toBeDisabled();
    
    await user.click(bulkAcceptButton);
    
    // Fields should be marked as accepted
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
  });

  it('should show confidence indicators correctly', () => {
    render(<FullExtractionReview {...mockProps} />);
    
    // Should show confidence badge
    expect(screen.getByText('85%')).toBeInTheDocument();
    
    // Should have appropriate color coding for high confidence
    const confidenceBadge = screen.getByText('85%').closest('[class*="badge"]');
    expect(confidenceBadge).toHaveClass('text-green-600');
  });
});
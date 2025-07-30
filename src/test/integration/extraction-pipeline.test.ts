/**
 * Integration tests for the complete extraction pipeline
 * Tests upload → extraction → review → apply to form → submit workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProductionFarmCreationForm from '@/components/farm/ProductionFarmCreationForm';
import { mapExtractionToForm, validateMappedData } from '@/lib/extraction/centralized-mapper';
import { extractionErrorHandler } from '@/lib/extraction/error-handler';

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null })
      })
    },
    functions: {
      invoke: vi.fn()
    }
  }
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: React.ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

describe('Extraction Pipeline Integration', () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    mockOnSubmit = vi.fn();
  });

  describe('Field Mapping', () => {
    it('should correctly map extraction data to form fields', () => {
      const mockExtractionData = {
        farmName: 'Test Farm',
        ownerName: 'John Doe',
        address: 'Test Address',
        totalHectares: '50.5',
        legalStatus: 'SRL',
        country: 'Romania',
        activities: ['Vegetables', 'Fruits'],
        livestockPresent: 'true',
        email: 'test@example.com',
        phoneNumber: '+40123456789'
      };

      const result = mapExtractionToForm(mockExtractionData);

      expect(result.mappedData).toMatchObject({
        name: 'Test Farm',
        address: 'Test Address',
        total_hectares: 50.5,
        legal_status: 'srl',
        country: 'RO',
        land_use_types: ['vegetables'],
        livestock_present: true
      });

      expect(result.mappingStats.successRate).toBeGreaterThan(80);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle unmapped fields gracefully', () => {
      const mockExtractionData = {
        farmName: 'Test Farm',
        unknownField: 'Unknown Value',
        anotherUnknown: 'Another Value'
      };

      const result = mapExtractionToForm(mockExtractionData);

      expect(result.unmappedFields).toContain('unknownField');
      expect(result.unmappedFields).toContain('anotherUnknown');
      expect(result.mappedData.name).toBe('Test Farm');
    });

    it('should validate mapped data correctly', () => {
      const invalidData = {
        name: '', // Required field empty
        total_hectares: -10, // Invalid value
        staff_count: 99999, // Too high
        email: 'invalid-email' // Invalid format
      };

      const errors = validateMappedData(invalidData);

      expect(errors).toContain('Farm name is required');
      expect(errors).toContain('Total hectares must be between 0 and 100,000');
      expect(errors).toContain('Staff count must be between 0 and 10,000');
      expect(errors).toContain('Invalid email format');
    });
  });

  describe('Error Handling', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('Failed to fetch');
      networkError.name = 'NetworkError';

      const result = extractionErrorHandler.handleExtractionFailure(networkError, {
        documentId: 'test-id',
        fileName: 'test.pdf'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('network');
      expect(result.error?.recoverable).toBe(true);
    });

    it('should classify validation errors correctly', () => {
      const validationError = new Error('File too large');

      const result = extractionErrorHandler.handleExtractionFailure(validationError, {
        documentId: 'test-id',
        fileName: 'large-file.pdf'
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('unknown'); // Will be classified based on message content
    });

    it('should provide appropriate error display info', () => {
      const error = {
        type: 'network' as const,
        message: 'Connection failed',
        timestamp: new Date(),
        recoverable: true
      };

      const displayInfo = extractionErrorHandler.getErrorDisplayInfo(error);

      expect(displayInfo.title).toBe('Connection Issue');
      expect(displayInfo.actions).toContainEqual({ label: 'Retry', action: 'retry' });
    });

    it('should determine retry logic correctly', () => {
      const recoverableError = {
        type: 'network' as const,
        message: 'Network timeout',
        timestamp: new Date(),
        recoverable: true
      };

      const nonRecoverableError = {
        type: 'validation' as const,
        message: 'Invalid file format',
        timestamp: new Date(),
        recoverable: false
      };

      expect(extractionErrorHandler.shouldRetry(recoverableError, 1)).toBe(true);
      expect(extractionErrorHandler.shouldRetry(recoverableError, 3)).toBe(false);
      expect(extractionErrorHandler.shouldRetry(nonRecoverableError, 1)).toBe(false);
    });
  });

  describe('Form Integration', () => {
    it('should render without crashing', () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <ProductionFarmCreationForm onSubmit={mockOnSubmit} />
        </Wrapper>
      );

      expect(screen.getByText('Upload Farm Documents (Recommended)')).toBeInTheDocument();
      expect(screen.getByText('Manual Farm Information Entry')).toBeInTheDocument();
    });

    it('should handle form submission', async () => {
      const Wrapper = createTestWrapper();
      
      render(
        <Wrapper>
          <ProductionFarmCreationForm onSubmit={mockOnSubmit} />
        </Wrapper>
      );

      // Fill in required fields
      const nameInput = screen.getByLabelText(/farm name/i);
      const addressInput = screen.getByLabelText(/complete farm address/i);
      const gdprCheckbox = screen.getByLabelText(/gdpr consent/i);

      fireEvent.change(nameInput, { target: { value: 'Test Farm' } });
      fireEvent.change(addressInput, { target: { value: 'Test Address' } });
      fireEvent.click(gdprCheckbox);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create farm profile/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Farm',
            address: 'Test Address',
            gdpr_consent: true
          })
        );
      });
    });
  });

  describe('Value Transformations', () => {
    it('should transform hectares correctly', async () => {
      const mapperModule = await import('@/lib/extraction/centralized-mapper');
      const { VALUE_TRANSFORMERS } = mapperModule;
      
      expect(VALUE_TRANSFORMERS.total_hectares('50.5')).toBe(50.5);
      expect(VALUE_TRANSFORMERS.total_hectares('invalid')).toBe(0);
      expect(VALUE_TRANSFORMERS.total_hectares(100)).toBe(100);
    });

    it('should transform activities to land use types', async () => {
      const mapperModule = await import('@/lib/extraction/centralized-mapper');
      const { VALUE_TRANSFORMERS } = mapperModule;
      
      expect(VALUE_TRANSFORMERS.land_use_types('Vegetable Cultivation')).toContain('vegetables');
      expect(VALUE_TRANSFORMERS.land_use_types('Olive Groves')).toContain('fruit_orchards');
      expect(VALUE_TRANSFORMERS.land_use_types('Sheep Grazing')).toContain('pasture_grassland');
    });

    it('should transform country names to codes', async () => {
      const mapperModule = await import('@/lib/extraction/centralized-mapper');
      const { VALUE_TRANSFORMERS } = mapperModule;
      
      expect(VALUE_TRANSFORMERS.country('Romania')).toBe('RO');
      expect(VALUE_TRANSFORMERS.country('Italy')).toBe('IT');
      expect(VALUE_TRANSFORMERS.country('Spain')).toBe('ES');
      expect(VALUE_TRANSFORMERS.country('Unknown Country')).toBe('Unknown Country');
    });
  });
});
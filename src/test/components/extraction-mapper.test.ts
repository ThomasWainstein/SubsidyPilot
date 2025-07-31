/**
 * Test suite for centralized extraction mapper
 */

import { describe, it, expect } from 'vitest';
import { mapExtractionToForm, validateMappedData } from '@/lib/extraction/centralized-mapper';

describe('Centralized Extraction Mapper', () => {
  it('maps extraction data to form fields correctly', () => {
    const extractionData = {
      farmName: 'Test Farm',
      address: '123 Main St',
      totalHectares: '50',
      legalStatus: 'srl',
      activities: 'vegetables, fruits',
      country: 'romania'
    };

    const result = mapExtractionToForm(extractionData);
    const mappedData = result.mappedData as any;

    expect(mappedData.name).toBe('Test Farm');
    expect(mappedData.address).toBe('123 Main St');
    expect(mappedData.total_hectares).toBe(50);
    expect(mappedData.legal_status).toBe('srl');
    expect(mappedData.country).toBe('RO');
    expect(mappedData.land_use_types).toEqual(['vegetables']);
  });

  it('handles type transformations correctly', () => {
    const extractionData = {
      totalHectares: '25.5',
      numberOfEmployees: '10',
      livestockPresent: 'yes'
    };

    const result = mapExtractionToForm(extractionData);
    const mappedData = result.mappedData as any;

    expect(mappedData.total_hectares).toBe(25.5);
    expect(mappedData.staff_count).toBe(10);
    expect(mappedData.livestock_present).toBe(true);
  });

  it('validates mapped data correctly', () => {
    const validData = {
      name: 'Valid Farm',
      total_hectares: 50,
      staff_count: 5,
      email: 'test@example.com'
    };

    const invalidData = {
      name: '',
      total_hectares: -10,
      staff_count: -5,
      email: 'invalid-email'
    };

    expect(validateMappedData(validData)).toEqual([]);
    
    const errors = validateMappedData(invalidData);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors).toContain('Farm name is required');
    expect(errors).toContain('Total hectares must be between 0 and 100,000');
    expect(errors).toContain('Staff count must be between 0 and 10,000');
    expect(errors).toContain('Invalid email format');
  });

  it('tracks unmapped fields', () => {
    const extractionData = {
      farmName: 'Test Farm',
      unknownField: 'some value',
      anotherUnknownField: 'another value'
    };

    const result = mapExtractionToForm(extractionData);

    expect(result.unmappedFields).toContain('unknownField');
    expect(result.unmappedFields).toContain('anotherUnknownField');
    expect(result.mappingStats.totalFields).toBe(3);
    expect(result.mappingStats.mappedFields).toBe(1);
  });
});
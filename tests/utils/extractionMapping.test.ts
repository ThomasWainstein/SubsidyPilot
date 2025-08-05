import { describe, it, expect } from 'vitest';
import {
  normalizeFieldName,
  findStandardFieldName,
  mapExtractedFields,
  validateMappedData,
  calculateExtractionConfidence,
  mergeExtractionResults,
  FARM_FIELD_MAPPINGS
} from '@/utils/extractionMapping';

describe('extractionMapping', () => {
  describe('normalizeFieldName', () => {
    it('should normalize field names correctly', () => {
      expect(normalizeFieldName('Farm Name')).toBe('farm_name');
      expect(normalizeFieldName('contact-email')).toBe('contact_email');
      expect(normalizeFieldName('Total_Area__')).toBe('total_area');
      expect(normalizeFieldName('123-ABC-def')).toBe('123_abc_def');
    });
  });

  describe('findStandardFieldName', () => {
    it('should find standard field names', () => {
      expect(findStandardFieldName('farm_name')).toBe('farm_name');
      expect(findStandardFieldName('name')).toBe('farm_name');
      expect(findStandardFieldName('proprietor')).toBe('owner_name');
      expect(findStandardFieldName('email')).toBe('contact_email');
      expect(findStandardFieldName('unknown_field')).toBeNull();
    });

    it('should handle normalized field names', () => {
      expect(findStandardFieldName('Farm Name')).toBe('farm_name');
      expect(findStandardFieldName('Contact-Email')).toBe('contact_email');
    });
  });

  describe('mapExtractedFields', () => {
    it('should map fields correctly', () => {
      const input = {
        'Farm Name': 'Test Farm',
        'proprietor': 'John Doe',
        'email': 'john@test.com',
        'unknown_field': 'some value',
        'total_area': 100
      };

      const result = mapExtractedFields(input);

      expect(result.farm_name).toBe('Test Farm');
      expect(result.owner_name).toBe('John Doe');
      expect(result.contact_email).toBe('john@test.com');
      expect(result.total_hectares).toBe(100);
      expect(result.custom_unknown_field).toBe('some value');
    });

    it('should filter out null and empty values', () => {
      const input = {
        'farm_name': 'Test Farm',
        'owner_name': null,
        'email': '',
        'phone': undefined
      };

      const result = mapExtractedFields(input);

      expect(result.farm_name).toBe('Test Farm');
      expect(result).not.toHaveProperty('owner_name');
      expect(result).not.toHaveProperty('contact_email');
      expect(result).not.toHaveProperty('contact_phone');
    });
  });

  describe('validateMappedData', () => {
    it('should validate required fields', () => {
      const validData = {
        farm_name: 'Test Farm',
        owner_name: 'John Doe',
        contact_email: 'john@test.com'
      };

      const result = validateMappedData(validData);

      expect(result.isValid).toBe(true);
      expect(result.missingFields).toEqual([]);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should detect missing required fields', () => {
      const invalidData = {
        contact_email: 'john@test.com'
      };

      const result = validateMappedData(invalidData, ['farm_name', 'owner_name']);

      expect(result.isValid).toBe(false);
      expect(result.missingFields).toEqual(['farm_name', 'owner_name']);
    });
  });

  describe('calculateExtractionConfidence', () => {
    it('should calculate confidence based on field completeness', () => {
      const completeData = {
        farm_name: 'Test Farm',
        owner_name: 'John Doe',
        contact_email: 'john@test.com',
        address: '123 Farm Road',
        crops: ['wheat', 'corn'],
        total_hectares: 100
      };

      const confidence = calculateExtractionConfidence(completeData);
      
      expect(confidence).toBeGreaterThan(0.5);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should penalize missing required fields', () => {
      const incompleteData = {
        contact_email: 'john@test.com'
      };

      const confidence = calculateExtractionConfidence(incompleteData);
      
      expect(confidence).toBeLessThan(0.5);
    });
  });

  describe('mergeExtractionResults', () => {
    it('should merge results prioritizing higher confidence', () => {
      const results = [
        {
          source: 'rule-based',
          data: { farm_name: 'Farm A', owner_name: 'John' },
          confidence: 0.6
        },
        {
          source: 'ai-based',
          data: { farm_name: 'Farm B', contact_email: 'john@test.com' },
          confidence: 0.8
        }
      ];

      const { mergedData, fieldSources } = mergeExtractionResults(results);

      expect(mergedData.farm_name).toBe('Farm B'); // Higher confidence wins
      expect(mergedData.owner_name).toBe('John'); // Only in rule-based
      expect(mergedData.contact_email).toBe('john@test.com'); // Only in AI

      expect(fieldSources.farm_name).toBe('ai-based');
      expect(fieldSources.owner_name).toBe('rule-based');
      expect(fieldSources.contact_email).toBe('ai-based');
    });
  });
});
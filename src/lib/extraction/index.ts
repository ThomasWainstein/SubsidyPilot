/**
 * Comprehensive farm document extraction utilities
 * Phase 1: Enhanced Data Mapping & Form Synchronization
 */

// Parser utilities
export * from './parsers';

// Field mapping configurations
export * from './fieldMappings';

// Data mapping functions
export * from './dataMapper';

// Type definitions
export type { FieldMapping } from './fieldMappings';
export type { ExtractionData, FormData, MappingResult } from './dataMapper';
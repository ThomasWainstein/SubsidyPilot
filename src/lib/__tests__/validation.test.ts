import { describe, it, expect } from 'vitest'
import { 
  validateEmail, 
  validateRequired, 
  validateNumeric, 
  validateUrl,
  sanitizeInput,
  validateFormData,
  createFieldValidator
} from '../validation'

describe('validation utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true)
      expect(validateEmail('test123@test-domain.com')).toBe(true)
    })

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@domain.com')).toBe(false)
      expect(validateEmail('test.domain.com')).toBe(false)
      expect(validateEmail('')).toBe(false)
    })
  })

  describe('validateRequired', () => {
    it('should validate required fields', () => {
      expect(validateRequired('test')).toBe(true)
      expect(validateRequired('0')).toBe(true)
      expect(validateRequired(' valid ')).toBe(true)
    })

    it('should reject empty or whitespace-only values', () => {
      expect(validateRequired('')).toBe(false)
      expect(validateRequired('   ')).toBe(false)
      expect(validateRequired('\n\t')).toBe(false)
    })

    it('should handle non-string values', () => {
      expect(validateRequired(0)).toBe(true)
      expect(validateRequired(false)).toBe(true)
      expect(validateRequired(null)).toBe(false)
      expect(validateRequired(undefined)).toBe(false)
    })
  })

  describe('validateNumeric', () => {
    it('should validate numeric values', () => {
      expect(validateNumeric('123')).toBe(true)
      expect(validateNumeric('123.45')).toBe(true)
      expect(validateNumeric('-67.89')).toBe(true)
      expect(validateNumeric('0')).toBe(true)
    })

    it('should reject non-numeric values', () => {
      expect(validateNumeric('abc')).toBe(false)
      expect(validateNumeric('12abc')).toBe(false)
      expect(validateNumeric('')).toBe(false)
      expect(validateNumeric('12.34.56')).toBe(false)
    })

    it('should handle minimum value constraints', () => {
      expect(validateNumeric('10', { min: 5 })).toBe(true)
      expect(validateNumeric('3', { min: 5 })).toBe(false)
      expect(validateNumeric('-5', { min: 0 })).toBe(false)
    })

    it('should handle maximum value constraints', () => {
      expect(validateNumeric('5', { max: 10 })).toBe(true)
      expect(validateNumeric('15', { max: 10 })).toBe(false)
    })
  })

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true)
      expect(validateUrl('http://test.co.uk')).toBe(true)
      expect(validateUrl('https://sub.domain.com/path?query=1')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false)
      expect(validateUrl('ftp://invalid.com')).toBe(false)
      expect(validateUrl('')).toBe(false)
      expect(validateUrl('//relative-url.com')).toBe(false)
    })
  })

  describe('sanitizeInput', () => {
    it('should remove script tags and dangerous content', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('')
      expect(sanitizeInput('Hello <script>evil()</script> World')).toBe('Hello  World')
      expect(sanitizeInput('<img src="x" onerror="alert(1)">')).toBe('')
    })

    it('should preserve safe content', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World')
      expect(sanitizeInput('123 Test Street')).toBe('123 Test Street')
      expect(sanitizeInput('Email: test@example.com')).toBe('Email: test@example.com')
    })

    it('should handle HTML entities', () => {
      expect(sanitizeInput('&lt;safe&gt;')).toBe('<safe>')
      expect(sanitizeInput('Tom &amp; Jerry')).toBe('Tom & Jerry')
    })
  })

  describe('validateFormData', () => {
    const schema = {
      name: { required: true },
      email: { required: true, email: true },
      age: { numeric: true, min: 0, max: 120 },
      website: { url: true }
    }

    it('should validate correct form data', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        age: '25',
        website: 'https://johndoe.com'
      }

      const result = validateFormData(data, schema)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })

    it('should catch validation errors', () => {
      const data = {
        name: '',
        email: 'invalid-email',
        age: 'not-a-number',
        website: 'not-a-url'
      }

      const result = validateFormData(data, schema)
      expect(result.isValid).toBe(false)
      expect(result.errors.name).toContain('required')
      expect(result.errors.email).toContain('email')
      expect(result.errors.age).toContain('numeric')
      expect(result.errors.website).toContain('URL')
    })

    it('should handle missing optional fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com'
      }

      const result = validateFormData(data, schema)
      expect(result.isValid).toBe(true)
      expect(result.errors).toEqual({})
    })
  })

  describe('createFieldValidator', () => {
    it('should create a validator function', () => {
      const validator = createFieldValidator({ required: true, email: true })
      
      expect(validator('test@example.com')).toBe(true)
      expect(validator('')).toBe(false)
      expect(validator('invalid-email')).toBe(false)
    })

    it('should return error messages for invalid fields', () => {
      const validator = createFieldValidator({ required: true, numeric: true, min: 0 })
      
      expect(validator('5')).toBe(true)
      expect(validator('')).toBe('This field is required')
      expect(validator('abc')).toBe('Must be a valid number')
      expect(validator('-5')).toBe('Must be at least 0')
    })
  })
})
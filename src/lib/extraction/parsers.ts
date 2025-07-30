/**
 * Parser utility functions for converting raw extracted values into correct types/formats
 * Used in farm profile data mapping and validation
 */

export const parseNumber = (value: any): number | undefined => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    // Remove non-numeric characters except dots and hyphens for decimals/negatives
    const cleanValue = value.replace(/[^\d.-]+/g, '');
    const n = parseFloat(cleanValue);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
};

export const parseIntNumber = (value: any): number | undefined => {
  if (typeof value === 'number' && !isNaN(value)) return Math.floor(value);
  if (typeof value === 'string') {
    // Remove non-numeric characters
    const cleanValue = value.replace(/[^\d]+/g, '');
    const n = parseInt(cleanValue, 10);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
};

export const parseDate = (value: any): string | undefined => {
  if (!value) return undefined;
  
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return undefined;
    return date.toISOString();
  } catch {
    return undefined;
  }
};

export const parseStringArray = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((v) => typeof v === 'string' || typeof v === 'number')
      .map(v => String(v).trim())
      .filter(Boolean);
  }
  
  if (typeof value === 'string') {
    // Split on common delimiters: comma, bullet point, newline, semicolon
    return value
      .split(/[,•\n;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  
  return [];
};

export const parseString = (value: any): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (value !== null && value !== undefined) {
    const stringified = String(value).trim();
    return stringified.length > 0 ? stringified : undefined;
  }
  return undefined;
};

export const validateEmail = (email: any): string | undefined => {
  const str = parseString(email);
  if (!str) return undefined;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str) ? str : undefined;
};

export const validateUrl = (url: any): string | undefined => {
  const str = parseString(url);
  if (!str) return undefined;
  
  try {
    // Add protocol if missing
    const urlWithProtocol = str.startsWith('http') ? str : `https://${str}`;
    new URL(urlWithProtocol);
    return urlWithProtocol;
  } catch {
    return undefined;
  }
};

export const parseGeolocation = (value: any): { lat: number; lng: number } | undefined => {
  if (typeof value === 'object' && value !== null) {
    const lat = parseNumber(value.lat || value.latitude);
    const lng = parseNumber(value.lng || value.longitude || value.lon);
    if (lat !== undefined && lng !== undefined) {
      return { lat, lng };
    }
  } else if (typeof value === 'string') {
    // Attempt to parse coordinates from string "lat,lng" or "lat lng"
    const parts = value.split(/[,\s]+/);
    if (parts.length === 2) {
      const lat = parseNumber(parts[0]);
      const lng = parseNumber(parts[1]);
      if (lat !== undefined && lng !== undefined) {
        return { lat, lng };
      }
    }
  }
  return undefined;
};

export const parseBoolean = (value: any): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (['true', 'yes', 'da', 'oui', 'sí', 'tak', '1'].includes(lower)) return true;
    if (['false', 'no', 'nu', 'non', 'nie', '0'].includes(lower)) return false;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return undefined;
};

export const parseCertificationValidity = (value: any): Record<string, string> | undefined => {
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, string> = {};
    
    Object.entries(value).forEach(([key, val]) => {
      const dateStr = parseDate(val);
      if (dateStr) {
        result[key] = dateStr;
      }
    });
    
    return Object.keys(result).length > 0 ? result : undefined;
  }
  return undefined;
};

export const parsePhoneNumbers = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value
      .map(v => parseString(v))
      .filter(Boolean) as string[];
  }
  
  if (typeof value === 'string') {
    // Split phone numbers by common separators
    return value
      .split(/[,;\n]/)
      .map(phone => {
        // Clean up phone number: remove extra spaces, normalize format
        return phone.trim().replace(/\s+/g, ' ');
      })
      .filter(Boolean);
  }
  
  return [];
};
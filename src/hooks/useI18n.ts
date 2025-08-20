import { useState, useEffect } from 'react';
import { translations, SupportedLocale, getNestedTranslation, interpolateTranslation } from '@/lib/i18n/translations';

/**
 * Internationalization hook with automatic locale detection and caching
 */
export const useI18n = () => {
  const [locale, setLocale] = useState<SupportedLocale>(() => {
    // Try to get locale from localStorage first
    const savedLocale = localStorage.getItem('app-locale') as SupportedLocale;
    if (savedLocale && savedLocale in translations) {
      return savedLocale;
    }
    
    // Detect from browser
    const browserLang = navigator.language.slice(0, 2) as SupportedLocale;
    return browserLang in translations ? browserLang : 'en';
  });

  // Save locale changes to localStorage
  useEffect(() => {
    localStorage.setItem('app-locale', locale);
  }, [locale]);

  /**
   * Get translation with support for nested keys and interpolation
   */
  const t = (key: string, variables?: Record<string, string>): string => {
    const translation = getNestedTranslation(translations[locale], key);
    
    if (variables) {
      return interpolateTranslation(translation, variables);
    }
    
    return translation;
  };

  /**
   * Get translation for a specific locale (useful for SEO)
   */
  const tLocale = (targetLocale: SupportedLocale, key: string, variables?: Record<string, string>): string => {
    const translation = getNestedTranslation(translations[targetLocale], key);
    
    if (variables) {
      return interpolateTranslation(translation, variables);
    }
    
    return translation;
  };

  /**
   * Get region name in current locale
   */
  const getRegionName = (regionKey: string): string => {
    return t(`regions.${regionKey}`) || regionKey;
  };

  /**
   * Format currency based on locale
   */
  const formatCurrency = (amount: number | string, currency: string = 'EUR'): string => {
    if (typeof amount === 'string') {
      // Handle strings like "< €15,000" or "Up to 50% of costs"
      if (amount.includes('€') || amount.includes('$') || amount.includes('£')) {
        return amount; // Already formatted
      }
      
      const numericAmount = parseFloat(amount.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (isNaN(numericAmount)) {
        return amount; // Return as-is if not numeric
      }
      amount = numericAmount;
    }

    const currencyMap: Record<string, string> = {
      'EUR': '€',
      'USD': '$',
      'GBP': '£',
      'RON': 'RON',
      'PLN': 'zł'
    };

    const symbol = currencyMap[currency] || currency;
    
    // Format number with proper locale formatting
    const formatter = new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale, {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    return `${symbol}${formatter.format(amount as number)}`;
  };

  /**
   * Format date based on locale
   */
  const formatDate = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  };

  return {
    locale,
    setLocale,
    t,
    tLocale,
    getRegionName,
    formatCurrency,
    formatDate,
    supportedLocales: Object.keys(translations) as SupportedLocale[]
  };
};
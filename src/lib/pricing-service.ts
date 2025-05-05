'use client';

import { useTranslation } from '@/lib/i18n';
import { useState, useEffect, useCallback } from 'react';

// API endpoint
const API_URL = process.env.API_URL || 'http://localhost:5000';

// Types for pricing information
export interface PricingInfo {
  currency: string;
  symbol: string;
  monthly: {
    price: string;
    display: string;
    discount: number;
  };
  yearly: {
    price_per_month: string;
    display_per_month: string;
    total_price: string;
    display_total: string;
    discount: number;
  };
}

// Default pricing info to use while loading
const defaultPricing: PricingInfo = {
  currency: 'usd',
  symbol: '$',
  monthly: {
    price: '7.99',
    display: '$7.99',
    discount: 0
  },
  yearly: {
    price_per_month: '6.79',
    display_per_month: '$6.79',
    total_price: '81.48',
    display_total: '$81.48',
    discount: 15
  }
};

/**
 * Hook to get pricing information based on current locale and currency
 */
export function usePricing() {
  const { locale } = useTranslation();
  const [pricing, setPricing] = useState<PricingInfo>(defaultPricing);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);

  const fetchPricing = useCallback(async (selectedLocale: string, selectedCurrency?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const url = new URL(`${API_URL}/api/pricing`);
      url.searchParams.append('locale', selectedLocale);
      
      if (selectedCurrency) {
        url.searchParams.append('currency', selectedCurrency);
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to fetch pricing: ${response.status}`);
      }
      
      const data = await response.json();
      setPricing(data);
    } catch (err) {
      console.error('Error fetching pricing:', err);
      setError('Failed to load pricing information');
      // Fallback to default pricing on error
      setPricing(defaultPricing);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update pricing when locale changes
  useEffect(() => {
    fetchPricing(locale, currency || undefined);
  }, [locale, currency, fetchPricing]);
  
  // Function to update currency
  const updateCurrency = useCallback((newCurrency: string) => {
    setCurrency(newCurrency);
  }, []);
  
  return { pricing, isLoading, error, updateCurrency };
} 
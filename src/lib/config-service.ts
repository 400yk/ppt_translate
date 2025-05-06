'use client';

import { useState, useEffect } from 'react';

// API endpoint
const API_URL = process.env.API_URL || 'http://localhost:5000';

// Valid period types for translation limits
export type TranslationPeriod = 'daily' | 'weekly' | 'monthly';

// Types for config information
export interface ConfigLimits {
  freeUserCharPerFileLimit: number;
  freeUserCharMonthlyLimit: number;
  freeUserTranslationLimit: number;
  freeUserTranslationPeriod: TranslationPeriod;
  paidUserCharMonthlyLimit: number;
  maxFileSizeMB: number;
}

const defaultLimits: ConfigLimits = {
  freeUserCharPerFileLimit: 25000,
  freeUserCharMonthlyLimit: 100000,
  freeUserTranslationLimit: 1,
  freeUserTranslationPeriod: 'weekly',
  paidUserCharMonthlyLimit: 5000000,
  maxFileSizeMB: 50
};

/**
 * Hook to get configuration limits from the backend
 */
export function useConfigLimits() {
  const [limits, setLimits] = useState<ConfigLimits>(defaultLimits);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        setIsLoading(true);
        
        // Fetch file size limit
        const fileSizeResponse = await fetch(`${API_URL}/config/file-size-limit`);
        const fileSizeData = await fileSizeResponse.json();
        
        // Fetch character limit
        const charLimitResponse = await fetch(`${API_URL}/api/config/character-limit`);
        const charLimitData = await charLimitResponse.json();
        
        // Create endpoint for all config limits
        const allLimitsResponse = await fetch(`${API_URL}/api/config/limits`);
        let allLimitsData = defaultLimits;
        
        if (allLimitsResponse.ok) {
          allLimitsData = await allLimitsResponse.json();
        } else {
          // If the all limits endpoint doesn't exist yet, construct from available endpoints
          allLimitsData = {
            ...defaultLimits,
            maxFileSizeMB: fileSizeData.maxFileSizeMB || defaultLimits.maxFileSizeMB,
            paidUserCharMonthlyLimit: charLimitData.limit || defaultLimits.paidUserCharMonthlyLimit
          };
        }
        
        setLimits(allLimitsData);
      } catch (err) {
        console.error('Error fetching config limits:', err);
        setError('Failed to load configuration limits');
        // Fallback to default limits
        setLimits(defaultLimits);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLimits();
  }, []);
  
  return { limits, isLoading, error };
} 
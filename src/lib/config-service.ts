'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';

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

// Type definition for referral configuration
interface ReferralConfig {
  rewardDays: number;
  invitationCodeRewardDays: number;
  codeLength: number;
  expiryDays: number;
  maxReferralsPerUser: number;
  paidMembersOnly: boolean;
}

const defaultLimits: ConfigLimits = {
  freeUserCharPerFileLimit: 25000,
  freeUserCharMonthlyLimit: 100000,
  freeUserTranslationLimit: 1,
  freeUserTranslationPeriod: 'weekly',
  paidUserCharMonthlyLimit: 5000000,
  maxFileSizeMB: 50
};

const defaultReferralConfig: ReferralConfig = {
  rewardDays: 3,
  invitationCodeRewardDays: 3,
  codeLength: 12,
  expiryDays: 30,
  maxReferralsPerUser: 100,
  paidMembersOnly: true
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
        const fileSizeResponse = await apiClient.get('/api/config/file-size-limit');
        const fileSizeData = fileSizeResponse.data;
        
        // Fetch character limit
        const charLimitResponse = await apiClient.get('/api/config/character-limit');
        const charLimitData = charLimitResponse.data;
        
        try {
          // Create endpoint for all config limits
          const allLimitsResponse = await apiClient.get('/api/config/limits');
          setLimits(allLimitsResponse.data);
        } catch (error) {
          // If the all limits endpoint doesn't exist yet, construct from available endpoints
          setLimits({
            ...defaultLimits,
            maxFileSizeMB: fileSizeData.maxFileSizeMB || defaultLimits.maxFileSizeMB,
            paidUserCharMonthlyLimit: charLimitData.limit || defaultLimits.paidUserCharMonthlyLimit
          });
        }
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

/**
 * Hook to get referral configuration from the backend
 */
export function useReferralConfig() {
  const [config, setConfig] = useState<ReferralConfig>(defaultReferralConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReferralConfig = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get('/api/config/referral');
        setConfig(response.data);
      } catch (err) {
        console.error('Error fetching referral configuration:', err);
        setError('Failed to load referral configuration');
        // Fallback to default config
        setConfig(defaultReferralConfig);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReferralConfig();
  }, []);
  
  return { config, isLoading, error };
} 
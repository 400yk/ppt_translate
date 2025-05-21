'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';
import apiClient from '@/lib/api-client';

// API endpoint
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Types for membership information
export interface MembershipStatus {
  user_type: 'free' | 'paid' | 'invitation' | 'guest';
  is_active: boolean;
  membership_start?: string;
  membership_end?: string;
  days_remaining?: number;
  translations_limit?: number | string;
  translations_used?: number;
  translations_remaining?: number;
  period?: string;
  period_end?: string;
  reset_info?: string;
  plan_type?: 'monthly' | 'yearly';
}

/**
 * Hook to handle membership purchases
 */
export function useMembership() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  /**
   * Purchase a membership plan
   * @param planType 'monthly' or 'yearly'
   * @returns Promise with the result of the purchase
   */
  const purchaseMembership = async (planType: 'monthly' | 'yearly'): Promise<boolean> => {
    setIsProcessing(true);
    
    try {
      console.log(`Sending payment request for plan: ${planType}`);
      const requestData = { plan_type: planType };
      console.log('Request payload:', requestData);
      
      // Send request to purchase membership
      const response = await apiClient.post('/api/membership/purchase', requestData);
      
      console.log(`Response status: ${response.status}`);
      console.log('Response data:', response.data);
      
      toast({
        title: t('payment.success'),
        description: planType === 'monthly' 
          ? t('payment.monthly_success') 
          : t('payment.yearly_success'),
      });
      
      return true;
    } catch (error: any) {
      console.error('Payment processing error:', error);
      
      let errorMessage = t('payment.error_description');
      // Handle axios error
      if (error.response && error.response.data) {
        errorMessage = error.response.data.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: t('payment.error'),
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };
  
  return {
    isProcessing,
    purchaseMembership
  };
} 
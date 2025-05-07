'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/lib/i18n';

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
      // Get token from local storage
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        toast({
          title: t('errors.login_failed'),
          description: t('auth.login_subtitle'),
          variant: 'destructive',
        });
        return false;
      }
      
      console.log(`Sending payment request for plan: ${planType}`);
      const requestData = { plan_type: planType };
      console.log('Request payload:', requestData);
      
      // Send request to purchase membership
      const response = await fetch(`${API_URL}/api/membership/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });
      
      console.log(`Response status: ${response.status}`);
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received:', await response.text());
        throw new Error('Server returned non-JSON response');
      }
      
      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to process payment');
      }
      
      toast({
        title: t('payment.success'),
        description: planType === 'monthly' 
          ? t('payment.monthly_success') 
          : t('payment.yearly_success'),
      });
      
      return true;
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: t('payment.error'),
        description: error instanceof Error ? error.message : t('payment.error_description'),
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
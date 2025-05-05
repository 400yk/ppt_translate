'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { Icons } from '@/components/icons';
import { DynamicHead } from '@/components/dynamic-head';

// API endpoint
const API_URL = 'http://localhost:5000';

export default function PaymentSuccessPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Add state to prevent hydration mismatch
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    // Only run verification after client-side hydration is complete
    if (!isClient) return;
    
    const verifyPayment = async () => {
      try {
        const sessionId = searchParams.get('session_id');
        
        if (!sessionId) {
          throw new Error('No session ID provided');
        }
        
        // Verify the payment with the backend
        const response = await fetch(`${API_URL}/api/payment/success?session_id=${sessionId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to verify payment');
        }
        
        await response.json();
        setSuccess(true);
      } catch (error) {
        console.error('Error verifying payment:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
        setSuccess(false);
      } finally {
        setLoading(false);
      }
    };
    
    if (searchParams.get('session_id')) {
      verifyPayment();
    } else {
      setLoading(false);
      setError('Invalid payment session');
    }
  }, [searchParams, isClient]);
  
  const handleReturnToProfile = () => {
    router.push('/profile');
  };
  
  // Only render the full content on the client to avoid hydration errors
  if (!isClient) {
    return <div className="min-h-screen"></div>;
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <DynamicHead title={loading ? t('payment.processing') : success ? t('payment.success') : t('payment.error')} />
      
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {loading ? t('common.loading') : success ? t('payment.success') : t('payment.error')}
          </CardTitle>
          <CardDescription className="text-center">
            {loading ? t('payment.processing') : ''}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex justify-center items-center py-10">
          {loading ? (
            <Icons.spinner className="h-16 w-16 animate-spin text-primary" />
          ) : success ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-green-100 p-3">
                <Icons.check className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-center text-muted-foreground">
                {t('payment.success_description')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-red-100 p-3">
                <Icons.close className="h-8 w-8 text-red-600" />
              </div>
              <p className="text-center text-muted-foreground">
                {error || t('payment.error_description')}
              </p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button
            onClick={handleReturnToProfile}
            disabled={loading}
          >
            {t('auth.back_to_home')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 
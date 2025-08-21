'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { Icons } from '@/components/icons';
import { DynamicHead } from '@/components/dynamic-head';
import apiClient, { getApiErrorMessage } from '@/lib/api-client';

/*
支付宝返回链接示例：
https://f2494e927c40.ngrok-free.app/payment/success?
charset=UTF-8&
out_trade_no=translide_monthly_1754747905_kevin.yang%40long-agi.com&
method=alipay.trade.page.pay.return&
total_amount=0.08&
sign=cM5yvBa8pUhzOgsefPEkPVtuGa5ZWYL%2BwFF%2BoI%2F%2BK26r8LLLBvAQlS7DsjOjnNbLhg0s583n3KidwDgMSzwc90JfWBn6Swe1pvqk8%2BKjHxOBYvglBUUzSEggjG8CgSbrSq4FJklFenBvCYDICJuFOm8Uhjj6RL6x878OgWGnvjB4uS3lXZ6oc9zbU%2FGtiRM2gxJI0F9p9JRLrB31aXE4Uioehk1m2119yBajKe2Xgv6ViTagfFIM%2BE%2B2pcKAU2mbEiwjhGBKEIKcPCnbN77lT8g%2BAFN3UkagrXieqkEUcqU6j7FHctb6y%2BpVtbLzd0rsNQj8nSpoT5Es2f4LaA6C9g%3D%3D&
trade_no=2025080922001489391434284572&
auth_app_id=2021005180670685&
version=1.0&
app_id=2021005180670685&
sign_type=RSA2&
seller_id=2088151419430518&
timestamp=2025-08-09+21%3A58%3A49
*/

function PaymentSuccessContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('stripe');
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
        const method = searchParams.get('method')?.includes('alipay')
          ? 'alipay'
          : searchParams.get('payment_method') || 'stripe';
        setPaymentMethod(method);
        
        if (method === 'alipay') {
          // Handle Alipay payment verification
          const outTradeNo = searchParams.get('out_trade_no');
          const tradeNo = searchParams.get('trade_no');
          
          console.log('Alipay payment verification:', {
            outTradeNo,
            tradeNo,
            paymentMethod
          });
          
          if (!outTradeNo) {
            throw new Error(t('payment.no_order_number'));
          }
          
          // Note: trade_status is not included in the return URL
          // The actual payment verification is done via asynchronous notification
          // This is just for user redirection and display
          
          // For Alipay, we need to poll for payment status since it's processed asynchronously
          let paymentProcessed = false;
          let attempts = 0;
          const maxAttempts = 10;
          
          while (!paymentProcessed && attempts < maxAttempts) {
            try {
              // Check payment status
              const statusResponse = await apiClient.get(`/api/payment/alipay/status?out_trade_no=${outTradeNo}`);
              console.log('Alipay payment status check:', statusResponse.data);
              
              if (statusResponse.data.payment_processed) {
                paymentProcessed = true;
                setSuccess(true);
                break;
              }
              
              // Wait 2 seconds before next attempt
              await new Promise(resolve => setTimeout(resolve, 2000));
              attempts++;
            } catch (error) {
              console.error('Error checking payment status:', error);
              attempts++;
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          if (!paymentProcessed) {
            // Fallback: proactively query Alipay via backend proxy
            try {
              const queryResp = await apiClient.get(`/api/payment/alipay/query?out_trade_no=${outTradeNo}`);
              if (queryResp?.data?.payment_processed) {
                setSuccess(true);
                paymentProcessed = true;
              } else {
                throw new Error(t('payment.payment_not_confirmed'));
              }
            } catch (err) {
              console.error('Alipay trade query fallback failed', err);
              throw new Error(t('payment.payment_verification_timeout'));
            }
          }
        } else {
          // Handle Stripe payment verification
          if (!sessionId) {
            throw new Error(t('payment.no_session_id'));
          }
          
          console.log('Stripe payment verification:', { sessionId, paymentMethod });
          
          // Verify the payment with the backend
          const response = await apiClient.get(`/api/payment/success?session_id=${sessionId}`);
          
          console.log('Stripe payment verification response:', response.data);
          setSuccess(true);
        }
      } catch (error: any) {
        console.error('Error verifying payment:', error);
        const errorMessage = getApiErrorMessage(error);
        
        setError(errorMessage);
        setSuccess(false);
      } finally {
        setLoading(false);
      }
    };
    
    // Check if we have any payment parameters
    const sessionId = searchParams.get('session_id');
    const outTradeNo = searchParams.get('out_trade_no');
    
    if (sessionId || outTradeNo) {
      verifyPayment();
    } else {
      setLoading(false);
      setError(t('payment.invalid_payment_session'));
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
                {paymentMethod === 'alipay' 
                  ? t('payment.alipay_success_description')
                  : t('payment.success_description')
                }
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

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Icons.spinner className="h-16 w-16 animate-spin text-primary" /></div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
} 
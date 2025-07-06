'use client';

import { useEffect, useState, useCallback, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Mail, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Loading component for Suspense fallback
function VerifyEmailLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading...</span>
        </CardContent>
      </Card>
    </div>
  );
}

// Component that handles search params logic
function VerifyEmailContent() {
  const { t } = useTranslation();
  const { loginWithToken, fetchWithAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | 'waiting' | null>(null);
  const [errorType, setErrorType] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const hasLoggedInRef = useRef(false); // Track if login has been performed
  const timerRef = useRef<NodeJS.Timeout | null>(null); // Track timer reference
  const timerStartedRef = useRef(false); // Track if timer has been started

  // Ensure component only renders after hydration to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Helper function to start countdown timer
  const startCountdownTimer = useCallback(() => {
    console.log('Starting countdown timer, current state:', { resendCooldown, canResend });
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setCanResend(false);
    setResendCooldown(60);
    timerStartedRef.current = true;
    
    timerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        console.log('Timer tick, countdown:', prev - 1);
        if (prev <= 1) {
          setCanResend(true);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          console.log('Timer finished, can resend now');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Debug logging for state changes
  useEffect(() => {
    console.log('State change:', { 
      verificationStatus, 
      resendCooldown, 
      canResend, 
      isLoading, 
      isMounted,
      timerStarted: timerStartedRef.current 
    });
  }, [verificationStatus, resendCooldown, canResend, isLoading, isMounted]);

  // Handle URL params and verification logic
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const token = searchParams.get('token');
    const username = searchParams.get('username');

    if (success === 'true' && token && username) {
      // Email verification successful (redirected from backend)
      setVerificationStatus('success');
      
      // Auto-login the user (only once)
      if (!hasLoggedInRef.current) {
        loginWithToken(token, username);
        hasLoggedInRef.current = true;
      }
      setIsLoading(false);
    } else if (error) {
      // Email verification failed (redirected from backend)
      setVerificationStatus('error');
      setErrorType(error);
      setIsLoading(false);
    } else if (token && !success && !error) {
      // Direct token verification (user came from email link directly)
      const handleDirectTokenVerification = async () => {
        try {
          console.log('Attempting direct token verification with token:', token);
          
          // Make API call to verify the token
          const response = await fetch(`/api/verify-email?token=${token}`, {
            method: 'GET',
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Verification response:', data);
            
            if (data.success && data.access_token && data.username) {
              // Verification successful
              setVerificationStatus('success');
              loginWithToken(data.access_token, data.username);
              hasLoggedInRef.current = true;
              
              toast({
                title: t('success.title'),
                description: t('auth.email_verified'),
              });
            } else {
              setVerificationStatus('error');
              setErrorType('invalid_token');
            }
          } else {
            console.error('Verification failed:', response.status, response.statusText);
            setVerificationStatus('error');
            
            // Try to get error type from response
            try {
              const errorData = await response.json();
              setErrorType(errorData.error || 'invalid_token');
            } catch {
              setErrorType('invalid_token');
            }
          }
        } catch (error) {
          console.error('Error during token verification:', error);
          setVerificationStatus('error');
          setErrorType('invalid_token');
        } finally {
          setIsLoading(false);
        }
      };

      handleDirectTokenVerification();
    } else {
      // No URL parameters - user just registered and is waiting for email verification
      setVerificationStatus('waiting');
      
      // Start cooldown timer (60 seconds before they can resend) - only once
      if (!timerStartedRef.current) {
        console.log('Starting timer for waiting state');
        startCountdownTimer();
      }

      setIsLoading(false);
    }
  }, [searchParams, toast, t]);

  const getErrorMessage = (errorType: string) => {
    switch (errorType) {
      case 'missing_token':
        return t('email.errors.missing_token');
      case 'invalid_token':
        return t('email.errors.invalid_token');
      case 'token_expired':
        return t('email.errors.token_expired');
      default:
        return t('errors.unknown_error');
    }
  };

  const handleResendEmail = async () => {
    if (!canResend || isResending) return;
    
    setIsResending(true);
    try {
      const response = await fetchWithAuth('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: t('success.title'),
          description: t('auth.verification_sent'),
        });
        
        // Reset cooldown using the helper function
        timerStartedRef.current = false; // Reset the flag so timer can restart
        startCountdownTimer();
      } else {
        const errorData = await response.json();
        toast({
          title: t('errors.generic_error_title'),
          description: errorData.message || t('errors.unknown_error'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: t('errors.generic_error_title'),
        description: t('errors.unknown_error'),
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleContinue = () => {
    console.log('Continue button clicked, navigating to /translate');
    try {
      router.push('/translate');
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = '/translate';
    }
  };

  const handleBackToHome = () => {
    console.log('Back to home button clicked, navigating to /');
    try {
      router.push('/');
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = '/';
    }
  };

  const handleLogin = () => {
    console.log('Login button clicked, navigating to /?tab=login');
    try {
      router.push('/?tab=login');
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = '/?tab=login';
    }
  };

  // Show loading state before hydration or during processing
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {verificationStatus === 'success' ? (
            <>
              <div className="mx-auto mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-green-700">
                {t('success.title')}
              </CardTitle>
              <CardDescription>
                {t('auth.email_verified')}
              </CardDescription>
            </>
          ) : verificationStatus === 'waiting' ? (
            <>
              <div className="mx-auto mb-4">
                <Mail className="h-16 w-16 text-blue-500" />
              </div>
              <CardTitle className="text-blue-700">
                {t('auth.check_email_title')}
              </CardTitle>
              <CardDescription>
                {t('auth.check_email_description')}
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-red-700">
                {t('errors.verification_error')}
              </CardTitle>
              <CardDescription>
                {getErrorMessage(errorType)}
              </CardDescription>
            </>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {verificationStatus === 'success' ? (
            <>
              <div className="space-y-2">
                <Button 
                  onClick={handleContinue}
                  className="w-full"
                >
                  {t('nav.translate_now')}
                </Button>
                <Button 
                  onClick={handleBackToHome}
                  variant="outline"
                  className="w-full"
                >
                  {t('nav.home')}
                </Button>
              </div>
            </>
          ) : verificationStatus === 'waiting' ? (
            <>
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    {t('auth.check_email_instructions')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('auth.check_spam_folder')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Button 
                    onClick={handleResendEmail}
                    disabled={!canResend || isResending}
                    variant="outline"
                    className="w-full"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('auth.sending')}
                      </>
                    ) : !canResend ? (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        {t('auth.resend_in_seconds', { seconds: resendCooldown })}
                      </>
                    ) : (
                      t('auth.resend_verification')
                    )}
                  </Button>
                  <Button 
                    onClick={handleBackToHome}
                    variant="default"
                    className="w-full"
                  >
                    {t('nav.home')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-center text-sm text-gray-600">
                {errorType === 'token_expired' 
                  ? t('auth.verify_email_first')
                  : t('auth.back_to_home')
                }
              </p>
              <div className="space-y-2">
                {errorType === 'token_expired' && (
                  <Button 
                    onClick={handleLogin}
                    className="w-full"
                  >
                    {t('auth.login')}
                  </Button>
                )}
                <Button 
                  onClick={handleBackToHome}
                  variant={errorType === 'token_expired' ? 'outline' : 'default'}
                  className="w-full"
                >
                  {t('nav.home')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Main page component that wraps content in Suspense
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  );
} 
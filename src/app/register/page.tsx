'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import { DynamicHead } from '@/components/dynamic-head';
import RegisterForm from '@/components/auth/RegisterForm';
import LogoImage from '@/assets/Pure_logo.png';
import Image from 'next/image';
import Link from 'next/link';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, registeredWithInvitation, clearRegistrationFlag } = useAuth();
  const { t } = useTranslation();
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Extract referral code from URL parameters
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferralCode(refParam);
    }
  }, [searchParams]);

  // Handle successful registration and redirect
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Show success message for referral registration
      if (registeredWithInvitation) {
        // Import toast dynamically to avoid SSR issues
        import('@/hooks/use-toast').then(({ toast }) => {
          toast({
            title: t('auth.register_success'),
            description: t('auth.welcome_with_invitation'),
          });
        });
        clearRegistrationFlag();
      }
      
      // Redirect to translate page
      router.push('/translate');
    }
  }, [isAuthenticated, isLoading, registeredWithInvitation, clearRegistrationFlag, router, t]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C8599]"></div>
      </div>
    );
  }

  // Don't render anything if user is authenticated (they'll be redirected)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <DynamicHead />
      
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Image src={LogoImage} alt={t('title')} width={28} height={28} />
              <span className="text-xl font-bold">{t('title')}</span>
            </Link>
            
            <Link 
              href="/"
              className="text-sm text-muted-foreground hover:text-primary transition"
            >
              {t('nav.back_to_home')}
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{t('auth.register')}</h1>
            <p className="text-muted-foreground">
              {referralCode 
                ? t('auth.register_with_referral_subtitle')
                : t('auth.register_subtitle')
              }
            </p>
            {referralCode && (
              <p className="text-sm text-[#0C8599] mt-2">
                {t('auth.using_referral_code')}: <span className="font-mono font-bold">{referralCode}</span>
              </p>
            )}
          </div>
          
          <RegisterForm initialReferralCode={referralCode} />
          
          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              {t('auth.already_have_account')}{' '}
              <Link href="/" className="text-primary hover:underline">
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0C8599]"></div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
} 
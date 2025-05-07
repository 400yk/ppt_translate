'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslation, LOCALE_CHANGE_EVENT } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { Check } from 'lucide-react';
import { Icons } from '@/components/icons';
import Image from 'next/image';
import LogoImage from '@/assets/Pure_logo.png';
import Link from 'next/link';
import { LanguageSelector } from '@/components/language-selector';
import { DynamicHead } from '@/components/dynamic-head';
import { RegistrationDialog } from '@/components/registration-dialog';
import { PaymentModal } from '@/components/payment-modal';
import { usePricing } from '@/lib/pricing-service';
import { useConfigLimits } from '@/lib/config-service';

export default function PricingPage() {
  const { t, locale } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { pricing, isLoading: isPricingLoading } = usePricing();
  const { limits, isLoading: isLimitsLoading } = useConfigLimits();
  const [isClient, setIsClient] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaidUser, setIsPaidUser] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Fix for hydration error - only render content after client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Check if user is a paid member
  useEffect(() => {
    const checkMembershipStatus = async () => {
      if (!isAuthenticated || !isClient) return;
      
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        const response = await fetch(`${API_URL}/api/membership/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setIsPaidUser(data.user_type === 'paid');
        }
      } catch (error) {
        console.error('Error checking membership status:', error);
      }
    };
    
    checkMembershipStatus();
  }, [isAuthenticated, isClient]);
  
  // Force component re-render on locale change
  useEffect(() => {
    const handleLocaleChange = () => {
      // Increment to force a re-render
      setForceRender(prev => prev + 1);
    };
    
    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    };
  }, []);

  // If not yet client-side (first render), return minimal content to avoid hydration mismatch
  if (!isClient) {
    return <div className="container max-w-6xl py-10"></div>;
  }

  const handleUpgradeClick = () => {
    if (!isAuthenticated) {
      setShowRegistrationDialog(true); // Show registration dialog instead of redirect
    } else {
      // Show payment modal for logged-in users
      setShowPaymentModal(true);
    }
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <DynamicHead />
      
      {/* Registration dialog */}
      <RegistrationDialog 
        isOpen={showRegistrationDialog} 
        onClose={() => setShowRegistrationDialog(false)} 
      />
      
      {/* Payment Modal */}
      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={closePaymentModal}
      />
      
      {/* Navbar */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Link href="/">
                <div className="flex items-center">
                  <Image src={LogoImage} alt={t('title')} width={40} height={40} />
                  <span className="text-2xl font-bold ml-2">{t('title')}</span>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <nav className="hidden md:flex items-center space-x-8">
                <Link href="/translate" className="text-foreground hover:text-primary transition">
                  {t('nav.translate_now')}
                </Link>
                <Link href="/pricing" className="text-foreground hover:text-primary transition">
                  {t('pricing.title')}
                </Link>
              </nav>
              
              {/* Language selector */}
              <div className="ml-6">
                <LanguageSelector width="w-[100px]" />
              </div>
              
              {isAuthenticated ? (
                <Button onClick={() => router.push('/translate')} variant="outline" className="flex items-center gap-2">
                  <Icons.user className="h-4 w-4" />
                  <span>{user?.username}</span>
                </Button>
              ) : (
                <Button onClick={() => setShowRegistrationDialog(true)} variant="outline">{t('auth.login')}</Button>
              )}
            </div>
            
            {/* Mobile menu button - can be expanded in the future */}
            <div className="md:hidden">
              <Button variant="ghost" size="icon">
                <Icons.menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container max-w-6xl py-10 mx-auto">
        <div className="space-y-6 text-center mb-12">
          <h1 className="text-4xl font-bold">🔥 {t('pricing.title')}</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="p-6 flex flex-col">
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl font-bold">{t('pricing.free_plan')}</h2>
              <p className="text-muted-foreground">{t('pricing.free_desc')}</p>
            </div>
            
            <div className="space-y-2 mb-6">
              <p className="text-3xl font-bold">{isPricingLoading ? '...' : pricing.symbol}0</p>
              <p className="text-muted-foreground">{t('pricing.free_plan_desc')}</p>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4 flex-grow">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {isLimitsLoading ? '...' : limits.freeUserTranslationLimit} PPT/
                    {isLimitsLoading 
                      ? t('pricing.week') 
                      : limits.freeUserTranslationPeriod === 'weekly' 
                        ? t('pricing.week')
                        : limits.freeUserTranslationPeriod === 'monthly'
                          ? t('pricing.month')
                          : t('pricing.week')
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.upload_limit')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{isLimitsLoading ? '...' : limits.freeUserCharPerFileLimit.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.char_per_file')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{isLimitsLoading ? '...' : limits.freeUserCharMonthlyLimit.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.monthly_limit')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{isLimitsLoading ? '...' : limits.maxFileSizeMB} MB</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.file_size')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{t('pricing.free_customer_email_support')}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.support')}</p>
                </div>
              </div>
            </div>

            <Button 
              className="mt-8 w-full" 
              variant="outline"
              onClick={() => isAuthenticated ? null : setShowRegistrationDialog(true)}
            >
              {isAuthenticated 
                ? (isPaidUser ? t('pricing.paid_user') : t('pricing.free_user'))
                : t('auth.login')}
            </Button>
          </Card>

          {/* Paid Plan */}
          <Card className="p-6 flex flex-col relative border-primary/50 bg-primary/5">
            <div className="absolute -top-4 right-4 bg-primary text-primary-foreground text-sm px-3 py-1 rounded-full">
              {t('pricing.recommended_plan')}
            </div>
            
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl font-bold">{t('pricing.paid_plan')}</h2>
              <p className="text-muted-foreground">{t('pricing.paid_desc')}</p>
            </div>
            
            <div className="space-y-2 mb-6">
              {isPricingLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-24 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 w-40 bg-muted animate-pulse rounded"></div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold">
                    {pricing.monthly.display}
                    <span className="text-lg font-normal">/{t('pricing.month')}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pricing.yearly.display_per_month}/{t('pricing.month')} {t('pricing.yearly')}
                  </p>
                </>
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-4 flex-grow">
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{t('pricing.no_limit')}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.upload_limit')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{t('pricing.no_limit')}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.char_per_file')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{isLimitsLoading ? '...' : limits.paidUserCharMonthlyLimit.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.monthly_limit')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{t('pricing.no_limit')}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.file_size')}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{t('pricing.paid_customer_email_support')}</p>
                  <p className="text-sm text-muted-foreground">{t('pricing.features.support')}</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleUpgradeClick} 
              size="lg" 
              className="mt-6"
              disabled={isPricingLoading || isPaidUser}
            >
              {isPricingLoading ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isAuthenticated 
                ? (isPaidUser ? t('pricing.paid_user') : t('pricing.upgrade')) 
                : t('auth.login')}
            </Button>
          </Card>
        </div>

        {/* FAQ section removed/commented out in original code */}
      </div>
      
      {/* Footer */}
      <footer className="border-t py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Image src={LogoImage} alt={t('title')} width={30} height={30} className="mr-2" />
              <span className="font-medium">{t('title')}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {t('landing.copyright')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 
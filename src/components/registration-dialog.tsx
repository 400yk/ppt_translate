'use client';

import { useTranslation } from '@/lib/i18n';
import AuthTabs from '@/components/auth-tabs';
import LogoImage from '@/assets/Pure_logo.png';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSearchParams } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Component that handles search params logic
function RegistrationDialogContent({ isOpen, onClose }: RegistrationDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const { isAuthenticated } = useAuth();
  const searchParams = useSearchParams();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  
  // Extract referral code from URL parameters
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferralCode(refParam);
      // If there's a referral code, default to register tab
      setActiveTab('register');
    }
  }, [searchParams]);
  
  // Reset tab state when dialog opens (but preserve referral code behavior)
  useEffect(() => {
    if (isOpen && !referralCode) {
      setActiveTab('login');
    }
  }, [isOpen, referralCode]);

  // Close dialog automatically when authentication state changes to true
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      onClose();
    }
  }, [isAuthenticated, isOpen, onClose]);
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogTitle className="sr-only">
          {activeTab === 'register' ? t('guest.register_title') : t('auth.login')}
        </DialogTitle>
        
        <div className="flex flex-col items-center mb-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src={LogoImage}
              alt={t('title')}
              width={100}
              height={100}
              className="mx-auto"
            />
          </Link>
        </div>
        
        <DialogHeader className="space-y-2 text-center">
          <DialogDescription className="mx-auto">
            {activeTab === 'register' 
              ? (referralCode ? t('auth.register_with_referral_subtitle') : t('guest.register_subtitle'))
              : t('auth.login_subtitle')
            }
          </DialogDescription>
          {referralCode && activeTab === 'register' && (
            <p className="text-sm text-[#0C8599] mt-2">
              {t('auth.using_referral_code')}: <span className="font-mono font-bold">{referralCode}</span>
            </p>
          )}
        </DialogHeader>
        
        {/* Use the AuthTabs component with login as the default tab */}
        <div className="py-4">
          <AuthTabs 
            defaultTab={referralCode ? "register" : "login"}
            onAuthSuccess={onClose}
            onTabChange={(tab) => setActiveTab(tab)}
            initialReferralCode={referralCode}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Loading component for Suspense fallback
function RegistrationDialogLoading({ isOpen, onClose }: RegistrationDialogProps) {
  const { t } = useTranslation();
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogTitle className="sr-only">
          {t('auth.login')}
        </DialogTitle>
        
        <div className="flex flex-col items-center mb-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src={LogoImage}
              alt={t('title')}
              width={100}
              height={100}
              className="mx-auto"
            />
          </Link>
        </div>
        
        <DialogHeader className="space-y-2 text-center">
          <DialogDescription className="mx-auto">
            Loading...
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C8599]"></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main component that wraps content in Suspense
export function RegistrationDialog({ isOpen, onClose }: RegistrationDialogProps) {
  return (
    <Suspense fallback={<RegistrationDialogLoading isOpen={isOpen} onClose={onClose} />}>
      <RegistrationDialogContent isOpen={isOpen} onClose={onClose} />
    </Suspense>
  );
} 
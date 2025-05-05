'use client';

import { useTranslation } from '@/lib/i18n';
import AuthTabs from '@/components/auth-tabs';
import LogoImage from '@/assets/Pure_logo.png';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

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

export function RegistrationDialog({ isOpen, onClose }: RegistrationDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const { isAuthenticated } = useAuth();
  
  // Reset tab state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('login');
    }
  }, [isOpen]);

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
            {activeTab === 'register' ? t('guest.register_subtitle') : t('auth.login_subtitle')}
          </DialogDescription>
        </DialogHeader>
        
        {/* Use the AuthTabs component with login as the default tab */}
        <div className="py-4">
          <AuthTabs 
            defaultTab="login" 
            onAuthSuccess={onClose}
            onTabChange={(tab) => setActiveTab(tab)} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
} 
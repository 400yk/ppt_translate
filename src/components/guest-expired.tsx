'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { DynamicHead } from '@/components/dynamic-head';
import { useTranslation } from '@/lib/i18n';
import { RegistrationDialog } from '@/components/registration-dialog';

interface GuestExpiredProps {
  locale: string;
  onRegister: () => void;
}

export function GuestExpired({ locale, onRegister }: GuestExpiredProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);

  const handleRegister = () => {
    setShowRegistrationDialog(true);
    onRegister();
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DynamicHead />
      <div className="container mx-auto px-4 py-8 max-w-6xl flex flex-col items-center justify-center h-full flex-1">
        <div className="w-full max-w-md p-8 border rounded-lg shadow-lg bg-white text-center">
          <Icons.info className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-4">
            {t('guest.trial_used')}
          </h2>
          <p className="mb-6 text-gray-600">
            {t('errors.free_trial_used')}
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={handleRegister} className="w-full">
              {t('auth.register_login')}
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="w-full">
              {t('auth.back_to_home')}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Registration dialog */}
      <RegistrationDialog 
        isOpen={showRegistrationDialog} 
        onClose={() => setShowRegistrationDialog(false)} 
      />
    </div>
  );
} 
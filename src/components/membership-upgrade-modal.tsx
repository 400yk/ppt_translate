'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

interface MembershipUpgradeModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export function MembershipUpgradeModal({ isVisible, onClose }: MembershipUpgradeModalProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleUpgrade = () => {
    onClose();
    router.push('/pricing');
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Modal container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {/* Content */}
          <div className="p-8 text-center">
            <Icons.pricing className="h-16 w-16 text-[#0C8599] mx-auto mb-6" />
            
            <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
              {t('errors.referral_membership_required')}
            </h2>
            
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              {t('errors.referral_upgrade_description')}
            </p>
            
            <div className="flex flex-col gap-3">
              <Button onClick={handleUpgrade} className="w-full bg-[#0C8599] hover:bg-[#0A6D80] text-white">
                {t('profile.upgrade_membership')}
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full">
                {t('auth.cancel')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 
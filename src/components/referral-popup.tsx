'use client';

import { useState, useEffect } from 'react';
import { X, Share2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useReferralConfig } from '@/lib/config-service';

interface ReferralPopupProps {
  isVisible: boolean;
  onClose: () => void;
  onShare: () => void;
  onFeedback: () => void;
}

// Helper function to parse **text** markdown and render as bold
function parseMarkdownBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      // Remove the ** and render as bold with extra emphasis
      const boldText = part.slice(2, -2);
      return <strong key={index} className="font-extrabold text-base text-[#0C8599]">{boldText}</strong>;
    }
    return part;
  });
}

export function ReferralPopup({ isVisible, onClose, onShare, onFeedback }: ReferralPopupProps) {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const { config: referralConfig } = useReferralConfig();

  // Fix for hydration error - only render after client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render anything on server side or if not visible
  if (!isClient || !isVisible) return null;

  const descriptionText = t('referral.popup.description', { days: referralConfig.rewardDays });

  return (
    <div 
      className={`
        fixed top-4 right-4 z-[100] w-full max-w-[420px] p-4
        sm:bottom-4 sm:top-auto
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[-100%] opacity-0 sm:translate-y-full'}
      `}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-md opacity-70 hover:opacity-100"
          aria-label={t('referral.popup.close')}
        >
          <X size={16} />
        </button>

        {/* Content */}
        <div className="p-6 pr-8">
          {/* Header */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('referral.popup.title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              {parseMarkdownBold(descriptionText)}
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            {/* Share button - using dark green color matching translate page */}
            <Button
              onClick={onShare}
              className="w-full bg-[#0C8599] hover:bg-[#0A6D80] text-white py-2 text-sm font-medium transition-colors"
              size="sm"
            >
              <Share2 className="mr-2 h-4 w-4" />
              {t('referral.popup.share_button')}
            </Button>

            {/* Feedback button */}
            <Button
              onClick={onFeedback}
              variant="outline"
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 hover:text-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 py-2 text-sm font-medium transition-colors"
              size="sm"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {t('referral.popup.feedback_button')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 
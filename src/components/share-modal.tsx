'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Share2, Mail, MessageCircle, ExternalLink, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useReferralConfig } from '@/lib/config-service';
import apiClient from '@/lib/api-client';
import Image from 'next/image';
import LogoImage from '@/assets/Pure_logo.png';

interface ShareModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export function ShareModal({ isVisible, onClose }: ShareModalProps) {
  const { t } = useTranslation();
  const { fetchWithAuth } = useAuth();
  const { toast } = useToast();
  const { config: referralConfig } = useReferralConfig();
  const [isClient, setIsClient] = useState(false);
  const [referralLink, setReferralLink] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingNew, setIsGeneratingNew] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fix for hydration error - only render after client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Generate referral link when modal opens
  useEffect(() => {
    if (isVisible && !referralLink) {
      generateReferralLink();
    }
  }, [isVisible]);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const generateReferralLink = async (isNewGeneration = false) => {
    const setLoading = isNewGeneration ? setIsGeneratingNew : setIsGenerating;
    setLoading(true);
    
    try {
      const response = await fetchWithAuth('/api/referrals/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Try to get error message safely
        let errorMessage = 'Failed to generate referral link';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Could not parse response as JSON:', parseError);
        throw new Error('Invalid response format from server');
      }
      const baseUrl = window.location.origin;
      const fullLink = `${baseUrl}/register?ref=${data.referral_code}`;
      
      setReferralCode(data.referral_code);
      setReferralLink(fullLink);
      
      // Show success message for new generation
      if (isNewGeneration) {
        toast({
          title: t('success.title'),
          description: t('share.modal.generate_new_success'),
        });
      }
    } catch (error) {
      console.error('Error generating referral link:', error);
      toast({
        title: t('errors.generic_error_title'),
        description: error instanceof Error ? error.message : 'Failed to generate referral link',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNewReferralLink = () => {
    generateReferralLink(true);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: t('success.title'),
        description: t('share.modal.copy_success'),
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: t('errors.generic_error_title'),
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const shareToFacebook = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const shareToTwitter = () => {
    const text = t('share.modal.twitter_text', { days: referralConfig.rewardDays });
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const shareToLinkedIn = () => {
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const shareToWhatsApp = () => {
    const text = t('share.modal.whatsapp_text', { days: referralConfig.rewardDays, link: referralLink });
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
  };

  const shareViaEmail = () => {
    const subject = t('share.modal.email_subject');
    const body = t('share.modal.email_body', { days: referralConfig.rewardDays, link: referralLink });
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  // Don't render anything on server side or if not visible
  if (!isClient || !isVisible) return null;

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
             aria-label={t('share.modal.close')}
           >
             <X size={20} />
           </button>

          {/* Content */}
          <div className="p-6">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <Image src={LogoImage} alt={t('title')} width={80} height={80} />
            </div>

            {/* Header */}
              <div className="mb-10">
               <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-center">
                 <Share2 className="mr-2 h-5 w-5" />
                 {t('share.modal.title')}
               </h2>
               <p className="text-gray-600 dark:text-gray-300 text-sm text-center">
                 {t('share.modal.description')}
               </p>
             </div>

            {/* Referral Link Section */}
            <div className="mb-10">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('share.modal.referral_link_label')}
              </label>
              {isGenerating ? (
                <div className="flex items-center justify-center p-4 border border-gray-300 rounded-md">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0C8599]"></div>
                  <span className="ml-2 text-sm text-gray-600">{t('share.modal.generating_link')}</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={referralLink}
                    readOnly
                    className="flex-1 font-mono text-sm"
                    placeholder={t('share.modal.placeholder_generating')}
                  />
                  <Button
                    onClick={copyToClipboard}
                    size="sm"
                    className="bg-[#0C8599] hover:bg-[#0A6D80] text-white"
                    disabled={!referralLink || isGeneratingNew}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </Button>
                </div>
              )}
            </div>

            {/* Social Media Sharing */}
             <div className="mb-10">
               <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                 {t('share.modal.social_media_title')}
               </h3>
               <div className="flex justify-center gap-4">

                 <button
                   onClick={shareViaEmail}
                   disabled={!referralLink || isGeneratingNew}
                   title="Email"
                   className="w-12 h-12 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                 >
                   <Mail className="h-6 w-6" />
                 </button>

                 <button
                   onClick={shareToTwitter}
                   disabled={!referralLink || isGeneratingNew}
                   title="X"
                   className="w-12 h-12 bg-black hover:bg-gray-800 text-white rounded-full flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                 >
                   <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                   </svg>
                 </button>

                 <button
                   onClick={shareToLinkedIn}
                   disabled={!referralLink || isGeneratingNew}
                   title="LinkedIn"
                   className="w-12 h-12 bg-[#0A66C2] hover:bg-[#095BAD] text-white rounded-full flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                 >
                   <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                   </svg>
                 </button>

                  <button
                     onClick={shareToWhatsApp}
                     disabled={!referralLink || isGeneratingNew}
                     title="WhatsApp"
                     className="w-12 h-12 bg-[#25D366] hover:bg-[#22BF5B] text-white rounded-full flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                   >
                     <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.89 3.488"/>
                     </svg>
                   </button>
                   
                   <button
                   onClick={shareToFacebook}
                   disabled={!referralLink || isGeneratingNew}
                   title="Facebook"
                   className="w-12 h-12 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-full flex items-center justify-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                 >
                   <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                   </svg>
                 </button>

               </div>
             </div>

             {/* Generate New Referral Button */}
             <div className="mt-10">
               <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                 {t('share.modal.single_use_info')}
               </p>
               <Button
                 onClick={generateNewReferralLink}
                 disabled={isGeneratingNew}
                 className="w-full bg-transparent border-2 border-gray-300 text-gray-700 hover:bg-[#0C8599] hover:text-white hover:border-[#0C8599] transition-colors duration-200 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-[#0C8599] dark:hover:border-[#0C8599]"
               >
                 {isGeneratingNew ? (
                   <>
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                     {t('share.modal.generating')}
                   </>
                 ) : (
                   <>
                     <RefreshCw className="h-4 w-4 mr-2" />
                     {t('share.modal.generate_new')}
                   </>
                 )}
               </Button>
             </div>
          </div>
        </div>
      </div>
    </>
  );
} 
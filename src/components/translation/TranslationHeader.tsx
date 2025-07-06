import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { LanguageSelector } from '@/components/language-selector';
import { ShareModal } from '@/components/share-modal';
import { MembershipUpgradeModal } from '@/components/membership-upgrade-modal';
import { FeedbackModal } from '@/components/feedback-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n';
import LogoImage from '@/assets/Pure_logo.png';

interface TranslationHeaderProps {
  isGuestUser: boolean;
  onShowRegistrationDialog: () => void;
}

export function TranslationHeader({ isGuestUser, onShowRegistrationDialog }: TranslationHeaderProps) {
  const { user, logout, fetchWithAuth } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  // Custom logout function to redirect to landing page
  const handleLogout = () => {
    logout(() => {
      router.push('/');
    });
  };

  // Handle opening share modal
  const handleInviteFriends = async () => {
    if (isGuestUser) {
      onShowRegistrationDialog();
      return;
    }

    try {
      // Use fetchWithAuth from auth context for proper authentication
      const response = await fetchWithAuth('/api/membership/status');
      
      if (response.ok) {
        const membershipStatus = await response.json();
        console.log('TranslationHeader - Membership status:', membershipStatus); // Debug log
        
        // Check if user has paid membership or invitation membership
        if (membershipStatus.user_type === 'paid' || membershipStatus.user_type === 'invitation') {
          setIsShareModalVisible(true);
        } else {
          console.log('TranslationHeader - User not eligible:', membershipStatus.user_type); // Debug log
          setShowUpgradePrompt(true);
        }
      } else {
        console.error('TranslationHeader - API response not ok:', response.status, response.statusText); // Debug log
        setShowUpgradePrompt(true);
      }
    } catch (error) {
      console.error('TranslationHeader - Error checking membership status:', error);
      setShowUpgradePrompt(true);
    }
  };

  // Handle closing share modal
  const handleCloseShareModal = () => {
    setIsShareModalVisible(false);
  };

  // Get translated texts for the dropdown menu
  const guestUserText = t('guest.guest_user');
  const registerLoginText = t('auth.register_login');
  const backToHomeText = t('auth.back_to_home');
  
  return (
    <div className="w-full flex justify-between items-center py-2">
      <div className="flex items-center">
        <Link href="/">
          <div className="flex items-center">
            <Image
              src={LogoImage}
              alt={t('title')} 
              width={40}
              height={40}
              className="mr-2"
            />
            <h1 className="text-2xl font-bold">{t('title')}</h1>
          </div>
        </Link>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Language selector */}
        <LanguageSelector width="w-[100px]" />
        
        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Icons.user className="h-4 w-4" />
              <span className="hidden sm:inline-block">{user?.username || guestUserText}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isGuestUser ? (
              <>
                <DropdownMenuLabel>{guestUserText}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onShowRegistrationDialog}>
                  <Icons.user className="mr-2 h-4 w-4" />
                  {registerLoginText}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/')}>
                  <Icons.home className="mr-2 h-4 w-4" />
                  {backToHomeText}
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuLabel>{user?.email || user?.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <Icons.user className="mr-2 h-4 w-4" />
                  {t('profile.title')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleInviteFriends}>
                  <Icons.share className="mr-2 h-4 w-4" />
                  {t('auth.invite_friends')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowFeedbackModal(true)}>
                  <Icons.messageSquare className="mr-2 h-4 w-4" />
                  {t('feedback.title')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <Icons.logout className="mr-2 h-4 w-4" />
                  {t('auth.logout')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Share Modal */}
      <ShareModal 
        isVisible={isShareModalVisible} 
        onClose={handleCloseShareModal} 
      />
      
      {/* Membership upgrade modal */}
      <MembershipUpgradeModal 
        isVisible={showUpgradePrompt} 
        onClose={() => setShowUpgradePrompt(false)} 
      />
      
      {/* Feedback modal */}
      <FeedbackModal
        isVisible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        pageContext="translate-header"
      />
    </div>
  );
} 
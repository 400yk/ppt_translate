'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { useTranslation, LOCALE_CHANGE_EVENT } from '@/lib/i18n';
import LogoImage from '@/assets/Pure_logo.png';
import { Icons } from '@/components/icons';
import { LanguageSelector } from '@/components/language-selector';
import { DynamicHead } from '@/components/dynamic-head';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PaymentModal } from '@/components/payment-modal';
import apiClient, { getApiErrorMessage } from '@/lib/api-client';
import { ShareModal } from '@/components/share-modal';
import { MembershipUpgradeModal } from '@/components/membership-upgrade-modal';
import { FeedbackModal } from '@/components/feedback-modal';
import { ReferralDashboard } from '@/components/referral-dashboard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

// API endpoint base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ProfilePage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { user, token, isAuthenticated, isLoading, logout } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<any>(null);
  const [isLoadingMembership, setIsLoadingMembership] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReferralDashboard, setShowReferralDashboard] = useState(false);
  const { toast } = useToast();

  // Fix for hydration error - only render content after client-side mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle logout
  const handleLogout = () => {
    logout(() => {
      // Use a callback to handle navigation after logout
      router.push('/');
    });
  };

  // Check if user should be redirected (not authenticated)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShouldRedirect(true);
    }
  }, [isLoading, isAuthenticated]);

  // Handle redirect if needed
  useEffect(() => {
    if (shouldRedirect) {
      router.push('/');
    }
  }, [shouldRedirect, router]);

  // Fetch membership status
  useEffect(() => {
    if (isClient && isAuthenticated && token) {
      fetchMembershipStatus();
    }
  }, [isClient, isAuthenticated, token]);

  const fetchMembershipStatus = async () => {
    try {
      setIsLoadingMembership(true);
      console.log('Fetching membership status...');
      
      const response = await apiClient.get('/api/membership/status');
      
      console.log('Membership status:', response.data);
      setMembershipStatus(response.data);
    } catch (error) {
      console.error('Error fetching membership status:', error);
    } finally {
      setIsLoadingMembership(false);
    }
  };

  // Force component re-render on locale change
  useEffect(() => {
    const handleLocaleChange = () => {
      // Refresh membership status when locale changes
      if (isAuthenticated && token) {
        fetchMembershipStatus();
      }
    };
    
    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    return () => {
      window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    };
  }, [isAuthenticated, token]);

  // Render membership status badge
  const renderMembershipBadge = () => {
    if (isLoadingMembership) {
      return <Badge variant="outline">{t('common.loading')}</Badge>;
    }

    if (!membershipStatus) {
      return <Badge variant="outline">{t('profile.free_user')}</Badge>;
    }

    switch (membershipStatus.user_type) {
      case 'paid':
        return <Badge className="bg-green-500">{t('profile.paid_member')}</Badge>;
      case 'invitation':
        return <Badge className="bg-blue-500">{t('profile.invitation_member')}</Badge>;
      case 'member':
        // Members with referral bonuses or other sources get same badge as paid members
        return <Badge className="bg-green-500">{t('profile.paid_member')}</Badge>;
      default:
        return <Badge variant="outline">{t('profile.free_user')}</Badge>;
    }
  };

  const openPaymentModal = () => {
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
  };

  const handlePaymentSuccess = () => {
    // Refresh membership status after successful payment
    fetchMembershipStatus();
  };

  // Add this function to handle opening the Stripe Customer Portal
  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      
      const response = await apiClient.post('/api/payment/create-portal-session', {
        return_url: window.location.href
      });
      
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error opening portal:', error);
      const errorMessage = getApiErrorMessage(error);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle invite friends click
  const handleInviteFriends = async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      // Use the already fetched membership status
      if (membershipStatus && (membershipStatus.user_type === 'paid' || membershipStatus.user_type === 'invitation')) {
        console.log('Profile page - User eligible for invites:', membershipStatus.user_type); // Debug log
        setShowShareModal(true);
      } else {
        console.log('Profile page - User not eligible:', membershipStatus?.user_type || 'no status'); // Debug log
        setShowUpgradePrompt(true);
      }
    } catch (error) {
      console.error('Error checking membership status:', error);
      setShowUpgradePrompt(true);
    }
  };

  // Handle feedback click
  const handleFeedback = () => {
    setShowFeedbackModal(true);
  };

  // If not yet client-side (first render), return minimal content to avoid hydration mismatch
  if (!isClient) {
    return <div className="container max-w-6xl py-10"></div>;
  }

  // If loading, show spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If user should be redirected, don't render the profile content
  if (shouldRedirect) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <DynamicHead title={t('profile.title')} />
      
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
              </nav>
              
              {/* Language selector */}
              <div className="ml-6">
                <LanguageSelector width="w-[100px]" />
              </div>
              
              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Icons.user className="h-4 w-4" />
                    <span>{user?.username}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user?.email || user?.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <div className="flex items-center">
                        <Icons.user className="mr-2 h-4 w-4" />
                        {t('profile.title')}
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleInviteFriends}>
                    <Icons.share className="mr-2 h-4 w-4" />
                    {t('auth.invite_friends')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleFeedback}>
                    <Icons.messageSquare className="mr-2 h-4 w-4" />
                    {t('feedback.title')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <Icons.logout className="mr-2 h-4 w-4" />
                    {t('auth.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col space-y-6 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
            
            {/* User information card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{user?.username}</CardTitle>
                    <CardDescription>{user?.email}</CardDescription>
                  </div>
                  {renderMembershipBadge()}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">{t('profile.membership_details')}</h2>
                
                {isLoadingMembership ? (
                  <div className="flex items-center justify-center p-4">
                    <Icons.spinner className="h-6 w-6 animate-spin" />
                  </div>
                ) : membershipStatus ? (
                  <div className="space-y-4">
                    {membershipStatus.user_type === 'paid' && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-muted-foreground">{t('profile.membership_start')}</div>
                          <div>{new Date(membershipStatus.membership_start).toLocaleDateString()}</div>
                          
                          <div className="text-muted-foreground">{t('profile.membership_end')}</div>
                          <div>{new Date(membershipStatus.membership_end).toLocaleDateString()}</div>
                          
                          <div className="text-muted-foreground">{t('profile.translations')}</div>
                          <div>{t('profile.unlimited')}</div>
                          
                          <div className="text-muted-foreground">{t('profile.monthly_character_limit')}</div>
                          <div>{membershipStatus.character_limit?.toLocaleString()}</div>
                          
                          <div className="text-muted-foreground">{t('profile.characters_used')}</div>
                          <div>{membershipStatus.characters_used?.toLocaleString() || 0}</div>
                          
                          <div className="text-muted-foreground">{t('profile.characters_remaining')}</div>
                          <div>{membershipStatus.characters_remaining?.toLocaleString() || 0}</div>
                          
                          {membershipStatus.next_character_reset && (
                            <>
                              <div className="text-muted-foreground">{t('profile.next_character_reset')}</div>
                              <div>{new Date(membershipStatus.next_character_reset).toLocaleDateString()}</div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                    
                    {membershipStatus.user_type === 'invitation' && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-muted-foreground">{t('profile.invitation_code')}</div>
                          <div>{membershipStatus.invitation_code}</div>
                          
                          <div className="text-muted-foreground">{t('profile.translations')}</div>
                          <div>{t('profile.unlimited')}</div>
                          
                          <div className="text-muted-foreground">{t('profile.monthly_character_limit')}</div>
                          <div>{membershipStatus.character_limit?.toLocaleString()}</div>
                          
                          <div className="text-muted-foreground">{t('profile.characters_used')}</div>
                          <div>{membershipStatus.characters_used?.toLocaleString() || 0}</div>
                          
                          <div className="text-muted-foreground">{t('profile.characters_remaining')}</div>
                          <div>{membershipStatus.characters_remaining?.toLocaleString() || 0}</div>
                          
                          {membershipStatus.next_character_reset && (
                            <>
                              <div className="text-muted-foreground">{t('profile.next_character_reset')}</div>
                              <div>{new Date(membershipStatus.next_character_reset).toLocaleDateString()}</div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                    
                    {membershipStatus.user_type === 'free' && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-muted-foreground">{t('profile.translations_limit')}</div>
                          <div>{membershipStatus.translations_limit}</div>
                          
                          <div className="text-muted-foreground">{t('profile.translations_used')}</div>
                          <div>{membershipStatus.translations_used}</div>
                          
                          <div className="text-muted-foreground">{t('profile.translations_remaining')}</div>
                          <div>{membershipStatus.translations_remaining}</div>
                          
                          <div className="text-muted-foreground">{t('profile.monthly_character_limit')}</div>
                          <div>{membershipStatus.character_limit?.toLocaleString()}</div>
                          
                          <div className="text-muted-foreground">{t('profile.characters_used')}</div>
                          <div>{membershipStatus.characters_used?.toLocaleString() || 0}</div>
                          
                          <div className="text-muted-foreground">{t('profile.characters_remaining')}</div>
                          <div>{membershipStatus.characters_remaining?.toLocaleString() || 0}</div>
                          
                          <div className="text-muted-foreground">{t('profile.reset_info')}</div>
                          <div>
                            {t('profile.reset_weekly')}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    {t('profile.free_user_description')}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <div>
                  {/* Referral Dashboard Button - Show for paid and invitation users */}
                  {membershipStatus && (membershipStatus.user_type === 'paid' || membershipStatus.user_type === 'invitation') && (
                    <Button 
                      onClick={() => setShowReferralDashboard(true)} 
                      variant="outline"
                      className="mr-2"
                    >
                      <Icons.share className="mr-2 h-4 w-4" />
                      {t('referral.dashboard.title')}
                    </Button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {(!membershipStatus || membershipStatus.user_type === 'free' || membershipStatus.user_type === 'invitation') && (
                    <Button onClick={openPaymentModal} className="bg-teal-600 hover:bg-teal-700 text-white">
                      <Icons.payment className="mr-2 h-4 w-4" />
                      {t('profile.upgrade_membership')}
                    </Button>
                  )}
                  
                  {membershipStatus && membershipStatus.user_type === 'paid' && (
                    <>
                      <Button onClick={openPaymentModal} variant="outline">
                        <Icons.payment className="mr-2 h-4 w-4" />
                        {t('profile.extend_membership')}
                      </Button>
                      <Button onClick={handleManageSubscription} variant="outline">
                        <Icons.settings className="mr-2 h-4 w-4" />
                        {t('profile.manage_billing')}
                      </Button>
                    </>
                  )}
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>

      {/* Payment Modal */}
      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={closePaymentModal}
        onSuccess={handlePaymentSuccess} 
      />
      
      {/* Share modal */}
      <ShareModal 
        isVisible={showShareModal} 
        onClose={() => setShowShareModal(false)} 
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
      />
      
      {/* Referral Dashboard */}
      <ReferralDashboard 
        isVisible={showReferralDashboard} 
        onClose={() => setShowReferralDashboard(false)} 
      />
    </div>
  );
} 
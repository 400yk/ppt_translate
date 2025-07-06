'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import apiClient, { getApiErrorMessage } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import { 
  enUS, 
  zhCN, 
  zhTW, 
  es, 
  fr, 
  de, 
  ja, 
  ko, 
  ru 
} from 'date-fns/locale';
import { ShareModal } from '@/components/share-modal';

interface ReferralData {
  id: number;
  referee_email: string | null;
  referral_code: string;
  status: 'pending' | 'completed' | 'expired';
  created_at: string;
  expires_at: string;
  completed_at: string | null;
  reward_claimed: boolean;
  referee_username: string | null;
  is_generic: boolean;
  reward_days: number;
}

interface ReferralStats {
  referrals: ReferralData[];
  total_count: number;
  pending_count: number;
  completed_count: number;
  remaining_referrals: number;
}

interface ReferralDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

export function ReferralDashboard({ isVisible, onClose }: ReferralDashboardProps) {
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [resendReferralCode, setResendReferralCode] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reward_claimed'>('all');

  // Fetch referral data
  useEffect(() => {
    if (isVisible && isAuthenticated) {
      fetchReferralData();
    }
  }, [isVisible, isAuthenticated]);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/referrals/my-referrals');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      const errorMessage = getApiErrorMessage(error);
      toast({
        title: t('errors.generic_error_title'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (referralId?: number) => {
    if (referralId) {
      setClaiming(referralId);
    } else {
      setClaimingAll(true);
    }

    try {
      const response = await apiClient.post('/api/referrals/claim-reward', 
        referralId ? { referral_id: referralId } : {}
      );
      
      toast({
        title: t('success.title'),
        description: t('referral.rewards_claimed', { 
          count: response.data.rewards_claimed,
          days: response.data.total_days_added 
        }),
      });
      
      // Refresh data
      fetchReferralData();
    } catch (error) {
      console.error('Error claiming reward:', error);
      const errorMessage = getApiErrorMessage(error);
      toast({
        title: t('errors.generic_error_title'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setClaiming(null);
      setClaimingAll(false);
    }
  };

  const getStatusBadge = (status: string, rewardClaimed: boolean) => {
    if (status === 'completed') {
      return (
        <Badge className={rewardClaimed ? 'bg-green-500' : 'bg-blue-500'}>
          {rewardClaimed ? t('referral.reward_claimed') : t('referral.reward_ready')}
        </Badge>
      );
    } else if (status === 'pending') {
      return <Badge variant="outline">{t('referral.pending')}</Badge>;
    } else if (status === 'expired') {
      return <Badge variant="secondary">{t('referral.expired')}</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    // Map app locales to date-fns locales
    const dateLocaleMap = {
      en: enUS,
      zh: zhCN,
      zh_hk: zhTW,
      es: es,
      fr: fr,
      de: de,
      ja: ja,
      ko: ko,
      ru: ru
    };
    
    const dateLocale = dateLocaleMap[locale] || enUS;
    
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true,
      locale: dateLocale
    });
  };

  const handleResendReferral = (referralCode: string) => {
    setResendReferralCode(referralCode);
    setShowShareModal(true);
  };

  const handleCloseShareModal = () => {
    setShowShareModal(false);
    setResendReferralCode(null);
  };

  const unclaimedRewards = stats?.referrals.filter(r => r.status === 'completed' && !r.reward_claimed) || [];
  const totalUnclaimedDays = unclaimedRewards.length * (stats?.referrals[0]?.reward_days || 3);
  
  // Filter referrals based on selected status
  const filteredReferrals = stats?.referrals.filter(referral => {
    switch (filterStatus) {
      case 'pending':
        return referral.status === 'pending';
      case 'reward_claimed':
        return referral.status === 'completed' && referral.reward_claimed;
      case 'all':
      default:
        return true;
    }
  }) || [];

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('referral.dashboard.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {t('referral.dashboard.description')} {t('referral.dashboard.max_referrals_info', { max: 100 })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Icons.x className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Icons.spinner className="h-8 w-8 animate-spin" />
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('referral.dashboard.total_referrals')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold">{stats.total_count}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('referral.dashboard.pending')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold text-yellow-600">{stats.pending_count}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('referral.dashboard.completed')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold text-green-600">{stats.completed_count}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {t('referral.dashboard.remaining')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-2xl font-bold text-blue-600">{stats.remaining_referrals}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Unclaimed Rewards */}
              {unclaimedRewards.length > 0 && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
                  <CardHeader>
                    <CardTitle className="text-green-800 dark:text-green-400">
                      {t('referral.dashboard.unclaimed_rewards')}
                    </CardTitle>
                    <CardDescription className="text-green-600 dark:text-green-300">
                      {t('referral.dashboard.unclaimed_description', { 
                        count: unclaimedRewards.length, 
                        days: totalUnclaimedDays 
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => handleClaimReward()}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={claimingAll}
                    >
                      {claimingAll ? (
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Icons.check className="mr-2 h-4 w-4" />
                      )}
                      {t('referral.dashboard.claim_all_rewards')}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Referrals List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{t('referral.dashboard.your_referrals')}</CardTitle>
                      <CardDescription>
                        {t('referral.dashboard.referrals_description')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">

                      <Select value={filterStatus} onValueChange={(value: 'all' | 'pending' | 'reward_claimed') => setFilterStatus(value)}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('referral.dashboard.filter_all')}</SelectItem>
                          <SelectItem value="pending">{t('referral.dashboard.filter_pending')}</SelectItem>
                          <SelectItem value="reward_claimed">{t('referral.dashboard.filter_reward_claimed')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => setShowShareModal(true)}
                        className="bg-[#0C8599] hover:bg-[#0A6D80] text-white"
                      >
                        <Icons.plus className="h-4 w-4 mr-2" />
                        {t('referral.dashboard.create_new_invitation')}
                      </Button>                      
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredReferrals.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Icons.share className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p>{stats?.referrals.length === 0 ? t('referral.dashboard.no_referrals') : 'No referrals match the selected filter.'}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredReferrals.map((referral) => (
                        <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {referral.referral_code}
                              </code>
                              {getStatusBadge(referral.status, referral.reward_claimed)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                              <div>
                                {t('referral.dashboard.created')}: {formatDate(referral.created_at)}
                              </div>
                              <div>
                                {t('referral.dashboard.expires')}: {formatDate(referral.expires_at)}
                              </div>
                              {referral.referee_username && (
                                <div>
                                  {t('referral.dashboard.referee')}: {referral.referee_username}
                                </div>
                              )}
                              {referral.completed_at && (
                                <div>
                                  {t('referral.dashboard.completed')}: {formatDate(referral.completed_at)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-sm font-medium text-green-600">
                              +{referral.reward_days} {t('referral.dashboard.days')}
                            </div>
                            {referral.status === 'completed' && !referral.reward_claimed && (
                              <Button
                                size="sm"
                                onClick={() => handleClaimReward(referral.id)}
                                disabled={claiming === referral.id}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                {claiming === referral.id ? (
                                  <Icons.spinner className="h-4 w-4 animate-spin" />
                                ) : (
                                  t('referral.dashboard.claim')
                                )}
                              </Button>
                            )}
                            {referral.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleResendReferral(referral.referral_code)}
                                className="bg-[#0C8599] hover:bg-[#0A6D80] text-white"
                              >
                                <Icons.share className="h-4 w-4 mr-1" />
                                {t('referral.dashboard.resend')}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>{t('errors.generic_error_title')}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Share Modal for Resending */}
      <ShareModal
        isVisible={showShareModal}
        onClose={handleCloseShareModal}
        predefinedReferralCode={resendReferralCode || undefined}
      />
    </div>
  );
} 
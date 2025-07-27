'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import StatCard from '@/components/admin/StatCard';
import { AdminService, UserAnalytics, TranslationAnalytics, ReferralAnalytics } from '@/lib/admin-service';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  FileText, 
  Share2, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics | null>(null);
  const [translationAnalytics, setTranslationAnalytics] = useState<TranslationAnalytics | null>(null);
  const [referralAnalytics, setReferralAnalytics] = useState<ReferralAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [userData, translationData, referralData] = await Promise.all([
          AdminService.getUserAnalytics(),
          AdminService.getTranslationAnalytics(),
          AdminService.getReferralAnalytics(),
        ]);
        
        setUserAnalytics(userData);
        setTranslationAnalytics(translationData);
        setReferralAnalytics(referralData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Overview of your PPT translation platform
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* User Statistics */}
          <StatCard
            title="Total Users"
            value={userAnalytics?.total_users || 0}
            icon={Users}
            description="Registered users"
          />
          
          <StatCard
            title="New Users Today"
            value={userAnalytics?.new_users.today || 0}
            icon={TrendingUp}
            description="New registrations"
            variant="success"
          />

          {/* Translation Statistics */}
          <StatCard
            title="Total Translations"
            value={translationAnalytics?.total_translations || 0}
            icon={FileText}
            description="All time translations"
          />

          <StatCard
            title="Success Rate"
            value={`${translationAnalytics?.success_rate || 0}%`}
            icon={CheckCircle}
            description="Translation success"
            variant={translationAnalytics?.success_rate && translationAnalytics.success_rate > 90 ? 'success' : 'warning'}
          />
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Translation Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Translation Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Successful</span>
                </div>
                <span className="font-semibold">{translationAnalytics?.status_breakdown.successful || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Failed</span>
                </div>
                <span className="font-semibold">{translationAnalytics?.status_breakdown.failed || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">Processing</span>
                </div>
                <span className="font-semibold">{translationAnalytics?.status_breakdown.processing || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* User Membership */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Membership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Paid Users</span>
                <span className="font-semibold">{userAnalytics?.membership_status.paid || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Free Users</span>
                <span className="font-semibold">{userAnalytics?.membership_status.free || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Verified Email</span>
                <span className="font-semibold">{userAnalytics?.email_verification.verified || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Membership Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Membership Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Stripe Payment</span>
                </div>
                <span className="font-semibold">{userAnalytics?.membership_breakdown.stripe || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm">Invitation Code</span>
                </div>
                <span className="font-semibold">{userAnalytics?.membership_breakdown.invitation || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-sm">Referral Bonus</span>
                </div>
                <span className="font-semibold">{userAnalytics?.membership_breakdown.referral || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm">Bonus Days</span>
                </div>
                <span className="font-semibold">{userAnalytics?.membership_breakdown.bonus || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Referral Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Referral Program
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Referrals</span>
                <span className="font-semibold">{referralAnalytics?.total_referrals || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Completed</span>
                <span className="font-semibold">{referralAnalytics?.status_breakdown.completed || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Conversion Rate</span>
                <span className="font-semibold">{referralAnalytics?.conversion_rate || 0}%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Today's Activity</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>New Users:</span>
                    <span className="font-medium">{userAnalytics?.new_users.today || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Translations:</span>
                    <span className="font-medium">{translationAnalytics?.translations_by_period.today || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Referrals:</span>
                    <span className="font-medium">{referralAnalytics?.referrals_by_period.today || 0}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">This Week</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>New Users:</span>
                    <span className="font-medium">{userAnalytics?.new_users.this_week || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Translations:</span>
                    <span className="font-medium">{translationAnalytics?.translations_by_period.this_week || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Referrals:</span>
                    <span className="font-medium">{referralAnalytics?.referrals_by_period.this_week || 0}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Performance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Avg Processing Time:</span>
                    <span className="font-medium">{translationAnalytics?.performance.average_processing_time || 0}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Characters:</span>
                    <span className="font-medium">{translationAnalytics?.character_usage.average || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guest Translations:</span>
                    <span className="font-medium">{translationAnalytics?.guest_translations.today || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
} 
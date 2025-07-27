'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useToast } from '@/hooks/use-toast';
import { 
  Share2, 
  Search, 
  Filter,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDistanceToNow, format } from 'date-fns';
import { AdminService, Referral, ReferralsResponse } from '@/lib/admin-service';

export default function ReferralManagementPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [pagination, setPagination] = useState<ReferralsResponse['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    reward_claimed: 'all',
    page: 1,
    per_page: 20
  });
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const { toast } = useToast();

  const fetchReferrals = async () => {
    try {
      setIsLoading(true);
      const response = await AdminService.getReferrals(filters);
      setReferrals(response.referrals);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referrals',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleSort = (field: string) => {
    setSortConfig(prev => {
      if (prev?.field === field) {
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        return { field, direction: 'asc' };
      }
    });
  };

  const getSortIcon = (field: string) => {
    if (sortConfig?.field !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  const sortedReferrals = [...referrals].sort((a, b) => {
    if (!sortConfig) return 0;

    const { field, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;

    switch (field) {
      case 'referrer_username':
        return multiplier * a.referrer_username.localeCompare(b.referrer_username);
      case 'referee_email':
        const aEmail = a.referee_email || '';
        const bEmail = b.referee_email || '';
        return multiplier * aEmail.localeCompare(bEmail);
      case 'referral_code':
        return multiplier * a.referral_code.localeCompare(b.referral_code);
      case 'status':
        return multiplier * a.status.localeCompare(b.status);
      case 'created_at':
        return multiplier * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'completed_at':
        if (!a.completed_at && !b.completed_at) return 0;
        if (!a.completed_at) return 1;
        if (!b.completed_at) return -1;
        return multiplier * (new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
      case 'expires_at':
        return multiplier * (new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
      default:
        return 0;
    }
  });

  const handleViewDetails = (referral: Referral) => {
    setSelectedReferral(referral);
    setIsDetailModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRewardClaimedBadge = (claimed: boolean) => {
    return claimed ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
        <CheckCircle className="w-3 h-3 mr-1" />
        Claimed
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return 'Unknown';
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Referral Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track and manage referral relationships and rewards
            </p>
          </div>
          <Button onClick={fetchReferrals} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by email or code..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.reward_claimed} onValueChange={(value) => handleFilterChange('reward_claimed', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Reward Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rewards</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.per_page.toString()} onValueChange={(value) => handleFilterChange('per_page', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Per Page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
              
              {sortConfig && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSortConfig(null)}
                  className="w-full md:w-auto"
                >
                  Clear Sort
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Referrals Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Referrals
              {pagination && (
                <span className="text-sm font-normal text-gray-500">
                  ({pagination.total} total)
                </span>
              )}
              {sortConfig && (
                <span className="text-sm font-normal text-blue-600">
                  • Sorted by {sortConfig.field} ({sortConfig.direction})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : sortedReferrals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No referrals found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium">
                        <button 
                          onClick={() => handleSort('referrer_username')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Referrer
                          {getSortIcon('referrer_username')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        <button 
                          onClick={() => handleSort('referee_email')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Referee
                          {getSortIcon('referee_email')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        <button 
                          onClick={() => handleSort('referral_code')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Code
                          {getSortIcon('referral_code')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        <button 
                          onClick={() => handleSort('status')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Status
                          {getSortIcon('status')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-medium">Reward</th>
                      <th className="text-left py-3 px-4 font-medium">
                        <button 
                          onClick={() => handleSort('created_at')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Created
                          {getSortIcon('created_at')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        <button 
                          onClick={() => handleSort('expires_at')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Expires
                          {getSortIcon('expires_at')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedReferrals.map((referral) => (
                      <tr key={referral.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {referral.referrer_username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {referral.referrer_email}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {referral.referee_username || 'Not registered'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {referral.referee_email || 'No email'}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {referral.referral_code}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {getStatusBadge(referral.status)}
                            {isExpired(referral.expires_at) && (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                Expired
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getRewardClaimedBadge(referral.reward_claimed)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {formatDate(referral.created_at)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {formatDate(referral.expires_at)}
                        </td>
                        <td className="py-3 px-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewDetails(referral)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {referral.status === 'completed' && !referral.reward_claimed && (
                                <DropdownMenuItem>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark Reward Claimed
                                </DropdownMenuItem>
                              )}
                              {referral.status === 'pending' && (
                                <DropdownMenuItem>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Mark Expired
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.per_page) + 1} to{' '}
                  {Math.min(pagination.page * pagination.per_page, pagination.total)} of{' '}
                  {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.has_prev}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.has_next}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Referral Details
              </DialogTitle>
              <DialogDescription>
                Detailed information about this referral
              </DialogDescription>
            </DialogHeader>
            
            {selectedReferral && (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Referral ID</label>
                    <p className="text-sm">{selectedReferral.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Referral Code</label>
                    <p className="text-sm font-mono">{selectedReferral.referral_code}</p>
                  </div>
                </div>

                {/* Referrer Info */}
                <div>
                  <label className="text-sm font-medium text-gray-500">Referrer</label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Username:</span> {selectedReferral.referrer_username}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span> {selectedReferral.referrer_email}
                      </div>
                      <div>
                        <span className="font-medium">User ID:</span> {selectedReferral.referrer_user_id}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referee Info */}
                <div>
                  <label className="text-sm font-medium text-gray-500">Referee</label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Email:</span> {selectedReferral.referee_email || 'Not provided'}
                      </div>
                      <div>
                        <span className="font-medium">Username:</span> {selectedReferral.referee_username || 'Not registered'}
                      </div>
                      <div>
                        <span className="font-medium">User ID:</span> {selectedReferral.referee_user_id || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Info */}
                <div>
                  <label className="text-sm font-medium text-gray-500">Status Information</label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Status:</span>
                        <div className="mt-1">{getStatusBadge(selectedReferral.status)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Reward:</span>
                        <div className="mt-1">{getRewardClaimedBadge(selectedReferral.reward_claimed)}</div>
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {formatDateTime(selectedReferral.created_at)}
                      </div>
                      <div>
                        <span className="font-medium">Expires:</span> {formatDateTime(selectedReferral.expires_at)}
                      </div>
                      {selectedReferral.completed_at && (
                        <div>
                          <span className="font-medium">Completed:</span> {formatDateTime(selectedReferral.completed_at)}
                        </div>
                      )}
                      {isExpired(selectedReferral.expires_at) && (
                        <div className="col-span-2">
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                            This referral has expired
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
} 
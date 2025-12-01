'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Search, 
  Filter,
  MoreHorizontal,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Shield,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
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
import { AdminService, User as AdminUser, UsersResponse } from '@/lib/admin-service';

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<UsersResponse['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    membership_status: 'all',
    email_verified: 'all',
    admin_status: 'all',
    page: 1,
    per_page: 20
  });
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await AdminService.getUsers(filters);
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
        // If same field, toggle direction
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // If new field, default to ascending
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

  const sortedUsers = [...users].sort((a, b) => {
    if (!sortConfig) return 0;

    const { field, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;

    switch (field) {
      case 'username':
        return multiplier * a.username.localeCompare(b.username);
      case 'email':
        return multiplier * a.email.localeCompare(b.email);
      case 'translation_count':
        return multiplier * (a.translation_count - b.translation_count);
      case 'total_characters':
        return multiplier * (a.total_characters - b.total_characters);
      case 'created_at':
        // Sort by actual date values, not formatted strings
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return multiplier * (dateA - dateB);
      case 'last_login':
        // Sort by actual date values, handling nulls properly
        if (!a.last_login && !b.last_login) return 0;
        if (!a.last_login) return 1; // null values go to end
        if (!b.last_login) return -1; // null values go to end
        const loginA = new Date(a.last_login).getTime();
        const loginB = new Date(b.last_login).getTime();
        return multiplier * (loginA - loginB);
      case 'membership_end':
        // Sort by actual date values, handling nulls properly
        if (!a.membership_end && !b.membership_end) return 0;
        if (!a.membership_end) return 1; // null values go to end
        if (!b.membership_end) return -1; // null values go to end
        const endA = new Date(a.membership_end).getTime();
        const endB = new Date(b.membership_end).getTime();
        return multiplier * (endA - endB);
      case 'membership_status':
        return multiplier * a.membership_status.localeCompare(b.membership_status);
      default:
        return 0;
    }
  });

  const handleViewDetails = (user: AdminUser) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  const getMembershipBadge = (user: AdminUser) => {
    const { membership_status, membership_type } = user;
    
    switch (membership_status) {
      case 'paid':
        let badgeColor = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
        let badgeText = membership_type;
        
        // Different colors for different payment types
        if (membership_type === 'Stripe Payment') {
          badgeColor = "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
        } else if (membership_type === 'Invitation Code') {
          badgeColor = "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
        } else if (membership_type === 'Referral Bonus') {
          badgeColor = "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
        } else if (membership_type === 'Bonus Days') {
          badgeColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
        }
        
        return <Badge className={badgeColor}>{badgeText}</Badge>;
      case 'free':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">Free</Badge>;
      default:
        return <Badge variant="secondary">{membership_status}</Badge>;
    }
  };

  const getEmailVerificationBadge = (verified: boolean) => {
    return verified ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
        <Mail className="w-3 h-3 mr-1" />
        Verified
      </Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
        <Mail className="w-3 h-3 mr-1" />
        Unverified
      </Badge>
    );
  };

  const getAdminBadge = (isAdmin: boolean) => {
    return isAdmin ? (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
        <Shield className="w-3 h-3 mr-1" />
        Admin
      </Badge>
    ) : null;
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage users, view their activity, and control access
            </p>
          </div>
          <Button onClick={fetchUsers} disabled={isLoading}>
            <Users className="w-4 h-4 mr-2" />
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
                  placeholder="Search by username or email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filters.membership_status} onValueChange={(value) => handleFilterChange('membership_status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Membership" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Memberships</SelectItem>
                  <SelectItem value="paid">All Paid</SelectItem>
                  <SelectItem value="stripe">Stripe Payment</SelectItem>
                  <SelectItem value="invitation">Invitation Code</SelectItem>
                  <SelectItem value="referral">Referral Bonus</SelectItem>
                  <SelectItem value="bonus">Bonus Days</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.email_verified} onValueChange={(value) => handleFilterChange('email_verified', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Email Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Email Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
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

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
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
            ) : sortedUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium">
                        <button 
                          onClick={() => handleSort('username')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          User
                          {getSortIcon('username')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">
                        <button 
                          onClick={() => handleSort('membership_status')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Membership
                          {getSortIcon('membership_status')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        <button 
                          onClick={() => handleSort('membership_end')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Membership End
                          {getSortIcon('membership_end')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        <button 
                          onClick={() => handleSort('translation_count')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Translations
                          {getSortIcon('translation_count')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        <button 
                          onClick={() => handleSort('total_characters')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Characters
                          {getSortIcon('total_characters')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        <button 
                          onClick={() => handleSort('created_at')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Joined
                          {getSortIcon('created_at')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        <button 
                          onClick={() => handleSort('last_login')}
                          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                        >
                          Last Login
                          {getSortIcon('last_login')}
                        </button>
                      </th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {user.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {getEmailVerificationBadge(user.is_email_verified)}
                            {getAdminBadge(user.is_admin)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getMembershipBadge(user)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {user.membership_end ? formatDate(user.membership_end) : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {user.translation_count}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {user.total_characters.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {user.last_login ? formatDate(user.last_login) : 'Never'}
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
                              <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <UserX className="mr-2 h-4 w-4" />
                                Suspend
                              </DropdownMenuItem>
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

        {/* User Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Details
            </DialogTitle>
              <DialogDescription>
                Detailed information about this user
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Username</label>
                    <p className="text-sm">{selectedUser.username}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">User ID</label>
                    <p className="text-sm">{selectedUser.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {getEmailVerificationBadge(selectedUser.is_email_verified)}
                      {getAdminBadge(selectedUser.is_admin)}
                      {getMembershipBadge(selectedUser)}
                    </div>
                  </div>
                </div>

                {/* Activity Info */}
                <div>
                  <label className="text-sm font-medium text-gray-500">Activity</label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Translations:</span> {selectedUser.translation_count}
                      </div>
                      <div>
                        <span className="font-medium">Total Characters:</span> {selectedUser.total_characters.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Joined:</span> {formatDateTime(selectedUser.created_at)}
                      </div>
                      <div>
                        <span className="font-medium">Last Login:</span> {selectedUser.last_login ? formatDateTime(selectedUser.last_login) : 'Never'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Membership Details */}
                <div>
                  <label className="text-sm font-medium text-gray-500">Membership Details</label>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Type:</span> {selectedUser.membership_type}
                      </div>
                      {selectedUser.membership_end && (
                        <div>
                          <span className="font-medium">Membership End:</span> {formatDateTime(selectedUser.membership_end)}
                        </div>
                      )}
                      {selectedUser.stripe_customer_id && (
                        <div>
                          <span className="font-medium">Stripe Customer ID:</span> {selectedUser.stripe_customer_id}
                        </div>
                      )}
                      {selectedUser.bonus_membership_days > 0 && (
                        <div>
                          <span className="font-medium">Bonus Days:</span> {selectedUser.bonus_membership_days} days
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="font-medium">Sources:</span> {selectedUser.membership_sources.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Info */}
                {(selectedUser.invitation_code || selectedUser.referred_by_code) && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Referral Information</label>
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      {selectedUser.invitation_code && (
                        <div className="text-sm">
                          <span className="font-medium">Invitation Code:</span> {selectedUser.invitation_code}
                        </div>
                      )}
                      {selectedUser.referred_by_code && (
                        <div className="text-sm">
                          <span className="font-medium">Referred By:</span> {selectedUser.referred_by_code}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminService, TranslationLog, TranslationLogsResponse } from '@/lib/admin-service';
import { useToast } from '@/hooks/use-toast';
import { 
  FileText, 
  Search, 
  Filter,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  User,
  Download
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDistanceToNow, format } from 'date-fns';

export default function TranslationHistoryPage() {
  const [logs, setLogs] = useState<TranslationLog[]>([]);
  const [pagination, setPagination] = useState<TranslationLogsResponse['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<TranslationLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    page: 1,
    per_page: 20
  });
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const apiFilters = {
        ...filters,
        status: filters.status === 'all' ? undefined : filters.status
      };
      const response = await AdminService.getTranslationLogs(apiFilters);
      setLogs(response.logs);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching translation logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load translation logs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
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

  const handleViewDetails = async (log: TranslationLog) => {
    try {
      const detailedLog = await AdminService.getTranslationLogDetail(log.id);
      setSelectedLog(detailedLog);
      setIsDetailModalOpen(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load translation details',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Success
        </Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
          <Clock className="w-3 h-3 mr-1" />
          Processing
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Translation History</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View and manage translation logs with detailed error information
            </p>
          </div>
          <Button onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by filename..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.per_page.toString()} 
                onValueChange={(value) => handleFilterChange('per_page', value)}
              >
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
            </div>
          </CardContent>
        </Card>

        {/* Translation Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Translation Logs
              {pagination && (
                <span className="text-sm font-normal text-gray-500">
                  ({pagination.total} total)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No translation logs found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium">File</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Languages</th>
                      <th className="text-left py-3 px-4 font-medium">User</th>
                      <th className="text-left py-3 px-4 font-medium">Characters</th>
                      <th className="text-left py-3 px-4 font-medium">Processing Time</th>
                      <th className="text-left py-3 px-4 font-medium">Created</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {log.filename}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(log.status)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {log.source_language} → {log.target_language}
                        </td>
                        <td className="py-3 px-4">
                          {log.user ? (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{log.user.username}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Guest</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {log.character_count.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {log.processing_time ? `${log.processing_time.toFixed(2)}s` : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Details
                          </Button>
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

        {/* Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Translation Details
              </DialogTitle>
              <DialogDescription>
                Detailed information about this translation
              </DialogDescription>
            </DialogHeader>
            
            {selectedLog && (
              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Filename</label>
                    <p className="text-sm">{selectedLog.filename}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Languages</label>
                    <p className="text-sm">{selectedLog.source_language} → {selectedLog.target_language}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Characters</label>
                    <p className="text-sm">{selectedLog.character_count.toLocaleString()}</p>
                  </div>
                </div>

                {/* User Info */}
                <div>
                  <label className="text-sm font-medium text-gray-500">User</label>
                  {selectedLog.user ? (
                    <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <p className="text-sm"><strong>Username:</strong> {selectedLog.user.username}</p>
                      <p className="text-sm"><strong>Email:</strong> {selectedLog.user.email}</p>
                      <p className="text-sm"><strong>User ID:</strong> {selectedLog.user.id}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">Guest user</p>
                  )}
                </div>

                {/* Timing Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="text-sm">{formatDateTime(selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Processing Time</label>
                    <p className="text-sm">
                      {selectedLog.processing_time ? `${selectedLog.processing_time.toFixed(2)}s` : 'N/A'}
                    </p>
                  </div>
                  {selectedLog.started_at && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Started</label>
                      <p className="text-sm">{formatDateTime(selectedLog.started_at)}</p>
                    </div>
                  )}
                  {selectedLog.completed_at && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Completed</label>
                      <p className="text-sm">{formatDateTime(selectedLog.completed_at)}</p>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {selectedLog.error_message && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Error Message</label>
                    <div className="mt-1 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                      <pre className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">
                        {selectedLog.error_message}
                      </pre>
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
'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminService, OrdersResponse, Order } from '@/lib/admin-service';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Filter, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function OrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<OrdersResponse['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    payment_method: 'all',
    plan_type: 'all',
    page: 1,
    per_page: 20,
  });

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const data = await AdminService.getOrders(filters);
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => setFilters((prev) => ({ ...prev, page }));

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return dateString;
    }
  };

  const openDetail = async (orderId: number) => {
    try {
      setSelectedOrder(null);
      setIsDetailOpen(true);
      const data = await AdminService.getOrderDetail(orderId);
      setSelectedOrder(data);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to load order detail', variant: 'destructive' });
    }
  };

  const statusBadge = (status: Order['status']) => {
    const common = 'px-2 py-0.5 rounded text-xs';
    switch (status) {
      case 'success':
        return <Badge className={`${common} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`}>Success</Badge>;
      case 'failed':
        return <Badge className={`${common} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`}>Failed</Badge>;
      case 'cancelled':
        return <Badge className={`${common} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`}>Cancelled</Badge>;
      default:
        return <Badge className={`${common} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`}>Pending</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">View and manage payment transactions</p>
          </div>
          <Button onClick={fetchOrders} disabled={isLoading}>
            <CreditCard className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search order/transaction id..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.payment_method} onValueChange={(v) => handleFilterChange('payment_method', v)}>
                <SelectTrigger><SelectValue placeholder="Payment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="alipay">Alipay</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.plan_type} onValueChange={(v) => handleFilterChange('plan_type', v)}>
                <SelectTrigger><SelectValue placeholder="Plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.per_page.toString()} onValueChange={(v) => handleFilterChange('per_page', v)}>
                <SelectTrigger><SelectValue placeholder="Per Page" /></SelectTrigger>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Orders {pagination && (
                <span className="text-sm font-normal text-gray-500">({pagination.total} total)</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No orders found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium">Order</th>
                      <th className="text-left py-3 px-4 font-medium">User</th>
                      <th className="text-left py-3 px-4 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 font-medium">Plan</th>
                      <th className="text-left py-3 px-4 font-medium">Payment</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Created</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="py-3 px-4">
                          <div className="text-sm font-medium">{o.order_number}</div>
                          <div className="text-xs text-gray-500">{o.transaction_id || '—'}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {o.user ? `${o.user.username} (${o.user.email})` : 'Guest/Unknown'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {o.amount.toFixed(2)} {o.currency?.toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 capitalize">{o.plan_type}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300 capitalize">{o.payment_method}</td>
                        <td className="py-3 px-4">{statusBadge(o.status)}</td>
                        <td className="py-3 px-4 text-sm text-gray-500">{formatDateTime(o.created_at)}</td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(o.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.per_page) + 1} to {Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page - 1)} disabled={!pagination.has_prev}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.page + 1)} disabled={!pagination.has_next}>Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Order Detail
              </DialogTitle>
              <DialogDescription>Full information about this transaction</DialogDescription>
            </DialogHeader>

            {!selectedOrder ? (
              <div className="flex items-center justify-center h-24">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-500">Order Number</div>
                    <div className="font-medium">{selectedOrder.order_number}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Status</div>
                    <div>{statusBadge(selectedOrder.status)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Amount</div>
                    <div className="font-medium">{selectedOrder.amount.toFixed(2)} {selectedOrder.currency?.toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Plan</div>
                    <div className="capitalize">{selectedOrder.plan_type}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Payment</div>
                    <div className="capitalize">{selectedOrder.payment_method}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Transaction ID</div>
                    <div className="font-mono text-xs break-all">{selectedOrder.transaction_id || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">User</div>
                    <div>{selectedOrder.user ? `${selectedOrder.user.username} (${selectedOrder.user.email})` : 'Guest/Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Created</div>
                    <div>{formatDateTime(selectedOrder.created_at)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Processed</div>
                    <div>{formatDateTime(selectedOrder.processed_at)}</div>
                  </div>
                </div>

                {selectedOrder.error_message && (
                  <div>
                    <div className="text-gray-500">Error</div>
                    <div className="text-red-600 dark:text-red-400 whitespace-pre-wrap">{selectedOrder.error_message}</div>
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



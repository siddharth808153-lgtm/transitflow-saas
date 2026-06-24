// src/pages/dashboard/SuperAdminDashboard.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  UserCheck, 
  Bus, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Eye,
  Search,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Activity,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import api from '@/api/axios';
import { SUPER_ADMIN } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tag from '@/components/ui/Tag';
import Drawer from '@/components/ui/Drawer';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const SuperAdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAdminId, setSelectedAdminId] = useState<number | string | null>(null);
  const [adminToToggle, setAdminToToggle] = useState<{ id: number | string, name: string, active: boolean } | null>(null);

  // 1. Platform Statistics
  const { data: statsResponse, isLoading: isLoadingStats } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      const res = await api.get(SUPER_ADMIN.STATS);
      return res.data;
    },
  });

  // 2. 12-Month Revenue Trend
  const { data: trendResponse, isLoading: isLoadingTrend } = useQuery({
    queryKey: ['super-admin-revenue-trend'],
    queryFn: async () => {
      const res = await api.get(SUPER_ADMIN.REVENUE_TREND);
      return res.data;
    },
  });

  // 3. Paginated Admins List
  const { data: adminsResponse, isLoading: isLoadingAdmins } = useQuery({
    queryKey: ['super-admin-admins', searchTerm, currentPage],
    queryFn: async () => {
      const params: any = { page: currentPage };
      if (searchTerm) params.search = searchTerm;
      const res = await api.get(SUPER_ADMIN.ADMINS_LIST, { params });
      return res.data;
    },
  });

  // 4. Admin Detail (for Drawer inspection)
  const { data: adminDetailResponse, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['super-admin-admin-detail', selectedAdminId],
    queryFn: async () => {
      const res = await api.get(SUPER_ADMIN.ADMIN_DETAIL(selectedAdminId!));
      return res.data;
    },
    enabled: selectedAdminId !== null,
  });

  // 5. Admin Revenue Trend (last 6 months, for Drawer chart)
  const { data: adminTrendResponse, isLoading: isLoadingAdminTrend } = useQuery({
    queryKey: ['super-admin-admin-trend', selectedAdminId],
    queryFn: async () => {
      const res = await api.get(SUPER_ADMIN.ADMIN_REVENUE_TREND(selectedAdminId!));
      return res.data;
    },
    enabled: selectedAdminId !== null,
  });

  // Toggle Admin Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (id: number | string) => {
      const res = await api.patch(SUPER_ADMIN.TOGGLE_STATUS(id));
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-admins'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-stats'] });
      if (selectedAdminId) {
        queryClient.invalidateQueries({ queryKey: ['super-admin-admin-detail', selectedAdminId] });
      }
      toast.push(
        <Notification type="success" title="Success">
          {res?.message || 'Admin status toggled successfully.'}
        </Notification>
      );
      setAdminToToggle(null);
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to update admin status.'}
        </Notification>
      );
    },
  });

  const stats = statsResponse?.data || {
    total_admins: 0,
    active_admins: 0,
    total_vehicles: 0,
    total_drivers: 0,
    total_students: 0,
    total_passengers: 0,
    total_revenue_this_month: 0,
    total_revenue_last_month: 0,
    total_pending_dues: 0,
    whatsapp_connected_admins: 0,
    platform_collection_rate: 0,
  };

  const trendData = trendResponse?.data || [];
  const adminsData = adminsResponse?.data || {};
  const adminsList = adminsData.admins || [];
  const totalAdminsCount = adminsData.pagination?.total || 0;
  const perPage = adminsData.pagination?.per_page || 15;

  const adminDetail = adminDetailResponse?.data || {};
  const adminDetailInfo = adminDetail.admin || {};
  const adminVehicles = adminDetail.vehicles || [];
  const adminDetailCounts = adminDetail.counts || { drivers: 0, students: 0, passengers: 0 };
  const adminRecentTx = adminDetail.recent_transactions || [];
  const adminTrendData = adminTrendResponse?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Dashboard"
        breadcrumbs={[{ label: 'Platform Overview' }]}
      />

      {/* Section 1 — Platform Stats Row (6 StatCards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
        <StatCard
          title="Total Admins"
          value={isLoadingStats ? '...' : stats.total_admins}
          icon={<Users className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Active Admins"
          value={isLoadingStats ? '...' : stats.active_admins}
          icon={<UserCheck className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Total Vehicles"
          value={isLoadingStats ? '...' : stats.total_vehicles}
          icon={<Bus className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Revenue This Month"
          value={isLoadingStats ? '...' : `₹${Number(stats.total_revenue_this_month).toLocaleString()}`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Pending Dues"
          value={isLoadingStats ? '...' : `₹${Number(stats.total_pending_dues).toLocaleString()}`}
          icon={<AlertCircle className="w-6 h-6" />}
          color="red"
        />
        <StatCard
          title="Collection Rate"
          value={isLoadingStats ? '...' : `${stats.platform_collection_rate}%`}
          icon={<ArrowUpRight className="w-6 h-6" />}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Section 2 — Revenue Trend Chart (2/3 width) */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-5">
                Platform Revenue — Last 12 Months
              </h4>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: '12px', fill: '#64748b' }} />
                    <YAxis tickLine={false} axisLine={false} style={{ fontSize: '12px', fill: '#64748b' }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `₹${value.toLocaleString()}`, 
                        'Revenue',
                        `Transactions: ${props.payload.transactions}`
                      ]}
                      contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>

        {/* Dynamic Extra Platform stats (1/3 width) */}
        <div className="lg:col-span-1">
          <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-full">
            <div className="p-6 flex flex-col justify-between h-full">
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-5">
                  Platform Operations
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Users className="w-5 h-5"/></div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">Connected WhatsApp Admins</p>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{stats.whatsapp_connected_admins}</h4>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Bus className="w-5 h-5"/></div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold uppercase">Total Platform Fleet Size</p>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{stats.total_vehicles}</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 mt-6">
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
                  📢 <strong>Platform Alert:</strong> {stats.total_admins - stats.active_admins} administrators currently set as inactive. Deactivated owners cannot authenticate into their accounts.
                </p>
              </div>
            </div>
          </Card>
        </div>

      </div>

      {/* Section 3 — Admins Table */}
      <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Platform Fleet Administrators
            </h4>
            <div className="relative max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <Input
                placeholder="Search admins by details..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Admin Name / Business</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Phone</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Vehicles</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Students</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Revenue (Month)</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Pending Dues</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">WhatsApp</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Status</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoadingAdmins ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        Loading administrators...
                      </div>
                    </td>
                  </tr>
                ) : adminsList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                      No admin owners registered yet.
                    </td>
                  </tr>
                ) : (
                  adminsList.map((admin: any) => (
                    <tr key={admin.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-sm">
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        <div>{admin.name}</div>
                        <div className="text-xs text-slate-400 font-normal mt-0.5">{admin.admin_settings?.business_name || 'N/A'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{admin.phone}</td>
                      <td className="py-3.5 px-4">
                        <Tag className="bg-slate-100 text-slate-700 border border-slate-200 font-bold px-2 py-0.5 text-xs">
                          {admin.vehicles_count}
                        </Tag>
                      </td>
                      <td className="py-3.5 px-4">
                        <Tag className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 text-xs">
                          {admin.students_count}
                        </Tag>
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 font-semibold">
                        ₹{Number(admin.revenue_this_month).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {admin.pending_dues > 0 ? (
                          <span className="text-rose-600 font-semibold">₹{Number(admin.pending_dues).toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {admin.admin_settings?.whatsapp_sender_phone ? (
                          <Tag className="bg-emerald-50 text-emerald-700 border-emerald-250 font-bold text-xs">
                            Active
                          </Tag>
                        ) : (
                          <Tag className="bg-slate-100 text-slate-500 border-slate-200 text-xs">
                            Not Set
                          </Tag>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Tag 
                          className={admin.is_active 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs' 
                            : 'bg-rose-50 text-rose-700 border-rose-200 font-bold text-xs'
                          }
                        >
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </Tag>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            size="xs" 
                            variant="default"
                            className="hover:text-blue-600 rounded-lg py-1 px-2.5"
                            onClick={() => setSelectedAdminId(admin.id)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                          <Button 
                            size="xs" 
                            variant="default"
                            className={admin.is_active 
                              ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg py-1 px-2.5' 
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg py-1 px-2.5'
                            }
                            onClick={() => setAdminToToggle({ id: admin.id, name: admin.name, active: admin.is_active })}
                          >
                            {admin.is_active ? 'Suspend' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination */}
          {totalAdminsCount > perPage && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing {adminsList.length} of {totalAdminsCount} admins
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="rounded-lg"
                >
                  Previous
                </Button>
                <Button 
                  size="sm" 
                  disabled={adminsList.length < perPage}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="rounded-lg"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Section 4 — AdminDetailSheet */}
      <Drawer
        isOpen={selectedAdminId !== null}
        onClose={() => setSelectedAdminId(null)}
        title="Fleet Owner Dashboard Detail"
        width={600}
      >
        {isLoadingDetail ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-slate-400">Loading details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header info */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{adminDetailInfo.name}</h3>
              <p className="text-slate-500 text-sm mt-0.5">{adminDetailInfo.admin_settings?.business_name || 'Individual Operator'}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Phone</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {adminDetailInfo.phone}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Email</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {adminDetailInfo.email || 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Registration</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(adminDetailInfo.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Platform metrics mini cards */}
            <div className="grid grid-cols-4 gap-3 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-center">
                <span className="text-xs text-slate-500 font-medium">Vehicles</span>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">{adminVehicles.length}</h4>
              </div>
              <div className="text-center border-l border-slate-200/50 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-medium">Drivers</span>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">{adminDetailCounts.drivers}</h4>
              </div>
              <div className="text-center border-l border-slate-200/50 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-medium">Students</span>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">{adminDetailCounts.students}</h4>
              </div>
              <div className="text-center border-l border-slate-200/50 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-medium">Passengers</span>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">{adminDetailCounts.passengers}</h4>
              </div>
            </div>

            {/* Last 6 Months Revenue bar chart */}
            <div>
              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
                Admin Revenue Trend — Last 6 Months
              </h5>
              <div className="h-48 w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={adminTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#94a3b8' }} />
                    <YAxis tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: '#94a3b8' }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip 
                      formatter={(v) => v !== undefined ? [`₹${v.toLocaleString()}`, 'Revenue'] : ['', 'Revenue']}
                      contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '12px' }}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Vehicles Details list */}
            <div>
              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
                Fitted Vehicles ({adminVehicles.length})
              </h5>
              <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-150">
                {adminVehicles.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3">No vehicles added.</p>
                ) : (
                  adminVehicles.map((veh: any) => {
                    const activeDriverName = veh.driver_assignments?.[0]?.driver?.name;
                    return (
                      <div key={veh.id} className="flex justify-between items-center p-3 hover:bg-slate-50/50">
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{veh.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Driver: {activeDriverName ? <strong className="text-slate-600 font-semibold">{activeDriverName}</strong> : <span className="italic">Unassigned</span>}
                          </p>
                        </div>
                        <Tag 
                          className={veh.type === 'bus' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200 text-[10px]' 
                            : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                          }
                        >
                          <span className="capitalize">{veh.type}</span>
                        </Tag>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent Payments logs */}
            <div>
              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
                Recent Admin Payments
              </h5>
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs">
                      <th className="py-2.5 px-3 font-semibold text-slate-500">Recipient</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-500">Route</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-500">Amount</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-500">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs">
                    {adminRecentTx.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400 italic">No payments logged yet.</td>
                      </tr>
                    ) : (
                      adminRecentTx.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">{tx.person_name}</td>
                          <td className="py-2.5 px-3 text-slate-400">{tx.vehicle_name || '-'}</td>
                          <td className="py-2.5 px-3 text-emerald-600 font-bold">₹{tx.amount}</td>
                          <td className="py-2.5 px-3 capitalize text-slate-500">{tx.payment_method}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions button */}
            <div className="pt-4 border-t border-slate-150">
              <Button
                variant="solid"
                className={adminDetailInfo.is_active 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white w-full rounded-xl py-2.5 flex items-center justify-center gap-2'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white w-full rounded-xl py-2.5 flex items-center justify-center gap-2'
                }
                onClick={() => {
                  setAdminToToggle({
                    id: adminDetailInfo.id,
                    name: adminDetailInfo.name,
                    active: adminDetailInfo.is_active
                  });
                }}
              >
                {adminDetailInfo.is_active ? 'Deactivate Admin' : 'Activate Admin'}
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        open={adminToToggle !== null}
        title={adminToToggle?.active ? 'Deactivate Owner?' : 'Activate Owner?'}
        description={adminToToggle?.active
          ? `Are you sure you want to deactivate ${adminToToggle?.name}? This will block their login and revoke all active sessions.`
          : `Activate owner ${adminToToggle?.name}? This will restore access to their dashboard.`
        }
        confirmLabel={adminToToggle?.active ? 'Deactivate' : 'Activate'}
        dangerous={adminToToggle?.active}
        onConfirm={() => {
          if (adminToToggle) toggleStatusMutation.mutate(adminToToggle.id);
        }}
        onCancel={() => setAdminToToggle(null)}
      />
    </div>
  );
};

export default SuperAdminDashboard;

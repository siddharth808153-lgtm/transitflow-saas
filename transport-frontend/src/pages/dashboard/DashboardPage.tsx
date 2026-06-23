// src/pages/dashboard/DashboardPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { 
  Bus, 
  Car, 
  UserCheck, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck,
  Plus,
  AlertCircle,
  DollarSign,
  Receipt,
  FileText,
  Calendar
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
import { DUES, TRANSACTIONS } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import useAuthStore from '@/store/authStore';

const chartData = [
  { name: 'Jan', revenue: 4000, trips: 240 },
  { name: 'Feb', revenue: 3000, trips: 198 },
  { name: 'Mar', revenue: 5000, trips: 310 },
  { name: 'Apr', revenue: 4780, trips: 280 },
  { name: 'May', revenue: 6890, trips: 390 },
  { name: 'Jun', revenue: 8390, trips: 480 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Fetch real summary data from GET /dues/summary
  const { data: summaryResponse, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['dues-summary-dashboard'],
    queryFn: async () => {
      const res = await api.get(DUES.SUMMARY);
      return res.data;
    },
  });

  // Fetch recent transactions (last 10)
  const { data: txResponse, isLoading: isLoadingTx } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const res = await api.get(TRANSACTIONS.LIST, { params: { page: 1 } });
      return res.data;
    },
  });

  const summary = summaryResponse?.data || {
    total_collected_this_month: 0,
    total_pending_this_month: 0,
    total_overdue: 0,
    student_dues_pending: 0,
    passenger_dues_pending: 0,
    collection_rate: 0,
  };

  const transactionsList = (txResponse?.data?.transactions || []).slice(0, 10);
  const pendingDuesCount = Number(summary.student_dues_pending || 0) + Number(summary.passenger_dues_pending || 0);

  const getTxTypeBadge = (type: string) => {
    switch (type) {
      case 'student_fee':
        return <Tag className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">Student Fee</Tag>;
      case 'auto_daily':
        return <Tag className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">Auto Daily</Tag>;
      case 'driver_wage':
        return <Tag className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">Driver Wage</Tag>;
      default:
        return <Tag className="bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold">Other</Tag>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold tracking-wide backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            System Online
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Hello, {user?.name || 'Administrator'}!
          </h1>
          <p className="text-blue-100 text-sm max-w-md">
            Welcome back to your Transport Management Dashboard. Here is the financial and operational summary for this month.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            className="bg-white hover:bg-slate-50 text-blue-600 rounded-xl font-bold text-xs px-4 py-2.5 shadow-sm"
            onClick={() => navigate('/vehicles/new')}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Vehicle
          </Button>
          <Button 
            className="bg-blue-500/20 border border-white/10 hover:bg-blue-500/30 text-white rounded-xl font-bold text-xs px-4 py-2.5"
            onClick={() => navigate('/drivers/new')}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Driver
          </Button>
        </div>
      </div>

      {/* Pending Dues Alert Banner */}
      {pendingDuesCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-semibold">
              You have {pendingDuesCount} pending dues this month.
            </span>
          </div>
          <Button
            size="sm"
            variant="default"
            className="text-amber-800 hover:bg-amber-100 border border-amber-200 bg-white shadow-sm"
            onClick={() => navigate('/dues')}
          >
            View Dues
          </Button>
        </div>
      )}

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Collected This Month"
          value={isLoadingSummary ? '...' : `₹${Number(summary.total_collected_this_month).toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Pending This Month"
          value={isLoadingSummary ? '...' : `₹${Number(summary.total_pending_this_month).toFixed(2)}`}
          icon={<AlertCircle className="w-6 h-6" />}
          color="red"
        />
        <StatCard
          title="Overdue (Previous Months)"
          value={isLoadingSummary ? '...' : `₹${Number(summary.total_overdue).toFixed(2)}`}
          icon={<Calendar className="w-6 h-6" />}
          color="orange"
        />
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Collection Rate</span>
            <span className="text-xl font-black text-slate-800 dark:text-white">
              {isLoadingSummary ? '...' : `${summary.collection_rate}%`}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${summary.collection_rate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Revenue Performance</h3>
              <p className="text-xs text-slate-400">Monthly overview of fares and rental collections</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
              +18.4%
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Side Chart (Trips) */}
        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Completed Trips</h3>
            <p className="text-xs text-slate-400">Total transits dispatched per month</p>
          </div>
          <div className="h-56 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="trips" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Transactions & Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions List */}
        <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recent Transactions</h3>
              <p className="text-xs text-slate-400 mt-0.5">Latest collections logged in the system</p>
            </div>
            <Button
              size="xs"
              variant="default"
              className="text-blue-600 hover:bg-blue-50"
              onClick={() => navigate('/transactions')}
            >
              View All
            </Button>
          </div>
          <div className="overflow-x-auto">
            {isLoadingTx ? (
              <div className="text-center py-6 text-sm text-slate-400">Loading transactions...</div>
            ) : transactionsList.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-400">No transactions recorded yet.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 font-bold">Type</th>
                    <th className="py-2.5 font-bold">Period</th>
                    <th className="py-2.5 font-bold">Amount</th>
                    <th className="py-2.5 font-bold">Method</th>
                    <th className="py-2.5 font-bold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {transactionsList.map((tx: any) => (
                    <tr key={tx.id} className="text-slate-700 hover:bg-slate-50/50">
                      <td className="py-3">{getTxTypeBadge(tx.transaction_type)}</td>
                      <td className="py-3 text-slate-600">
                        {tx.payment_for_month
                          ? new Date(tx.payment_for_month).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                          : tx.payment_for_date
                          ? new Date(tx.payment_for_date).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="py-3 font-bold text-emerald-600">₹{Number(tx.amount).toFixed(2)}</td>
                      <td className="py-3 uppercase text-[10px] font-bold text-slate-500">{tx.payment_method}</td>
                      <td className="py-3 text-slate-400">{new Date(tx.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Quick Shortcuts & System status */}
        <div className="space-y-6">
          <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white p-6 shadow-sm">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Quick Shortcuts</h3>
              <p className="text-xs text-slate-400 mt-0.5">Frequent actions and operations</p>
            </div>
            <div className="mt-4 space-y-2">
              <button 
                onClick={() => navigate('/transactions')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 text-slate-700 text-sm font-semibold transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-500" />
                  View Transactions Log
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>
              <button 
                onClick={() => navigate('/dues')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 text-slate-700 text-sm font-semibold transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  Dues & Collections
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>
            </div>
          </Card>

          <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white p-6 shadow-sm">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">System Operations</h3>
              <p className="text-xs text-slate-400 mt-0.5">Overview of database settings and integrations</p>
            </div>
            <div className="mt-4 text-xs text-slate-500 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex justify-between">
                <span>Sanctum Authentication:</span>
                <span className="font-semibold text-emerald-600">Connected</span>
              </div>
              <div className="flex justify-between">
                <span>Baileys WhatsApp Gateway:</span>
                <span className="font-semibold text-slate-600">Initialized (Mock)</span>
              </div>
              <div className="flex justify-between">
                <span>Database Engine:</span>
                <span className="font-semibold text-slate-600">MySQL</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

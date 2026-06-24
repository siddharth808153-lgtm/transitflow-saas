// src/pages/dashboard/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { 
  Bus, 
  UserCheck, 
  GraduationCap, 
  Users, 
  TrendingUp, 
  AlertCircle,
  Clock,
  Plus,
  FileText,
  DollarSign,
  Info,
  Calendar,
  MessageSquare,
  Search,
  Check
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import api from '@/api/axios';
import { ADMIN_DASHBOARD, TRANSACTIONS, VEHICLES, STUDENTS, PASSENGERS, WHATSAPP, DUES } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tag from '@/components/ui/Tag';
import Dialog from '@/components/ui/Dialog';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import useAuthStore from '@/store/authStore';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [currentGreeting, setCurrentGreeting] = useState('');

  // Quick Payment Modal states
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payType, setPayType] = useState<'student_fee' | 'auto_daily'>('student_fee');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReference, setSelectedReference] = useState<any>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'upi' | 'bank' | 'other'>('cash');
  const [payMonth, setPayMonth] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [recordAnother, setRecordAnother] = useState(false);

  // Compute greeting based on time of day
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr < 12) setCurrentGreeting('Good morning');
    else if (hr < 17) setCurrentGreeting('Good afternoon');
    else setCurrentGreeting('Good evening');
  }, []);

  // 1. Dashboard summary counters & finance/fleet stats
  const { data: summaryResponse, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['admin-summary'],
    queryFn: async () => {
      const res = await api.get(ADMIN_DASHBOARD.SUMMARY);
      return res.data;
    },
  });

  // 2. WhatsApp connect status for indicator pill
  const { data: whatsappStatusResponse } = useQuery({
    queryKey: ['admin-whatsapp-status'],
    queryFn: async () => {
      const res = await api.get(WHATSAPP.STATUS);
      return res.data;
    },
  });

  // 3. Pending Dues (Top 10 student & passenger)
  const { data: pendingDuesResponse, isLoading: isLoadingPending } = useQuery({
    queryKey: ['admin-pending-dues'],
    queryFn: async () => {
      const res = await api.get(ADMIN_DASHBOARD.PENDING_DUES);
      return res.data;
    },
  });

  // 4. Monthly Revenue (6 months trend split)
  const { data: monthlyRevenueResponse } = useQuery({
    queryKey: ['admin-monthly-revenue'],
    queryFn: async () => {
      const res = await api.get(ADMIN_DASHBOARD.MONTHLY_REVENUE);
      return res.data;
    },
  });

  // 5. Vehicle Performance (Outstanding dues)
  const { data: vehiclePerformanceResponse, isLoading: isLoadingPerformance } = useQuery({
    queryKey: ['admin-vehicle-performance'],
    queryFn: async () => {
      const res = await api.get(ADMIN_DASHBOARD.VEHICLE_PERFORMANCE);
      return res.data;
    },
  });

  // 6. Recent Transactions (Last 15)
  const { data: recentTxResponse, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['admin-recent-transactions'],
    queryFn: async () => {
      const res = await api.get(ADMIN_DASHBOARD.RECENT_TRANSACTIONS);
      return res.data;
    },
  });

  // Search reference list (Students or Passengers) for Quick Pay Modal
  const { data: studentsResponse } = useQuery({
    queryKey: ['quickpay-students-list'],
    queryFn: async () => {
      const res = await api.get(STUDENTS.LIST);
      return res.data;
    },
    enabled: isPayModalOpen && payType === 'student_fee',
  });

  const { data: passengersResponse } = useQuery({
    queryKey: ['quickpay-passengers-list'],
    queryFn: async () => {
      const res = await api.get(PASSENGERS.LIST);
      return res.data;
    },
    enabled: isPayModalOpen && payType === 'auto_daily',
  });

  // Mark as Paid direct Due mutation (from alert panel)
  const markPaidMutation = useMutation({
    mutationFn: async (dueId: number | string) => {
      const res = await api.post(DUES.MARK_PAID(dueId), {
        payment_method: 'cash', // Default to cash for quick button
        notes: 'Quick collected via dashboard panel'
      });
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-dues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin-recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-vehicle-performance'] });
      toast.push(
        <Notification type="success" title="Success">
          {res?.message || 'Payment recorded & WhatsApp message queued.'}
        </Notification>
      );
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to record payment.'}
        </Notification>
      );
    }
  });

  // Record Transaction Mutation (from Quick Pay Modal)
  const recordTxMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post(TRANSACTIONS.CREATE, payload);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-dues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-recent-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-vehicle-performance'] });
      
      const personName = selectedReference?.student_name || selectedReference?.name || 'Customer';
      toast.push(
        <Notification type="success" title="Payment Recorded">
          ✅ Payment recorded! WhatsApp sent to {personName}
        </Notification>
      );

      if (recordAnother) {
        // Reset only values that vary
        setSelectedReference(null);
        setPayAmount('');
        setPayNotes('');
        setSearchQuery('');
      } else {
        // Close modal
        setIsPayModalOpen(false);
        resetPayForm();
      }
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to record transaction.'}
        </Notification>
      );
    }
  });

  const resetPayForm = () => {
    setSelectedReference(null);
    setPayAmount('');
    setPayNotes('');
    setSearchQuery('');
    setPayMonth('');
    setPayDate('');
  };

  const handleQuickPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReference || !payAmount) {
      toast.push(
        <Notification type="danger" title="Validation Error">
          Please select a passenger/student and fill in the amount.
        </Notification>
      );
      return;
    }

    const payload: any = {
      vehicle_id: selectedReference.vehicle_id || selectedReference.studentAssignments?.[0]?.vehicle_id,
      transaction_type: payType,
      reference_id: selectedReference.id,
      reference_type: payType === 'student_fee' ? 'student' : 'auto_passenger',
      amount: parseFloat(payAmount),
      payment_method: payMethod,
      notes: payNotes
    };

    if (!payload.vehicle_id) {
      toast.push(
        <Notification type="danger" title="Validation Error">
          Selected person has no active vehicle assignment. Cannot log payment.
        </Notification>
      );
      return;
    }

    if (payType === 'student_fee') {
      if (!payMonth) {
        toast.push(<Notification type="danger" title="Error">Month is required</Notification>);
        return;
      }
      // ensure formatting matches YYYY-MM-DD
      payload.payment_for_month = payMonth + '-01';
    } else {
      if (!payDate) {
        toast.push(<Notification type="danger" title="Error">Date is required</Notification>);
        return;
      }
      payload.payment_for_date = payDate;
    }

    recordTxMutation.mutate(payload);
  };

  // Filter students or passengers dynamically based on query
  const filteredReferences = () => {
    if (payType === 'student_fee') {
      const list = studentsResponse?.data || [];
      return list.filter((s: any) => 
        s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.user?.phone?.includes(searchQuery)
      );
    } else {
      const list = passengersResponse?.data || [];
      return list.filter((p: any) => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone?.includes(searchQuery)
      );
    }
  };

  const getGreetingEmoji = () => {
    const hr = new Date().getHours();
    if (hr < 12) return '🌅';
    if (hr < 17) return '☀️';
    return '🌙';
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const summary = summaryResponse?.data || {
    vehicles: { total: 0, active: 0, buses: 0, autos: 0 },
    drivers: { total: 0, active: 0, assigned: 0, unassigned: 0 },
    students: { total: 0, active: 0, assigned_to_bus: 0, unassigned: 0 },
    passengers: { total: 0, active: 0 },
    finance: { collected_today: 0, collected_this_week: 0, collected_this_month: 0, pending_this_month: 0, overdue: 0, collection_rate: 0 },
    whatsapp: { sent_today: 0, failed_today: 0, pending: 0 }
  };

  const whatsapp = whatsappStatusResponse?.data || { status: 'disconnected' };
  const recentTransactions = recentTxResponse?.data || [];
  const pendingDues = pendingDuesResponse?.data || { student_dues: [], passenger_dues: [] };
  const revenueTrend = monthlyRevenueResponse?.data || [];
  const vehiclePerformance = vehiclePerformanceResponse?.data || [];

  const pendingDuesTotalCount = pendingDues.student_dues.length + pendingDues.passenger_dues.length;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Section 1 — Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2">
            <span>{getGreetingEmoji()}</span>
            {currentGreeting}, {user?.name}!
          </h2>
          <p className="text-blue-100 text-sm md:text-base font-medium">
            🏢 Operator: <strong className="font-semibold text-white">{user?.admin_settings?.business_name || 'My Fleet Workspace'}</strong> | 📅 {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        {/* WhatsApp Indicator Pill */}
        <div 
          className="cursor-pointer bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-2.5 border border-white/10 shadow-inner w-fit transition-all active:scale-95"
          onClick={() => navigate('/settings/whatsapp')}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${
            whatsapp.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
          }`}></span>
          <span className="text-xs font-bold tracking-wide uppercase">
            {whatsapp.status === 'connected' ? 'WhatsApp Active' : 'WhatsApp Offline — Connect Now'}
          </span>
        </div>
      </div>

      {/* Section 2 — Finance Stats Row (4 StatCards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Collected Today"
          value={isLoadingSummary ? '...' : `₹${Number(summary.finance.collected_today).toLocaleString()}`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Collected This Month"
          value={isLoadingSummary ? '...' : `₹${Number(summary.finance.collected_this_month).toLocaleString()}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Pending Dues This Month"
          value={isLoadingSummary ? '...' : `₹${Number(summary.finance.pending_this_month).toLocaleString()}`}
          icon={<AlertCircle className="w-6 h-6" />}
          color="red"
        />
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Collection Rate</span>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
              {isLoadingSummary ? '...' : `${summary.finance.collection_rate}%`}
            </h3>
          </div>
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* Simple circular metric display using SVG */}
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
              <circle cx="24" cy="24" r="20" stroke="#3b82f6" strokeWidth="4" fill="transparent" 
                strokeDasharray="125"
                strokeDashoffset={125 - (125 * (summary.finance.collection_rate || 0)) / 100}
              />
            </svg>
            <span className="absolute text-[9px] font-bold text-blue-600 dark:text-blue-400">Rate</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <Button 
          variant="solid" 
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 px-4 py-2 text-xs shadow-md shadow-blue-500/10"
          onClick={() => setIsPayModalOpen(true)}
        >
          <DollarSign className="w-4 h-4" />
          Record Payment
        </Button>
        <Button 
          variant="default"
          className="rounded-xl flex items-center gap-1.5 px-4 py-2 text-xs border border-slate-250 hover:bg-slate-50"
          onClick={() => navigate('/dues')}
        >
          <Calendar className="w-4 h-4 text-slate-500" />
          Generate Monthly Dues
        </Button>
        <Button 
          variant="default"
          className="rounded-xl flex items-center gap-1.5 px-4 py-2 text-xs border border-slate-250 hover:bg-slate-50"
          onClick={() => navigate('/students/new')}
        >
          <Plus className="w-4 h-4 text-slate-500" />
          Add Student
        </Button>
        <Button 
          variant="default"
          className="rounded-xl flex items-center gap-1.5 px-4 py-2 text-xs border border-slate-250 text-slate-400 hover:bg-slate-50 cursor-not-allowed"
          disabled
        >
          <FileText className="w-4 h-4 text-slate-400" />
          View Reports (Soon)
        </Button>
      </div>

      {/* Section 3 — Fleet Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Vehicles"
          value={isLoadingSummary ? '...' : `${summary.vehicles.total} (${summary.vehicles.active} Active)`}
          icon={<Bus className="w-6 h-6" />}
          color="slate"
        />
        <StatCard
          title="Active Drivers"
          value={isLoadingSummary ? '...' : `${summary.drivers.active} (${summary.drivers.assigned} Assigned)`}
          icon={<UserCheck className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Total Students"
          value={isLoadingSummary ? '...' : `${summary.students.total} (${summary.students.assigned_to_bus} Route)`}
          icon={<GraduationCap className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Auto Passengers"
          value={isLoadingSummary ? '...' : `${summary.passengers.total} (${summary.passengers.active} Active)`}
          icon={<Users className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Section 4 — Pending Dues Alert Panel */}
      {pendingDuesTotalCount > 0 && (
        <Card className="rounded-2xl border border-amber-250 bg-amber-50/20 shadow-sm overflow-hidden">
          <div className="p-6">
            <h4 className="text-lg font-bold text-amber-900 flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Outstanding Collections Queue
            </h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left Column: Student Dues */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 rounded-xl p-4 shadow-sm">
                <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                  <span>📚 {pendingDues.student_dues.length} Student Dues Pending</span>
                  <span className="text-xs font-normal text-blue-600 cursor-pointer hover:underline" onClick={() => navigate('/dues')}>View All</span>
                </h5>
                <div className="space-y-3">
                  {pendingDues.student_dues.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No pending student dues.</p>
                  ) : (
                    pendingDues.student_dues.slice(0, 5).map((due: any) => (
                      <div key={due.due_id} className="flex justify-between items-center text-xs p-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg">
                        <div>
                          <p className="font-bold text-slate-700">{due.student_name}</p>
                          <p className="text-slate-450 text-[10px] mt-0.5">{due.bus_name} • {due.month}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">₹{due.amount}</span>
                          <Tag className={`text-[10px] font-bold ${due.days_overdue > 30 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'}`}>
                            {due.days_overdue}d Overdue
                          </Tag>
                          <Button
                            size="xs"
                            variant="solid"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-0.5 text-[10px] font-bold"
                            onClick={() => markPaidMutation.mutate(due.due_id)}
                            loading={markPaidMutation.isPending}
                          >
                            Mark Paid
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Auto Passenger Dues */}
              <div className="bg-white dark:bg-slate-900 border border-slate-150 rounded-xl p-4 shadow-sm">
                <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
                  <span>🚗 {pendingDues.passenger_dues.length} Passenger Dues Pending</span>
                  <span className="text-xs font-normal text-blue-600 cursor-pointer hover:underline" onClick={() => navigate('/dues')}>View All</span>
                </h5>
                <div className="space-y-3">
                  {pendingDues.passenger_dues.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No pending passenger dues.</p>
                  ) : (
                    pendingDues.passenger_dues.slice(0, 5).map((due: any) => (
                      <div key={due.due_id} className="flex justify-between items-center text-xs p-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg">
                        <div>
                          <p className="font-bold text-slate-700">{due.passenger_name}</p>
                          <p className="text-slate-450 text-[10px] mt-0.5">{due.auto_name} • {due.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">₹{due.amount}</span>
                          <Tag className={`text-[10px] font-bold ${due.days_overdue > 30 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'}`}>
                            {due.days_overdue}d Overdue
                          </Tag>
                          <Button
                            size="xs"
                            variant="solid"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-0.5 text-[10px] font-bold"
                            onClick={() => markPaidMutation.mutate(due.due_id)}
                            loading={markPaidMutation.isPending}
                          >
                            Mark Paid
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </Card>
      )}

      {/* Section 5 — Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-5">
                Monthly Revenue Breakdown
              </h4>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: '12px', fill: '#64748b' }} />
                    <YAxis tickLine={false} axisLine={false} style={{ fontSize: '12px', fill: '#64748b' }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip 
                      formatter={(v) => v !== undefined ? `₹${v.toLocaleString()}` : ''}
                      contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '12px', border: 'none' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                    <Bar dataKey="student_fees" name="Student Fees" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="auto_fares" name="Auto Fares" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 7 — Recent Transactions */}
        <div className="lg:col-span-1">
          <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-full flex flex-col justify-between">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Recent Payments
                </h4>
                <span className="text-xs text-blue-600 cursor-pointer hover:underline font-semibold" onClick={() => navigate('/transactions')}>View All</span>
              </div>

              <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                {isLoadingRecent ? (
                  <p className="text-xs text-slate-450 italic py-4">Loading recent payments...</p>
                ) : recentTransactions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No payment transactions recorded.</p>
                ) : (
                  recentTransactions.map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{tx.person_name}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(tx.created_at)} • {tx.vehicle_name || 'General'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-600 block">₹{tx.amount}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">{tx.payment_method}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Section 6 — Vehicle Performance Table */}
      <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-6">
          <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-5">
            Vehicle Performance This Month
          </h4>

          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Vehicle Route / Name</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Current Driver</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Active Passengers</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Revenue (Month)</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Pending Dues</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {isLoadingPerformance ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">Loading fleet performance data...</td>
                  </tr>
                ) : vehiclePerformance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 italic">No fleet vehicles registered.</td>
                  </tr>
                ) : (
                  vehiclePerformance.map((veh: any) => (
                    <tr key={veh.vehicle_id} className="hover:bg-slate-50/50 text-slate-700 dark:text-slate-350">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          {veh.vehicle_name}
                          <Tag className={veh.type === 'bus' ? 'bg-blue-50 text-blue-700 border-blue-200 text-[10px]' : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'}>
                            <span className="capitalize">{veh.type}</span>
                          </Tag>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {veh.driver_name ? (
                          <span className="font-medium text-slate-800 dark:text-slate-300">{veh.driver_name}</span>
                        ) : (
                          <Tag className="bg-rose-50 text-rose-700 border-rose-200 font-semibold text-[10px]">No Driver</Tag>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium">{veh.passenger_count}</td>
                      <td className="py-3.5 px-4 text-emerald-600 font-semibold">₹{veh.revenue_this_month.toLocaleString()}</td>
                      <td className="py-3.5 px-4">
                        {veh.pending_dues_amount > 0 ? (
                          <span className="text-rose-600 font-semibold">
                            {veh.pending_dues_count} Dues (₹{veh.pending_dues_amount.toLocaleString()})
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Button 
                          size="xs" 
                          variant="default"
                          className="hover:text-blue-600 rounded-lg"
                          onClick={() => navigate(`/vehicles/${veh.vehicle_id}`)}
                        >
                          View Vehicle
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Quick Payment Entry Modal */}
      <Dialog
        isOpen={isPayModalOpen}
        onClose={() => {
          setIsPayModalOpen(false);
          resetPayForm();
        }}
        width={480}
      >
        <div className="mb-4">
          <h5 className="text-lg font-bold text-slate-900 dark:text-slate-100">Record Quick Payment</h5>
        </div>
        <form onSubmit={handleQuickPaySubmit} className="space-y-4">
          
          {/* Step 1: Select Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Payment Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  payType === 'student_fee' 
                    ? 'bg-blue-550 border-blue-600 text-white shadow-lg shadow-blue-500/10' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
                onClick={() => {
                  setPayType('student_fee');
                  setSelectedReference(null);
                  setSearchQuery('');
                }}
              >
                <GraduationCap className="w-5 h-5" />
                Student Fee
              </button>
              <button
                type="button"
                className={`py-3 px-4 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  payType === 'auto_daily' 
                    ? 'bg-blue-550 border-blue-600 text-white shadow-lg shadow-blue-500/10' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
                onClick={() => {
                  setPayType('auto_daily');
                  setSelectedReference(null);
                  setSearchQuery('');
                }}
              >
                <Users className="w-5 h-5" />
                Auto Fare
              </button>
            </div>
          </div>

          {/* Step 2: Search and Select Reference */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {payType === 'student_fee' ? 'Search Student' : 'Search Auto Passenger'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder={payType === 'student_fee' ? 'Enter student name or parent phone...' : 'Enter passenger name or phone...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>

            {/* Filtered reference dropdown dropdown */}
            {searchQuery && !selectedReference && (
              <div className="max-h-40 overflow-y-auto border border-slate-200 bg-white rounded-xl shadow-md divide-y divide-slate-100 z-50 position-absolute w-full">
                {filteredReferences().length === 0 ? (
                  <p className="p-3 text-xs text-slate-400 text-center italic">No matching records found.</p>
                ) : (
                  filteredReferences().map((ref: any) => {
                    const primaryName = ref.student_name || ref.name;
                    const phoneNum = ref.user?.phone || ref.phone;
                    const routeName = ref.studentAssignments?.[0]?.vehicle?.name || ref.vehicle?.name || 'No Route';
                    return (
                      <div 
                        key={ref.id}
                        className="p-2.5 text-xs hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                        onClick={() => {
                          setSelectedReference(ref);
                          setPayAmount(ref.current_monthly_fee || ref.daily_fare || '');
                          setSearchQuery('');
                        }}
                      >
                        <div>
                          <strong className="text-slate-800 font-semibold">{primaryName}</strong>
                          <span className="text-slate-400 text-[10px] ml-2">({phoneNum})</span>
                        </div>
                        <span className="text-slate-500 font-medium text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{routeName}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Selected user pill display */}
          {selectedReference && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">Selected Client</p>
                <h5 className="font-bold text-slate-800 mt-0.5">
                  {selectedReference.student_name || selectedReference.name}
                </h5>
                <p className="text-slate-500 text-[10px] mt-0.5">
                  Route: {selectedReference.studentAssignments?.[0]?.vehicle?.name || selectedReference.vehicle?.name || 'Unassigned'}
                </p>
              </div>
              <Button
                size="xs"
                className="text-slate-500 border border-slate-200 hover:bg-slate-100 rounded-lg px-2"
                type="button"
                onClick={() => setSelectedReference(null)}
              >
                Change
              </Button>
            </div>
          )}

          {/* Step 3: Enter Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Amount (₹)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="rounded-xl font-semibold text-slate-850"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Method</label>
              <select
                value={payMethod}
                onChange={(e: any) => setPayMethod(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI (GPay/PhonePe)</option>
                <option value="bank">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {payType === 'student_fee' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">For Month</label>
              <Input
                type="month"
                value={payMonth}
                onChange={(e) => setPayMonth(e.target.value)}
                className="rounded-xl font-medium"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">For Date</label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="rounded-xl font-medium"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Notes (Optional)</label>
            <Input
              placeholder="Add payment notes..."
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 py-1.5">
            <input 
              type="checkbox" 
              id="recordAnother" 
              checked={recordAnother}
              onChange={(e) => setRecordAnother(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <label htmlFor="recordAnother" className="text-xs text-slate-500 select-none">
              Record another transaction (Keep form open)
            </label>
          </div>

          {/* Step 4: Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => {
                setIsPayModalOpen(false);
                resetPayForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="solid"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/10"
              loading={recordTxMutation.isPending}
            >
              Confirm Payment
            </Button>
          </div>

        </form>
      </Dialog>

    </div>
  );
};

export default AdminDashboard;

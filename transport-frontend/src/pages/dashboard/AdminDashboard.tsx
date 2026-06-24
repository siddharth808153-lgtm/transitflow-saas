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
      <div className="relative overflow-hidden bg-slate-900 dark:bg-slate-950 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-indigo-500/5 transition-all duration-300">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-gradient-to-tr from-violet-500/5 to-pink-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative space-y-2.5 z-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
            <span>{getGreetingEmoji()}</span>
            <span>{currentGreeting}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            Welcome, {user?.name}!
          </h2>
          <p className="text-slate-400 text-sm md:text-base font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>🏢 Workspace:</span>
            <strong className="text-white font-bold">{user?.admin_settings?.business_name || 'TransitFlow Fleet'}</strong>
            <span className="text-slate-650 dark:text-slate-800">•</span>
            <span>📅 {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </p>
        </div>
        
        {/* WhatsApp Connection Indicator Panel */}
        <div 
          className="relative z-10 cursor-pointer bg-white/5 hover:bg-white/10 backdrop-blur-xl px-5 py-3 rounded-2xl flex items-center gap-3.5 border border-white/10 shadow-lg transition-all active:scale-[0.98] duration-200 group"
          onClick={() => navigate('/settings/whatsapp')}
        >
          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center relative`}>
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
              whatsapp.status === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              whatsapp.status === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}></span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp Integration</p>
            <p className="text-xs font-black text-white group-hover:text-indigo-200 transition-colors mt-0.5">
              {whatsapp.status === 'connected' ? 'CONNECTED & ACTIVE' : 'OFFLINE — CONFIGURE'}
            </p>
          </div>
        </div>
      </div>

      {/* Section 2 — Finance Stats Row (Custom Premium Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Today's collection */}
        <div className="bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500">Collected Today</span>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-50">
                {isLoadingSummary ? '...' : `₹${Number(summary.finance.collected_today).toLocaleString()}`}
              </h3>
            </div>
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Monthly Collection */}
        <div className="bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500">Monthly Earnings</span>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-50">
                {isLoadingSummary ? '...' : `₹${Number(summary.finance.collected_this_month).toLocaleString()}`}
              </h3>
            </div>
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-100 dark:border-blue-900/50 group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3: Pending Dues */}
        <div className="bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-455 dark:text-slate-500">Unpaid Dues</span>
              <h3 className="text-2xl md:text-3xl font-black text-rose-600 dark:text-rose-500">
                {isLoadingSummary ? '...' : `₹${Number(summary.finance.pending_this_month).toLocaleString()}`}
              </h3>
            </div>
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900/50 group-hover:scale-105 transition-transform">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 4: Collection Rate circular meter */}
        <div className="bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500">Collection Rate</span>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-50">
              {isLoadingSummary ? '...' : `${summary.finance.collection_rate}%`}
            </h3>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="28" cy="28" r="24" stroke="#f1f5f9" strokeWidth="4.5" fill="transparent" className="dark:stroke-slate-800" />
              <circle cx="28" cy="28" r="24" stroke="#3b82f6" strokeWidth="4.5" fill="transparent" 
                strokeDasharray="150"
                strokeDashoffset={150 - (150 * (summary.finance.collection_rate || 0)) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <span className="absolute text-[10px] font-black text-blue-600 dark:text-blue-400">RATE</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-3xl shadow-sm">
        <Button 
          variant="solid" 
          className="bg-blue-650 hover:bg-blue-705 text-white rounded-2xl flex items-center gap-2 px-5 py-3 text-xs shadow-lg shadow-blue-500/10 font-bold active:scale-[0.98] transition-all"
          onClick={() => setIsPayModalOpen(true)}
        >
          <DollarSign className="w-4 h-4" />
          Record Payment
        </Button>
        <Button 
          variant="default"
          className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 rounded-2xl flex items-center gap-2 px-5 py-3 text-xs font-bold active:scale-[0.98] transition-all"
          onClick={() => navigate('/dues')}
        >
          <Calendar className="w-4 h-4 text-blue-600" />
          Generate Monthly Dues
        </Button>
        <Button 
          variant="default"
          className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 rounded-2xl flex items-center gap-2 px-5 py-3 text-xs font-bold active:scale-[0.98] transition-all"
          onClick={() => navigate('/students/new')}
        >
          <Plus className="w-4 h-4 text-blue-600" />
          Add Student
        </Button>
        <Button 
          variant="default"
          className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-250 rounded-2xl flex items-center gap-2 px-5 py-3 text-xs font-bold active:scale-[0.98] transition-all"
          onClick={() => navigate('/reports')}
        >
          <FileText className="w-4 h-4 text-blue-600" />
          Reports Dashboard
        </Button>
      </div>

      {/* Section 3 — Fleet Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Vehicles */}
        <div className="bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500">Fleet Vehicles</span>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100">
                {isLoadingSummary ? '...' : `${summary.vehicles.total} Total`}
              </h3>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">
                {summary.vehicles.active} Active operational
              </p>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450 rounded-2xl">
              <Bus className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 2: Drivers */}
        <div className="bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500">Active Drivers</span>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100">
                {isLoadingSummary ? '...' : `${summary.drivers.active} Active`}
              </h3>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-500">
                {summary.drivers.assigned} Assigned on routes
              </p>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-455 rounded-2xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3: Students */}
        <div className="bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500">Bus Students</span>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100">
                {isLoadingSummary ? '...' : `${summary.students.total} Registered`}
              </h3>
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-500">
                {summary.students.assigned_to_bus} Assigned to buses
              </p>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450 rounded-2xl">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 4: Passengers */}
        <div className="bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/80 border border-slate-200/80 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-450 dark:text-slate-500">Auto Passengers</span>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100">
                {isLoadingSummary ? '...' : `${summary.passengers.total} Active`}
              </h3>
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-500">
                Fare based daily riders
              </p>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-450 rounded-2xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4 — Pending Dues Alert Panel */}
      {pendingDuesTotalCount > 0 && (
        <div className="bg-amber-50/40 dark:bg-amber-950/10 border border-amber-250/60 rounded-3xl shadow-sm overflow-hidden p-6">
          <h4 className="text-lg font-extrabold text-amber-900 dark:text-amber-300 flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
            Outstanding Collections Queue
          </h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: Student Dues */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/85 rounded-2xl p-4 shadow-sm">
              <h5 className="font-extrabold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between text-sm">
                <span>📚 {pendingDues.student_dues.length} Student Dues Pending</span>
                <span className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-450 cursor-pointer" onClick={() => navigate('/dues')}>View All</span>
              </h5>
              <div className="space-y-3">
                {pendingDues.student_dues.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No pending student dues.</p>
                ) : (
                  pendingDues.student_dues.slice(0, 5).map((due: any) => (
                    <div key={due.due_id} className="flex justify-between items-center text-xs p-3 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 border border-slate-100 dark:border-slate-800/80 rounded-xl transition-all duration-200">
                      <div>
                        <p className="font-extrabold text-slate-700 dark:text-slate-350">{due.student_name}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5 font-medium">{due.bus_name} • {due.month}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 dark:text-slate-200">₹{due.amount}</span>
                        <Tag className={`text-[10px] font-bold ${due.days_overdue > 30 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'}`}>
                          {due.days_overdue}d Overdue
                        </Tag>
                        <Button
                          size="xs"
                          variant="solid"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold shadow-md shadow-emerald-500/10 active:scale-95"
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
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/85 rounded-2xl p-4 shadow-sm">
              <h5 className="font-extrabold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between text-sm">
                <span>🚗 {pendingDues.passenger_dues.length} Passenger Dues Pending</span>
                <span className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-450 cursor-pointer" onClick={() => navigate('/dues')}>View All</span>
              </h5>
              <div className="space-y-3">
                {pendingDues.passenger_dues.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">No pending passenger dues.</p>
                ) : (
                  pendingDues.passenger_dues.slice(0, 5).map((due: any) => (
                    <div key={due.due_id} className="flex justify-between items-center text-xs p-3 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-50 border border-slate-100 dark:border-slate-800/80 rounded-xl transition-all duration-200">
                      <div>
                        <p className="font-extrabold text-slate-700 dark:text-slate-350">{due.passenger_name}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5 font-medium">{due.auto_name} • {due.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 dark:text-slate-200">₹{due.amount}</span>
                        <Tag className={`text-[10px] font-bold ${due.days_overdue > 30 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'}`}>
                          {due.days_overdue}d Overdue
                        </Tag>
                        <Button
                          size="xs"
                          variant="solid"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold shadow-md shadow-emerald-500/10 active:scale-95"
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
      )}

      {/* Section 5 — Revenue Chart & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6">
              <h4 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-5">
                Monthly Revenue Breakdown
              </h4>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#94a3b8', fontWeight: 'bold' }} />
                    <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#94a3b8', fontWeight: 'bold' }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip 
                      formatter={(v) => v !== undefined ? `₹${v.toLocaleString()}` : ''}
                      contentStyle={{ background: '#0f172a', color: '#fff', borderRadius: '14px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#94a3b8', fontSize: '11px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '15px', fontWeight: 'bold', fill: '#64748b' }} />
                    <Bar dataKey="student_fees" name="Student Fees" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="auto_fares" name="Auto Fares" stackId="a" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </div>

        {/* Section 7 — Recent Transactions */}
        <div className="lg:col-span-1">
          <Card className="rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 h-full flex flex-col justify-between overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h4 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Recent Payments
                </h4>
                <span className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-450 cursor-pointer font-bold" onClick={() => navigate('/transactions')}>View All</span>
              </div>

              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {isLoadingRecent ? (
                  <p className="text-xs text-slate-450 italic py-4">Loading recent payments...</p>
                ) : recentTransactions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No payment transactions recorded.</p>
                ) : (
                  recentTransactions.map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center text-xs p-1 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 rounded-xl transition-colors">
                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-slate-200">{tx.person_name}</p>
                        <p className="text-slate-450 text-[10px] mt-0.5 flex items-center gap-1 font-semibold">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {timeAgo(tx.created_at)} • {tx.vehicle_name || 'General'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-600 dark:text-emerald-500 block">₹{tx.amount}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">{tx.payment_method}</span>
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
      <Card className="rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6">
          <h4 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-5">
            Vehicle Performance This Month
          </h4>

          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3.5 px-4 text-xs font-extrabold uppercase text-slate-500 tracking-wider">Vehicle Route / Name</th>
                  <th className="py-3.5 px-4 text-xs font-extrabold uppercase text-slate-500 tracking-wider">Current Driver</th>
                  <th className="py-3.5 px-4 text-xs font-extrabold uppercase text-slate-500 tracking-wider">Active Passengers</th>
                  <th className="py-3.5 px-4 text-xs font-extrabold uppercase text-slate-500 tracking-wider">Revenue (Month)</th>
                  <th className="py-3.5 px-4 text-xs font-extrabold uppercase text-slate-500 tracking-wider">Pending Dues</th>
                  <th className="py-3.5 px-4 text-xs font-extrabold uppercase text-slate-500 tracking-wider text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {isLoadingPerformance ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">Loading fleet performance data...</td>
                  </tr>
                ) : vehiclePerformance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">No fleet vehicles registered.</td>
                  </tr>
                ) : (
                  vehiclePerformance.map((veh: any) => (
                    <tr key={veh.vehicle_id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/20 text-slate-700 dark:text-slate-350 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          {veh.vehicle_name}
                          <Tag className={veh.type === 'bus' ? 'bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold px-2 py-0.5' : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0.5'}>
                            <span className="capitalize">{veh.type}</span>
                          </Tag>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {veh.driver_name ? (
                          <span className="font-bold text-slate-800 dark:text-slate-300">{veh.driver_name}</span>
                        ) : (
                          <Tag className="bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] px-2 py-0.5">No Driver Assigned</Tag>
                        )}
                      </td>
                      <td className="py-4 px-4 font-extrabold text-slate-800 dark:text-slate-300">{veh.passenger_count}</td>
                      <td className="py-4 px-4 text-emerald-600 dark:text-emerald-550 font-black">₹{veh.revenue_this_month.toLocaleString()}</td>
                      <td className="py-4 px-4">
                        {veh.pending_dues_amount > 0 ? (
                          <span className="text-rose-600 font-black">
                            {veh.pending_dues_count} Dues (₹{veh.pending_dues_amount.toLocaleString()})
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Button 
                          size="xs" 
                          variant="default"
                          className="hover:text-blue-600 dark:hover:text-blue-400 rounded-xl font-bold px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
                          onClick={() => navigate(`/vehicles/${veh.vehicle_id}`)}
                        >
                          View Details
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

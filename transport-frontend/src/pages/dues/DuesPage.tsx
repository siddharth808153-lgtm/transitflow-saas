// src/pages/dues/DuesPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, DollarSign, Calendar, RefreshCw, CheckCircle, AlertCircle, CalendarRange, Info, Bus, Car } from 'lucide-react';
import api from '@/api/axios';
import { DUES, VEHICLES } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import DataTable from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tag from '@/components/ui/Tag';
import Tabs from '@/components/ui/Tabs';
import Dialog from '@/components/ui/Dialog';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const DuesPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'students' | 'passengers'>('students');

  // Generator Modals
  const [generateMonthlyOpen, setGenerateMonthlyOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [generationResult, setGenerationResult] = useState<{ generated: number; skipped: number } | null>(null);

  const [generateDailyOpen, setGenerateDailyOpen] = useState(false);
  const [selectedDailyDate, setSelectedDailyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedDailyVehicleId, setSelectedDailyVehicleId] = useState('');
  const [dailyGenerationResult, setDailyGenerationResult] = useState<{ generated: number; skipped: number } | null>(null);

  // Pay Modal
  const [payDueId, setPayDueId] = useState<number | string | null>(null);
  const [payDueData, setPayDueData] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank' | 'other'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Filters for Students Tab
  const [studentVehicleId, setStudentVehicleId] = useState('');
  const [studentMonth, setStudentMonth] = useState('');
  const [studentStatus, setStudentStatus] = useState('all');

  // Filters for Passengers Tab
  const [passengerVehicleId, setPassengerVehicleId] = useState('');
  const [passengerDateFrom, setPassengerDateFrom] = useState('');
  const [passengerDateTo, setPassengerDateTo] = useState('');
  const [passengerStatus, setPassengerStatus] = useState('all');

  // Fetch Summary statistics
  const { data: summaryResponse, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['dues-summary'],
    queryFn: async () => {
      const res = await api.get(DUES.SUMMARY);
      return res.data;
    },
  });

  // Fetch Vehicles
  const { data: vehiclesResponse } = useQuery({
    queryKey: ['vehicles-dues'],
    queryFn: async () => {
      const res = await api.get(VEHICLES.LIST);
      return res.data;
    },
  });

  // Fetch Dues
  const { data: duesResponse, isLoading: isLoadingDues } = useQuery({
    queryKey: ['dues-list', activeTab, studentVehicleId, studentMonth, studentStatus, passengerVehicleId, passengerDateFrom, passengerDateTo, passengerStatus],
    queryFn: async () => {
      const params: any = {};
      
      if (activeTab === 'students') {
        params.reference_type = 'student';
        if (studentVehicleId) params.vehicle_id = studentVehicleId;
        if (studentMonth) params.month = studentMonth;
        if (studentStatus !== 'all') {
          if (studentStatus === 'paid') params.is_paid = 'true';
          if (studentStatus === 'pending') params.is_paid = 'false';
          if (studentStatus === 'overdue') params.status = 'overdue';
        }
      } else {
        params.reference_type = 'auto_passenger';
        if (passengerVehicleId) params.vehicle_id = passengerVehicleId;
        if (passengerStatus !== 'all') {
          if (passengerStatus === 'paid') params.is_paid = 'true';
          if (passengerStatus === 'pending') params.is_paid = 'false';
        }
        // Date range filters can be parsed on frontend or added as query params
      }

      const res = await api.get(DUES.LIST, { params });
      return res.data;
    },
  });

  const vehicles = vehiclesResponse?.data || [];
  const buses = vehicles.filter((v: any) => v.type === 'bus');
  const autos = vehicles.filter((v: any) => v.type === 'auto');

  const summary = summaryResponse?.data || {
    total_collected_this_month: 0,
    total_pending_this_month: 0,
    total_overdue: 0,
    collection_rate: 0,
  };

  const rawDuesList = duesResponse?.data?.dues || [];
  
  // Custom frontend filter for Passenger Dates if range is selected
  const duesList = React.useMemo(() => {
    if (activeTab === 'passengers' && (passengerDateFrom || passengerDateTo)) {
      return rawDuesList.filter((due: any) => {
        if (!due.due_for_date) return true;
        const d = new Date(due.due_for_date);
        const from = passengerDateFrom ? new Date(passengerDateFrom) : null;
        const to = passengerDateTo ? new Date(passengerDateTo) : null;

        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }
    return rawDuesList;
  }, [rawDuesList, activeTab, passengerDateFrom, passengerDateTo]);

  // Generate Monthly Dues Mutation
  const generateMonthlyMutation = useMutation({
    mutationFn: async (month: string) => {
      const res = await api.post(DUES.GENERATE_MONTHLY, { month });
      return res.data;
    },
    onSuccess: (res) => {
      setGenerationResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['dues-list'] });
      queryClient.invalidateQueries({ queryKey: ['dues-summary'] });
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Generation Failed">
          {err.response?.data?.message || 'Failed to generate monthly student dues.'}
        </Notification>
      );
    },
  });

  // Generate Daily Dues Mutation
  const generateDailyMutation = useMutation({
    mutationFn: async (payload: { date: string; vehicle_id: string }) => {
      const res = await api.post(DUES.GENERATE_DAILY, payload);
      return res.data;
    },
    onSuccess: (res) => {
      setDailyGenerationResult(res.data);
      queryClient.invalidateQueries({ queryKey: ['dues-list'] });
      queryClient.invalidateQueries({ queryKey: ['dues-summary'] });
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Generation Failed">
          {err.response?.data?.message || 'Failed to generate daily passenger dues.'}
        </Notification>
      );
    },
  });

  // Mark Paid Mutation
  const markPaidMutation = useMutation({
    mutationFn: async (payload: { id: string | number; payment_method: string; notes?: string }) => {
      const res = await api.post(DUES.MARK_PAID(payload.id), {
        payment_method: payload.payment_method,
        notes: payload.notes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dues-list'] });
      queryClient.invalidateQueries({ queryKey: ['dues-summary'] });
      toast.push(
        <Notification type="success" title="Payment Recorded">
          Payment recorded successfully and WhatsApp confirmation is dispatched.
        </Notification>
      );
      setPayDueId(null);
      setPayDueData(null);
      setPaymentNotes('');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Payment Failed">
          {err.response?.data?.message || 'Failed to mark due as paid.'}
        </Notification>
      );
    },
  });

  const getStatusBadge = (row: any) => {
    if (row.is_paid) {
      return <Tag className="bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</Tag>;
    }
    // Check if overdue: reference_type = student has due_for_month, passenger has due_for_date
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let isOverdue = false;
    if (row.due_for_month) {
      const dueMonth = new Date(row.due_for_month);
      isOverdue = dueMonth < currentMonthStart;
    } else if (row.due_for_date) {
      const dueDay = new Date(row.due_for_date);
      isOverdue = dueDay < currentMonthStart;
    }

    if (isOverdue) {
      return <Tag className="bg-rose-50 text-rose-700 border border-rose-200">Overdue</Tag>;
    }
    return <Tag className="bg-amber-50 text-amber-600 border border-amber-200">Pending</Tag>;
  };

  const getPersonName = (row: any) => {
    if (row.reference) {
      if (row.reference_type === 'student') {
        return row.reference.student_name || 'N/A';
      }
      return row.reference.name || 'N/A';
    }
    return 'N/A';
  };

  const studentColumns = [
    {
      key: 'student_name',
      label: 'Student Name',
      render: (_: any, row: any) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{getPersonName(row)}</span>
      ),
    },
    {
      key: 'vehicle',
      label: 'Bus Route',
      render: (val: any) => (
        <span className="text-slate-600 font-medium flex items-center gap-1">
          <Bus className="w-3.5 h-3.5 text-blue-500" />
          {val?.name || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'due_for_month',
      label: 'Due Month',
      render: (val: string) => {
        if (!val) return '-';
        return new Date(val).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      },
    },
    {
      key: 'due_amount',
      label: 'Due Amount',
      render: (val: any) => <span className="font-semibold text-slate-800">₹{Number(val).toFixed(2)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, row: any) => getStatusBadge(row),
    },
    {
      key: 'paid_at',
      label: 'Paid On',
      render: (val: string) => (val ? new Date(val).toLocaleDateString() : '-'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => {
        if (!row.is_paid) {
          return (
            <Button
              size="xs"
              variant="solid"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              onClick={() => {
                setPayDueId(row.id);
                setPayDueData(row);
              }}
            >
              Mark as Paid
            </Button>
          );
        }
        return <span className="text-xs text-slate-400 font-medium">No actions</span>;
      },
    },
  ];

  const passengerColumns = [
    {
      key: 'passenger_name',
      label: 'Passenger Name',
      render: (_: any, row: any) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{getPersonName(row)}</span>
      ),
    },
    {
      key: 'vehicle',
      label: 'Auto Vehicle',
      render: (val: any) => (
        <span className="text-slate-600 font-medium flex items-center gap-1">
          <Car className="w-3.5 h-3.5 text-amber-500" />
          {val?.name || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'due_for_date',
      label: 'Due Date',
      render: (val: string) => (val ? new Date(val).toLocaleDateString() : '-'),
    },
    {
      key: 'due_amount',
      label: 'Fare Amount',
      render: (val: any) => <span className="font-semibold text-amber-600">₹{Number(val).toFixed(2)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, row: any) => getStatusBadge(row),
    },
    {
      key: 'paid_at',
      label: 'Paid On',
      render: (val: string) => (val ? new Date(val).toLocaleDateString() : '-'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => {
        if (!row.is_paid) {
          return (
            <Button
              size="xs"
              variant="solid"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              onClick={() => {
                setPayDueId(row.id);
                setPayDueData(row);
              }}
            >
              Mark as Paid
            </Button>
          );
        }
        return <span className="text-xs text-slate-400 font-medium">No actions</span>;
      },
    },
  ];

  const handleMonthlySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMonth) return;
    generateMonthlyMutation.mutate(selectedMonth);
  };

  const handleDailySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDailyDate || !selectedDailyVehicleId) {
      toast.push(<Notification type="danger" title="Validation Error">Please pick a date and select an auto.</Notification>);
      return;
    }
    generateDailyMutation.mutate({
      date: selectedDailyDate,
      vehicle_id: selectedDailyVehicleId,
    });
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payDueId) return;
    markPaidMutation.mutate({
      id: payDueId,
      payment_method: paymentMethod,
      notes: paymentNotes,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dues & Collections"
        breadcrumbs={[{ label: 'Dues & Collections' }]}
      />

      {/* Top summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Collected This Month"
          value={`₹${summary.total_collected_this_month.toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Pending This Month"
          value={`₹${summary.total_pending_this_month.toFixed(2)}`}
          icon={<AlertCircle className="w-6 h-6" />}
          color="red"
        />
        <StatCard
          title="Overdue (Previous Months)"
          value={`₹${summary.total_overdue.toFixed(2)}`}
          icon={<CalendarRange className="w-6 h-6" />}
          color="orange"
        />
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Collection Rate</span>
            <span className="text-xl font-black text-slate-800 dark:text-white">{summary.collection_rate}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${summary.collection_rate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <Tabs defaultValue="students" onChange={(val) => setActiveTab(val as any)}>
        <Tabs.TabList className="border-b border-slate-200 dark:border-slate-800 pb-px mb-6 flex gap-6">
          <Tabs.TabNav value="students" className="pb-3 text-sm font-semibold tracking-wide border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-slate-500 cursor-pointer">
            Student Dues (Monthly)
          </Tabs.TabNav>
          <Tabs.TabNav value="passengers" className="pb-3 text-sm font-semibold tracking-wide border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-slate-500 cursor-pointer">
            Auto Passenger Dues (Daily)
          </Tabs.TabNav>
        </Tabs.TabList>

        {/* Tab 1 — Student Monthly Dues */}
        <Tabs.TabContent value="students" className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row gap-3 flex-1">
              {/* Bus selector */}
              <select
                value={studentVehicleId}
                onChange={(e) => setStudentVehicleId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-xs"
              >
                <option value="">All Buses</option>
                {buses.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Month selector */}
              <Input
                type="month"
                value={studentMonth}
                onChange={(e) => setStudentMonth(e.target.value)}
                className="rounded-xl max-w-xs"
              />
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-col md:flex-row items-center gap-3">
              <select
                value={studentStatus}
                onChange={(e) => setStudentStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>

              <Button
                variant="solid"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs py-2.5 px-4 shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                onClick={() => {
                  setGenerationResult(null);
                  setGenerateMonthlyOpen(true);
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Generate Dues
              </Button>
            </div>
          </div>

          {/* Dues List Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <DataTable
              columns={studentColumns}
              data={duesList}
              loading={isLoadingDues}
              emptyMessage="No student dues generated for the chosen routes and period."
            />
          </div>
        </Tabs.TabContent>

        {/* Tab 2 — Auto Passenger Daily Dues */}
        <Tabs.TabContent value="passengers" className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row gap-3 flex-1">
              {/* Auto selector */}
              <select
                value={passengerVehicleId}
                onChange={(e) => setPassengerVehicleId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-xs"
              >
                <option value="">All Autos</option>
                {autos.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              {/* Date From */}
              <Input
                type="date"
                placeholder="From Date"
                value={passengerDateFrom}
                onChange={(e) => setPassengerDateFrom(e.target.value)}
                className="rounded-xl max-w-xs"
              />

              {/* Date To */}
              <Input
                type="date"
                placeholder="To Date"
                value={passengerDateTo}
                onChange={(e) => setPassengerDateTo(e.target.value)}
                className="rounded-xl max-w-xs"
              />
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-col md:flex-row items-center gap-3">
              <select
                value={passengerStatus}
                onChange={(e) => setPassengerStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>

              <Button
                variant="solid"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs py-2.5 px-4 shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                onClick={() => {
                  setDailyGenerationResult(null);
                  setGenerateDailyOpen(true);
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Generate Daily Dues
              </Button>
            </div>
          </div>

          {/* Dues List Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <DataTable
              columns={passengerColumns}
              data={duesList}
              loading={isLoadingDues}
              emptyMessage="No passenger ride dues generated for the chosen period."
            />
          </div>
        </Tabs.TabContent>
      </Tabs>

      {/* Generate Monthly Modal */}
      <Dialog
        isOpen={generateMonthlyOpen}
        onClose={() => setGenerateMonthlyOpen(false)}
        contentClassName="rounded-2xl"
      >
        <h3 className="text-lg font-bold mb-4">Generate Monthly Student Dues</h3>
        {generationResult ? (
          <div className="space-y-4 pt-2 text-center">
            <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-left space-y-1.5">
              <p className="text-sm font-semibold">Monthly Dues Processed</p>
              <p className="text-xs">Generated new dues: <span className="font-bold">{generationResult.generated}</span></p>
              <p className="text-xs">Skipped (already exist): <span className="font-bold">{generationResult.skipped}</span></p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button size="sm" onClick={() => setGenerateMonthlyOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleMonthlySubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Select Due Month <span className="text-rose-500">*</span>
              </label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                required
                className="rounded-xl w-full"
              />
              <p className="text-xs text-slate-400 mt-2">
                This will batch generate unpaid dues for all active students assigned to a bus route for this month.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button size="sm" type="button" onClick={() => setGenerateMonthlyOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="solid"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                type="submit"
                disabled={generateMonthlyMutation.isPending}
              >
                {generateMonthlyMutation.isPending ? 'Generating...' : 'Confirm Generate'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Generate Daily Modal */}
      <Dialog
        isOpen={generateDailyOpen}
        onClose={() => setGenerateDailyOpen(false)}
        contentClassName="rounded-2xl"
      >
        <h3 className="text-lg font-bold mb-4">Generate Passenger Daily Dues</h3>
        {dailyGenerationResult ? (
          <div className="space-y-4 pt-2 text-center">
            <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-left space-y-1.5">
              <p className="text-sm font-semibold">Daily Dues Processed</p>
              <p className="text-xs">Generated new dues: <span className="font-bold">{dailyGenerationResult.generated}</span></p>
              <p className="text-xs">Skipped (already exist): <span className="font-bold">{dailyGenerationResult.skipped}</span></p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button size="sm" onClick={() => setGenerateDailyOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDailySubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Select Date <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={selectedDailyDate}
                onChange={(e) => setSelectedDailyDate(e.target.value)}
                required
                className="rounded-xl w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Select Auto Route <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedDailyVehicleId}
                onChange={(e) => setSelectedDailyVehicleId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select Auto...</option>
                {autos.map((a: any) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-2">
                This will batch generate unpaid dues for all active passengers assigned to the chosen Auto Rickshaw route for this date.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button size="sm" type="button" onClick={() => setGenerateDailyOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="solid"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                type="submit"
                disabled={generateDailyMutation.isPending}
              >
                {generateDailyMutation.isPending ? 'Generating...' : 'Confirm Generate'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Record Payment (Mark as Paid) Modal */}
      <Dialog
        isOpen={payDueId !== null}
        onClose={() => {
          setPayDueId(null);
          setPayDueData(null);
        }}
        contentClassName="rounded-2xl"
      >
        <h3 className="text-lg font-bold mb-4">Record Payment</h3>
        {payDueData && (
          <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-2">
            <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Person</p>
              <p className="text-sm font-bold text-slate-800">{getPersonName(payDueData)}</p>
              <div className="flex justify-between border-t border-emerald-100 pt-2 mt-2">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase block">Amount Due</span>
                  <span className="text-lg font-bold">₹{Number(payDueData.due_amount).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase block">Period</span>
                  <span className="text-sm font-medium text-slate-700">
                    {payDueData.due_for_month
                      ? new Date(payDueData.due_for_month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                      : payDueData.due_for_date
                      ? new Date(payDueData.due_for_date).toLocaleDateString()
                      : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                <option value="bank">Bank Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Notes (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Paid in full, advance"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="rounded-xl w-full"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                size="sm"
                type="button"
                onClick={() => {
                  setPayDueId(null);
                  setPayDueData(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="solid"
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                type="submit"
                disabled={markPaidMutation.isPending}
              >
                {markPaidMutation.isPending ? 'Recording...' : 'Mark as Paid'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
};

export default DuesPage;

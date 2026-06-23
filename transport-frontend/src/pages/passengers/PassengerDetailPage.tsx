// src/pages/passengers/PassengerDetailPage.tsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Car, 
  Calendar, 
  AlertCircle, 
  DollarSign, 
  Link as LinkIcon, 
  Users,
  CheckCircle,
  Clock
} from 'lucide-react';
import api from '@/api/axios';
import { PASSENGERS } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import Dialog from '@/components/ui/Dialog';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const PassengerDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | number>('');

  // Fetch Passenger details
  const { data: passengerResponse, isLoading } = useQuery({
    queryKey: ['passenger', id],
    queryFn: async () => {
      const res = await api.get(PASSENGERS.DETAIL(id!));
      return res.data;
    },
  });

  // Fetch Dues & Daily Records
  const { data: duesResponse, isLoading: isLoadingDues } = useQuery({
    queryKey: ['passenger-dues', id],
    queryFn: async () => {
      const res = await api.get(PASSENGERS.DUES(id!));
      return res.data;
    },
  });

  // Fetch App Users (for linking)
  const { data: usersResponse } = useQuery({
    queryKey: ['app-users-link'],
    queryFn: async () => {
      const res = await api.get('/users', { params: { role: 'user' } });
      return res.data;
    },
    enabled: linkOpen,
  });

  const passenger = passengerResponse?.data;
  const duesList = duesResponse?.data || [];
  const appUsers = usersResponse?.data || [];
  const unlinkedUsers = appUsers.filter((u: any) => !u.passenger);

  // Link App Account Mutation
  const linkMutation = useMutation({
    mutationFn: async (userId: string | number) => {
      return await api.patch(PASSENGERS.UPDATE(id!), { user_id: userId });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['passenger', id] });
      toast.push(
        <Notification type="success" title="Account Linked">
          App account linked successfully.
        </Notification>
      );
      setLinkOpen(false);
      setSelectedUserId('');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to link app account.'}
        </Notification>
      );
    },
  });

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    linkMutation.mutate(selectedUserId);
  };

  if (isLoading) {
    return <div className="text-center py-20">Loading passenger details...</div>;
  }

  if (!passenger) {
    return (
      <div className="text-center py-20 text-slate-500">
        <AlertCircle className="w-12 h-12 mx-auto text-rose-500 mb-4" />
        Passenger not found.
      </div>
    );
  }

  // Daily records / payments columns
  const dailyColumns = [
    {
      key: 'due_for_date',
      label: 'Date',
      render: (val: string) => <span>{val ? new Date(val).toLocaleDateString() : 'N/A'}</span>
    },
    {
      key: 'due_amount',
      label: 'Fare Due',
      render: (val: any) => <span className="font-semibold text-slate-800">₹{Number(val).toFixed(2)}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, row: any) => (
        <Tag className={row.is_paid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}>
          <span className="font-semibold">{row.is_paid ? 'Paid' : 'Unpaid'}</span>
        </Tag>
      )
    },
    {
      key: 'paid_at',
      label: 'Paid Date',
      render: (val: string) => <span>{val ? new Date(val).toLocaleDateString() : '-'}</span>
    }
  ];

  // Transaction history columns
  const paymentColumns = [
    {
      key: 'created_at',
      label: 'Payment Date',
      render: (val: string) => <span>{val ? new Date(val).toLocaleString() : 'N/A'}</span>
    },
    {
      key: 'amount',
      label: 'Amount Paid',
      render: (val: any) => <span className="font-semibold text-emerald-600">₹{Number(val).toFixed(2)}</span>
    },
    {
      key: 'payment_method',
      label: 'Method',
      render: (val: string) => <span className="uppercase font-medium text-xs">{val || 'Other'}</span>
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (val: string) => <span className="text-slate-500 text-xs">{val || '-'}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate('/passengers')}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={passenger.name}
          breadcrumbs={[
            { label: 'Auto Passengers', path: '/passengers' },
            { label: passenger.name },
          ]}
          action={
            <Button
              variant="default"
              className="rounded-xl border border-slate-200"
              onClick={() => navigate(`/passengers/${passenger.id}/edit`)}
            >
              Edit Details
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-6 space-y-6">
          <h3 className="text-lg font-bold text-slate-900">Passenger Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Full Name</p>
                <p className="text-sm font-bold text-slate-800">{passenger.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                <Phone className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Phone Number</p>
                <p className="text-sm font-bold text-slate-800">{passenger.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                <Car className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Assigned Auto</p>
                <p className="text-sm font-bold text-slate-800 capitalize">{passenger.vehicle?.name || 'Unassigned'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Daily Fare Rate</p>
                <p className="text-sm font-bold text-amber-600">₹{Number(passenger.daily_fare).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-500">Active Status</span>
            <Tag className={passenger.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
              <span className="font-semibold">{passenger.is_active ? 'Active' : 'Inactive'}</span>
            </Tag>
          </div>
        </Card>

        {/* Linked App Account Card */}
        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">App Account Connection</h3>

          {passenger.user_id ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Linked Account</h4>
                  <p className="text-xs text-slate-400">ID: #{passenger.user_id}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1.5">
                <div className="flex justify-between">
                  <span>Allows user to view payment history:</span>
                  <span className="font-semibold text-emerald-600">Yes</span>
                </div>
                <div className="flex justify-between">
                  <span>Receives WhatsApp notifications:</span>
                  <span className="font-semibold text-emerald-600">Enabled</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-4">
              <LinkIcon className="w-10 h-10 mx-auto text-slate-300" />
              <div>
                <h4 className="font-bold text-slate-800 text-sm">No App Account Linked</h4>
                <p className="text-xs text-slate-400 mt-1">Linking an account lets the passenger check their records from the React mobile app.</p>
              </div>
              <Button
                variant="solid"
                className="bg-blue-600 hover:bg-blue-700 text-white w-full rounded-xl py-2"
                onClick={() => setLinkOpen(true)}
              >
                Link Account
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="records">
        <Tabs.TabList className="border-b border-slate-200 dark:border-slate-800 pb-px mb-6 flex gap-6">
          <Tabs.TabNav value="records" className="pb-3 text-sm font-semibold tracking-wide border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-slate-500 cursor-pointer">
            Daily Records & Dues
          </Tabs.TabNav>
          <Tabs.TabNav value="history" className="pb-3 text-sm font-semibold tracking-wide border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-slate-500 cursor-pointer">
            Payment History
          </Tabs.TabNav>
        </Tabs.TabList>

        {/* Tab 1: Daily Records */}
        <Tabs.TabContent value="records">
          <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-2">
            <DataTable
              columns={dailyColumns}
              data={duesList}
              loading={isLoadingDues}
              emptyMessage="No daily transit records found."
            />
          </Card>
        </Tabs.TabContent>

        {/* Tab 2: Payment History */}
        <Tabs.TabContent value="history">
          <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-2">
            <DataTable
              columns={paymentColumns}
              data={passenger.transactions || []}
              emptyMessage="No payment transactions logged yet."
            />
          </Card>
        </Tabs.TabContent>
      </Tabs>

      {/* Link Account Dialog */}
      <Dialog
        isOpen={linkOpen}
        onClose={() => setLinkOpen(false)}
        contentClassName="rounded-2xl"
      >
        <h3 className="text-lg font-bold mb-4">Link App Account</h3>
        <form onSubmit={handleLinkSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Select User Account
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Choose a user...</option>
              {unlinkedUsers.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.phone})
                </option>
              ))}
            </select>
            {unlinkedUsers.length === 0 && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                No unlinked user accounts of role 'user' available.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button size="sm" type="button" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              variant="solid" 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              type="submit"
              disabled={linkMutation.isPending}
            >
              {linkMutation.isPending ? 'Linking...' : 'Link Account'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default PassengerDetailPage;

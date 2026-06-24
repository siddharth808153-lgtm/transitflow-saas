// src/pages/drivers/DriverDetailPage.tsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  CreditCard, 
  DollarSign, 
  Bus, 
  Calendar, 
  AlertCircle, 
  UserMinus 
} from 'lucide-react';
import api from '@/api/axios';
import { DRIVERS } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const DriverDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [relieveOpen, setRelieveOpen] = useState(false);
  const [relieveReason, setRelieveReason] = useState('');

  // Fetch driver detail
  const { data: driverResponse, isLoading } = useQuery({
    queryKey: ['driver', id],
    queryFn: async () => {
      const res = await api.get(DRIVERS.DETAIL(id!));
      return res.data;
    },
  });

  const driver = driverResponse?.data;
  const logs = driver?.driver_assignments || [];
  const leaves = driver?.leaves || [];
  const adjustments = driver?.wage_adjustments || [];
  const transactions = driver?.transactions || [];

  const [activeTab, setActiveTab] = useState<'assignments' | 'leaves' | 'payments' | 'adjustments'>('assignments');

  // Relieve Mutation
  const relieveMutation = useMutation({
    mutationFn: async () => {
      return await api.post(DRIVERS.RELIEVE(id!), { reason: relieveReason });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['driver', id] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.push(
        <Notification type="success" title="Success">
          {res.data?.message || 'Driver relieved from vehicle successfully.'}
        </Notification>
      );
      setRelieveOpen(false);
      setRelieveReason('');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to relieve driver.'}
        </Notification>
      );
    },
  });

  const handleRelieveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    relieveMutation.mutate();
  };

  if (isLoading) {
    return <div className="text-center py-20">Loading driver details...</div>;
  }

  if (!driver) {
    return (
      <div className="text-center py-20 text-slate-500">
        <AlertCircle className="w-12 h-12 mx-auto text-rose-500 mb-4" />
        Driver not found.
      </div>
    );
  }

  const logColumns = [
    {
      key: 'vehicle_name',
      label: 'Vehicle Name',
      render: (_: any, row: any) => <span className="font-semibold text-slate-800">{row.vehicle?.name || 'Unknown'}</span>
    },
    {
      key: 'assigned_date',
      label: 'Assigned Date',
      render: (val: string) => <span>{val ? new Date(val).toLocaleDateString() : '-'}</span>
    },
    {
      key: 'relieved_date',
      label: 'Relieved Date',
      render: (val: string) => <span>{val ? new Date(val).toLocaleDateString() : <Tag className="bg-emerald-50 text-emerald-700">Current</Tag>}</span>
    },
    {
      key: 'reason_for_change',
      label: 'Reason for Change',
      render: (val: string) => <span>{val || '-'}</span>
    }
  ];

  const leaveColumns = [
    {
      key: 'date',
      label: 'Leave Date',
      render: (val: string) => <span>{val ? new Date(val).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '-'}</span>
    },
    {
      key: 'leave_type',
      label: 'Type',
      render: (val: string) => (
        <Tag className={`text-[10px] font-bold px-2 py-0.5 border ${ 
          val === 'full' 
            ? 'bg-rose-50 text-rose-700 border-rose-200' 
            : 'bg-orange-50 text-orange-700 border-orange-200'
        }`}>
          {val === 'full' ? 'Full Day' : 'Half Day'}
        </Tag>
      )
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (val: string) => <span className="text-slate-500">{val || '-'}</span>
    }
  ];

  const adjustmentColumns = [
    {
      key: 'month',
      label: 'Month',
      render: (val: string) => <span className="font-semibold">{val}</span>
    },
    {
      key: 'adjustment_amount',
      label: 'Amount',
      render: (val: string) => (
        <span className={`font-semibold ${parseFloat(val) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {parseFloat(val) >= 0 ? '+' : ''}₹{parseFloat(val).toFixed(2)}
        </span>
      )
    },
    {
      key: 'reason',
      label: 'Reason / Description',
      render: (val: string) => <span className="text-slate-500">{val || '-'}</span>
    }
  ];

  const transactionColumns = [
    {
      key: 'payment_for_date',
      label: 'Date',
      render: (val: string, row: any) => {
        const dateToShow = val || row.created_at;
        return <span>{dateToShow ? new Date(dateToShow).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '-'}</span>;
      }
    },
    {
      key: 'transaction_type',
      label: 'Transaction Type',
      render: (val: string) => {
        if (val === 'driver_wage') {
          return <Tag className="bg-blue-50 text-blue-700 border-blue-200">Wage Paid</Tag>;
        }
        if (val === 'auto_daily') {
          return <Tag className="bg-amber-50 text-amber-700 border-amber-200">Daily Rent Paid</Tag>;
        }
        return <Tag className="bg-slate-50 text-slate-700 border-slate-200">{val}</Tag>;
      }
    },
    {
      key: 'payment_method',
      label: 'Method',
      render: (val: string) => <span className="capitalize font-medium">{val}</span>
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (val: string, row: any) => (
        <span className={`font-bold ${row.transaction_type === 'driver_wage' ? 'text-rose-600' : 'text-emerald-600'}`}>
          {row.transaction_type === 'driver_wage' ? '-' : '+'}₹{parseFloat(val).toFixed(2)}
        </span>
      )
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
          onClick={() => navigate('/drivers')}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={driver.name}
          breadcrumbs={[
            { label: 'Drivers', path: '/drivers' },
            { label: driver.name },
          ]}
          action={
            <Button
              variant="default"
              className="rounded-xl border border-slate-200"
              onClick={() => navigate(`/drivers/${driver.id}/edit`)}
            >
              Edit Details
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-6 space-y-6">
          <h3 className="text-lg font-bold text-slate-900">Driver Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Full Name</p>
                <p className="text-sm font-bold text-slate-800">{driver.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                <Phone className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">WhatsApp Phone</p>
                <p className="text-sm font-bold text-slate-800">{driver.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">License Number</p>
                <p className="text-sm font-bold text-slate-800">{driver.license_number || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                <DollarSign className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Daily Wage</p>
                <p className="text-sm font-bold text-slate-800">{driver.daily_wage ? `₹${driver.daily_wage}` : 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
            <span className="text-sm font-medium text-slate-500">Employment Status</span>
            <Tag className={driver.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
              <span className="font-semibold">{driver.is_active ? 'Active' : 'Inactive'}</span>
            </Tag>
          </div>
        </Card>

        {/* Current Assignment Card */}
        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Current Assignment</h3>

          {driver.current_vehicle ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold border border-blue-100">
                  <Bus className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 capitalize">{driver.current_vehicle.name}</h4>
                  <p className="text-xs text-slate-400 capitalize">Type: {driver.current_vehicle.type}</p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Assigned: {new Date(driver.current_vehicle.updated_at).toLocaleDateString()}</span>
                </div>
              </div>

              <Button 
                variant="default" 
                className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl py-2.5 flex items-center justify-center gap-2"
                onClick={() => setRelieveOpen(true)}
              >
                <UserMinus className="w-4 h-4" />
                Relieve from Vehicle
              </Button>
            </div>
          ) : (
            <div className="text-center py-10 space-y-4">
              <Bus className="w-12 h-12 mx-auto text-slate-300" />
              <div>
                <h4 className="font-bold text-slate-800">Unassigned</h4>
                <p className="text-xs text-slate-400 mt-1">This driver is not currently assigned to any vehicles.</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Tabs / Detailed Activity Log */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          {[
            { id: 'assignments', label: 'Assignment History' },
            { id: 'leaves', label: 'Leaves History' },
            { id: 'adjustments', label: 'Wage Adjustments' },
            { id: 'payments', label: 'Payments & Rent Feed' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-6 text-sm font-bold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-2">
          {activeTab === 'assignments' && (
            <DataTable
              columns={logColumns}
              data={logs}
              emptyMessage="No past vehicle assignments recorded."
            />
          )}

          {activeTab === 'leaves' && (
            <DataTable
              columns={leaveColumns}
              data={leaves}
              emptyMessage="No leaves recorded for this driver."
            />
          )}

          {activeTab === 'adjustments' && (
            <DataTable
              columns={adjustmentColumns}
              data={adjustments}
              emptyMessage="No wage adjustments recorded for this driver."
            />
          )}

          {activeTab === 'payments' && (
            <DataTable
              columns={transactionColumns}
              data={transactions}
              emptyMessage="No payments or rent transactions recorded for this driver."
            />
          )}
        </Card>
      </div>

      {/* Relieve Dialog */}
      <Dialog
        isOpen={relieveOpen}
        onClose={() => setRelieveOpen(false)}
        contentClassName="rounded-2xl"
      >
        <h3 className="text-lg font-bold mb-4">Relieve Driver</h3>
        <form onSubmit={handleRelieveSubmit} className="space-y-6 pt-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Reason for Relieving <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. End of shift, shift rotation, leave"
              value={relieveReason}
              onChange={(e) => setRelieveReason(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button size="sm" type="button" onClick={() => setRelieveOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              variant="solid" 
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
              type="submit"
              disabled={relieveMutation.isPending}
            >
              {relieveMutation.isPending ? 'Relieving...' : 'Relieve'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default DriverDetailPage;

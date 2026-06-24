// src/pages/drivers/DriversPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, User, Phone, Clipboard, Bus, Trash2, CheckCircle, XCircle, Calendar, AlertCircle } from 'lucide-react';
import api from '@/api/axios';
import { DRIVERS, VEHICLES } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tag from '@/components/ui/Tag';
import Dialog from '@/components/ui/Dialog';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const DriversPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'assigned' | 'unassigned'>('all');

  // Dialog / Action states
  const [deleteDriverId, setDeleteDriverId] = useState<string | number | null>(null);
  const [assignDriverId, setAssignDriverId] = useState<string | number | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | number>('');
  const [leavesDriverId, setLeavesDriverId] = useState<string | number | null>(null);
  const [adjustmentDriverId, setAdjustmentDriverId] = useState<string | number | null>(null);

  // Leaves Form states
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveType, setLeaveType] = useState<'full' | 'half'>('full');
  const [leaveNotes, setLeaveNotes] = useState('');

  // Adjustment Form states
  const [adjMonth, setAdjMonth] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');

  // Fetch Drivers
  const { data: driversResponse, isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await api.get(DRIVERS.LIST);
      return res.data;
    },
  });

  const driversData = driversResponse?.data?.drivers || [];
  const drivers = Array.isArray(driversData) ? driversData : Object.values(driversData);

  // Fetch Vehicles for assignment
  const { data: vehiclesResponse } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get(VEHICLES.LIST);
      return res.data;
    },
    enabled: assignDriverId !== null,
  });

  const vehiclesData = vehiclesResponse?.data?.vehicles || [];
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : Object.values(vehiclesData);
  const unassignedVehicles = vehicles.filter((v: any) => v.is_active && !v.current_driver);

  // Delete/Deactivate Driver Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      return await api.delete(DRIVERS.DELETE(id));
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.push(
        <Notification type="success" title="Success">
          {res.data?.message || 'Driver profile status updated.'}
        </Notification>
      );
      setDeleteDriverId(null);
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to update driver status.'}
        </Notification>
      );
    },
  });

  // Assign Driver Mutation
  const assignMutation = useMutation({
    mutationFn: async ({ driverId, vehicleId }: { driverId: string | number; vehicleId: string | number }) => {
      return await api.post(DRIVERS.ASSIGN(driverId), { vehicle_id: vehicleId });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.push(
        <Notification type="success" title="Driver Assigned">
          {res.data?.message || 'Driver assigned to vehicle successfully.'}
        </Notification>
      );
      setAssignDriverId(null);
      setSelectedVehicleId('');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Assignment Failed">
          {err.response?.data?.message || 'Failed to assign driver.'}
        </Notification>
      );
    },
  });

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignDriverId || !selectedVehicleId) return;
    assignMutation.mutate({ driverId: assignDriverId, vehicleId: selectedVehicleId });
  };

  // Queries and mutations for Driver Leaves
  const { data: leavesResponse, refetch: refetchLeaves } = useQuery({
    queryKey: ['driver-leaves', leavesDriverId],
    queryFn: async () => {
      const res = await api.get(DRIVERS.LEAVES_LIST(leavesDriverId!));
      return res.data;
    },
    enabled: leavesDriverId !== null,
  });
  const leaves = leavesResponse?.data || [];

  const logLeaveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post(DRIVERS.LEAVE_CREATE, payload);
      return res.data;
    },
    onSuccess: () => {
      refetchLeaves();
      setLeaveDate('');
      setLeaveNotes('');
      toast.push(
        <Notification type="success" title="Leave Logged">
          Driver leave recorded successfully.
        </Notification>
      );
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to log leave.'}
        </Notification>
      );
    }
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: async (id: number | string) => {
      const res = await api.delete(DRIVERS.LEAVE_DELETE(id));
      return res.data;
    },
    onSuccess: () => {
      refetchLeaves();
      toast.push(
        <Notification type="success" title="Leave Deleted">
          Leave record removed successfully.
        </Notification>
      );
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to delete leave.'}
        </Notification>
      );
    }
  });

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leavesDriverId || !leaveDate || !leaveType) return;
    logLeaveMutation.mutate({
      driver_id: leavesDriverId,
      date: leaveDate,
      leave_type: leaveType,
      notes: leaveNotes,
    });
  };

  // Queries and mutations for Driver Wage Adjustments
  const { data: adjustmentsResponse, refetch: refetchAdjustments } = useQuery({
    queryKey: ['driver-adjustments', adjustmentDriverId],
    queryFn: async () => {
      const res = await api.get(DRIVERS.ADJUSTMENTS_LIST(adjustmentDriverId!));
      return res.data;
    },
    enabled: adjustmentDriverId !== null,
  });
  const adjustments = adjustmentsResponse?.data || [];

  const logAdjustmentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post(DRIVERS.ADJUSTMENT_CREATE, payload);
      return res.data;
    },
    onSuccess: () => {
      refetchAdjustments();
      setAdjAmount('');
      setAdjReason('');
      toast.push(
        <Notification type="success" title="Adjustment Recorded">
          Driver wage adjustment saved successfully.
        </Notification>
      );
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to save adjustment.'}
        </Notification>
      );
    }
  });

  const handleAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentDriverId || !adjMonth || !adjAmount) return;
    logAdjustmentMutation.mutate({
      driver_id: adjustmentDriverId,
      month: adjMonth,
      adjustment_amount: parseFloat(adjAmount),
      reason: adjReason,
    });
  };

  // Filter lists
  const filteredDrivers = React.useMemo(() => {
    let list = drivers;

    if (filterType === 'assigned') {
      list = list.filter((d: any) => d.current_vehicle_id !== null);
    } else if (filterType === 'unassigned') {
      list = list.filter((d: any) => !d.current_vehicle_id);
    }

    if (searchTerm.trim() !== '') {
      list = list.filter((d: any) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.phone.includes(searchTerm)
      );
    }

    return list;
  }, [drivers, filterType, searchTerm]);

  const columns = [
    {
      key: 'name',
      label: 'Driver Name',
      render: (val: string, row: any) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{val}</span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone Number',
      render: (val: string) => <span>{val}</span>,
    },
    {
      key: 'license_number',
      label: 'License No.',
      render: (val: string) => <span>{val || <span className="text-slate-400 italic">None</span>}</span>,
    },
    {
      key: 'current_vehicle',
      label: 'Current Vehicle',
      render: (_: any, row: any) => {
        if (row.current_vehicle) {
          return (
            <Tag className="bg-blue-50 text-blue-700 border-blue-200">
              <span className="flex items-center gap-1 capitalize font-medium">
                <Bus className="w-3 h-3" />
                {row.current_vehicle.name}
              </span>
            </Tag>
          );
        }
        return (
          <Tag className="bg-slate-100 text-slate-500 border-slate-200">
            Unassigned
          </Tag>
        );
      },
    },
    {
      key: 'daily_wage',
      label: 'Daily Wage',
      render: (val: any) => <span>{val ? `₹${Number(val).toFixed(2)}` : 'N/A'}</span>,
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val: boolean) => (
        <Tag className={val ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}>
          <span className="font-semibold">{val ? 'Active' : 'Inactive'}</span>
        </Tag>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            size="xs" 
            variant="default"
            className="hover:text-blue-600 font-semibold px-2 py-1"
            onClick={() => navigate(`/drivers/${row.id}`)}
          >
            View
          </Button>
          <Button 
            size="xs" 
            variant="default"
            className="hover:text-blue-600 font-semibold px-2 py-1"
            onClick={() => navigate(`/drivers/${row.id}/edit`)}
          >
            Edit
          </Button>
          {!row.current_vehicle_id && row.is_active && (
            <Button 
              size="xs" 
              variant="default"
              className="text-blue-600 hover:bg-blue-50 font-semibold px-2 py-1"
              onClick={() => setAssignDriverId(row.id)}
            >
              Assign Vehicle
            </Button>
          )}
          {row.is_active && (
            <Button 
              size="xs" 
              variant="default"
              className="text-amber-600 hover:bg-amber-50 font-semibold px-2 py-1"
              onClick={() => setLeavesDriverId(row.id)}
            >
              Leaves
            </Button>
          )}
          {row.is_active && (
            <Button 
              size="xs" 
              variant="default"
              className="text-indigo-600 hover:bg-indigo-50 font-semibold px-2 py-1"
              onClick={() => setAdjustmentDriverId(row.id)}
            >
              Adjust Wage
            </Button>
          )}
          {row.is_active && (
            <Button 
              size="xs" 
              variant="default"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-semibold px-2 py-1"
              onClick={() => setDeleteDriverId(row.id)}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Drivers"
        breadcrumbs={[{ label: 'Drivers' }]}
        action={
          <Button
            variant="solid"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 rounded-xl py-2 px-4 shadow-lg shadow-blue-500/10"
            onClick={() => navigate('/drivers/new')}
          >
            <Plus className="w-4 h-4" />
            Add Driver
          </Button>
        }
      />

      {/* Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <div className="relative max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <Input
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60">
          {(['all', 'assigned', 'unassigned'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                filterType === type
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Main Drivers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredDrivers}
          loading={isLoading}
          emptyMessage="No drivers matched your filter criteria."
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDriverId !== null}
        title="Delete Driver Profile?"
        description="Are you sure you want to deactivate this driver? This action will set their status to Inactive and remove them from any current vehicle assignments."
        confirmLabel="Deactivate"
        dangerous={true}
        onConfirm={() => {
          if (deleteDriverId) deleteMutation.mutate(deleteDriverId);
        }}
        onCancel={() => setDeleteDriverId(null)}
      />

      {/* Quick Assign Vehicle Dialog */}
      <Dialog
        isOpen={assignDriverId !== null}
        onClose={() => setAssignDriverId(null)}
        contentClassName="rounded-2xl"
      >
        <h3 className="text-lg font-bold mb-4">Assign Driver to Vehicle</h3>
        <form onSubmit={handleAssignSubmit} className="space-y-6 pt-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Available Vehicle
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Choose a vehicle...</option>
              {unassignedVehicles.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.type})
                </option>
              ))}
            </select>
            {unassignedVehicles.length === 0 && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                All vehicles are currently assigned to drivers.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button size="sm" type="button" onClick={() => setAssignDriverId(null)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              variant="solid" 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              type="submit"
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Driver Leaves Modal */}
      <Dialog
        isOpen={leavesDriverId !== null}
        onClose={() => {
          setLeavesDriverId(null);
          setLeaveDate('');
          setLeaveNotes('');
        }}
        contentClassName="rounded-2xl max-w-lg w-full"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <Calendar className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Manage Driver Leaves</h3>
        </div>

        {/* Add Leave Form */}
        <form onSubmit={handleLeaveSubmit} className="space-y-4 mb-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Log New Leave</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date</label>
              <Input
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as 'full' | 'half')}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="full">Full Day Leave</option>
                <option value="half">Half Day Leave</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Notes (Optional)</label>
            <Input
              placeholder="e.g. Personal emergency, sick leave..."
              value={leaveNotes}
              onChange={(e) => setLeaveNotes(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <Button
            size="sm"
            variant="solid"
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl w-full flex items-center justify-center font-bold"
            type="submit"
            disabled={logLeaveMutation.isPending}
          >
            {logLeaveMutation.isPending ? 'Saving...' : 'Add Leave'}
          </Button>
        </form>

        {/* Leaves List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Leave History</h4>
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
            {leaves.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4">No leaves recorded yet.</p>
            ) : (
              leaves.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between pt-2.5 first:pt-0">
                  <div>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(l.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </span>
                    <Tag className={`ml-2 text-[10px] font-bold px-2 py-0.5 border ${ 
                      l.leave_type === 'full' 
                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                      {l.leave_type === 'full' ? 'Full Day' : 'Half Day'}
                    </Tag>
                    {l.notes && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{l.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteLeaveMutation.mutate(l.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    disabled={deleteLeaveMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </Dialog>

      {/* Driver Wage Adjustment Modal */}
      <Dialog
        isOpen={adjustmentDriverId !== null}
        onClose={() => {
          setAdjustmentDriverId(null);
          setAdjMonth('');
          setAdjAmount('');
          setAdjReason('');
        }}
        contentClassName="rounded-2xl max-w-lg w-full"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <AlertCircle className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Adjust Driver Wage</h3>
        </div>

        {/* Add Adjustment Form */}
        <form onSubmit={handleAdjustmentSubmit} className="space-y-4 mb-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">New Adjustment</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Month</label>
              <Input
                type="month"
                value={adjMonth}
                onChange={(e) => setAdjMonth(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Amount (₹, negative for penalty)</label>
              <Input
                type="number"
                placeholder="e.g. 500 or -200"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Reason / Note</label>
            <Input
              placeholder="e.g. Attendance bonus, vehicle damage penalty..."
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <Button
            size="sm"
            variant="solid"
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl w-full flex items-center justify-center font-bold"
            type="submit"
            disabled={logAdjustmentMutation.isPending}
          >\n            {logAdjustmentMutation.isPending ? 'Saving...' : 'Save Adjustment'}\n          </Button>
        </form>

        {/* Adjustments List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Adjustment History</h4>
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
            {adjustments.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4">No adjustments recorded yet.</p>
            ) : (
              adjustments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between pt-2.5 first:pt-0">
                  <div>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {a.month}
                    </span>
                    <Tag className={`ml-2 text-[10px] font-bold px-2 py-0.5 border ${ 
                      parseFloat(a.adjustment_amount) >= 0 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {parseFloat(a.adjustment_amount) >= 0 ? '+' : ''}₹{parseFloat(a.adjustment_amount).toFixed(2)}
                    </Tag>
                    {a.reason && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{a.reason}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default DriversPage;

// src/pages/drivers/DriversPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, User, Phone, Clipboard, Bus, Trash2, CheckCircle, XCircle } from 'lucide-react';
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

  // Fetch Drivers
  const { data: driversResponse, isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await api.get(DRIVERS.LIST);
      return res.data;
    },
  });

  const drivers = driversResponse?.data || [];

  // Fetch Vehicles for assignment
  const { data: vehiclesResponse } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get(VEHICLES.LIST);
      return res.data;
    },
    enabled: assignDriverId !== null,
  });

  const vehicles = vehiclesResponse?.data || [];
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
        <div className="flex items-center gap-2">
          <Button 
            size="xs" 
            variant="default"
            className="hover:text-blue-600"
            onClick={() => navigate(`/drivers/${row.id}`)}
          >
            View
          </Button>
          <Button 
            size="xs" 
            variant="default"
            className="hover:text-blue-600"
            onClick={() => navigate(`/drivers/${row.id}/edit`)}
          >
            Edit
          </Button>
          {!row.current_vehicle_id && row.is_active && (
            <Button 
              size="xs" 
              variant="default"
              className="text-blue-600 hover:bg-blue-50"
              onClick={() => setAssignDriverId(row.id)}
            >
              Assign Vehicle
            </Button>
          )}
          {row.is_active && (
            <Button 
              size="xs" 
              variant="default"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
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
    </div>
  );
};

export default DriversPage;

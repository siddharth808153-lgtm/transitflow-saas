// src/pages/passengers/PassengersPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users, Car, Phone, Trash2, Edit, Eye, DollarSign, AlertCircle } from 'lucide-react';
import api from '@/api/axios';
import { PASSENGERS, VEHICLES } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import DataTable from '@/components/shared/DataTable';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tag from '@/components/ui/Tag';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const PassengersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | number>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deletePassengerId, setDeletePassengerId] = useState<string | number | null>(null);

  // Fetch Passengers
  const { data: passengersResponse, isLoading } = useQuery({
    queryKey: ['passengers'],
    queryFn: async () => {
      const res = await api.get(PASSENGERS.LIST);
      return res.data;
    },
  });

  // Fetch Vehicles (to filter by Autos)
  const { data: vehiclesResponse } = useQuery({
    queryKey: ['active-autos-filter'],
    queryFn: async () => {
      const res = await api.get(VEHICLES.LIST);
      return res.data;
    },
  });

  const passengers = passengersResponse?.data || [];
  const autos = (vehiclesResponse?.data || []).filter((v: any) => v.type === 'auto');

  // Deactivate/Delete Passenger Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      return await api.delete(PASSENGERS.DELETE(id));
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['passengers'] });
      toast.push(
        <Notification type="success" title="Success">
          {res.data?.message || 'Passenger deleted successfully.'}
        </Notification>
      );
      setDeletePassengerId(null);
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to delete passenger.'}
        </Notification>
      );
    },
  });

  // Filter passengers
  const filteredPassengers = React.useMemo(() => {
    return passengers.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm);
      const matchesVehicle = selectedVehicleId ? String(p.vehicle_id) === String(selectedVehicleId) : true;
      const matchesStatus = statusFilter === 'all' 
        ? true 
        : statusFilter === 'active' 
          ? p.is_active 
          : !p.is_active;

      return matchesSearch && matchesVehicle && matchesStatus;
    });
  }, [passengers, searchTerm, selectedVehicleId, statusFilter]);

  // Statistics
  const stats = React.useMemo(() => {
    const total = passengers.length;
    const active = passengers.filter((p: any) => p.is_active).length;
    const revenuePotential = passengers
      .filter((p: any) => p.is_active)
      .reduce((sum: number, p: any) => sum + Number(p.daily_fare || 0), 0);

    return { total, active, revenuePotential };
  }, [passengers]);

  const columns = [
    {
      key: 'name',
      label: 'Passenger Name',
      render: (val: string) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{val}</span>
      ),
    },
    {
      key: 'phone',
      label: 'Phone Number',
      render: (val: string) => <span>{val}</span>,
    },
    {
      key: 'vehicle',
      label: 'Assigned Auto',
      render: (_: any, row: any) => {
        if (row.vehicle) {
          return (
            <Tag className="bg-amber-50 text-amber-700 border border-amber-200">
              <span className="flex items-center gap-1 font-medium">
                <Car className="w-3.5 h-3.5" />
                {row.vehicle.name}
              </span>
            </Tag>
          );
        }
        return (
          <Tag className="bg-slate-100 text-slate-500 border border-slate-200">
            Unassigned
          </Tag>
        );
      },
    },
    {
      key: 'daily_fare',
      label: 'Daily Fare',
      render: (val: any) => (
        <span className="font-semibold text-amber-600">
          ₹{Number(val).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'app_account',
      label: 'App Account',
      render: (_: any, row: any) => {
        const hasAccount = !!row.user_id;
        return (
          <Tag className={hasAccount ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}>
            <span className="font-semibold">{hasAccount ? 'Yes' : 'No'}</span>
          </Tag>
        );
      },
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
            onClick={() => navigate(`/passengers/${row.id}`)}
          >
            View
          </Button>
          <Button 
            size="xs" 
            variant="default"
            className="hover:text-blue-600"
            onClick={() => navigate(`/passengers/${row.id}/edit`)}
          >
            Edit
          </Button>
          <Button 
            size="xs" 
            variant="default"
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            onClick={() => setDeletePassengerId(row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Auto Passengers"
        breadcrumbs={[{ label: 'Passengers' }]}
        action={
          <Button
            variant="solid"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 rounded-xl py-2 px-4 shadow-lg shadow-blue-500/10"
            onClick={() => navigate('/passengers/new')}
          >
            <Plus className="w-4 h-4" />
            Add Passenger
          </Button>
        }
      />

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="Total Passengers"
          value={isLoading ? '...' : stats.total}
          icon={<Users className="w-6 h-6" />}
          color="slate"
        />
        <StatCard
          title="Active Passengers"
          value={isLoading ? '...' : stats.active}
          icon={<Users className="w-6 h-6" />}
          color="orange"
        />
        <StatCard
          title="Daily Revenue Potential"
          value={isLoading ? '...' : `₹${stats.revenuePotential.toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative max-w-sm w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <Input
              placeholder="Search by passenger name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {/* Auto Selector Dropdown */}
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-xs"
          >
            <option value="">All Autos</option>
            {autos.map((auto: any) => (
              <option key={auto.id} value={auto.id}>
                {auto.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60 w-fit">
          {([
            { label: 'All', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' }
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                statusFilter === opt.value
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Passengers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredPassengers}
          loading={isLoading}
          emptyMessage="No auto passengers found matching your filters."
        />
      </div>

      {/* Confirm Deactivation */}
      <ConfirmDialog
        open={deletePassengerId !== null}
        title="Delete Passenger Profile?"
        description="Are you sure you want to delete this passenger? This action will remove their current auto assignments and delete their logs. This action is irreversible."
        confirmLabel="Delete"
        dangerous={true}
        onConfirm={() => {
          if (deletePassengerId) deleteMutation.mutate(deletePassengerId);
        }}
        onCancel={() => setDeletePassengerId(null)}
      />
    </div>
  );
};

export default PassengersPage;

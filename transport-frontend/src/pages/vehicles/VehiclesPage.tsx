// src/pages/vehicles/VehiclesPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Bus, Car, Users, Settings } from 'lucide-react';
import api from '@/api/axios';
import { VEHICLES } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import DataTable from '@/components/shared/DataTable';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tag from '@/components/ui/Tag';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const VehiclesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [deactivateId, setDeactivateId] = useState<number | string | null>(null);

  // Fetch vehicles
  const { data: response, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get(VEHICLES.LIST);
      return res.data;
    },
  });

  const vehicles = response?.data || [];

  // Deactivate/Delete Mutation
  const deactivateMutation = useMutation({
    mutationFn: async (id: number | string) => {
      return await api.delete(VEHICLES.DELETE(id));
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.push(
        <Notification type="success" title="Success">
          {res.data?.message || 'Vehicle status updated successfully.'}
        </Notification>
      );
      setDeactivateId(null);
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to update vehicle status.'}
        </Notification>
      );
    },
  });

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = vehicles.length;
    const activeBuses = vehicles.filter((v: any) => v.type === 'bus' && v.is_active).length;
    const activeAutos = vehicles.filter((v: any) => v.type === 'auto' && v.is_active).length;
    const totalCapacity = vehicles.reduce((sum: number, v: any) => sum + (v.capacity || 0), 0);

    return { total, activeBuses, activeAutos, totalCapacity };
  }, [vehicles]);

  // Filter vehicles by search term
  const filteredVehicles = React.useMemo(() => {
    return vehicles.filter((v: any) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vehicles, searchTerm]);

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (val: string, row: any) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{val}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (val: string) => {
        const isBus = val === 'bus';
        return (
          <Tag className={isBus ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}>
            <span className="flex items-center gap-1.5 capitalize font-medium">
              {isBus ? <Bus className="w-3.5 h-3.5" /> : <Car className="w-3.5 h-3.5" />}
              {val}
            </span>
          </Tag>
        );
      },
    },
    {
      key: 'wage_type',
      label: 'Wage Type',
      render: (val: string) => {
        const isMonthly = val === 'monthly';
        return (
          <Tag className={isMonthly ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}>
            <span className="capitalize font-medium">{val}</span>
          </Tag>
        );
      },
    },
    {
      key: 'capacity',
      label: 'Capacity',
      render: (val: any) => <span>{val ? `${val} Passengers` : 'N/A'}</span>,
    },
    {
      key: 'driver',
      label: 'Current Driver',
      render: (_: any, row: any) => (
        <span>{row.current_driver?.name || <span className="text-slate-400 italic">Unassigned</span>}</span>
      ),
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
            onClick={() => navigate(`/vehicles/${row.id}`)}
          >
            View
          </Button>
          <Button 
            size="xs" 
            variant="default"
            className="hover:text-blue-600"
            onClick={() => navigate(`/vehicles/${row.id}/edit`)}
          >
            Edit
          </Button>
          {row.is_active && (
            <Button 
              size="xs" 
              variant="default"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => setDeactivateId(row.id)}
            >
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Vehicles"
        breadcrumbs={[{ label: 'Vehicles' }]}
        action={
          <Button
            variant="solid"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 rounded-xl py-2 px-4 shadow-lg shadow-blue-500/10"
            onClick={() => navigate('/vehicles/new')}
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Vehicles"
          value={isLoading ? '...' : stats.total}
          icon={<Bus className="w-6 h-6" />}
          color="slate"
        />
        <StatCard
          title="Active Buses"
          value={isLoading ? '...' : stats.activeBuses}
          icon={<Bus className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Active Autos"
          value={isLoading ? '...' : stats.activeAutos}
          icon={<Car className="w-6 h-6" />}
          color="orange"
        />
        <StatCard
          title="Total Capacity"
          value={isLoading ? '...' : stats.totalCapacity}
          icon={<Users className="w-6 h-6" />}
          color="green"
        />
      </div>

      {/* Table Actions Row */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <Input
            placeholder="Search vehicles by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      {/* Main Vehicles Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredVehicles}
          loading={isLoading}
          emptyMessage="No vehicles registered yet. Click 'Add Vehicle' to get started."
        />
      </div>

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        open={deactivateId !== null}
        title="Deactivate Vehicle?"
        description="Are you sure you want to deactivate this vehicle? This will also unassign the current driver."
        confirmLabel="Deactivate"
        dangerous={true}
        onConfirm={() => {
          if (deactivateId) deactivateMutation.mutate(deactivateId);
        }}
        onCancel={() => setDeactivateId(null)}
      />
    </div>
  );
};

export default VehiclesPage;

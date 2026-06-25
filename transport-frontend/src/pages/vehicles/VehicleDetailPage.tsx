// src/pages/vehicles/VehicleDetailPage.tsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Bus, 
  Car, 
  User, 
  Phone, 
  Calendar, 
  FileText, 
  UserPlus, 
  UserMinus, 
  Users, 
  AlertCircle 
} from 'lucide-react';
import api from '@/api/axios';
import { VEHICLES, DRIVERS } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import DataTable from '@/components/shared/DataTable';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const VehicleDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Dialog states
  const [assignOpen, setAssignOpen] = useState(false);
  const [relieveOpen, setRelieveOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | number>('');
  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [relieveReason, setRelieveReason] = useState('');

  // Fetch vehicle detail
  const { data: vehicleResponse, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      const res = await api.get(VEHICLES.DETAIL(id!));
      return res.data;
    },
  });

  // Fetch unassigned drivers for assign dropdown
  const { data: driversResponse } = useQuery({
    queryKey: ['unassigned-drivers'],
    queryFn: async () => {
      const res = await api.get(DRIVERS.LIST);
      return res.data;
    },
    enabled: assignOpen,
  });

  // Fetch driver history log
  const { data: logsResponse, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['vehicle-logs', id],
    queryFn: async () => {
      const res = await api.get(VEHICLES.LOGS(id!), { params: { event: 'driver' } });
      return res.data;
    },
  });

  // Fetch current student/passenger list
  const { data: studentsResponse, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['vehicle-students', id],
    queryFn: async () => {
      const res = await api.get(VEHICLES.CURRENT_STUDENTS(id!));
      return res.data;
    },
  });

  const vehicle = vehicleResponse?.data;
  const logs = logsResponse?.data || [];
  const students = studentsResponse?.data || [];
  const driversData = driversResponse?.data?.drivers || [];
  const driversList = Array.isArray(driversData) ? driversData : Object.values(driversData);
  const unassignedDrivers = driversList.filter((d: any) => !d.current_vehicle_id);

  // Assign Driver Mutation
  const assignMutation = useMutation({
    mutationFn: async ({ driverId, assignedDate }: { driverId: string | number; assignedDate: string }) => {
      return await api.post(DRIVERS.ASSIGN(driverId), { vehicle_id: id, assigned_date: assignedDate });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-logs', id] });
      toast.push(
        <Notification type="success" title="Driver Assigned">
          {res.data?.message || 'Driver assigned to vehicle successfully.'}
        </Notification>
      );
      setAssignOpen(false);
      setSelectedDriverId('');
      setAssignDate(new Date().toISOString().split('T')[0]);
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Assignment Failed">
          {err.response?.data?.message || 'Failed to assign driver.'}
        </Notification>
      );
    },
  });

  // Relieve Driver Mutation
  const relieveMutation = useMutation({
    mutationFn: async (driverId: string | number) => {
      return await api.post(DRIVERS.RELIEVE(driverId), { reason: relieveReason });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-logs', id] });
      toast.push(
        <Notification type="success" title="Driver Relieved">
          {res.data?.message || 'Driver relieved from vehicle.'}
        </Notification>
      );
      setRelieveOpen(false);
      setRelieveReason('');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Failed to Relieve">
          {err.response?.data?.message || 'Failed to relieve driver.'}
        </Notification>
      );
    },
  });

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) {
      toast.push(<Notification type="danger" title="Validation Error">Please select a driver.</Notification>);
      return;
    }
    assignMutation.mutate({ driverId: selectedDriverId, assignedDate: assignDate });
  };

  const handleRelieveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle?.current_driver?.id) return;
    relieveMutation.mutate(vehicle.current_driver.id);
  };

  if (isLoading) {
    return <div className="text-center py-20">Loading vehicle details...</div>;
  }

  if (!vehicle) {
    return (
      <div className="text-center py-20 text-slate-500">
        <AlertCircle className="w-12 h-12 mx-auto text-rose-500 mb-4" />
        Vehicle not found.
      </div>
    );
  }

  // Table structures
  const logColumns = [
    {
      key: 'driver_name',
      label: 'Driver Name',
      render: (_: any, row: any) => <span className="font-semibold text-slate-800">{row.driver?.name || 'Unknown'}</span>
    },
    {
      key: 'assigned_at',
      label: 'Assigned Date',
      render: (val: string) => <span>{val ? new Date(val).toLocaleDateString() : '-'}</span>
    },
    {
      key: 'relieved_at',
      label: 'Relieved Date',
      render: (val: string) => <span>{val ? new Date(val).toLocaleDateString() : <Tag className="bg-emerald-50 text-emerald-700">Current</Tag>}</span>
    },
    {
      key: 'reason',
      label: 'Reason for Change',
      render: (val: string) => <span>{val || '-'}</span>
    }
  ];

  const studentColumns = [
    {
      key: 'name',
      label: 'Passenger Name',
      render: (val: string) => <span className="font-semibold text-slate-800">{val}</span>
    },
    {
      key: 'phone',
      label: 'WhatsApp Phone',
      render: (val: string) => <span>{val || '-'}</span>
    },
    {
      key: 'role',
      label: 'Role/Type',
      render: (val: string) => <span className="capitalize">{val}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate('/vehicles')}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={vehicle.name}
          breadcrumbs={[
            { label: 'Vehicles', path: '/vehicles' },
            { label: vehicle.name },
          ]}
          action={
            <Button
              variant="default"
              className="rounded-xl border border-slate-200"
              onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
            >
              Edit Details
            </Button>
          }
        />
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="overview">
        <Tabs.TabList className="border-b border-slate-200 dark:border-slate-800 pb-px mb-6 flex gap-6">
          <Tabs.TabNav value="overview" className="pb-3 text-sm font-semibold tracking-wide border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-slate-500 cursor-pointer">
            Overview
          </Tabs.TabNav>
          <Tabs.TabNav value="logs" className="pb-3 text-sm font-semibold tracking-wide border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-slate-500 cursor-pointer">
            Driver History
          </Tabs.TabNav>
          <Tabs.TabNav value="students" className="pb-3 text-sm font-semibold tracking-wide border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-slate-500 cursor-pointer">
            Passenger List
          </Tabs.TabNav>
        </Tabs.TabList>

        {/* Overview Content */}
        <Tabs.TabContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Info Card */}
            <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-6 space-y-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Vehicle Specifications</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                    {vehicle.type === 'bus' ? <Bus className="w-5 h-5 text-blue-600" /> : <Car className="w-5 h-5 text-orange-500" />}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Vehicle Type</p>
                    <p className="text-sm font-bold text-slate-800 capitalize">{vehicle.type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                    <Users className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Capacity</p>
                    <p className="text-sm font-bold text-slate-800">{vehicle.capacity ? `${vehicle.capacity} Seats` : 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                    <FileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Wage / Fee Structure</p>
                    <p className="text-sm font-bold text-slate-800 capitalize">{vehicle.wage_type} wages</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Registered Date</p>
                    <p className="text-sm font-bold text-slate-800">{new Date(vehicle.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Operating Status</span>
                <Tag className={vehicle.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                  <span className="font-semibold">{vehicle.is_active ? 'Active' : 'Inactive'}</span>
                </Tag>
              </div>
            </Card>

            {/* Current Driver Card */}
            <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Current Driver</h3>

              {vehicle.current_driver ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-lg uppercase border border-blue-100">
                      {vehicle.current_driver.name.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{vehicle.current_driver.name}</h4>
                      <p className="text-xs text-slate-400">License: {vehicle.current_driver.driver_profile?.license_number || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{vehicle.current_driver.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Assigned: {new Date(vehicle.current_driver.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="solid" 
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs py-2.5"
                      onClick={() => setAssignOpen(true)}
                    >
                      Change Driver
                    </Button>
                    <Button 
                      variant="default"
                      className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs py-2.5"
                      onClick={() => setRelieveOpen(true)}
                    >
                      <span className="flex items-center justify-center gap-1">
                        <UserMinus className="w-3.5 h-3.5" />
                        Relieve
                      </span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-4">
                  <User className="w-12 h-12 mx-auto text-slate-300" />
                  <div>
                    <h4 className="font-bold text-slate-800">No Driver Assigned</h4>
                    <p className="text-xs text-slate-400 mt-1">Assign a driver to operationalize this vehicle.</p>
                  </div>
                  <Button
                    variant="solid"
                    className="bg-blue-600 hover:bg-blue-700 text-white w-full rounded-xl flex items-center justify-center gap-2 py-2.5 shadow-md shadow-blue-500/10"
                    onClick={() => setAssignOpen(true)}
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign Driver
                  </Button>
                </div>
              )}
            </Card>

          </div>
        </Tabs.TabContent>

        {/* Driver History Content */}
        <Tabs.TabContent value="logs">
          <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-2">
            <DataTable
              columns={logColumns}
              data={logs}
              loading={isLoadingLogs}
              emptyMessage="No driver assignment logs found for this vehicle."
            />
          </Card>
        </Tabs.TabContent>

        {/* Student list Content */}
        <Tabs.TabContent value="students">
          <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-2">
            <DataTable
              columns={studentColumns}
              data={students}
              loading={isLoadingStudents}
              emptyMessage="No passengers currently assigned to this vehicle."
            />
          </Card>
        </Tabs.TabContent>
      </Tabs>

      {/* Assign Driver Dialog */}
      <Dialog
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        contentClassName="rounded-2xl"
      >
        <h3 className="text-lg font-bold mb-4">Assign Driver to Vehicle</h3>
        <form onSubmit={handleAssignSubmit} className="space-y-6 pt-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Unassigned Driver
            </label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Choose a driver...</option>
              {unassignedDrivers.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.phone})
                </option>
              ))}
            </select>
            {unassignedDrivers.length === 0 && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                All active drivers are currently assigned.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Assigned Date
            </label>
            <Input
              type="date"
              value={assignDate}
              onChange={(e) => setAssignDate(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button size="sm" type="button" onClick={() => setAssignOpen(false)}>
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

      {/* Relieve Driver Dialog */}
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
              placeholder="e.g. End of shift, leave request, vehicle maintenance"
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

export default VehicleDetailPage;

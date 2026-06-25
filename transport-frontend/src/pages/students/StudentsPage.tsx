// src/pages/students/StudentsPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, GraduationCap, Bus, Calendar, Trash2, Edit, Eye, UserMinus, DollarSign, Users, AlertCircle, LogIn } from 'lucide-react';
import api from '@/api/axios';
import useAuthStore from '@/store/authStore';
import { STUDENTS, VEHICLES } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import DataTable from '@/components/shared/DataTable';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tag from '@/components/ui/Tag';
import Pagination from '@/components/ui/Pagination';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import Dialog from '@/components/ui/Dialog';

export const StudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filter and pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | number>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Impersonate Parent Mutation
  const impersonateMutation = useMutation({
    mutationFn: async (id: number | string) => {
      const res = await api.post(`/auth/impersonate/${id}`);
      return res.data;
    },
    onSuccess: (res) => {
      const { user, token } = res.data || {};
      useAuthStore.getState().impersonate(user, token);
      toast.push(
        <Notification type="success" title="Impersonating Parent">
          Logged in as parent {user.name}
        </Notification>
      );
      navigate('/portal/payments');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Impersonation Failed">
          {err.response?.data?.message || 'Failed to impersonate parent.'}
        </Notification>
      );
    },
  });

  // Dialog / Action states
  const [deleteStudentId, setDeleteStudentId] = useState<string | number | null>(null);
  const [removeVehicleId, setRemoveVehicleId] = useState<string | number | null>(null);
  const [removeReason, setRemoveReason] = useState('');

  // Fetch Students with Query Params
  const { data: studentsResponse, isLoading } = useQuery({
    queryKey: ['students', searchTerm, selectedVehicleId, statusFilter, currentPage],
    queryFn: async () => {
      const params: any = { page: currentPage };
      if (searchTerm.trim()) params.search = searchTerm;
      if (selectedVehicleId) params.vehicle_id = selectedVehicleId;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await api.get(STUDENTS.LIST, { params });
      return res.data;
    },
  });

  // Fetch active buses for dropdown filter
  const { data: vehiclesResponse } = useQuery({
    queryKey: ['active-buses'],
    queryFn: async () => {
      const res = await api.get(VEHICLES.LIST);
      return res.data;
    },
  });

  const studentsData = studentsResponse?.data || {};
  const studentsListRaw = studentsData.data || [];
  const studentsList = Array.isArray(studentsListRaw) ? studentsListRaw : Object.values(studentsListRaw);
  const totalRecords = studentsData.total || 0;
  const pageSize = studentsData.per_page || 10;

  const vehiclesData = vehiclesResponse?.data?.vehicles || [];
  const vehiclesList = Array.isArray(vehiclesData) ? vehiclesData : Object.values(vehiclesData);
  const buses = vehiclesList.filter((v: any) => v.type === 'bus');

  // Delete Student Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string | number) => {
      return await api.delete(STUDENTS.DELETE(id));
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.push(
        <Notification type="success" title="Success">
          {res.data?.message || 'Student deleted successfully.'}
        </Notification>
      );
      setDeleteStudentId(null);
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to delete student.'}
        </Notification>
      );
    },
  });

  // Remove Student from Bus Mutation
  const removeBusMutation = useMutation({
    mutationFn: async (studentId: string | number) => {
      return await api.post(STUDENTS.REMOVE_VEHICLE(studentId), { reason: removeReason });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.push(
        <Notification type="success" title="Success">
          {res.data?.message || 'Student removed from bus.'}
        </Notification>
      );
      setRemoveVehicleId(null);
      setRemoveReason('');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to remove student from bus.'}
        </Notification>
      );
    },
  });

  // Calculations for stats based on all records (or estimated)
  // Let's compute them from list to avoid backend dependencies
  const stats = React.useMemo(() => {
    const total = totalRecords;
    const active = studentsList.filter((s: any) => s.is_active).length;
    // Calculate total active fees (revenue)
    const monthlyRevenue = studentsList
      .filter((s: any) => s.is_active && s.current_assignment)
      .reduce((sum: number, s: any) => sum + Number(s.current_assignment.monthly_fee || 0), 0);
    // Pending dues
    const pendingDues = studentsList.filter((s: any) => s.has_pending_dues || s.dues_status === 'pending').length;

    return { total, active, monthlyRevenue, pendingDues };
  }, [studentsList, totalRecords]);

  const handleRemoveBusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!removeVehicleId) return;
    removeBusMutation.mutate(removeVehicleId);
  };

  const columns = [
    {
      key: 'student_name',
      label: 'Student Name',
      render: (val: string, row: any) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{val}</span>
      ),
    },
    {
      key: 'class_section',
      label: 'Class & Section',
      render: (_: any, row: any) => (
        <span>{row.class ? `${row.class} - ${row.section || 'A'}` : 'N/A'}</span>
      ),
    },
    {
      key: 'parent',
      label: 'Parent / Phone',
      render: (_: any, row: any) => (
        <div className="flex flex-col">
          <span className="text-slate-800 font-medium">{row.parent?.name || 'N/A'}</span>
          <span className="text-slate-400 text-xs">{row.parent?.phone || '-'}</span>
        </div>
      ),
    },
    {
      key: 'assigned_bus',
      label: 'Assigned Bus',
      render: (_: any, row: any) => {
        if (row.current_assignment?.vehicle) {
          return (
            <Tag className="bg-blue-50 text-blue-700 border border-blue-200">
              <span className="flex items-center gap-1">
                <Bus className="w-3 h-3" />
                {row.current_assignment.vehicle.name}
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
      key: 'monthly_fee',
      label: 'Monthly Fee',
      render: (_: any, row: any) => {
        const fee = row.current_assignment?.monthly_fee;
        return (
          <span className="font-semibold text-emerald-600">
            {fee ? `₹${Number(fee).toFixed(2)}` : '-'}
          </span>
        );
      },
    },
    {
      key: 'due_status',
      label: 'Due Status',
      render: (_: any, row: any) => {
        const isPending = row.has_pending_dues || row.dues_status === 'pending';
        return (
          <Tag className={isPending ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}>
            <span className="font-semibold">{isPending ? 'Pending' : 'Paid'}</span>
          </Tag>
        );
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (val: boolean) => (
        <Tag className={val ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}>
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
            className="hover:text-blue-600 no-underline"
            onClick={() => navigate(`/students/${row.id}`)}
          >
            View
          </Button>
          <Button 
            size="xs" 
            variant="default"
            className="hover:text-blue-600 no-underline"
            onClick={() => navigate(`/students/${row.id}/edit`)}
          >
            Edit
          </Button>
          {row.current_assignment && (
            <Button 
              size="xs" 
              variant="default"
              className="text-amber-600 hover:bg-amber-50 no-underline"
              onClick={() => setRemoveVehicleId(row.id)}
            >
              Remove Bus
            </Button>
          )}
          {row.parent?.id && row.is_active && (
            <Button 
              size="xs" 
              variant="default"
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 no-underline font-semibold"
              disabled={impersonateMutation.isPending}
              icon={<LogIn className="w-3.5 h-3.5" />}
              onClick={() => impersonateMutation.mutate(row.parent.id)}
            >
              {impersonateMutation.isPending && impersonateMutation.variables === row.parent.id ? '...' : 'Impersonate Parent'}
            </Button>
          )}
          <Button 
            size="xs" 
            variant="default"
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 no-underline"
            onClick={() => setDeleteStudentId(row.id)}
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
        title="Students"
        breadcrumbs={[{ label: 'Students' }]}
        action={
          <Button
            variant="solid"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 rounded-xl py-2 px-4 shadow-lg shadow-blue-500/10"
            onClick={() => navigate('/students/new')}
          >
            <Plus className="w-4 h-4" />
            Add Student
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Students"
          value={isLoading ? '...' : stats.total}
          icon={<GraduationCap className="w-6 h-6" />}
          color="slate"
        />
        <StatCard
          title="Active Students"
          value={isLoading ? '...' : stats.active}
          icon={<GraduationCap className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Monthly Revenue"
          value={isLoading ? '...' : `₹${stats.monthlyRevenue.toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Pending Dues"
          value={isLoading ? '...' : stats.pendingDues}
          icon={<Users className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Filters bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative max-w-sm w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <Input
              placeholder="Search by student name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 rounded-xl"
            />
          </div>

          {/* Vehicle Dropdown */}
          <select
            value={selectedVehicleId}
            onChange={(e) => {
              setSelectedVehicleId(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-xs"
          >
            <option value="">All Buses</option>
            {buses.map((bus: any) => (
              <option key={bus.id} value={bus.id}>
                {bus.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60 w-fit">
          {([
            { label: 'All', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' }
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setStatusFilter(opt.value);
                setCurrentPage(1);
              }}
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

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={studentsList}
          loading={isLoading}
          emptyMessage="No students found matching your filters. Click 'Add Student' to create one."
        />
      </div>

      {/* Pagination */}
      {totalRecords > pageSize && (
        <div className="flex justify-end pt-4">
          <Pagination
            currentPage={currentPage}
            total={totalRecords}
            pageSize={pageSize}
            onChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteStudentId !== null}
        title="Delete Student?"
        description="Are you sure you want to delete this student profile? This will also remove any active bus assignments and delete their logs. This action cannot be undone."
        confirmLabel="Delete"
        dangerous={true}
        onConfirm={() => {
          if (deleteStudentId) deleteMutation.mutate(deleteStudentId);
        }}
        onCancel={() => setDeleteStudentId(null)}
      />

      {/* Remove from Bus Dialog */}
      <Dialog
        isOpen={removeVehicleId !== null}
        onClose={() => setRemoveVehicleId(null)}
        contentClassName="rounded-2xl"
      >
        <h3 className="text-lg font-bold mb-4">Remove Student from Bus</h3>
        <form onSubmit={handleRemoveBusSubmit} className="space-y-6 pt-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Reason for Removal <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Relocating, changed routes, completed session"
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button size="sm" type="button" onClick={() => setRemoveVehicleId(null)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              variant="solid" 
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
              type="submit"
              disabled={removeBusMutation.isPending}
            >
              {removeBusMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default StudentsPage;

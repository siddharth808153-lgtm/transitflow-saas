// src/pages/students/StudentDetailPage.tsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  GraduationCap, 
  User, 
  Phone, 
  Bus, 
  Calendar, 
  MessageCircle, 
  History, 
  DollarSign, 
  AlertCircle, 
  Plus, 
  Trash2,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import api from '@/api/axios';
import { STUDENTS, VEHICLES } from '@/api/endpoints';
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

export const StudentDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Modal / Form states
  const [assignOpen, setAssignOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const [selectedBusId, setSelectedBusId] = useState<string | number>('');
  const [newFee, setNewFee] = useState<number | ''>('');
  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [changeReason, setChangeReason] = useState('');
  
  const [removeReason, setRemoveReason] = useState('');
  
  const [selectedDueId, setSelectedDueId] = useState<string | number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank' | 'other'>('cash');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // Fetch Student Detail
  const { data: studentResponse, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const res = await api.get(STUDENTS.DETAIL(id!));
      return res.data;
    },
  });

  // Fetch Active Buses for assignment/change modal
  const { data: busesResponse } = useQuery({
    queryKey: ['active-buses-detail'],
    queryFn: async () => {
      const res = await api.get(VEHICLES.LIST);
      return res.data;
    },
    enabled: assignOpen,
  });

  // Fetch Assignment History
  const { data: historyResponse, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['student-history', id],
    queryFn: async () => {
      const res = await api.get(STUDENTS.ASSIGNMENT_HISTORY(id!));
      return res.data;
    },
  });

  // Fetch Dues and Payment History
  const { data: duesResponse, isLoading: isLoadingDues } = useQuery({
    queryKey: ['student-dues', id],
    queryFn: async () => {
      const res = await api.get(STUDENTS.DUES(id!));
      return res.data;
    },
  });

  const student = studentResponse?.data;
  const historyList = historyResponse?.data || [];
  const duesList = duesResponse?.data || [];
  const busesData = busesResponse?.data?.vehicles || [];
  const busesList = Array.isArray(busesData) ? busesData : Object.values(busesData);
  const buses = busesList.filter((v: any) => v.type === 'bus' && v.is_active);

  // Assign/Change Bus Mutation
  const assignMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post(STUDENTS.ASSIGN_VEHICLE(id!), payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      queryClient.invalidateQueries({ queryKey: ['student-history', id] });
      toast.push(
        <Notification type="success" title="Success">
          {res.data?.message || 'Bus assignment updated successfully.'}
        </Notification>
      );
      setAssignOpen(false);
      setSelectedBusId('');
      setNewFee('');
      setChangeReason('');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to assign bus.'}
        </Notification>
      );
    },
  });

  // Remove Bus Mutation
  const removeMutation = useMutation({
    mutationFn: async () => {
      return await api.post(STUDENTS.REMOVE_VEHICLE(id!), { reason: removeReason });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      queryClient.invalidateQueries({ queryKey: ['student-history', id] });
      toast.push(
        <Notification type="success" title="Success">
          {res.data?.message || 'Student removed from bus.'}
        </Notification>
      );
      setRemoveOpen(false);
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

  // Mark Due as Paid Mutation
  const payDueMutation = useMutation({
    mutationFn: async (payload: any) => {
      // In a real application, POST /students/:id/dues/:due_id/pay
      return await api.post(`/students/${id}/dues/${selectedDueId}/pay`, payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['student-dues', id] });
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      toast.push(
        <Notification type="success" title="Payment Recorded">
          Payment of ₹{paymentAmount} recorded successfully.
        </Notification>
      );
      setPayOpen(false);
      setSelectedDueId(null);
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Payment Failed">
          {err.response?.data?.message || 'Failed to record payment.'}
        </Notification>
      );
    },
  });

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusId || newFee === '') {
      toast.push(<Notification type="danger" title="Validation Error">Please select a bus and enter the monthly fee.</Notification>);
      return;
    }
    assignMutation.mutate({
      vehicle_id: Number(selectedBusId),
      monthly_fee: Number(newFee),
      assigned_date: assignDate,
      reason: changeReason || null,
    });
  };

  const handleRemoveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    removeMutation.mutate();
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDueId) return;
    payDueMutation.mutate({
      payment_method: paymentMethod,
      amount: paymentAmount,
    });
  };

  if (isLoading) {
    return <div className="text-center py-20">Loading student details...</div>;
  }

  if (!student) {
    return (
      <div className="text-center py-20 text-slate-500">
        <AlertCircle className="w-12 h-12 mx-auto text-rose-500 mb-4" />
        Student profile not found.
      </div>
    );
  }

  // Formatting helper
  const getWhatsAppLink = (phone?: string) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    return `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}`;
  };

  // Log History columns
  const historyColumns = [
    {
      key: 'vehicle_name',
      label: 'Bus Name',
      render: (_: any, row: any) => <span className="font-semibold text-slate-800">{row.vehicle?.name || 'Unknown Bus'}</span>
    },
    {
      key: 'monthly_fee',
      label: 'Monthly Fee',
      render: (val: any) => <span className="font-medium text-emerald-600">₹{Number(val).toFixed(2)}</span>
    },
    {
      key: 'assigned_date',
      label: 'Assigned Date',
      render: (val: string) => <span>{val ? new Date(val).toLocaleDateString() : '-'}</span>
    },
    {
      key: 'removed_date',
      label: 'Removed Date',
      render: (val: string) => <span>{val ? new Date(val).toLocaleDateString() : <Tag className="bg-emerald-50 text-emerald-700">Active</Tag>}</span>
    },
    {
      key: 'removal_reason',
      label: 'Notes / Reason',
      render: (val: string) => <span className="text-slate-500 text-xs">{val || '-'}</span>
    }
  ];

  // Dues & Payments columns
  const dueColumns = [
    {
      key: 'due_for_month',
      label: 'Billing Month',
      render: (val: string) => <span className="font-semibold text-slate-800">{val || 'N/A'}</span>
    },
    {
      key: 'due_amount',
      label: 'Amount Due',
      render: (val: any) => <span className="font-medium text-slate-900">₹{Number(val).toFixed(2)}</span>
    },
    {
      key: 'paid_at',
      label: 'Paid Date',
      render: (val: string) => <span>{val ? new Date(val).toLocaleDateString() : '-'}</span>
    },
    {
      key: 'status',
      label: 'Payment Status',
      render: (_: any, row: any) => (
        <Tag className={row.is_paid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}>
          <span className="font-semibold">{row.is_paid ? 'Paid' : 'Pending'}</span>
        </Tag>
      )
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5"
              onClick={() => {
                setSelectedDueId(row.id);
                setPaymentAmount(Number(row.due_amount));
                setPayOpen(true);
              }}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Mark as Paid
            </Button>
          );
        }
        return <span className="text-xs text-slate-400 font-medium">Clear</span>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate('/students')}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={student.student_name}
          breadcrumbs={[
            { label: 'Students', path: '/students' },
            { label: student.student_name },
          ]}
          action={
            <Button
              variant="default"
              className="rounded-xl border border-slate-200"
              onClick={() => navigate(`/students/${student.id}/edit`)}
            >
              Edit Details
            </Button>
          }
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <Tabs.TabList className="border-b border-slate-200 dark:border-slate-800 pb-px mb-6 flex gap-6">
          <Tabs.TabNav value="profile" className="pb-3 text-sm font-semibold tracking-wide border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-slate-500 cursor-pointer">
            Profile
          </Tabs.TabNav>
          <Tabs.TabNav value="history" className="pb-3 text-sm font-semibold tracking-wide border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-slate-500 cursor-pointer">
            Bus History
          </Tabs.TabNav>
          <Tabs.TabNav value="payments" className="pb-3 text-sm font-semibold tracking-wide border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 text-slate-500 cursor-pointer">
            Payment History
          </Tabs.TabNav>
        </Tabs.TabList>

        {/* Tab 1 — Profile */}
        <Tabs.TabContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Info specifications */}
            <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-6 space-y-6">
              <h3 className="text-lg font-bold text-slate-900">Student Profile</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Student Name</p>
                    <p className="text-sm font-bold text-slate-800">{student.student_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Class & Section</p>
                    <p className="text-sm font-bold text-slate-800">{student.class ? `${student.class} - ${student.section || 'A'}` : 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Account Status</span>
                <Tag className={student.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}>
                  <span className="font-semibold">{student.is_active ? 'Active' : 'Inactive'}</span>
                </Tag>
              </div>
            </Card>

            {/* Parent Details Card */}
            <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Parent / Guardian</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold text-lg uppercase border border-blue-100">
                    {student.parent?.name?.substring(0, 2) || 'PA'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{student.parent?.name || 'Ramesh Sharma'}</h4>
                    <p className="text-xs text-slate-400 font-medium capitalize">User Account</p>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{student.parent?.phone || '9999999999'}</span>
                  </div>
                </div>

                <a 
                  href={getWhatsAppLink(student.parent?.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 font-semibold text-sm transition-colors shadow-lg shadow-emerald-500/10"
                >
                  <MessageCircle className="w-5 h-5" />
                  Chat on WhatsApp
                </a>
              </div>
            </Card>

            {/* Current Bus Assignment */}
            <Card className="lg:col-span-3 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Bus Route Assignment</h3>

              {student.current_assignment?.vehicle ? (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                      <Bus className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{student.current_assignment.vehicle.name}</h4>
                      <p className="text-sm text-slate-500">
                        Monthly Fee: <span className="font-bold text-emerald-600">₹{Number(student.current_assignment.monthly_fee).toFixed(2)}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Assigned since: {new Date(student.current_assignment.assigned_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button 
                      variant="solid" 
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs py-2.5 px-4 shadow-md shadow-blue-500/10"
                      onClick={() => {
                        setSelectedBusId(student.current_assignment?.vehicle_id || '');
                        setNewFee(student.current_assignment?.monthly_fee || '');
                        setAssignOpen(true);
                      }}
                    >
                      Change Route
                    </Button>
                    <Button 
                      variant="default"
                      className="border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs py-2.5 px-4"
                      onClick={() => setRemoveOpen(true)}
                    >
                      Remove from Bus
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 max-w-md mx-auto space-y-4">
                  <Bus className="w-12 h-12 mx-auto text-slate-300" />
                  <div>
                    <h4 className="font-bold text-slate-800">Unassigned</h4>
                    <p className="text-xs text-slate-400 mt-1">This student is not assigned to a bus route yet. Assign a route to initialize billing.</p>
                  </div>
                  <Button
                    variant="solid"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 px-6 shadow-md shadow-blue-500/15"
                    onClick={() => setAssignOpen(true)}
                  >
                    Assign to Bus
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </Tabs.TabContent>

        {/* Tab 2 — Assignment History */}
        <Tabs.TabContent value="history">
          <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-2">
            <DataTable
              columns={historyColumns}
              data={historyList}
              loading={isLoadingHistory}
              emptyMessage="No historical bus assignments recorded for this student."
            />
          </Card>
        </Tabs.TabContent>

        {/* Tab 3 — Payment History */}
        <Tabs.TabContent value="payments">
          <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm bg-white p-2">
            <DataTable
              columns={dueColumns}
              data={duesList}
              loading={isLoadingDues}
              emptyMessage="No dues or transaction histories recorded for this student."
            />
          </Card>
        </Tabs.TabContent>
      </Tabs>

      {/* Change/Assign Bus Modal */}
      <Dialog
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        contentClassName="rounded-2xl"
      >
        <h3 className="text-lg font-bold mb-4">{student.current_assignment ? 'Change Bus Route' : 'Assign to Bus'}</h3>
        <form onSubmit={handleAssignSubmit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Select Bus Route <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedBusId}
              onChange={(e) => setSelectedBusId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select Bus...</option>
              {buses.map((bus: any) => (
                <option key={bus.id} value={bus.id}>
                  {bus.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Monthly Fee (₹) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                placeholder="e.g. 1500"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value === '' ? '' : Number(e.target.value))}
                className="rounded-xl"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Assigned Date
              </label>
              <Input
                type="date"
                value={assignDate}
                onChange={(e) => setAssignDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          {student.current_assignment && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Reason for Change (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Changed address, route change request"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="rounded-xl"
              />
            </div>
          )}

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

      {/* Remove from Bus Dialog */}
      <Dialog
        isOpen={removeOpen}
        onClose={() => setRemoveOpen(false)}
        contentClassName="rounded-2xl"
      >
        <h3 className="text-lg font-bold mb-4">Remove Student from Bus</h3>
        <form onSubmit={handleRemoveSubmit} className="space-y-6 pt-2">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Reason for Removal <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Graduated, shifted to auto, no longer needs route"
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button size="sm" type="button" onClick={() => setRemoveOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              variant="solid" 
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
              type="submit"
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Pay Due Modal */}
      <Dialog
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        contentClassName="rounded-2xl"
      >
        <h3 className="text-lg font-bold mb-4">Record Payment</h3>
        <form onSubmit={handlePaySubmit} className="space-y-4 pt-2">
          <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Pending Amount Due</p>
            <p className="text-2xl font-black mt-1">₹{paymentAmount.toFixed(2)}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Payment Method
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

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button size="sm" type="button" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button 
              size="sm" 
              variant="solid" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              type="submit"
              disabled={payDueMutation.isPending}
            >
              {payDueMutation.isPending ? 'Recording...' : 'Mark as Paid'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default StudentDetailPage;

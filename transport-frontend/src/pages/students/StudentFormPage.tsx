// src/pages/students/StudentFormPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Plus, AlertCircle, Copy, Check } from 'lucide-react';
import api from '@/api/axios';
import { STUDENTS, VEHICLES, AUTH } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Switcher from '@/components/ui/Switcher';
import Dialog from '@/components/ui/Dialog';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const StudentFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  // Form states
  const [studentName, setStudentName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentSection, setStudentSection] = useState('');
  const [parentId, setParentId] = useState<string | number>('');
  const [assignedBusId, setAssignedBusId] = useState<string | number>('');
  const [monthlyFee, setMonthlyFee] = useState<number | ''>('');
  const [assignedDate, setAssignedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState(true);

  // Validation state
  const [errors, setErrors] = useState<any>({});

  // Dialog for Parent creation
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [createdPasswordDisplay, setCreatedPasswordDisplay] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch student details if editing
  const { data: studentResponse, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const res = await api.get(STUDENTS.DETAIL(id!));
      return res.data;
    },
    enabled: isEdit,
  });

  // Fetch parents (users with role='user')
  const { data: parentsResponse } = useQuery({
    queryKey: ['parents'],
    queryFn: async () => {
      // In Part 2, users of role='user' are passengers/parents
      const res = await api.get('/users', { params: { role: 'user' } });
      return res.data;
    },
  });

  // Fetch active buses
  const { data: busesResponse } = useQuery({
    queryKey: ['active-buses-form'],
    queryFn: async () => {
      const res = await api.get(VEHICLES.LIST);
      return res.data;
    },
  });

  const parents = parentsResponse?.data || [];
  const buses = (busesResponse?.data || []).filter((v: any) => v.type === 'bus' && v.is_active);

  // Populate form fields on edit load
  useEffect(() => {
    if (isEdit && studentResponse?.data) {
      const s = studentResponse.data;
      setStudentName(s.student_name || '');
      setStudentClass(s.class || '');
      setStudentSection(s.section || '');
      setParentId(s.user_id || '');
      if (s.current_assignment) {
        setAssignedBusId(s.current_assignment.vehicle_id || '');
        setMonthlyFee(s.current_assignment.monthly_fee ?? '');
        setAssignedDate(s.current_assignment.assigned_date ? s.current_assignment.assigned_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      }
      setIsActive(!!s.is_active);
    }
  }, [isEdit, studentResponse]);

  // Mutation to Create/Update Student
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEdit) {
        return await api.patch(STUDENTS.UPDATE(id!), payload);
      } else {
        return await api.post(STUDENTS.CREATE, payload);
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['student', id] });
      }
      toast.push(
        <Notification type="success" title="Success" duration={3500}>
          {res.data?.message || `Student ${isEdit ? 'updated' : 'created'} successfully.`}
        </Notification>
      );
      navigate('/students');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error" duration={4000}>
          {err.response?.data?.message || 'Failed to save student details.'}
        </Notification>
      );
    },
  });

  // Create Parent Mutation
  const createParentMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post(AUTH.CREATE_USER, payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      const parentUser = res.data?.data;
      if (parentUser?.id) {
        setParentId(parentUser.id);
      }
      setCreatedPasswordDisplay(parentPassword);
      toast.push(
        <Notification type="success" title="Parent Created">
          Parent account created and selected automatically.
        </Notification>
      );
      // Reset form fields (but keep password displayed)
      setParentName('');
      setParentPhone('');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Registration Failed">
          {err.response?.data?.message || 'Failed to create parent account.'}
        </Notification>
      );
    },
  });

  const handleParentCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim() || !parentPhone.trim()) {
      toast.push(<Notification type="danger" title="Validation Error">Please enter name and phone number.</Notification>);
      return;
    }
    // Auto-generate password
    const generatedPassword = Math.random().toString(36).substring(2, 10);
    setParentPassword(generatedPassword);
    
    createParentMutation.mutate({
      name: parentName,
      phone: parentPhone,
      password: generatedPassword,
    });
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(createdPasswordDisplay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: any = {};

    if (!studentName.trim()) newErrors.studentName = 'Student Name is required';
    if (!parentId) newErrors.parentId = 'Parent/Guardian selection is required';
    if (assignedBusId && monthlyFee === '') newErrors.monthlyFee = 'Monthly fee is required when assigned to a bus';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const payload = {
      student_name: studentName,
      class: studentClass || null,
      section: studentSection || null,
      user_id: Number(parentId),
      vehicle_id: assignedBusId ? Number(assignedBusId) : null,
      monthly_fee: assignedBusId ? Number(monthlyFee) : null,
      assigned_date: assignedBusId ? assignedDate : null,
      is_active: isActive,
    };

    saveMutation.mutate(payload);
  };

  if (isEdit && isLoadingDetails) {
    return <div className="text-center py-20">Loading student details...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate('/students')}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? 'Edit Student' : 'Add Student'}
          breadcrumbs={[
            { label: 'Students', path: '/students' },
            { label: isEdit ? 'Edit' : 'Add' },
          ]}
        />
      </div>

      <Card className="shadow-lg border border-slate-200 dark:border-slate-800 rounded-2xl bg-white p-2">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Student Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className={errors.studentName ? 'border-rose-500 rounded-xl' : 'rounded-xl'}
            />
            {errors.studentName && <p className="text-xs text-rose-500 mt-1.5">{errors.studentName}</p>}
          </div>

          {/* Class & Section Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Class / Grade (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. 5th, 10th"
                value={studentClass}
                onChange={(e) => setStudentClass(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Section (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. A, B, C"
                value={studentSection}
                onChange={(e) => setStudentSection(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Parent/Guardian Selector */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Parent / Guardian <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 focus:outline-none"
                onClick={() => {
                  setCreatedPasswordDisplay('');
                  setParentModalOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Parent
              </button>
            </div>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                errors.parentId ? 'border-rose-500' : ''
              }`}
            >
              <option value="">Select Parent / Guardian</option>
              {parents.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.phone})
                </option>
              ))}
            </select>
            {errors.parentId && <p className="text-xs text-rose-500 mt-1.5">{errors.parentId}</p>}
          </div>

          {/* Bus Assignment Fields */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-sm font-bold text-slate-900 mb-4">Bus Route Assignment (Optional)</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Select Bus
                </label>
                <select
                  value={assignedBusId}
                  onChange={(e) => setAssignedBusId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Not Assigned to Bus</option>
                  {buses.map((bus: any) => (
                    <option key={bus.id} value={bus.id}>
                      {bus.name} (Cap: {bus.capacity || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {assignedBusId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Monthly Fee (₹) <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g. 1500"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(e.target.value === '' ? '' : Number(e.target.value))}
                      className={errors.monthlyFee ? 'border-rose-500 rounded-xl' : 'rounded-xl'}
                      min={0}
                    />
                    {errors.monthlyFee && <p className="text-xs text-rose-500 mt-1.5">{errors.monthlyFee}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Assigned Date
                    </label>
                    <Input
                      type="date"
                      value={assignedDate}
                      onChange={(e) => setAssignedDate(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status field */}
          <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800 pt-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Active Status</h4>
              <p className="text-xs text-slate-500">Inactive students will not be counted in active vehicle logs.</p>
            </div>
            <Switcher
              checked={isActive}
              onChange={(checked) => setIsActive(checked)}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="solid"
            block
            disabled={saveMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold shadow-lg shadow-blue-500/10 active:scale-[0.98]"
          >
            <span className="flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Student'}
            </span>
          </Button>
        </form>
      </Card>

      {/* Parent Creation Quick Modal */}
      <Dialog
        isOpen={parentModalOpen}
        onClose={() => setParentModalOpen(false)}
        contentClassName="rounded-2xl"
      >
        <h3 className="text-lg font-bold mb-4">Create Parent Account</h3>
        
        {createdPasswordDisplay ? (
          <div className="space-y-4 pt-2 text-center">
            <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl space-y-2 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Account Created Successfully</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-mono font-bold">{parentPhone}</span>
                <span className="text-xs text-slate-400">Username (Phone)</span>
              </div>
              <div className="flex items-center justify-between mt-1 border-t border-emerald-100 pt-2">
                <span className="text-sm font-mono font-bold">{createdPasswordDisplay}</span>
                <span className="text-xs text-slate-400">Password</span>
              </div>
            </div>
            <p className="text-xs text-rose-500 font-semibold flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" />
              This password is shown only once. Please write it down.
            </p>
            <div className="flex justify-center gap-3">
              <Button 
                size="sm" 
                variant="solid" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                onClick={handleCopyPassword}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy Credentials'}
              </Button>
              <Button size="sm" onClick={() => {
                setParentModalOpen(false);
                setCreatedPasswordDisplay('');
              }}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleParentCreateSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Parent Name <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Ramesh Sharma"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Phone Number (WhatsApp) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. 9876543210"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button size="sm" type="button" onClick={() => setParentModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                size="sm" 
                variant="solid" 
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                type="submit"
                disabled={createParentMutation.isPending}
              >
                {createParentMutation.isPending ? 'Creating...' : 'Create & Select'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
};

export default StudentFormPage;

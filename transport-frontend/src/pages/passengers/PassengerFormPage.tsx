// src/pages/passengers/PassengerFormPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import api from '@/api/axios';
import { PASSENGERS, VEHICLES } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Switcher from '@/components/ui/Switcher';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const PassengerFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedVehicleId, setAssignedVehicleId] = useState<string | number>('');
  const [dailyFare, setDailyFare] = useState<number | ''>('');
  const [linkedUserId, setLinkedUserId] = useState<string | number>('');
  const [isActive, setIsActive] = useState(true);

  // Validation state
  const [errors, setErrors] = useState<any>({});

  // Fetch passenger detail if edit mode
  const { data: passengerResponse, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['passenger', id],
    queryFn: async () => {
      const res = await api.get(PASSENGERS.DETAIL(id!));
      return res.data;
    },
    enabled: isEdit,
  });

  // Fetch active autos
  const { data: vehiclesResponse } = useQuery({
    queryKey: ['active-autos-form'],
    queryFn: async () => {
      const res = await api.get(VEHICLES.LIST);
      return res.data;
    },
  });

  // Fetch app users of role 'user' to link (optional)
  const { data: usersResponse } = useQuery({
    queryKey: ['app-users-passengers'],
    queryFn: async () => {
      const res = await api.get('/users', { params: { role: 'user' } });
      return res.data;
    },
  });

  const autos = (vehiclesResponse?.data?.vehicles || []).filter((v: any) => v.type === 'auto' && v.is_active);
  const appUsers = usersResponse?.data || [];

  // Populate form fields on edit load
  useEffect(() => {
    if (isEdit && passengerResponse?.data) {
      const p = passengerResponse.data;
      setName(p.name || '');
      setPhone(p.phone || '');
      setAssignedVehicleId(p.vehicle_id || '');
      setDailyFare(p.daily_fare ?? '');
      setLinkedUserId(p.user_id || '');
      setIsActive(!!p.is_active);
    }
  }, [isEdit, passengerResponse]);

  // Mutation to Create/Update Passenger
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEdit) {
        return await api.patch(PASSENGERS.UPDATE(id!), payload);
      } else {
        return await api.post(PASSENGERS.CREATE, payload);
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['passengers'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['passenger', id] });
      }
      toast.push(
        <Notification type="success" title="Success" duration={3500}>
          {res.data?.message || `Passenger ${isEdit ? 'updated' : 'created'} successfully.`}
        </Notification>
      );
      navigate('/passengers');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error" duration={4000}>
          {err.response?.data?.message || 'Failed to save passenger details.'}
        </Notification>
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: any = {};

    if (!name.trim()) newErrors.name = 'Passenger Name is required';
    if (!phone.trim()) newErrors.phone = 'Phone Number is required';
    if (!assignedVehicleId) newErrors.assignedVehicleId = 'Assigned Auto is required';
    if (dailyFare === '') newErrors.dailyFare = 'Daily Fare is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const payload = {
      name,
      phone,
      vehicle_id: Number(assignedVehicleId),
      daily_fare: Number(dailyFare),
      user_id: linkedUserId ? Number(linkedUserId) : null,
      is_active: isActive,
    };

    saveMutation.mutate(payload);
  };

  if (isEdit && isLoadingDetails) {
    return <div className="text-center py-20">Loading passenger details...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate('/passengers')}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? 'Edit Auto Passenger' : 'Add Auto Passenger'}
          breadcrumbs={[
            { label: 'Auto Passengers', path: '/passengers' },
            { label: isEdit ? 'Edit' : 'Add' },
          ]}
        />
      </div>

      <Card className="shadow-lg border border-slate-200 dark:border-slate-800 rounded-2xl bg-white p-2">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Passenger Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? 'border-rose-500 rounded-xl' : 'rounded-xl'}
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1.5">{errors.name}</p>}
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. 9988776655"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={errors.phone ? 'border-rose-500 rounded-xl' : 'rounded-xl'}
            />
            {errors.phone && <p className="text-xs text-rose-500 mt-1.5">{errors.phone}</p>}
          </div>

          {/* Auto Selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Assign to Auto Rickshaw <span className="text-rose-500">*</span>
            </label>
            <select
              value={assignedVehicleId}
              onChange={(e) => setAssignedVehicleId(e.target.value)}
              className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                errors.assignedVehicleId ? 'border-rose-500' : ''
              }`}
            >
              <option value="">Select Auto Vehicle</option>
              {autos.map((auto: any) => (
                <option key={auto.id} value={auto.id}>
                  {auto.name}
                </option>
              ))}
            </select>
            {errors.assignedVehicleId && <p className="text-xs text-rose-500 mt-1.5">{errors.assignedVehicleId}</p>}
          </div>

          {/* Daily Fare */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Daily Fare (₹) <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              placeholder="e.g. 50"
              value={dailyFare}
              onChange={(e) => setDailyFare(e.target.value === '' ? '' : Number(e.target.value))}
              className={errors.dailyFare ? 'border-rose-500 rounded-xl' : 'rounded-xl'}
              min={0}
            />
            {errors.dailyFare && <p className="text-xs text-rose-500 mt-1.5">{errors.dailyFare}</p>}
          </div>

          {/* Optional Linked App Account */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Link to App Account (Optional)
            </label>
            <select
              value={linkedUserId}
              onChange={(e) => setLinkedUserId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No App Account Linked</option>
              {appUsers.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Status field */}
          <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800 pt-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Active Status</h4>
              <p className="text-xs text-slate-500">Inactive passengers will not appear in daily auto logs.</p>
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
              {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Passenger'}
            </span>
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default PassengerFormPage;

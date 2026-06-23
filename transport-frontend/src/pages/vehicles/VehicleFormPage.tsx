// src/pages/vehicles/VehicleFormPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import api from '@/api/axios';
import { VEHICLES } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Switcher from '@/components/ui/Switcher';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const VehicleFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<'auto' | 'bus' | ''>('');
  const [wageType, setWageType] = useState<'daily' | 'monthly' | ''>('');
  const [capacity, setCapacity] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; type?: string; wageType?: string }>({});

  // Fetch details if edit mode
  const { data: vehicleResponse, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      const res = await api.get(VEHICLES.DETAIL(id!));
      return res.data;
    },
    enabled: isEdit,
  });

  // Populate form fields on load/edit
  useEffect(() => {
    if (isEdit && vehicleResponse?.data) {
      const v = vehicleResponse.data;
      setName(v.name || '');
      setType(v.type || '');
      setWageType(v.wage_type || '');
      setCapacity(v.capacity ?? '');
      setIsActive(!!v.is_active);
    }
  }, [isEdit, vehicleResponse]);

  // Auto-set wage type when type changes
  const handleTypeChange = (selectedType: 'auto' | 'bus') => {
    setType(selectedType);
    if (selectedType === 'auto') {
      setWageType('daily');
    } else if (selectedType === 'bus') {
      setWageType('monthly');
    }
  };

  // Mutation for Save (Create/Update)
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEdit) {
        return await api.patch(VEHICLES.UPDATE(id!), payload);
      } else {
        return await api.post(VEHICLES.CREATE, payload);
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['vehicle', id] });
      }
      toast.push(
        <Notification type="success" title="Success" duration={3500}>
          {res.data?.message || `Vehicle ${isEdit ? 'updated' : 'created'} successfully.`}
        </Notification>
      );
      navigate('/vehicles');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error" duration={4000}>
          {err.response?.data?.message || 'Failed to save vehicle details.'}
        </Notification>
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!name.trim()) newErrors.name = 'Vehicle Name is required';
    if (!type) newErrors.type = 'Vehicle Type is required';
    if (!wageType) newErrors.wageType = 'Wage Type is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const payload = {
      name,
      type,
      wage_type: wageType,
      capacity: capacity === '' ? null : Number(capacity),
      is_active: isActive,
    };

    saveMutation.mutate(payload);
  };

  if (isEdit && isLoadingDetails) {
    return <div className="text-center py-20">Loading vehicle details...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate('/vehicles')}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? 'Edit Vehicle' : 'Add Vehicle'}
          breadcrumbs={[
            { label: 'Vehicles', path: '/vehicles' },
            { label: isEdit ? 'Edit' : 'Add' },
          ]}
        />
      </div>

      <Card className="shadow-lg border border-slate-200 dark:border-slate-800 rounded-2xl bg-white p-2">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Vehicle Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Yellow School Bus 04, Driver Daily Auto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? 'border-rose-500 rounded-xl' : 'rounded-xl'}
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1.5">{errors.name}</p>}
          </div>

          {/* Type Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Vehicle Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as 'auto' | 'bus')}
              className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                errors.type ? 'border-rose-500' : ''
              }`}
            >
              <option value="">Select Type</option>
              <option value="bus">School Bus</option>
              <option value="auto">Auto Rickshaw</option>
            </select>
            {errors.type && <p className="text-xs text-rose-500 mt-1.5">{errors.type}</p>}
          </div>

          {/* Wage Type Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Wage Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={wageType}
              onChange={(e) => setWageType(e.target.value as 'daily' | 'monthly')}
              className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                errors.wageType ? 'border-rose-500' : ''
              }`}
            >
              <option value="">Select Wage Type</option>
              <option value="daily">Daily Wages</option>
              <option value="monthly">Monthly Fees</option>
            </select>
            {errors.wageType && <p className="text-xs text-rose-500 mt-1.5">{errors.wageType}</p>}
          </div>

          {/* Capacity Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Capacity (Number of Passengers)
            </label>
            <Input
              type="number"
              placeholder="e.g. 3, 40"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
              className="rounded-xl"
              min={1}
            />
          </div>

          {/* Status Field */}
          <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800 pt-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Active Status</h4>
              <p className="text-xs text-slate-500">Deactivated vehicles cannot be assigned to drivers or passengers.</p>
            </div>
            <Switcher
              checked={isActive}
              onChange={(checked) => setIsActive(checked)}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="solid"
            block
            disabled={saveMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold shadow-lg shadow-blue-500/10 active:scale-[0.98]"
          >
            <span className="flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Vehicle'}
            </span>
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default VehicleFormPage;

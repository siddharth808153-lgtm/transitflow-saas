// src/pages/drivers/DriverFormPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import api from '@/api/axios';
import { DRIVERS } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Switcher from '@/components/ui/Switcher';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const DriverFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [dailyWage, setDailyWage] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  // Fetch details if edit mode
  const { data: driverResponse, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['driver', id],
    queryFn: async () => {
      const res = await api.get(DRIVERS.DETAIL(id!));
      return res.data;
    },
    enabled: isEdit,
  });

  // Populate form fields on load/edit
  useEffect(() => {
    if (isEdit && driverResponse?.data) {
      const d = driverResponse.data;
      setName(d.name || '');
      setPhone(d.phone || '');
      setLicenseNumber(d.license_number || '');
      setDailyWage(d.daily_wage ?? '');
      setIsActive(!!d.is_active);
    }
  }, [isEdit, driverResponse]);

  // Mutation for Save (Create/Update)
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEdit) {
        return await api.patch(DRIVERS.UPDATE(id!), payload);
      } else {
        return await api.post(DRIVERS.CREATE, payload);
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['driver', id] });
      }
      toast.push(
        <Notification type="success" title="Success" duration={3500}>
          {res.data?.message || `Driver ${isEdit ? 'updated' : 'created'} successfully.`}
        </Notification>
      );
      navigate('/drivers');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error" duration={4000}>
          {err.response?.data?.message || 'Failed to save driver details.'}
        </Notification>
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!name.trim()) newErrors.name = 'Driver Name is required';
    if (!phone.trim()) newErrors.phone = 'Phone Number is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const payload = {
      name,
      phone,
      license_number: licenseNumber.trim() === '' ? null : licenseNumber,
      daily_wage: dailyWage === '' ? null : Number(dailyWage),
      is_active: isActive,
    };

    saveMutation.mutate(payload);
  };

  if (isEdit && isLoadingDetails) {
    return <div className="text-center py-20">Loading driver details...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate('/drivers')}
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={isEdit ? 'Edit Driver' : 'Add Driver'}
          breadcrumbs={[
            { label: 'Drivers', path: '/drivers' },
            { label: isEdit ? 'Edit' : 'Add' },
          ]}
        />
      </div>

      <Card className="shadow-lg border border-slate-200 dark:border-slate-800 rounded-2xl bg-white p-2">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Driver Name <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. John Doe, Rajesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? 'border-rose-500 rounded-xl' : 'rounded-xl'}
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1.5">{errors.name}</p>}
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              WhatsApp Phone Number <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. 9999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={errors.phone ? 'border-rose-500 rounded-xl' : 'rounded-xl'}
            />
            {errors.phone && <p className="text-xs text-rose-500 mt-1.5">{errors.phone}</p>}
          </div>

          {/* License Number Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              License Number (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. DL-1420110012345"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Daily Wage Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Daily Wage (₹, Optional)
            </label>
            <Input
              type="number"
              placeholder="e.g. 500, 750"
              value={dailyWage}
              onChange={(e) => setDailyWage(e.target.value === '' ? '' : Number(e.target.value))}
              className="rounded-xl"
              min={0}
              step="0.01"
            />
          </div>

          {/* Status Field */}
          <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800 pt-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Active Status</h4>
              <p className="text-xs text-slate-500">Inactive drivers cannot be assigned to vehicles.</p>
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
              {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Driver'}
            </span>
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default DriverFormPage;

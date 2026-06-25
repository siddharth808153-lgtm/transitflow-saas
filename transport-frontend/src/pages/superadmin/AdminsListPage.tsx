// src/pages/superadmin/AdminsListPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  UserPlus, 
  Search, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle,
  Copy,
  Lock,
  Phone,
  Mail,
  Shield,
  Loader2,
  Calendar,
  LogIn
} from 'lucide-react';
import api from '@/api/axios';
import useAuthStore from '@/store/authStore';
import { SUPER_ADMIN, AUTH } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tag from '@/components/ui/Tag';
import Drawer from '@/components/ui/Drawer';
import Dialog from '@/components/ui/Dialog';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const AdminsListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAdminId, setSelectedAdminId] = useState<number | string | null>(null);
  const [adminToToggle, setAdminToToggle] = useState<{ id: number | string, name: string, active: boolean } | null>(null);

  // Impersonate Admin Mutation
  const impersonateMutation = useMutation({
    mutationFn: async (id: number | string) => {
      const res = await api.post(`/auth/impersonate/${id}`);
      return res.data;
    },
    onSuccess: (res) => {
      const { user, token } = res.data || {};
      useAuthStore.getState().impersonate(user, token);
      toast.push(
        <Notification type="success" title="Impersonating Admin">
          Successfully logged in as {user.name}
        </Notification>
      );
      window.location.href = '/dashboard';
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Impersonation Failed">
          {err.response?.data?.message || 'Failed to impersonate admin.'}
        </Notification>
      );
    },
  });
  
  // Create Admin Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminBusiness, setAdminBusiness] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [createdAdminCreds, setCreatedAdminCreds] = useState<any>(null);

  // 1. Fetch Admins list
  const { data: adminsResponse, isLoading: isLoadingAdmins } = useQuery({
    queryKey: ['super-admin-admins-list', searchTerm, currentPage],
    queryFn: async () => {
      const params: any = { page: currentPage };
      if (searchTerm) params.search = searchTerm;
      const res = await api.get(SUPER_ADMIN.ADMINS_LIST, { params });
      return res.data;
    },
  });

  // 2. Fetch Admin details for Drawer
  const { data: adminDetailResponse, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['super-admin-admins-detail', selectedAdminId],
    queryFn: async () => {
      const res = await api.get(SUPER_ADMIN.ADMIN_DETAIL(selectedAdminId!));
      return res.data;
    },
    enabled: selectedAdminId !== null,
  });

  // Toggle Admin Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (id: number | string) => {
      const res = await api.patch(SUPER_ADMIN.TOGGLE_STATUS(id));
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-admins-list'] });
      if (selectedAdminId) {
        queryClient.invalidateQueries({ queryKey: ['super-admin-admins-detail', selectedAdminId] });
      }
      toast.push(
        <Notification type="success" title="Success">
          {res?.message || 'Admin status toggled successfully.'}
        </Notification>
      );
      setAdminToToggle(null);
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to update admin status.'}
        </Notification>
      );
    },
  });

  // Create Admin Mutation
  const createAdminMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post(AUTH.CREATE_ADMIN, payload);
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-admins-list'] });
      toast.push(
        <Notification type="success" title="Admin Account Created">
          Admin account for {adminName} created successfully!
        </Notification>
      );
      
      // Store credentials to display one-time credentials card
      setCreatedAdminCreds({
        name: adminName,
        phone: adminPhone,
        email: adminEmail || 'Not configured',
        password: adminPassword,
        business: adminBusiness || 'Not configured'
      });

      // Clear form inputs
      resetForm();
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Creation Failed">
          {err.response?.data?.message || 'Failed to create administrator account.'}
        </Notification>
      );
    }
  });

  const resetForm = () => {
    setAdminName('');
    setAdminPhone('');
    setAdminEmail('');
    setAdminPassword('');
    setAdminBusiness('');
    setShowPassword(false);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName || !adminPhone || !adminPassword) {
      toast.push(
        <Notification type="danger" title="Validation Error">
          Please fill in Name, Phone, and Password fields.
        </Notification>
      );
      return;
    }

    const payload: any = {
      name: adminName,
      phone: adminPhone,
      password: adminPassword,
    };

    if (adminEmail) payload.email = adminEmail;
    if (adminBusiness) payload.business_name = adminBusiness;

    createAdminMutation.mutate(payload);
  };

  const copyCredsToClipboard = () => {
    if (!createdAdminCreds) return;
    const text = `TransitFlow Admin Account Created:\n` +
      `Name: ${createdAdminCreds.name}\n` +
      `Phone/Username: ${createdAdminCreds.phone}\n` +
      `Password: ${createdAdminCreds.password}\n` +
      `Business: ${createdAdminCreds.business}`;
    
    navigator.clipboard.writeText(text);
    toast.push(
      <Notification type="success" title="Copied">
        Credentials copied to clipboard!
      </Notification>
    );
  };

  const adminsData = adminsResponse?.data || {};
  const adminsList = adminsData.admins || [];
  const totalAdminsCount = adminsData.pagination?.total || 0;
  const perPage = adminsData.pagination?.per_page || 15;

  const adminDetail = adminDetailResponse?.data || {};
  const adminDetailInfo = adminDetail.admin || {};
  const adminVehicles = adminDetail.vehicles || [];
  const adminDetailCounts = adminDetail.counts || { drivers: 0, students: 0, passengers: 0 };
  const adminRecentTx = adminDetail.recent_transactions || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrators Administration"
        breadcrumbs={[
          { label: 'Platform Management', path: '#' },
          { label: 'Administrators' }
        ]}
        action={
          <Button
            variant="solid"
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 rounded-xl py-2 px-4 shadow-lg shadow-blue-500/10"
            onClick={() => {
              setCreatedAdminCreds(null);
              setIsCreateModalOpen(true);
            }}
          >
            <UserPlus className="w-4 h-4" />
            Create New Admin
          </Button>
        }
      />

      {/* Main Admin List Table */}
      <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Registered System Administrators
            </h4>
            <div className="relative max-w-xs w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <Input
                placeholder="Search admins by name, phone..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Admin Name / Business</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Phone</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Vehicles</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Students</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Revenue (Month)</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Pending Dues</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">WhatsApp</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500">Status</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase text-slate-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoadingAdmins ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        Loading administrators...
                      </div>
                    </td>
                  </tr>
                ) : adminsList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                      No admin owners registered yet.
                    </td>
                  </tr>
                ) : (
                  adminsList.map((admin: any) => (
                    <tr key={admin.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-sm">
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        <div>{admin.name}</div>
                        <div className="text-xs text-slate-400 font-normal mt-0.5">{admin.admin_settings?.business_name || 'N/A'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">{admin.phone}</td>
                      <td className="py-3.5 px-4">
                        <Tag className="bg-slate-100 text-slate-700 border border-slate-200 font-bold px-2 py-0.5 text-xs">
                          {admin.vehicles_count}
                        </Tag>
                      </td>
                      <td className="py-3.5 px-4">
                        <Tag className="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-0.5 text-xs">
                          {admin.students_count}
                        </Tag>
                      </td>
                      <td className="py-3.5 px-4 text-emerald-600 font-semibold">
                        ₹{Number(admin.revenue_this_month).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {admin.pending_dues > 0 ? (
                          <span className="text-rose-600 font-semibold">₹{Number(admin.pending_dues).toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {admin.admin_settings?.whatsapp_sender_phone ? (
                          <Tag className="bg-emerald-50 text-emerald-700 border-emerald-250 font-bold text-xs">
                            Active
                          </Tag>
                        ) : (
                          <Tag className="bg-slate-100 text-slate-500 border-slate-200 text-xs">
                            Not Set
                          </Tag>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Tag 
                          className={admin.is_active 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs' 
                            : 'bg-rose-50 text-rose-700 border-rose-200 font-bold text-xs'
                          }
                        >
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </Tag>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            size="xs" 
                            variant="default"
                            className="hover:text-blue-600 rounded-lg py-1 px-2.5 no-underline"
                            icon={<Eye className="w-3.5 h-3.5" />}
                            onClick={() => setSelectedAdminId(admin.id)}
                          >
                            View
                          </Button>
                          {admin.is_active && (
                            <Button 
                              size="xs" 
                              variant="default"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg py-1 px-2.5 no-underline font-semibold"
                              disabled={impersonateMutation.isPending}
                              icon={<LogIn className="w-3.5 h-3.5" />}
                              onClick={() => impersonateMutation.mutate(admin.id)}
                            >
                              {impersonateMutation.isPending && impersonateMutation.variables === admin.id ? 'Loading...' : 'Impersonate'}
                            </Button>
                          )}
                          <Button 
                            size="xs" 
                            variant="default"
                            className={admin.is_active 
                              ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg py-1 px-2.5 no-underline' 
                              : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg py-1 px-2.5 no-underline'
                            }
                            onClick={() => setAdminToToggle({ id: admin.id, name: admin.name, active: admin.is_active })}
                          >
                            {admin.is_active ? 'Suspend' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination */}
          {totalAdminsCount > perPage && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing {adminsList.length} of {totalAdminsCount} admins
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="rounded-lg"
                >
                  Previous
                </Button>
                <Button 
                  size="sm" 
                  disabled={adminsList.length < perPage}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="rounded-lg"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Admin Details Side Sheet */}
      <Drawer
        isOpen={selectedAdminId !== null}
        onClose={() => setSelectedAdminId(null)}
        title="Admin Detail Information"
        width={600}
      >
        {isLoadingDetail ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-slate-400">Loading details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{adminDetailInfo.name}</h3>
              <p className="text-slate-500 text-sm mt-0.5">{adminDetailInfo.admin_settings?.business_name || 'Individual Operator'}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Phone</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {adminDetailInfo.phone}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Email</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {adminDetailInfo.email || 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Registration</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(adminDetailInfo.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-center">
                <span className="text-xs text-slate-500 font-medium">Vehicles</span>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">{adminVehicles.length}</h4>
              </div>
              <div className="text-center border-l border-slate-200/50 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-medium">Drivers</span>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">{adminDetailCounts.drivers}</h4>
              </div>
              <div className="text-center border-l border-slate-200/50 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-medium">Students</span>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">{adminDetailCounts.students}</h4>
              </div>
              <div className="text-center border-l border-slate-200/50 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-medium">Passengers</span>
                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">{adminDetailCounts.passengers}</h4>
              </div>
            </div>

            {/* Vehicles Details list */}
            <div>
              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
                Fitted Vehicles ({adminVehicles.length})
              </h5>
              <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-150">
                {adminVehicles.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3">No vehicles added.</p>
                ) : (
                  adminVehicles.map((veh: any) => {
                    const activeDriverName = veh.driver_assignments?.[0]?.driver?.name;
                    return (
                      <div key={veh.id} className="flex justify-between items-center p-3 hover:bg-slate-50/50">
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{veh.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Driver: {activeDriverName ? <strong className="text-slate-600 font-semibold">{activeDriverName}</strong> : <span className="italic">Unassigned</span>}
                          </p>
                        </div>
                        <Tag 
                          className={veh.type === 'bus' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200 text-[10px]' 
                            : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                          }
                        >
                          <span className="capitalize">{veh.type}</span>
                        </Tag>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent Payments logs */}
            <div>
              <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
                Recent Admin Payments
              </h5>
              <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs">
                      <th className="py-2.5 px-3 font-semibold text-slate-500">Recipient</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-500">Route</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-500">Amount</th>
                      <th className="py-2.5 px-3 font-semibold text-slate-500">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-xs">
                    {adminRecentTx.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400 italic">No payments logged yet.</td>
                      </tr>
                    ) : (
                      adminRecentTx.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">{tx.person_name}</td>
                          <td className="py-2.5 px-3 text-slate-400">{tx.vehicle_name || '-'}</td>
                          <td className="py-2.5 px-3 text-emerald-600 font-bold">₹{tx.amount}</td>
                          <td className="py-2.5 px-3 capitalize text-slate-500">{tx.payment_method}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions button */}
            <div className="pt-4 border-t border-slate-150">
              <Button
                variant="solid"
                className={adminDetailInfo.is_active 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white w-full rounded-xl py-2.5 flex items-center justify-center gap-2'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white w-full rounded-xl py-2.5 flex items-center justify-center gap-2'
                }
                onClick={() => {
                  setAdminToToggle({
                    id: adminDetailInfo.id,
                    name: adminDetailInfo.name,
                    active: adminDetailInfo.is_active
                  });
                }}
              >
                {adminDetailInfo.is_active ? 'Deactivate Admin' : 'Activate Admin'}
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Create New Admin Modal */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreatedAdminCreds(null);
        }}
        width={480}
      >
        <div className="mb-4">
          <h5 className="text-lg font-bold text-slate-900 dark:text-slate-100">Create Admin Account</h5>
        </div>
        {!createdAdminCreds ? (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Full Name</label>
              <Input
                placeholder="e.g. John Doe"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Phone</label>
                <Input
                  placeholder="e.g. 919876543210"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className="rounded-xl font-medium"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Email (Optional)</label>
                <Input
                  type="email"
                  placeholder="e.g. john@business.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="rounded-xl font-medium pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Business Name (Optional)</label>
              <Input
                placeholder="e.g. Metro School Transports"
                value={adminBusiness}
                onChange={(e) => setAdminBusiness(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                className="rounded-xl"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="solid"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/15"
                loading={createAdminMutation.isPending}
              >
                Create Account
              </Button>
            </div>
          </form>
        ) : (
          /* One-time credentials display card */
          <div className="space-y-5">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3.5">
              <Check className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <h5 className="font-bold text-slate-800">Admin Owner Created Successfully</h5>
                <p className="text-xs text-slate-500 mt-0.5">Please copy this credentials configuration sheet immediately. It will not be shown again.</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3 font-mono text-xs text-slate-700 relative">
              <button 
                type="button"
                onClick={copyCredsToClipboard}
                className="absolute right-3 top-3 text-slate-400 hover:text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 rounded p-1.5 transition-all shadow-sm"
                title="Copy Credentials"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase font-sans">Full Name</span>
                <p className="font-bold mt-0.5">{createdAdminCreds.name}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase font-sans">Phone / Login Username</span>
                <p className="font-bold mt-0.5">{createdAdminCreds.phone}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase font-sans">Password</span>
                <p className="font-bold text-blue-600 mt-0.5">{createdAdminCreds.password}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase font-sans">Business Details</span>
                <p className="mt-0.5 font-bold">{createdAdminCreds.business}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="solid"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setCreatedAdminCreds(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirm Deactivation Dialog */}
      <ConfirmDialog
        open={adminToToggle !== null}
        title={adminToToggle?.active ? 'Deactivate Owner?' : 'Activate Owner?'}
        description={adminToToggle?.active
          ? `Are you sure you want to deactivate ${adminToToggle?.name}? This will block their login and revoke all active sessions.`
          : `Activate owner ${adminToToggle?.name}? This will restore access to their dashboard.`
        }
        confirmLabel={adminToToggle?.active ? 'Deactivate' : 'Activate'}
        dangerous={adminToToggle?.active}
        onConfirm={() => {
          if (adminToToggle) toggleStatusMutation.mutate(adminToToggle.id);
        }}
        onCancel={() => setAdminToToggle(null)}
      />
    </div>
  );
};

export default AdminsListPage;

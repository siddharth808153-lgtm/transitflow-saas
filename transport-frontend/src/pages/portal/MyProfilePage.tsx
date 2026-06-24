// src/pages/portal/MyProfilePage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, Phone, Mail, Lock, Shield, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import api from '@/api/axios';
import { PORTAL, AUTH } from '@/api/endpoints';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Tag from '@/components/ui/Tag';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import useAuthStore from '@/store/authStore';

export const MyProfilePage: React.FC = () => {
  const { logout } = useAuthStore();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // 1. Fetch user profile info
  const { data: profileResponse, isLoading } = useQuery({
    queryKey: ['portal-profile-details'],
    queryFn: async () => {
      const res = await api.get(PORTAL.PROFILE);
      return res.data;
    },
  });

  const profileData = profileResponse?.data || {};
  const userInfo = profileData.user || {};
  const students = profileData.students || [];
  const passengers = profileData.passengers || [];

  // 2. Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.patch(AUTH.CHANGE_PASSWORD, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.push(
        <Notification type="success" title="Success">
          Password updated successfully.
        </Notification>
      );
      // Clear forms
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => {
      toast.push(
        <Notification type="danger" title="Error">
          {err.response?.data?.message || 'Failed to change password. Please check your credentials.'}
        </Notification>
      );
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.push(
        <Notification type="danger" title="Validation Error">
          Please fill in all password fields.
        </Notification>
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.push(
        <Notification type="danger" title="Validation Error">
          New password and confirmation do not match.
        </Notification>
      );
      return;
    }

    changePasswordMutation.mutate({
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirmation: confirmPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-400">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="flex flex-col items-center justify-center py-6 bg-slate-50 border border-slate-150 rounded-2xl">
        <Avatar className="bg-blue-600 text-white font-bold text-xl w-16 h-16 rounded-2xl flex items-center justify-center uppercase mb-3">
          {userInfo.name?.substring(0, 2) || 'US'}
        </Avatar>
        <h4 className="text-base font-bold text-slate-900">{userInfo.name}</h4>
        <Tag className="bg-blue-100 text-blue-800 text-[10px] font-bold mt-1 px-2.5 rounded-full capitalize">
          Client Account
        </Tag>
      </div>

      {/* Profile details */}
      <Card className="border border-slate-150 rounded-2xl shadow-sm p-4 bg-white space-y-3">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Details</h5>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Phone Number</span>
            <span className="text-xs font-semibold text-slate-800">{userInfo.phone}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Email Address</span>
            <span className="text-xs font-semibold text-slate-800">{userInfo.email || 'Not configured'}</span>
          </div>
        </div>
      </Card>

      {/* Children Accounts List */}
      {students.length > 0 && (
        <Card className="border border-slate-150 rounded-2xl shadow-sm p-4 bg-white">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Linked Bus Students</h5>
          <div className="space-y-3 divide-y divide-slate-100">
            {students.map((std: any, idx: number) => (
              <div key={std.id} className={`flex justify-between items-center ${idx > 0 ? 'pt-3' : ''}`}>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{std.student_name}</span>
                  <span className="text-[10px] text-slate-400">Class {std.class}-{std.section}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-semibold block">{std.current_bus?.vehicle_name || 'N/A'}</span>
                  <span className="text-[10px] text-slate-400 font-bold">₹{std.current_bus?.monthly_fee || 0}/month</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Passenger Accounts List */}
      {passengers.length > 0 && (
        <Card className="border border-slate-150 rounded-2xl shadow-sm p-4 bg-white">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Linked Auto Passengers</h5>
          <div className="space-y-3 divide-y divide-slate-100">
            {passengers.map((psg: any, idx: number) => (
              <div key={psg.id} className={`flex justify-between items-center ${idx > 0 ? 'pt-3' : ''}`}>
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{psg.name}</span>
                  <span className="text-[10px] text-slate-400">Rider Account</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-semibold block">{psg.vehicle_name || 'N/A'}</span>
                  <span className="text-[10px] text-slate-400 font-bold">₹{psg.daily_fare || 0}/day</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Change Password Panel */}
      <Card className="border border-slate-150 rounded-2xl shadow-sm p-4 bg-white">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Change Account Password</h5>
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          
          <div className="space-y-1.5 relative">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Current Password</span>
            <div className="relative">
              <Input
                type={showOldPass ? 'text' : 'password'}
                placeholder="Current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="pr-10 rounded-xl text-xs py-2 bg-slate-50/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowOldPass(!showOldPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 relative">
            <span className="text-[10px] text-slate-400 font-bold uppercase">New Password</span>
            <div className="relative">
              <Input
                type={showNewPass ? 'text' : 'password'}
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10 rounded-xl text-xs py-2 bg-slate-50/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 relative">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Confirm New Password</span>
            <div className="relative">
              <Input
                type={showConfirmPass ? 'text' : 'password'}
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pr-10 rounded-xl text-xs py-2 bg-slate-50/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="solid"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 px-4 shadow-md text-xs font-bold flex items-center justify-center gap-1.5 mt-2"
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </Card>

      {/* Logout button */}
      <Button
        variant="solid"
        className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-2xl py-3 px-4 shadow-lg shadow-rose-500/10 font-bold text-sm flex items-center justify-center gap-2"
        onClick={() => logout()}
      >
        Sign Out Profile
      </Button>

      {/* Version context */}
      <div className="text-center text-[10px] text-slate-400 py-4 font-semibold uppercase tracking-wider">
        TransitFlow Mobile Portal v1.0.0
      </div>

    </div>
  );
};

export default MyProfilePage;

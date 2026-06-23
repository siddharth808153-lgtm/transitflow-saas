// src/pages/auth/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bus, Eye, EyeOff, Lock, Phone } from 'lucide-react';
import api from '@/api/axios';
import { AUTH } from '@/api/endpoints';
import useAuthStore from '@/store/authStore';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.push(
        <Notification type="danger" title="Validation Error">
          Please fill in all fields.
        </Notification>
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post(AUTH.LOGIN, { phone, password });
      const { success, message, data } = response.data;

      if (success && data?.token && data?.user) {
        login(data.user, data.token);
        toast.push(
          <Notification type="success" title="Login Successful" duration={3500}>
            {message || `Welcome back, ${data.user.name}!`}
          </Notification>
        );
        navigate('/dashboard', { replace: true });
      } else {
        throw new Error(message || 'Failed to authenticate');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Invalid credentials or connection error.';
      toast.push(
        <Notification type="danger" title="Authentication Failed" duration={4000}>
          {errMsg}
        </Notification>
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        {/* App Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/20 mb-4 animate-bounce">
            <Bus className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Transport<span className="text-blue-600">Manager</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Sign in to manage your transport fleet & schedules
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-2">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <Input
                  type="text"
                  placeholder="Enter your phone number (e.g. 9999999999)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 pr-10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="solid"
              block
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-transform duration-100"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;

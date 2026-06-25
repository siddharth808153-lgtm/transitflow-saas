// src/pages/auth/SignUpPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Bus, Eye, EyeOff, Lock, Phone, User, Mail } from 'lucide-react';
import api from '@/api/axios';
import { AUTH } from '@/api/endpoints';
import useAuthStore from '@/store/authStore';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !password || !passwordConfirmation) {
      toast.push(
        <Notification type="danger" title="Validation Error">
          Please fill in all required fields.
        </Notification>
      );
      return;
    }

    if (password !== passwordConfirmation) {
      toast.push(
        <Notification type="danger" title="Validation Error">
          Passwords do not match.
        </Notification>
      );
      return;
    }

    if (password.length < 8) {
      toast.push(
        <Notification type="danger" title="Validation Error">
          Password must be at least 8 characters.
        </Notification>
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post(AUTH.REGISTER, {
        name,
        phone,
        email: email || undefined,
        password,
        password_confirmation: passwordConfirmation,
      });
      const { success, message, data } = response.data;

      if (success && data?.token && data?.user) {
        login(data.user, data.token);
        toast.push(
          <Notification type="success" title="Account Created!" duration={3500}>
            {message || `Welcome, ${data.user.name}! Your account is ready.`}
          </Notification>
        );
        navigate('/dashboard', { replace: true });
      } else {
        throw new Error(message || 'Registration failed');
      }
    } catch (err: any) {
      const errData = err.response?.data;
      let errMsg = errData?.message || err.message || 'Registration failed. Please try again.';

      // Handle Laravel validation errors
      if (errData?.errors) {
        const firstError = Object.values(errData.errors).flat()[0];
        if (firstError) errMsg = firstError as string;
      }

      toast.push(
        <Notification type="danger" title="Registration Failed" duration={4000}>
          {errMsg}
        </Notification>
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md">
        {/* App Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/20 mb-4">
            <Bus className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
            Transport<span className="text-blue-600">Manager</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Create your account to get started
          </p>
        </div>

        {/* Sign Up Card */}
        <Card className="shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-3xl p-2">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Phone Number <span className="text-red-500">*</span>
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

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Email <span className="text-slate-400 text-[10px] normal-case">(optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password (min 8 characters)"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 pr-10 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            {/* Sign In Link */}
            <div className="text-center pt-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
              </span>
              <Link
                to="/login"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SignUpPage;

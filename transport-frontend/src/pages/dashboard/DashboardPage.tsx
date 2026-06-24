// src/pages/dashboard/DashboardPage.tsx
import React from 'react';
import { Navigate } from 'react-router';
import useAuthStore from '@/store/authStore';
import SuperAdminDashboard from './SuperAdminDashboard';
import AdminDashboard from './AdminDashboard';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  if (user?.role === 'user') {
    return <Navigate to="/portal/payments" replace />;
  }

  if (user?.role === 'super_admin') {
    return <SuperAdminDashboard />;
  }

  return <AdminDashboard />;
};

export default DashboardPage;

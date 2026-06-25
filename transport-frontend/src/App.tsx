// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Theme from '@/components/template/Theme';
import useAuthStore from '@/store/authStore';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/auth/LoginPage';
import SignUpPage from '@/pages/auth/SignUpPage';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import VehiclesPage from '@/pages/vehicles/VehiclesPage';
import VehicleFormPage from '@/pages/vehicles/VehicleFormPage';
import VehicleDetailPage from '@/pages/vehicles/VehicleDetailPage';
import DriversPage from '@/pages/drivers/DriversPage';
import DriverFormPage from '@/pages/drivers/DriverFormPage';
import DriverDetailPage from '@/pages/drivers/DriverDetailPage';
import StudentsPage from '@/pages/students/StudentsPage';
import StudentFormPage from '@/pages/students/StudentFormPage';
import StudentDetailPage from '@/pages/students/StudentDetailPage';
import PassengersPage from '@/pages/passengers/PassengersPage';
import PassengerFormPage from '@/pages/passengers/PassengerFormPage';
import PassengerDetailPage from '@/pages/passengers/PassengerDetailPage';
import TransactionsPage from '@/pages/transactions/TransactionsPage';
import DuesPage from '@/pages/dues/DuesPage';
import WhatsAppSettingsPage from '@/pages/settings/WhatsAppSettingsPage';
import { AdminsListPage } from '@/pages/superadmin/AdminsListPage';
import UserLayout from '@/components/layout/UserLayout';
import MyPaymentsPage from '@/pages/portal/MyPaymentsPage';
import MyDuesPage from '@/pages/portal/MyDuesPage';
import MyProfilePage from '@/pages/portal/MyProfilePage';
import ReportsPage from '@/pages/reports/ReportsPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Initialize React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Role Protected Route Guard
const RoleProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ children, allowedRoles }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public Route Guard (Redirect to dashboard if already authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Theme>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/sign-up"
              element={
                <PublicRoute>
                  <SignUpPage />
                </PublicRoute>
              }
            />

            {/* Protected Routes (rendered inside AppLayout) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="vehicles" element={<VehiclesPage />} />
              <Route path="vehicles/new" element={<VehicleFormPage />} />
              <Route path="vehicles/:id" element={<VehicleDetailPage />} />
              <Route path="vehicles/:id/edit" element={<VehicleFormPage />} />
              <Route path="drivers" element={<DriversPage />} />
              <Route path="drivers/new" element={<DriverFormPage />} />
              <Route path="drivers/:id" element={<DriverDetailPage />} />
              <Route path="drivers/:id/edit" element={<DriverFormPage />} />
              
              {/* Students routes */}
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/new" element={<StudentFormPage />} />
              <Route path="students/:id" element={<StudentDetailPage />} />
              <Route path="students/:id/edit" element={<StudentFormPage />} />

              {/* Passengers routes */}
              <Route path="passengers" element={<PassengersPage />} />
              <Route path="passengers/new" element={<PassengerFormPage />} />
              <Route path="passengers/:id" element={<PassengerDetailPage />} />
              <Route path="passengers/:id/edit" element={<PassengerFormPage />} />

              {/* Transactions routes */}
              <Route path="transactions" element={<TransactionsPage />} />

              {/* Dues routes */}
              <Route path="dues" element={<DuesPage />} />

              {/* Settings routes */}
              <Route path="settings/whatsapp" element={<WhatsAppSettingsPage />} />

              {/* Reports routes */}
              <Route 
                path="reports" 
                element={
                  <RoleProtectedRoute allowedRoles={['admin', 'super_admin']}>
                    <ReportsPage />
                  </RoleProtectedRoute>
                } 
              />

              {/* Super Admin routes */}
              <Route 
                path="admins" 
                element={
                  <RoleProtectedRoute allowedRoles={['super_admin']}>
                    <AdminsListPage />
                  </RoleProtectedRoute>
                } 
              />
            </Route>

            {/* User Portal routes */}
            <Route
              path="/portal"
              element={
                <RoleProtectedRoute allowedRoles={['user']}>
                  <UserLayout />
                </RoleProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/portal/payments" replace />} />
              <Route path="payments" element={<MyPaymentsPage />} />
              <Route path="dues" element={<MyDuesPage />} />
              <Route path="profile" element={<MyProfilePage />} />
            </Route>

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </Theme>
    </QueryClientProvider>
  );
}

export default App;

// src/components/layout/Topbar.tsx
import React from 'react';
import { useLocation } from 'react-router';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import Badge from '@/components/ui/Badge';
import Dropdown from '@/components/ui/Dropdown';

interface TopbarProps {
  onMobileMenuToggle?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMobileMenuToggle }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Determine current page title based on path
  const getPageTitle = (pathname: string) => {
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    if (pathname.startsWith('/vehicles')) {
      if (pathname.includes('/new')) return 'Add Vehicle';
      if (pathname.includes('/edit')) return 'Edit Vehicle';
      return 'Vehicles';
    }
    if (pathname.startsWith('/drivers')) {
      if (pathname.includes('/new')) return 'Add Driver';
      if (pathname.includes('/edit')) return 'Edit Driver';
      return 'Drivers';
    }
    return 'Transport Manager';
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50';
      case 'admin':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-800';
    }
  };

  return (
    <header className="sticky top-0 right-0 left-0 h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-40 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Mobile menu toggle */}
        <button 
          onClick={onMobileMenuToggle}
          className="md:hidden text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {getPageTitle(location.pathname)}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* User Role Badge */}
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize tracking-wide ${getRoleBadgeColor(user?.role)}`}>
          {user?.role?.replace('_', ' ') || 'User'}
        </span>

        {/* Notification Bell */}
        <button className="relative text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white dark:ring-slate-950"></span>
        </button>

        {/* User Menu Dropdown (using custom UI Dropdown) */}
        <div className="md:hidden flex items-center">
          <Dropdown
            renderTitle={
              <button className="text-slate-500 hover:text-slate-700 p-1 hover:bg-slate-50 rounded-full">
                <User className="w-5 h-5" />
              </button>
            }
            placement="bottom-end"
          >
            <Dropdown.Item onClick={logout} eventKey="logout">
              <span className="flex items-center gap-2 text-rose-600">
                <LogOut className="w-4 h-4" />
                Logout
              </span>
            </Dropdown.Item>
          </Dropdown>
        </div>
      </div>
    </header>
  );
};

export default Topbar;

// src/components/layout/AppLayout.tsx
import React, { useState } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Drawer from '@/components/ui/Drawer';
import { 
  Bus, 
  LayoutDashboard, 
  UserCheck, 
  GraduationCap, 
  Users, 
  Receipt, 
  Settings, 
  LogOut 
} from 'lucide-react';
import useAuthStore from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';
import { useThemeStore } from '@/store/themeStore';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const isCollapsed = useThemeStore((state) => state.layout.sideNavCollapse);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If not authenticated, redirect to /login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Vehicles', path: '/vehicles', icon: Bus },
    { label: 'Drivers', path: '/drivers', icon: UserCheck },
    { label: 'Students', path: '/students', icon: GraduationCap, isPlaceholder: true },
    { label: 'Passengers', path: '/passengers', icon: Users, isPlaceholder: true },
    { label: 'Transactions', path: '/transactions', icon: Receipt, isPlaceholder: true },
    { label: 'Settings', path: '/settings', icon: Settings, isPlaceholder: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900/40 flex">
      {/* Sidebar for Desktop */}
      <Sidebar />

      {/* Mobile Drawer Navigation */}
      <Drawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        placement="left"
        bodyClass="p-0 bg-slate-900 text-slate-100 flex flex-col justify-between h-full"
        title={
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 text-slate-100">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Bus className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Transport<span className="text-blue-500">Manager</span>
            </span>
          </div>
        }
      >
        <div className="flex-1 flex flex-col justify-between">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={item.isPlaceholder ? '#' : item.path}
                  onClick={(e) => {
                    if (item.isPlaceholder) {
                      e.preventDefault();
                    } else {
                      setMobileMenuOpen(false);
                    }
                  }}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                    ${item.isPlaceholder ? 'text-slate-500 cursor-not-allowed' : 'hover:bg-slate-800 hover:text-white'}
                    ${isActive && !item.isPlaceholder ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-300'}
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">
                    {item.label}
                    {item.isPlaceholder && (
                      <span className="ml-2 text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-normal">
                        Soon
                      </span>
                    )}
                  </span>
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="bg-blue-600 text-white font-bold" size="sm">
                  {user?.name?.substring(0, 2) || 'US'}
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{user?.name || 'User'}</p>
                  <p className="text-xs text-slate-400 capitalize">{user?.role?.replace('_', ' ') || 'Admin'}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="text-slate-400 hover:text-rose-500 p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${isCollapsed ? 'md:pl-16' : 'md:pl-60'} transition-all duration-300 min-w-0`}>
        <Topbar onMobileMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;

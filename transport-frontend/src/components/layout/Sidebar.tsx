// src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { NavLink } from 'react-router';
import { 
  Bus, 
  LayoutDashboard, 
  UserCheck, 
  GraduationCap, 
  Users, 
  Receipt, 
  Settings, 
  LogOut, 
  Menu,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  User,
  FileText
} from 'lucide-react';
import useAuthStore from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';
import { useThemeStore } from '@/store/themeStore';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const isCollapsed = useThemeStore((state) => state.layout.sideNavCollapse);
  const setSideNavCollapse = useThemeStore((state) => state.setSideNavCollapse);

  const role = user?.role || 'admin';
  let navItems: { label: string; path: string; icon: any; isPlaceholder?: boolean }[] = [];

  if (role === 'super_admin') {
    navItems = [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Admins', path: '/admins', icon: Users },
      { label: 'Reports', path: '/reports', icon: FileText },
      { label: 'Revenue', path: '/revenue', icon: CreditCard, isPlaceholder: true },
      { label: 'WhatsApp Settings', path: '/settings/whatsapp', icon: Settings },
    ];
  } else if (role === 'admin') {
    navItems = [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Vehicles', path: '/vehicles', icon: Bus },
      { label: 'Drivers', path: '/drivers', icon: UserCheck },
      { label: 'Students', path: '/students', icon: GraduationCap },
      { label: 'Passengers', path: '/passengers', icon: Users },
      { label: 'Transactions', path: '/transactions', icon: Receipt },
      { label: 'Dues', path: '/dues', icon: CreditCard },
      { label: 'Reports', path: '/reports', icon: FileText },
      { label: 'WhatsApp Settings', path: '/settings/whatsapp', icon: Settings },
    ];
  } else {
    // role is 'user' (student/parent/passenger)
    navItems = [
      { label: 'My Payments', path: '/portal/payments', icon: CreditCard },
      { label: 'Profile', path: '/portal/profile', icon: User },
    ];
  }

  return (
    <aside 
      className={`fixed top-0 left-0 h-screen bg-slate-900 text-slate-100 flex flex-col justify-between transition-all duration-300 border-r border-slate-800 z-50
        ${isCollapsed ? 'w-16' : 'w-60'} 
        md:flex hidden`}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Bus className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <span className="font-bold text-lg tracking-tight whitespace-nowrap">
                Transport<span className="text-blue-500">Manager</span>
              </span>
            )}
          </div>
          <button 
            onClick={() => setSideNavCollapse(!isCollapsed)}
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.isPlaceholder ? '#' : item.path}
                onClick={(e) => item.isPlaceholder && e.preventDefault()}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                  ${item.isPlaceholder ? 'text-slate-500 cursor-not-allowed' : 'hover:bg-slate-800 hover:text-white'}
                  ${isActive && !item.isPlaceholder ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-300'}
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${item.isPlaceholder ? 'text-slate-600' : 'text-slate-400 group-hover:text-white'}`} />
                {!isCollapsed && (
                  <span className="truncate flex-1">
                    {item.label}
                    {item.isPlaceholder && (
                      <span className="ml-2 text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-normal">
                        Soon
                      </span>
                    )}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Session Info Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center justify-between gap-3 overflow-hidden">
          <div className="flex items-center gap-3">
            <Avatar 
              className="bg-blue-600 text-white font-bold uppercase rounded-xl flex-shrink-0"
              size="sm"
            >
              {user?.name?.substring(0, 2) || 'US'}
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{user?.role?.replace('_', ' ') || 'Admin'}</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button 
              onClick={logout}
              className="text-slate-400 hover:text-rose-500 p-1.5 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

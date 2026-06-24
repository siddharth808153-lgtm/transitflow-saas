// src/components/layout/UserLayout.tsx
import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { House, AlertCircle, User, LogOut, Bus } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import Avatar from '@/components/ui/Avatar';

export const UserLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Home', path: '/portal/payments', icon: House },
    { label: 'Dues', path: '/portal/dues', icon: AlertCircle },
    { label: 'Profile', path: '/portal/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center items-stretch font-sans">
      {/* Mobile Frame Container: 480px max-width, centered, simulated mobile screen */}
      <div className="w-full max-w-[480px] bg-white flex flex-col justify-between shadow-xl relative min-h-screen">
        
        {/* Top Navbar */}
        <header className="sticky top-0 left-0 right-0 h-16 bg-white border-b border-slate-150 flex items-center justify-between px-4 z-40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg text-white">
              <Bus className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">
              Transit<span className="text-blue-600">Flow</span>
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="bg-blue-100 text-blue-600 font-bold text-xs" size="sm">
                {user?.name?.substring(0, 2) || 'US'}
              </Avatar>
              <span className="text-xs font-semibold text-slate-700 hidden xs:inline-block max-w-[80px] truncate">
                {user?.name || 'User'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-500 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 bg-slate-50/50">
          <Outlet />
        </main>

        {/* Bottom Tab Bar */}
        <nav className="fixed bottom-0 max-w-[480px] w-full h-16 bg-white border-t border-slate-150 flex justify-around items-center z-40">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) => `
                  flex flex-col items-center justify-center gap-1 w-20 py-1.5 transition-all text-xs font-bold
                  ${isActive ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600'}
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default UserLayout;

// src/pages/dashboard/DashboardPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { 
  Bus, 
  Car, 
  UserCheck, 
  Users, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import api from '@/api/axios';
import { VEHICLES, DRIVERS } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import useAuthStore from '@/store/authStore';

const chartData = [
  { name: 'Jan', revenue: 4000, trips: 240 },
  { name: 'Feb', revenue: 3000, trips: 198 },
  { name: 'Mar', revenue: 5000, trips: 310 },
  { name: 'Apr', revenue: 4780, trips: 280 },
  { name: 'May', revenue: 6890, trips: 390 },
  { name: 'Jun', revenue: 8390, trips: 480 },
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Fetch data counts
  const { data: vehiclesResponse } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get(VEHICLES.LIST);
      return res.data;
    },
  });

  const { data: driversResponse } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await api.get(DRIVERS.LIST);
      return res.data;
    },
  });

  const vehicles = vehiclesResponse?.data || [];
  const drivers = driversResponse?.data || [];

  const totalVehicles = vehicles.length;
  const activeBuses = vehicles.filter((v: any) => v.type === 'bus' && v.is_active).length;
  const activeAutos = vehicles.filter((v: any) => v.type === 'auto' && v.is_active).length;
  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter((d: any) => d.is_active).length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold tracking-wide backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            System Online
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Hello, {user?.name || 'Administrator'}!
          </h1>
          <p className="text-blue-100 text-sm max-w-md">
            Welcome back to your Transport Management Dashboard. Here is the operational summary of your fleet today.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            className="bg-white hover:bg-slate-50 text-blue-600 rounded-xl font-bold text-xs px-4 py-2.5 shadow-sm"
            onClick={() => navigate('/vehicles/new')}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Vehicle
          </Button>
          <Button 
            className="bg-blue-500/20 border border-white/10 hover:bg-blue-500/30 text-white rounded-xl font-bold text-xs px-4 py-2.5"
            onClick={() => navigate('/drivers/new')}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Driver
          </Button>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Fleet Size"
          value={totalVehicles}
          icon={<Bus className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Active Drivers"
          value={`${activeDrivers}/${totalDrivers}`}
          icon={<UserCheck className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Active School Buses"
          value={activeBuses}
          icon={<Bus className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Active Auto Rickshaws"
          value={activeAutos}
          icon={<Car className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Revenue Performance</h3>
              <p className="text-xs text-slate-400">Monthly overview of fares and rental collections</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
              +18.4%
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Side Chart (Trips) */}
        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Completed Trips</h3>
            <p className="text-xs text-slate-400">Total transits dispatched per month</p>
          </div>
          <div className="h-56 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="trips" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Shortcuts/Activity Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Quick Shortcuts</h3>
            <p className="text-xs text-slate-400 mt-0.5">Frequent actions and operations</p>
          </div>
          <div className="mt-4 space-y-2">
            <button 
              onClick={() => navigate('/vehicles')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 text-slate-700 text-sm font-semibold transition-colors group"
            >
              <span>View Active Vehicles List</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </button>
            <button 
              onClick={() => navigate('/drivers')}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 text-slate-700 text-sm font-semibold transition-colors group"
            >
              <span>View Registered Drivers List</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </button>
          </div>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">System Operations</h3>
            <p className="text-xs text-slate-400 mt-0.5">Overview of database settings and integrations</p>
          </div>
          <div className="mt-4 text-xs text-slate-500 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between">
              <span>Sanctum Authentication:</span>
              <span className="font-semibold text-emerald-600">Connected</span>
            </div>
            <div className="flex justify-between">
              <span>Baileys WhatsApp Gateway:</span>
              <span className="font-semibold text-slate-600">Initialized (Mock)</span>
            </div>
            <div className="flex justify-between">
              <span>Database Engine:</span>
              <span className="font-semibold text-slate-600">MySQL</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;

// src/pages/NotFoundPage.tsx
import React from 'react';
import { useNavigate } from 'react-router';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
      <div className="p-4 bg-rose-50 text-rose-600 rounded-3xl mb-6 shadow-lg shadow-rose-500/5 animate-pulse">
        <ShieldAlert className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight">404 - Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-sm mt-3 mb-8">
        The page you are looking for does not exist or has been moved. Please check the URL or head back home.
      </p>
      <Button
        variant="solid"
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-6 font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98]"
        onClick={() => navigate('/dashboard')}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Button>
    </div>
  );
};

export default NotFoundPage;

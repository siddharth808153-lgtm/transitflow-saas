// src/pages/portal/MyDuesPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, MessageSquare, Check, Loader2, ArrowRight } from 'lucide-react';
import api from '@/api/axios';
import { PORTAL } from '@/api/endpoints';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export const MyDuesPage: React.FC = () => {
  const { data: duesResponse, isLoading } = useQuery({
    queryKey: ['portal-dues'],
    queryFn: async () => {
      const res = await api.get(PORTAL.DUES);
      return res.data;
    },
  });

  const duesData = duesResponse?.data || {};
  const studentDues = duesData.student_dues || [];
  const passengerDues = duesData.passenger_dues || [];
  const totalPending = duesData.total_pending || 0;

  const hasDues = studentDues.length > 0 || passengerDues.length > 0;

  const formatWhatsAppLink = (phone: string, text: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-400">Checking for dues...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h3 className="text-xl font-black text-slate-900">Your Dues</h3>
        <p className="text-xs text-slate-400 mt-0.5">Manage outstanding transport fees.</p>
      </div>

      {!hasDues ? (
        /* No Dues Screen with checkmark animation */
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center animate-bounce">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-black text-slate-900">All caught up!</h4>
            <p className="text-xs text-slate-400">No pending dues. You are all set! 🎉</p>
          </div>
        </div>
      ) : (
        /* Dues Exist Screen */
        <div className="space-y-4">
          
          {/* Red Alert Banner */}
          <div className="bg-rose-500 text-white p-4 rounded-2xl shadow-lg shadow-rose-500/10 flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-90">Attention Required</span>
              <p className="text-sm font-bold">You have ₹{totalPending} pending fees due.</p>
            </div>
          </div>

          {/* Dues Cards Listing */}
          <div className="space-y-3">
            {/* Student/Bus Dues */}
            {studentDues.map((due: any) => {
              const message = `Hi, I want to pay ₹${due.amount} for ${due.student_name} - Bus Fee for ${due.month}`;
              return (
                <Card key={due.due_id} className="border border-slate-150 rounded-2xl shadow-sm p-4 relative overflow-hidden bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{due.student_name}</span>
                        {due.is_overdue && (
                          <span className="text-[9px] bg-rose-50 text-rose-600 border border-rose-100 font-bold px-1.5 py-0.5 rounded">
                            {due.days_overdue} days overdue
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-semibold block mt-1">
                        🚌 Bus route: {due.bus_name}
                      </span>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Due Month: {due.month}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-rose-500 block">₹{due.amount}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                    <a 
                      href={formatWhatsAppLink(due.admin_phone, message)}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-100 border border-blue-100/50 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Contact Admin
                    </a>
                  </div>
                </Card>
              );
            })}

            {/* Passenger/Auto Dues */}
            {passengerDues.map((due: any) => {
              const message = `Hi, I want to pay ₹${due.amount} for ${due.passenger_name} - Auto Fare for ${due.date}`;
              return (
                <Card key={due.due_id} className="border border-slate-150 rounded-2xl shadow-sm p-4 relative overflow-hidden bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{due.passenger_name}</span>
                      <span className="text-xs text-slate-500 font-semibold block mt-1">
                        🚗 Auto: {due.auto_name}
                      </span>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Ride Date: {due.date}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-rose-500 block">₹{due.amount}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                    <a 
                      href={formatWhatsAppLink(due.admin_phone, message)}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50/50 hover:bg-blue-100 border border-blue-100/50 px-3 py-1.5 rounded-xl transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Contact Admin
                    </a>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Note Footer */}
      <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 mt-6">
        <h6 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
          ℹ️ Payment Instructions
        </h6>
        <p className="text-[11px] leading-relaxed text-slate-500">
          Online payment is not integrated directly in the app. To make a payment, contact your transport administrator using the buttons above to coordinate Cash or UPI settlement. Once they record the payment, you will receive a WhatsApp confirmation.
        </p>
      </div>
    </div>
  );
};

export default MyDuesPage;

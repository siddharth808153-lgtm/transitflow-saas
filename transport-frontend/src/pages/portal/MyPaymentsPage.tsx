// src/pages/portal/MyPaymentsPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, ArrowUpRight, DollarSign, Loader2, Calendar } from 'lucide-react';
import api from '@/api/axios';
import { PORTAL } from '@/api/endpoints';
import Card from '@/components/ui/Card';
import Tag from '@/components/ui/Tag';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

// Individual student card that fetches payment history on expansion
const StudentExpandableCard: React.FC<{ student: any }> = ({ student }) => {
  const [expanded, setExpanded] = useState(false);

  const { data: detailResponse, isLoading } = useQuery({
    queryKey: ['student-portal-detail', student.id],
    queryFn: async () => {
      const res = await api.get(PORTAL.STUDENT_DETAIL(student.id));
      return res.data;
    },
    enabled: expanded,
  });

  const detail = detailResponse?.data || {};
  const history = detail.payment_history || [];

  return (
    <Card className="border border-slate-150 rounded-2xl shadow-sm mb-3 hover:border-slate-350 transition-colors">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
            {student.student_name.substring(0, 1)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm">{student.student_name}</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                Class {student.class}-{student.section}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              🚌 {student.current_bus?.vehicle_name || 'Unassigned'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-800 block">₹{student.current_bus?.monthly_fee ?? 0}</span>
            {student.pending_dues_count > 0 ? (
              <span className="text-[10px] text-rose-500 font-bold flex items-center gap-0.5 justify-end">
                <AlertCircle className="w-2.5 h-2.5" /> Due
              </span>
            ) : (
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 justify-end">
                <CheckCircle2 className="w-2.5 h-2.5" /> Paid
              </span>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <div className="flex justify-between text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
            <span>Payment History</span>
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />}
          </div>
          
          {isLoading ? (
            <p className="text-xs text-slate-400 text-center py-2">Loading logs...</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-2">No dues generated yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {history.slice(0, 6).map((log: any) => (
                <div 
                  key={log.due_id} 
                  className={`flex justify-between items-center p-2 rounded-xl border text-xs ${
                    log.is_paid 
                      ? 'bg-emerald-50/40 border-emerald-100 text-emerald-800' 
                      : 'bg-rose-50/40 border-rose-100 text-rose-800'
                  }`}
                >
                  <span className="font-medium truncate max-w-[80px]">{log.month}</span>
                  <span className="font-bold flex items-center gap-1">
                    ₹{log.amount} {log.is_paid ? '✅' : '❌'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export const MyPaymentsPage: React.FC = () => {
  const [filterType, setFilterType] = useState<'all' | 'student' | 'passenger'>('all');
  const [page, setPage] = useState(1);

  // 1. Fetch user profile (includes students/passengers lists)
  const { data: profileResponse, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['portal-profile'],
    queryFn: async () => {
      const res = await api.get(PORTAL.PROFILE);
      return res.data;
    },
  });

  const profileData = profileResponse?.data || {};
  const user = profileData.user || {};
  const students = profileData.students || [];
  const passengers = profileData.passengers || [];

  // Calculate sum of pending dues
  const totalPendingDues = students.reduce((sum: number, s: any) => sum + (s.pending_dues_amount || 0), 0) +
                           passengers.reduce((sum: number, p: any) => sum + (p.pending_dues_count * p.daily_fare || 0), 0);

  // 2. Fetch payments log list
  const { data: paymentsResponse, isLoading: isLoadingPayments, isFetching } = useQuery({
    queryKey: ['portal-payments', filterType, page],
    queryFn: async () => {
      const params: any = { page };
      if (filterType !== 'all') params.type = filterType;
      const res = await api.get(PORTAL.PAYMENTS, { params });
      return res.data;
    },
  });

  const paymentsData = paymentsResponse?.data || {};
  const summary = paymentsData.summary || { total_paid_this_month: 0, total_paid_all_time: 0, last_payment_date: null };
  const paymentsList = paymentsData.payments || [];
  const pagination = paymentsData.pagination || { current_page: 1, last_page: 1 };

  return (
    <div className="space-y-4">
      
      {/* Welcome Banner */}
      <div>
        <h3 className="text-xl font-black text-slate-900">Hello, {user.name || 'Parent'}!</h3>
        <p className="text-xs text-slate-400 mt-0.5">Welcome back to your transport portal.</p>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500 text-white rounded-2xl p-4 shadow-md shadow-emerald-500/10 flex flex-col justify-between h-24">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Paid This Month</span>
          <h4 className="text-2xl font-black">₹{summary.total_paid_this_month}</h4>
        </div>
        <div className={`rounded-2xl p-4 shadow-md flex flex-col justify-between h-24 transition-all ${
          totalPendingDues > 0 
            ? 'bg-rose-500 text-white shadow-rose-500/10' 
            : 'bg-slate-100 text-slate-700 shadow-slate-100/10 border border-slate-200'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-95">Pending Dues</span>
          <h4 className="text-2xl font-black">₹{totalPendingDues}</h4>
        </div>
      </div>

      {/* Linked Children / Passengers Section */}
      <div>
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Linked Accounts</h5>
        {isLoadingProfile ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {students.map((student: any) => (
              <StudentExpandableCard key={student.id} student={student} />
            ))}
            
            {passengers.map((passenger: any) => (
              <Card key={passenger.id} className="border border-slate-150 rounded-2xl shadow-sm p-4 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-lg">
                      {passenger.name.substring(0, 1)}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{passenger.name}</span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        🚗 {passenger.vehicle_name || 'Unassigned Auto'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 block">₹{passenger.daily_fare}/day</span>
                    {passenger.pending_dues_count > 0 ? (
                      <span className="text-[10px] text-rose-500 font-bold flex items-center gap-0.5 justify-end">
                        <AlertCircle className="w-2.5 h-2.5" /> {passenger.pending_dues_count} days unpaid
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 justify-end">
                        <CheckCircle2 className="w-2.5 h-2.5" /> All Paid
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      {/* Payment History List */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment History</h5>
          
          {/* Quick Filters */}
          <div className="flex gap-1.5">
            <button 
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                filterType === 'all' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'bg-slate-150 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => { setFilterType('all'); setPage(1); }}
            >
              All
            </button>
            <button 
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                filterType === 'student' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'bg-slate-150 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => { setFilterType('student'); setPage(1); }}
            >
              Bus
            </button>
            <button 
              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                filterType === 'passenger' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' : 'bg-slate-150 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => { setFilterType('passenger'); setPage(1); }}
            >
              Auto
            </button>
          </div>
        </div>

        {isLoadingPayments && page === 1 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : paymentsList.length === 0 ? (
          <Card className="p-6 text-center text-slate-400 text-xs italic border border-slate-150 rounded-2xl">
            No payment history found.
          </Card>
        ) : (
          <div className="space-y-2">
            {paymentsList.map((tx: any) => {
              const txDate = tx.payment_for_month 
                ? new Date(tx.payment_for_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) 
                : tx.payment_for_date 
                ? new Date(tx.payment_for_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                : 'N/A';

              return (
                <div key={tx.id} className="flex items-center justify-between p-3 border border-slate-150 rounded-2xl bg-white shadow-sm hover:bg-slate-50/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block capitalize">
                        {tx.reference_type === 'student' ? 'Bus Fare' : 'Auto Ride'} - {txDate}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Paid on {new Date(tx.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} via <span className="uppercase text-slate-500 font-semibold">{tx.payment_method}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">
                    +₹{tx.amount}
                  </span>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {pagination.last_page > 1 && (
              <div className="flex justify-between items-center pt-3">
                <Button
                  variant="plain"
                  className="text-xs font-bold py-1 px-3"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                >
                  Previous
                </Button>
                <span className="text-xs text-slate-400">Page {page} of {pagination.last_page}</span>
                <Button
                  variant="plain"
                  className="text-xs font-bold py-1 px-3"
                  onClick={() => setPage(p => Math.min(pagination.last_page, p + 1))}
                  disabled={page === pagination.last_page || isFetching}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default MyPaymentsPage;

// src/pages/transactions/TransactionsPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Eye, CreditCard, Info, FileText } from 'lucide-react';
import api from '@/api/axios';
import { TRANSACTIONS, DUES, VEHICLES } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import DataTable from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tag from '@/components/ui/Tag';
import Pagination from '@/components/ui/Pagination';
import Dialog from '@/components/ui/Dialog';

export const TransactionsPage: React.FC = () => {
  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [transactionType, setTransactionType] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Detail Modal state
  const [selectedTxId, setSelectedTxId] = useState<number | string | null>(null);

  // Fetch paginated Transactions
  const { data: txResponse, isLoading: isLoadingTx } = useQuery({
    queryKey: ['transactions', dateFrom, dateTo, transactionType, paymentMethod, selectedVehicleId, currentPage],
    queryFn: async () => {
      const params: any = { page: currentPage };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (transactionType !== 'all') params.transaction_type = transactionType;
      if (paymentMethod !== 'all') params.payment_method = paymentMethod;
      if (selectedVehicleId) params.vehicle_id = selectedVehicleId;

      const res = await api.get(TRANSACTIONS.LIST, { params });
      return res.data;
    },
  });

  // Fetch summary metrics (for stats row)
  const { data: summaryResponse } = useQuery({
    queryKey: ['dues-summary-tx'],
    queryFn: async () => {
      const res = await api.get(DUES.SUMMARY);
      return res.data;
    },
  });

  // Fetch active vehicles for filter dropdown
  const { data: vehiclesResponse } = useQuery({
    queryKey: ['vehicles-filter'],
    queryFn: async () => {
      const res = await api.get(VEHICLES.LIST);
      return res.data;
    },
  });

  // Fetch specific transaction details for modal inspection
  const { data: txDetailResponse, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['transaction-detail', selectedTxId],
    queryFn: async () => {
      const res = await api.get(TRANSACTIONS.DETAIL(selectedTxId!));
      return res.data;
    },
    enabled: selectedTxId !== null,
  });

  const txData = txResponse?.data || {};
  const transactionsList = txData.transactions || [];
  const totalRecords = txData.pagination?.total || 0;
  const pageSize = txData.pagination?.per_page || 20;
  const meta = txData.meta || {};

  const summary = summaryResponse?.data || {};
  const vehiclesList = vehiclesResponse?.data?.vehicles || vehiclesResponse?.data || [];

  const getTxTypeBadge = (type: string) => {
    switch (type) {
      case 'student_fee':
        return <Tag className="bg-blue-50 text-blue-700 border border-blue-200 font-semibold">Student Fee</Tag>;
      case 'auto_daily':
        return <Tag className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold">Auto Daily</Tag>;
      case 'driver_wage':
        return <Tag className="bg-purple-50 text-purple-700 border border-purple-200 font-semibold">Driver Wage</Tag>;
      default:
        return <Tag className="bg-slate-50 text-slate-700 border border-slate-200 font-semibold">Other</Tag>;
    }
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      cash: 'bg-slate-100 text-slate-700',
      upi: 'bg-emerald-50 text-emerald-700',
      bank: 'bg-blue-50 text-blue-700',
      other: 'bg-amber-50 text-amber-700',
    };
    return (
      <Tag className={`${colors[method] || colors.other} font-semibold uppercase text-[10px]`}>
        {method}
      </Tag>
    );
  };

  const getPersonName = (row: any) => {
    if (row.reference) {
      if (row.reference_type === 'student') {
        return row.reference.student_name || 'N/A';
      }
      return row.reference.name || 'N/A';
    }
    return 'N/A';
  };

  const columns = [
    {
      key: 'id',
      label: '#',
      render: (val: any) => <span className="font-mono text-xs font-semibold text-slate-500">TX-{val}</span>,
    },
    {
      key: 'transaction_type',
      label: 'Type',
      render: (val: string) => getTxTypeBadge(val),
    },
    {
      key: 'reference',
      label: 'Person Name',
      render: (_: any, row: any) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">{getPersonName(row)}</span>
      ),
    },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (val: any) => (
        <span className="text-slate-600 dark:text-slate-400 font-medium">{val?.name || '-'}</span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (val: any) => (
        <span className="font-bold text-emerald-600">
          ₹{Number(val).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'payment_method',
      label: 'Method',
      render: (val: string) => getMethodBadge(val),
    },
    {
      key: 'for_period',
      label: 'For Period',
      render: (_: any, row: any) => {
        if (row.payment_for_month) {
          const date = new Date(row.payment_for_month);
          return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        }
        if (row.payment_for_date) {
          return new Date(row.payment_for_date).toLocaleDateString();
        }
        return '-';
      },
    },
    {
      key: 'collector',
      label: 'Recorded By',
      render: (val: any) => (
        <span className="text-slate-500 text-xs font-medium">{val?.name || '-'}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (val: string) => (
        <span className="text-slate-400 text-xs font-medium">{new Date(val).toLocaleString()}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <Button
          size="xs"
          variant="default"
          className="hover:text-blue-600"
          onClick={() => setSelectedTxId(row.id)}
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        breadcrumbs={[{ label: 'Transactions' }]}
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Today's Collection"
          value={`₹${Number(meta.today_total || 0).toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="This Month"
          value={`₹${Number(meta.this_month_total || summary.total_collected_this_month || 0).toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
          color="green"
        />
        <StatCard
          title="Total This Month"
          value={totalRecords}
          icon={<CreditCard className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="Pending Dues"
          value={Number(summary.student_dues_pending || 0) + Number(summary.passenger_dues_pending || 0)}
          icon={<Info className="w-6 h-6" />}
          color="orange"
        />
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Date From */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl w-full"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl w-full"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Transaction Type</label>
            <select
              value={transactionType}
              onChange={(e) => {
                setTransactionType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="student_fee">Student Fee</option>
              <option value="auto_daily">Auto Daily</option>
              <option value="driver_wage">Driver Wage</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Vehicle Dropdown */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vehicle</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => {
                setSelectedVehicleId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Vehicles</option>
              {(Array.isArray(vehiclesList) ? vehiclesList : []).map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={transactionsList}
          loading={isLoadingTx}
          emptyMessage="No transactions found matching the filters."
        />
      </div>

      {/* Pagination */}
      {totalRecords > pageSize && (
        <div className="flex justify-end pt-4">
          <Pagination
            currentPage={currentPage}
            total={totalRecords}
            pageSize={pageSize}
            onChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* Inspection Modal */}
      <Dialog
        isOpen={selectedTxId !== null}
        onClose={() => setSelectedTxId(null)}
        contentClassName="rounded-2xl max-w-lg"
      >
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileText className="w-5 h-5 text-blue-600" />
          Transaction Detail
        </h3>

        {isLoadingDetail ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading details...</div>
        ) : txDetailResponse?.data ? (
          (() => {
            const tx = txDetailResponse.data;
            const hasWhatsapp = tx.whatsapp_logs && tx.whatsapp_logs.length > 0;
            const wsStatus = hasWhatsapp ? tx.whatsapp_logs[0].status : 'pending';

            return (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase block">Transaction ID</span>
                    <span className="font-mono font-bold text-slate-800">TX-{tx.id}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase block">Amount Paid</span>
                    <span className="font-bold text-emerald-600 text-base">₹{Number(tx.amount).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase block">Payment Method</span>
                    <span className="font-semibold text-slate-800 uppercase">{tx.payment_method}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase block">Transaction Type</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {tx.transaction_type?.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase block">Associated Vehicle</span>
                    <span className="font-semibold text-slate-800">{tx.vehicle?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase block">Period</span>
                    <span className="font-semibold text-slate-800">
                      {tx.payment_for_month
                        ? new Date(tx.payment_for_month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                        : tx.payment_for_date
                        ? new Date(tx.payment_for_date).toLocaleDateString()
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase block">Person Name</span>
                    <span className="font-bold text-slate-800">{getPersonName(tx)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase block">Collector</span>
                    <span className="font-semibold text-slate-800">{tx.collector?.name || '-'}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-400 font-semibold uppercase block mb-1">Notes</span>
                  <p className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 min-h-[40px]">
                    {tx.notes || 'No description notes provided.'}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">WhatsApp Status</span>
                  <Tag
                    className={
                      wsStatus === 'sent' || wsStatus === 'Sent'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : wsStatus === 'failed' || wsStatus === 'Failed'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }
                  >
                    <span className="font-bold text-xs uppercase tracking-wide">{wsStatus}</span>
                  </Tag>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <Button size="sm" onClick={() => setSelectedTxId(null)}>
                    Close
                  </Button>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="py-12 text-center text-sm text-rose-500">Failed to load details.</div>
        )}
      </Dialog>
    </div>
  );
};

export default TransactionsPage;

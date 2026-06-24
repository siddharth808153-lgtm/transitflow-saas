// src/pages/reports/ReportsPage.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  Download, 
  Printer, 
  Loader2, 
  Search, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Bus, 
  Users, 
  DollarSign, 
  UserCheck 
} from 'lucide-react';
import api from '@/api/axios';
import { REPORTS, VEHICLES } from '@/api/endpoints';
import PageHeader from '@/components/shared/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tag from '@/components/ui/Tag';

export const ReportsPage: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'collection' | 'dues' | 'vehicle' | 'driver'>('collection');
  
  // Parameter states
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [dueAsOfDate, setDueAsOfDate] = useState(new Date().toISOString().substring(0, 10)); // YYYY-MM-DD
  const [dueType, setDueType] = useState<'all' | 'student' | 'passenger'>('all');
  
  const [reportData, setReportData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch vehicles for dropdown filter
  const { data: vehiclesResponse } = useQuery({
    queryKey: ['reports-vehicles'],
    queryFn: async () => {
      const res = await api.get(VEHICLES.LIST);
      return res.data;
    },
  });
  const vehiclesData = vehiclesResponse?.data?.vehicles || [];
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : Object.values(vehiclesData);

  // Generate report handler
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setReportData(null);
    try {
      let url = '';
      let params: any = {};

      if (activeReport === 'collection') {
        url = REPORTS.MONTHLY_COLLECTION;
        params = { month: selectedMonth };
        if (selectedVehicleId) params.vehicle_id = selectedVehicleId;
      } else if (activeReport === 'dues') {
        url = REPORTS.DUES_REPORT;
        params = { as_of_date: dueAsOfDate, type: dueType };
      } else if (activeReport === 'vehicle') {
        url = REPORTS.VEHICLE_SUMMARY;
        params = { month: selectedMonth };
      } else if (activeReport === 'driver') {
        url = REPORTS.DRIVER_WAGES;
        params = { month: selectedMonth };
      }

      const res = await api.get(url, { params });
      setReportData(res.data?.data);
    } catch (err) {
      console.error('Failed to generate report', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Safe print handler
  const handlePrint = () => {
    const reportElement = document.getElementById('report-print-area');
    if (!reportElement) return;

    const title = `${activeReport.toUpperCase()} REPORT`;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
            h2 { font-size: 22px; font-weight: bold; margin-bottom: 5px; color: #0f172a; }
            p { font-size: 12px; color: #64748b; margin-top: 0; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; }
            .card-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
            .card-val { font-size: 20px; font-weight: 800; margin-top: 5px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            th { background-color: #f8fafc; color: #475569; font-size: 11px; font-weight: bold; text-transform: uppercase; text-align: left; padding: 10px 14px; border-bottom: 2px solid #cbd5e1; }
            td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #334155; }
            tr:last-child td { border-bottom: 2px solid #cbd5e1; }
            .footer-row td { font-weight: bold; background-color: #f8fafc; color: #0f172a; border-top: 2px solid #cbd5e1; }
            .badge { font-weight: bold; font-size: 10px; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; display: inline-block; }
            .badge-paid { background-color: #dcfce7; color: #15803d; }
            .badge-pending { background-color: #fef3c7; color: #d97706; }
            .badge-overdue { background-color: #fee2e2; color: #b91c1c; }
            @media print {
              body { padding: 10px; }
              @page { size: auto; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          ${reportElement.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const meta = reportData?.report_meta || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytical Reports"
        breadcrumbs={[
          { label: 'Platform Management', path: '#' },
          { label: 'Reports' }
        ]}
      />

      {/* Select Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { id: 'collection', title: 'Monthly Collections', desc: 'Summary of paid and pending monthly fares.' },
          { id: 'dues', title: 'Outstanding Dues', desc: 'Detailed listing of all overdue parent/passenger fees.' },
          { id: 'vehicle', title: 'Vehicle Summaries', desc: 'Earnings, driver cost, and net profit per vehicle.' },
          { id: 'driver', title: 'Driver Wages Feed', desc: 'Calculate driver working days and wages due.' },
        ].map((rep) => (
          <Card 
            key={rep.id} 
            className={`cursor-pointer border-2 transition-all rounded-2xl hover:shadow-md ${
              activeReport === rep.id 
                ? 'border-blue-600 bg-blue-50/10 shadow-lg shadow-blue-500/5' 
                : 'border-slate-200 dark:border-slate-800 bg-white hover:border-slate-355'
            }`}
            onClick={() => {
              setActiveReport(rep.id as any);
              setReportData(null);
            }}
          >
            <div className="p-5 space-y-2">
              <FileText className={`w-6 h-6 ${activeReport === rep.id ? 'text-blue-600' : 'text-slate-400'}`} />
              <h5 className="font-bold text-slate-800 dark:text-slate-100">{rep.title}</h5>
              <p className="text-xs text-slate-400 leading-relaxed">{rep.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Configuration parameters panel */}
      <Card className="rounded-2xl border border-slate-250 bg-white">
        <div className="p-6">
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide mb-4">
            Report Parameters
          </h4>
          
          <div className="flex flex-wrap items-end gap-4">
            {/* Conditional Parameters Render */}
            {activeReport === 'collection' && (
              <>
                <div className="space-y-1.5 min-w-[200px]">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Selected Month</label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5 min-w-[220px]">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Filter Vehicle (Optional)</label>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                  >
                    <option value="">All Vehicles</option>
                    {vehicles.map((v: any) => (
                      <option key={v.id} value={v.id}>{v.name} ({v.type})</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {activeReport === 'dues' && (
              <>
                <div className="space-y-1.5 min-w-[200px]">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">As of Date</label>
                  <Input
                    type="date"
                    value={dueAsOfDate}
                    onChange={(e) => setDueAsOfDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5 min-w-[200px]">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Type</label>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
                    value={dueType}
                    onChange={(e) => setDueType(e.target.value as any)}
                  >
                    <option value="all">All Dues</option>
                    <option value="student">Bus Student Dues</option>
                    <option value="passenger">Auto Passenger Dues</option>
                  </select>
                </div>
              </>
            )}

            {(activeReport === 'vehicle' || activeReport === 'driver') && (
              <div className="space-y-1.5 min-w-[200px]">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Report Month</label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}

            <Button
              variant="solid"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 px-6 shadow-lg shadow-blue-500/10 flex items-center gap-2 font-bold text-sm h-[40px]"
              onClick={handleGenerateReport}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : (
                'Generate Report'
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Generated Report View Area */}
      {reportData && (
        <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h4 className="text-base font-bold text-slate-800">Report Preview</h4>
              <p className="text-xs text-slate-400 mt-0.5">Preview print formatting below.</p>
            </div>
            <Button
              variant="plain"
              className="border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center gap-2 py-2 px-4 rounded-xl font-bold text-xs"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4" />
              Print Report
            </Button>
          </div>

          <div className="p-6 overflow-x-auto" id="report-print-area">
            {/* Monthly Collection Report Layout */}
            {activeReport === 'collection' && (
              <div className="space-y-6">
                <div>
                  <h2>Monthly Collection Report</h2>
                  <p>Month: {meta.month} | Generated at: {meta.generated_at} | Admin: {meta.admin_name} ({meta.business_name})</p>
                </div>

                <div className="grid">
                  <div className="card">
                    <span className="card-title">Total Collected</span>
                    <h3 className="card-val">₹{reportData.summary.total_collected.toLocaleString()}</h3>
                  </div>
                  <div className="card">
                    <span className="card-title">Total Outstanding Dues</span>
                    <h3 className="card-val">₹{reportData.summary.total_pending.toLocaleString()}</h3>
                  </div>
                  <div className="card">
                    <span className="card-title">Collection Rate</span>
                    <h3 className="card-val">{reportData.summary.collection_rate}%</h3>
                  </div>
                  <div className="card">
                    <span className="card-title">Total Registered Accounts</span>
                    <h3 className="card-val">
                      {reportData.summary.total_students} Students / {reportData.summary.total_passengers} Pass.
                    </h3>
                  </div>
                </div>

                {/* Students list */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">Bus Student Collections</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>Vehicle Name</th>
                        <th>Monthly Fee</th>
                        <th>Paid Amount</th>
                        <th>Date Paid</th>
                        <th>Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.student_collections.map((s: any, idx: number) => (
                        <tr key={idx}>
                          <td>{s.student_name}</td>
                          <td>{s.class}-{s.section}</td>
                          <td>{s.bus_name}</td>
                          <td>₹{s.monthly_fee}</td>
                          <td>₹{s.paid_amount}</td>
                          <td>{s.payment_date || '-'}</td>
                          <td className="uppercase">{s.payment_method || '-'}</td>
                          <td>
                            <span className={`badge ${
                              s.status === 'paid' ? 'badge-paid' : s.status === 'overdue' ? 'badge-overdue' : 'badge-pending'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Auto Passengers list */}
                <div className="pt-4">
                  <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">Auto Passenger Daily Collections</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Passenger Name</th>
                        <th>Auto Name</th>
                        <th>Daily Fare</th>
                        <th>Days Recorded</th>
                        <th>Total Collected</th>
                        <th>Unpaid Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.passenger_collections.map((p: any, idx: number) => (
                        <tr key={idx}>
                          <td>{p.passenger_name}</td>
                          <td>{p.auto_name}</td>
                          <td>₹{p.daily_fare}</td>
                          <td>{p.days_recorded}</td>
                          <td>₹{p.total_collected}</td>
                          <td>{p.pending_days} days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Dues Report Layout */}
            {activeReport === 'dues' && (
              <div className="space-y-6">
                <div>
                  <h2>Outstanding Dues Report</h2>
                  <p>As of Date: {meta.as_of_date} | Generated at: {meta.generated_at} | Admin: {meta.admin_name} ({meta.business_name})</p>
                </div>

                <div className="grid">
                  <div className="card">
                    <span className="card-title">Total Overdue Dues</span>
                    <h3 className="card-val text-rose-600">₹{reportData.total_overdue_amount.toLocaleString()}</h3>
                  </div>
                  <div className="card">
                    <span className="card-title">Students Overdue</span>
                    <h3 className="card-val">{reportData.overdue_students}</h3>
                  </div>
                  <div className="card">
                    <span className="card-title">Passengers Overdue</span>
                    <h3 className="card-val">{reportData.overdue_passengers}</h3>
                  </div>
                </div>

                {reportData.student_dues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">Student Outstanding Dues</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Bus Route</th>
                          <th>Due Month</th>
                          <th>Dues Amount</th>
                          <th>Days Overdue</th>
                          <th>Parent Contact Name</th>
                          <th>Parent Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.student_dues.map((s: any, idx: number) => (
                          <tr key={idx}>
                            <td>{s.student_name}</td>
                            <td>{s.bus}</td>
                            <td>{s.month}</td>
                            <td className="font-bold text-rose-600">₹{s.amount}</td>
                            <td>{s.days_overdue} days</td>
                            <td>{s.parent_name}</td>
                            <td>{s.parent_phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {reportData.passenger_dues.length > 0 && (
                  <div className="pt-4">
                    <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">Passenger Outstanding Dues</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>Passenger Name</th>
                          <th>Auto Name</th>
                          <th>Due Date</th>
                          <th>Amount</th>
                          <th>Days Overdue</th>
                          <th>Phone Number</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.passenger_dues.map((p: any, idx: number) => (
                          <tr key={idx}>
                            <td>{p.name}</td>
                            <td>{p.auto}</td>
                            <td>{p.date}</td>
                            <td className="font-bold text-rose-600">₹{p.amount}</td>
                            <td>{p.days_overdue} days</td>
                            <td>{p.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Vehicle Summary Report Layout */}
            {activeReport === 'vehicle' && (
              <div className="space-y-6">
                <div>
                  <h2>Vehicle Summary Report</h2>
                  <p>Month: {meta.month} | Generated at: {meta.generated_at} | Admin: {meta.admin_name} ({meta.business_name})</p>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Vehicle Name</th>
                      <th>Type</th>
                      <th>Wage Type</th>
                      <th>Driver Assigned</th>
                      <th>Capacity</th>
                      <th>Active Riders</th>
                      <th>Monthly Revenue</th>
                      <th>Pending Dues</th>
                      <th>Driver Wage</th>
                      <th>Net Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.vehicles.map((v: any, idx: number) => (
                      <tr key={idx}>
                        <td>{v.vehicle_name}</td>
                        <td className="capitalize">{v.type}</td>
                        <td className="capitalize">{v.wage_type}</td>
                        <td>{v.driver_name || '-'}</td>
                        <td>{v.capacity || '-'}</td>
                        <td>{v.active_students_or_passengers}</td>
                        <td className="text-emerald-600 font-semibold">₹{v.monthly_revenue}</td>
                        <td className="text-amber-600 font-semibold">₹{v.pending_dues}</td>
                        <td className="text-slate-500">₹{v.driver_wage_this_month}</td>
                        <td className={`font-bold ${v.net_revenue >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                          ₹{v.net_revenue}
                        </td>
                      </tr>
                    ))}
                    <tr className="footer-row">
                      <td colSpan={6}>Totals</td>
                      <td>₹{reportData.totals.total_revenue.toLocaleString()}</td>
                      <td>₹{reportData.totals.total_pending.toLocaleString()}</td>
                      <td>₹{reportData.totals.total_driver_wages.toLocaleString()}</td>
                      <td>₹{reportData.totals.total_net_revenue.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Driver Wage Report Layout */}
            {activeReport === 'driver' && (
              <div className="space-y-6">
                <div>
                  <h2>Driver Wage & Working Days Report</h2>
                  <p>Month: {meta.month} | Generated at: {meta.generated_at} | Admin: {meta.admin_name} ({meta.business_name})</p>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Driver Name</th>
                      <th>Phone</th>
                      <th>Vehicle Name</th>
                      <th>Daily Wage Rate</th>
                      <th>Working Days</th>
                      <th>Total Wage Due</th>
                      <th>Wage Paid</th>
                      <th>Wage Pending</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.drivers.map((d: any, idx: number) => (
                      <tr key={idx}>
                        <td>{d.driver_name}</td>
                        <td>{d.phone}</td>
                        <td>{d.vehicle_name}</td>
                        <td>₹{d.daily_wage}</td>
                        <td>{d.working_days_this_month} days</td>
                        <td className="font-semibold text-slate-800">₹{d.total_wage_due}</td>
                        <td className="text-emerald-600 font-semibold">₹{d.wage_paid}</td>
                        <td className="text-amber-600 font-semibold">₹{d.wage_pending}</td>
                        <td>
                          <span className={`badge ${
                            d.status === 'paid' ? 'badge-paid' : d.status === 'partial' ? 'badge-pending' : 'badge-overdue'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="footer-row">
                      <td colSpan={5}>Totals</td>
                      <td>₹{reportData.total_wage_due.toLocaleString()}</td>
                      <td>₹{reportData.total_wage_paid.toLocaleString()}</td>
                      <td>₹{reportData.total_wage_pending.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReportsPage;

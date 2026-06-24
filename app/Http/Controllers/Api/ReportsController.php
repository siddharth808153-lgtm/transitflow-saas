<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Student;
use App\Models\AutoPassenger;
use App\Models\Due;
use App\Models\Transaction;
use App\Models\Vehicle;
use App\Models\Driver;
use App\Models\DriverAssignment;
use App\Models\StudentAssignment;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportsController extends Controller
{
    use ApiResponse;

    /**
     * Helper to resolve the admin ID based on permissions.
     */
    private function resolveAdminId(Request $request): int
    {
        return auth()->user()->isSuperAdmin()
            ? ($request->input('admin_id') ?? auth()->id())
            : auth()->id();
    }

    /**
     * Generate Monthly Collection Report.
     */
    public function monthlyCollectionReport(Request $request): JsonResponse
    {
        $request->validate([
            'month'      => 'required|date_format:Y-m',
            'vehicle_id' => 'nullable|integer|exists:vehicles,id',
        ]);

        $adminId = $this->resolveAdminId($request);
        $adminUser = User::with('adminSettings')->findOrFail($adminId);
        
        $month = $request->month;
        $year = Carbon::parse($month)->year;
        $monthNum = Carbon::parse($month)->month;

        // Query transactions for the selected month
        $txQuery = Transaction::where('admin_id', $adminId)
            ->where(function ($q) use ($year, $monthNum) {
                $q->where(fn($sq) => $sq->whereYear('payment_for_month', $year)->whereMonth('payment_for_month', $monthNum))
                  ->orWhere(fn($sq) => $sq->whereYear('payment_for_date', $year)->whereMonth('payment_for_date', $monthNum));
            });

        // Query dues for the selected month
        $duesQuery = Due::where('admin_id', $adminId)
            ->where(function ($q) use ($year, $monthNum) {
                $q->where(fn($sq) => $sq->whereYear('due_for_month', $year)->whereMonth('due_for_month', $monthNum))
                  ->orWhere(fn($sq) => $sq->whereYear('due_for_date', $year)->whereMonth('due_for_date', $monthNum));
            });

        if ($request->filled('vehicle_id')) {
            $txQuery->where('vehicle_id', $request->vehicle_id);
            $duesQuery->where('vehicle_id', $request->vehicle_id);
        }

        $transactions = $txQuery->get();
        $dues = $duesQuery->get();

        $totalCollected = $transactions->sum('amount');
        $totalPending = $dues->where('is_paid', false)->sum('due_amount');
        $totalDuesSum = $totalCollected + $totalPending;
        $collectionRate = $totalDuesSum > 0 ? ($totalCollected / $totalDuesSum) * 100 : 0;

        // 1. Student collections listing
        $studentsQuery = Student::where('admin_id', $adminId)
            ->with(['studentAssignments' => function ($q) {
                $q->whereNull('removed_date')->with('vehicle');
            }]);

        if ($request->filled('vehicle_id')) {
            $studentsQuery->whereHas('studentAssignments', function ($q) use ($request) {
                $q->where('vehicle_id', $request->vehicle_id)->whereNull('removed_date');
            });
        }
        $students = $studentsQuery->get();

        $studentCollections = $students->map(function ($student) use ($dues, $transactions, $month) {
            $activeAssignment = $student->studentAssignments->first();
            $studentDue = $dues->where('reference_type', 'student')
                ->where('reference_id', $student->id)
                ->first();

            $paidTx = $transactions->where('reference_type', 'student')
                ->where('reference_id', $student->id)
                ->first();

            $status = 'pending';
            if ($studentDue) {
                $status = $studentDue->is_paid ? 'paid' : (Carbon::parse($month)->startOfMonth()->isPast() ? 'overdue' : 'pending');
            }

            return [
                'student_name'   => $student->student_name,
                'class'          => $student->class,
                'section'        => $student->section,
                'bus_name'       => $activeAssignment->vehicle?->name ?? 'N/A',
                'monthly_fee'    => $activeAssignment ? (float)$activeAssignment->monthly_fee : 0,
                'paid_amount'    => $paidTx ? (float)$paidTx->amount : 0,
                'payment_date'   => $paidTx ? $paidTx->created_at->toDateString() : null,
                'payment_method' => $paidTx ? $paidTx->payment_method : null,
                'status'         => $status,
            ];
        });

        // 2. Passenger collections listing
        $passengerQuery = AutoPassenger::where('admin_id', $adminId)->with('vehicle');
        if ($request->filled('vehicle_id')) {
            $passengerQuery->where('vehicle_id', $request->vehicle_id);
        }
        $passengers = $passengerQuery->get();

        $passengerCollections = $passengers->map(function ($passenger) use ($dues, $transactions) {
            $passengerDues = $dues->where('reference_type', 'auto_passenger')
                ->where('reference_id', $passenger->id);

            $passengerTxs = $transactions->where('reference_type', 'auto_passenger')
                ->where('reference_id', $passenger->id);

            return [
                'passenger_name'  => $passenger->name,
                'auto_name'       => $passenger->vehicle?->name ?? 'N/A',
                'daily_fare'      => (float)$passenger->daily_fare,
                'days_recorded'   => $passengerTxs->count(),
                'total_collected' => (float)$passengerTxs->sum('amount'),
                'pending_days'    => $passengerDues->where('is_paid', false)->count(),
            ];
        });

        // 3. Daily Breakdown
        $dailyBreakdown = $transactions->groupBy(function ($tx) {
            return $tx->created_at->toDateString();
        })->map(function ($txs, $date) {
            return [
                'date'             => $date,
                'amount_collected' => (float)$txs->sum('amount'),
                'transaction_count' => $txs->count(),
            ];
        })->values()->sortBy('date')->values();

        // 4. Vehicle wise breakdown
        $vehicleQuery = Vehicle::where('admin_id', $adminId);
        if ($request->filled('vehicle_id')) {
            $vehicleQuery->where('id', $request->vehicle_id);
        }
        $vehicles = $vehicleQuery->get();

        $vehicleWise = $vehicles->map(function ($vehicle) use ($transactions, $dues) {
            $vTx = $transactions->where('vehicle_id', $vehicle->id);
            $vDues = $dues->where('vehicle_id', $vehicle->id);

            if ($vehicle->type === 'bus') {
                $count = StudentAssignment::where('vehicle_id', $vehicle->id)->whereNull('removed_date')->count();
            } else {
                $count = AutoPassenger::where('vehicle_id', $vehicle->id)->where('is_active', true)->count();
            }

            return [
                'vehicle_name' => $vehicle->name,
                'type'         => $vehicle->type,
                'collected'    => (float)$vTx->sum('amount'),
                'pending'      => (float)$vDues->where('is_paid', false)->sum('due_amount'),
                'count'        => $count,
            ];
        });

        return $this->successResponse([
            'report_meta'           => [
                'month'         => Carbon::parse($month)->format('F Y'),
                'generated_at'  => now()->toDateTimeString(),
                'admin_name'    => $adminUser->name,
                'business_name' => $adminUser->adminSettings?->business_name ?? 'N/A',
            ],
            'summary'               => [
                'total_collected' => (float)$totalCollected,
                'total_pending'   => (float)$totalPending,
                'total_students'  => $studentCollections->count(),
                'total_passengers'=> $passengerCollections->count(),
                'collection_rate' => round((float)$collectionRate, 2),
                'cash_collected'  => (float)$transactions->where('payment_method', 'cash')->sum('amount'),
                'upi_collected'   => (float)$transactions->where('payment_method', 'upi')->sum('amount'),
                'bank_collected'  => (float)$transactions->where('payment_method', 'bank')->sum('amount'),
            ],
            'student_collections'   => $studentCollections,
            'passenger_collections' => $passengerCollections,
            'daily_breakdown'       => $dailyBreakdown,
            'vehicle_wise'          => $vehicleWise,
        ], 'Monthly collection report generated');
    }

    /**
     * Generate Due Report.
     */
    public function dueReport(Request $request): JsonResponse
    {
        $request->validate([
            'as_of_date' => 'nullable|date',
            'type'       => 'nullable|string|in:student,passenger,all',
        ]);

        $adminId = $this->resolveAdminId($request);
        $adminUser = User::with('adminSettings')->findOrFail($adminId);

        $asOfDate = $request->input('as_of_date') ?? now()->toDateString();
        $reqType = $request->input('type') ?? 'all';
        $now = Carbon::parse($asOfDate);

        // Fetch unpaid dues
        $duesQuery = Due::where('admin_id', $adminId)
            ->where('is_paid', false)
            ->with(['vehicle', 'reference']);

        if ($reqType === 'student') {
            $duesQuery->where('reference_type', 'student');
        } elseif ($reqType === 'passenger') {
            $duesQuery->where('reference_type', 'auto_passenger');
        }

        $dues = $duesQuery->get();

        // Filter by date (due date <= as_of_date)
        $filteredDues = $dues->filter(function ($due) use ($asOfDate) {
            if ($due->reference_type === 'student') {
                return $due->due_for_month && Carbon::parse($due->due_for_month)->toDateString() <= $asOfDate;
            } else {
                return $due->due_for_date && Carbon::parse($due->due_for_date)->toDateString() <= $asOfDate;
            }
        });

        // 1. Format student dues
        $studentDues = $filteredDues->where('reference_type', 'student')->map(function ($due) use ($now) {
            $dueDate = Carbon::parse($due->due_for_month);
            $daysOverdue = max(0, (int)$dueDate->diffInDays($now, false));
            $student = $due->reference;
            $parent = $student ? User::find($student->user_id) : null;

            return [
                'student_name' => $student?->student_name ?? 'N/A',
                'bus'          => $due->vehicle?->name ?? 'N/A',
                'month'        => $dueDate->format('F Y'),
                'amount'       => (float)$due->due_amount,
                'days_overdue' => $daysOverdue,
                'parent_name'  => $parent?->name ?? 'N/A',
                'parent_phone' => $parent?->phone ?? 'N/A',
            ];
        })->values();

        // 2. Format passenger dues
        $passengerDues = $filteredDues->where('reference_type', 'auto_passenger')->map(function ($due) use ($now) {
            $dueDate = Carbon::parse($due->due_for_date);
            $daysOverdue = max(0, (int)$dueDate->diffInDays($now, false));
            $passenger = $due->reference;

            return [
                'name'         => $passenger?->name ?? 'N/A',
                'auto'         => $due->vehicle?->name ?? 'N/A',
                'date'         => $dueDate->format('d M Y'),
                'amount'       => (float)$due->due_amount,
                'days_overdue' => $daysOverdue,
                'phone'        => $passenger?->phone ?? 'N/A',
            ];
        })->values();

        return $this->successResponse([
            'report_meta'          => [
                'as_of_date'    => Carbon::parse($asOfDate)->format('d M Y'),
                'generated_at'  => now()->toDateTimeString(),
                'admin_name'    => $adminUser->name,
                'business_name' => $adminUser->adminSettings?->business_name ?? 'N/A',
            ],
            'total_overdue_amount' => (float)$filteredDues->sum('due_amount'),
            'overdue_students'     => $studentDues->pluck('student_name')->unique()->count(),
            'overdue_passengers'   => $passengerDues->pluck('name')->unique()->count(),
            'student_dues'         => $studentDues,
            'passenger_dues'       => $passengerDues,
        ], 'Due report generated');
    }

    /**
     * Generate Vehicle Summary Report.
     */
    public function vehicleSummaryReport(Request $request): JsonResponse
    {
        $request->validate([
            'month' => 'required|date_format:Y-m',
        ]);

        $adminId = $this->resolveAdminId($request);
        $adminUser = User::with('adminSettings')->findOrFail($adminId);

        $month = $request->month;
        $year = Carbon::parse($month)->year;
        $monthNum = Carbon::parse($month)->month;

        $vehicles = Vehicle::where('admin_id', $adminId)->get();

        $vehicleReports = $vehicles->map(function ($vehicle) use ($year, $monthNum, $adminId) {
            // Active count
            if ($vehicle->type === 'bus') {
                $activeCount = StudentAssignment::where('vehicle_id', $vehicle->id)->whereNull('removed_date')->count();
            } else {
                $activeCount = AutoPassenger::where('vehicle_id', $vehicle->id)->where('is_active', true)->count();
            }

            // Monthly revenue
            $revenue = Transaction::where('vehicle_id', $vehicle->id)
                ->where(function ($q) use ($year, $monthNum) {
                    $q->where(fn($sq) => $sq->whereYear('payment_for_month', $year)->whereMonth('payment_for_month', $monthNum))
                      ->orWhere(fn($sq) => $sq->whereYear('payment_for_date', $year)->whereMonth('payment_for_date', $monthNum));
                })
                ->sum('amount');

            // Pending dues
            $pending = Due::where('vehicle_id', $vehicle->id)
                ->where('is_paid', false)
                ->where(function ($q) use ($year, $monthNum) {
                    $q->where(fn($sq) => $sq->whereYear('due_for_month', $year)->whereMonth('due_for_month', $monthNum))
                      ->orWhere(fn($sq) => $sq->whereYear('due_for_date', $year)->whereMonth('due_for_date', $monthNum));
                })
                ->sum('due_amount');

            // Active Driver & Wages calculation
            $activeDriverAssignment = DriverAssignment::where('vehicle_id', $vehicle->id)
                ->where(function ($q) use ($year, $monthNum) {
                    $firstOfMonth = Carbon::create($year, $monthNum, 1)->startOfMonth();
                    $lastOfMonth = Carbon::create($year, $monthNum, 1)->endOfMonth();
                    
                    $q->where('assigned_date', '<=', $lastOfMonth)
                      ->where(function($sq) use ($firstOfMonth) {
                          $sq->whereNull('relieved_date')
                            ->orWhere('relieved_date', '>=', $firstOfMonth);
                      });
                })
                ->first();

            $driverName = null;
            $driverWage = 0;
            if ($activeDriverAssignment) {
                $driver = Driver::find($activeDriverAssignment->driver_id);
                $driverName = $driver?->name;

                if ($driver) {
                    // working days in this month
                    $startOfMonth = Carbon::create($year, $monthNum, 1)->startOfMonth();
                    $endOfMonth = Carbon::create($year, $monthNum, 1)->endOfMonth();

                    $startActive = Carbon::max($startOfMonth, Carbon::parse($activeDriverAssignment->assigned_date));
                    $endActive = $activeDriverAssignment->relieved_date 
                        ? Carbon::min($endOfMonth, Carbon::parse($activeDriverAssignment->relieved_date))
                        : Carbon::min($endOfMonth, now());

                    $workingDays = 0;
                    if ($startActive->lte($endActive)) {
                        $curr = clone $startActive;
                        while ($curr->lte($endActive)) {
                            if ($curr->dayOfWeek !== Carbon::SUNDAY) {
                                $workingDays++;
                            }
                            $curr->addDay();
                        }
                    }

                    if ($vehicle->wage_type === 'monthly') {
                        $driverWage = (float)($driver->daily_wage * 26);
                    } else {
                        $driverWage = (float)($driver->daily_wage * $workingDays);
                    }
                }
            }

            return [
                'vehicle_name'                  => $vehicle->name,
                'type'                          => $vehicle->type,
                'wage_type'                     => $vehicle->wage_type,
                'driver_name'                   => $driverName,
                'capacity'                      => $vehicle->capacity,
                'active_students_or_passengers' => $activeCount,
                'monthly_revenue'               => (float)$revenue,
                'pending_dues'                  => (float)$pending,
                'driver_wage_this_month'        => (float)$driverWage,
                'net_revenue'                   => (float)($revenue - $driverWage),
            ];
        });

        $totalRevenue = $vehicleReports->sum('monthly_revenue');
        $totalDriverWages = $vehicleReports->sum('driver_wage_this_month');
        $totalNetRevenue = $vehicleReports->sum('net_revenue');
        $totalPending = $vehicleReports->sum('pending_dues');

        return $this->successResponse([
            'report_meta' => [
                'month'         => Carbon::parse($month)->format('F Y'),
                'generated_at'  => now()->toDateTimeString(),
                'admin_name'    => $adminUser->name,
                'business_name' => $adminUser->adminSettings?->business_name ?? 'N/A',
            ],
            'vehicles' => $vehicleReports,
            'totals'   => [
                'total_revenue'      => (float)$totalRevenue,
                'total_driver_wages' => (float)$totalDriverWages,
                'total_net_revenue'  => (float)$totalNetRevenue,
                'total_pending'      => (float)$totalPending,
            ]
        ], 'Vehicle summary report generated');
    }

    /**
     * Generate Driver Wage Report.
     */
    public function driverWageReport(Request $request): JsonResponse
    {
        $request->validate([
            'month' => 'required|date_format:Y-m',
        ]);

        $adminId = $this->resolveAdminId($request);
        $adminUser = User::with('adminSettings')->findOrFail($adminId);

        $month = $request->month;
        $year = Carbon::parse($month)->year;
        $monthNum = Carbon::parse($month)->month;

        $drivers = Driver::where('admin_id', $adminId)->get();

        $driverReports = $drivers->map(function ($driver) use ($year, $monthNum, $month) {
            // Find active vehicle assignment in that month
            $activeAssignment = DriverAssignment::where('driver_id', $driver->id)
                ->where(function ($q) use ($year, $monthNum) {
                    $firstOfMonth = Carbon::create($year, $monthNum, 1)->startOfMonth();
                    $lastOfMonth = Carbon::create($year, $monthNum, 1)->endOfMonth();
                    
                    $q->where('assigned_date', '<=', $lastOfMonth)
                      ->where(function($sq) use ($firstOfMonth) {
                          $sq->whereNull('relieved_date')
                            ->orWhere('relieved_date', '>=', $firstOfMonth);
                      });
                })
                ->with('vehicle')
                ->first();

            $vehicleName = $activeAssignment?->vehicle?->name;
            $wageType = $activeAssignment?->vehicle?->wage_type ?? 'daily';

            // Calculate working days excluding Sundays
            $workingDays = 0;
            if ($activeAssignment) {
                $startOfMonth = Carbon::create($year, $monthNum, 1)->startOfMonth();
                $endOfMonth = Carbon::create($year, $monthNum, 1)->endOfMonth();

                $startActive = Carbon::max($startOfMonth, Carbon::parse($activeAssignment->assigned_date));
                $endActive = $activeAssignment->relieved_date 
                    ? Carbon::min($endOfMonth, Carbon::parse($activeAssignment->relieved_date))
                    : Carbon::min($endOfMonth, now());

                if ($startActive->lte($endActive)) {
                    $curr = clone $startActive;
                    while ($curr->lte($endActive)) {
                        if ($curr->dayOfWeek !== Carbon::SUNDAY) {
                            $workingDays++;
                        }
                        $curr->addDay();
                    }
                }
            }

            // Calculate leaves for this driver in this month
            $leaves = \App\Models\DriverLeave::where('driver_id', $driver->id)
                ->whereYear('date', $year)
                ->whereMonth('date', $monthNum)
                ->get();

            $leaveDays = 0.0;
            foreach ($leaves as $leave) {
                if ($leave->leave_type === 'full') {
                    $leaveDays += 1.0;
                } elseif ($leave->leave_type === 'half') {
                    $leaveDays += 0.5;
                }
            }

            $workingDays = max(0.0, $workingDays - $leaveDays);

            // Fetch wage adjustments for this driver in this month
            $adjustment = \App\Models\DriverWageAdjustment::where('driver_id', $driver->id)
                ->where('month', $month)
                ->first();

            $adjustmentAmount = $adjustment ? (float)$adjustment->adjustment_amount : 0.0;
            $adjustmentReason = $adjustment ? $adjustment->reason : null;

            // Wage due
            if ($wageType === 'monthly') {
                $wageDue = (float)($driver->daily_wage * 26) + $adjustmentAmount;
            } else {
                $wageDue = (float)($driver->daily_wage * $workingDays) + $adjustmentAmount;
            }

            // Wage paid
            $wagePaid = Transaction::where('reference_type', 'driver')
                ->where('reference_id', $driver->id)
                ->where('transaction_type', 'driver_wage')
                ->whereYear('payment_for_month', $year)
                ->whereMonth('payment_for_month', $monthNum)
                ->sum('amount');

            $wagePending = max(0.0, $wageDue - $wagePaid);

            $status = 'pending';
            if ($wagePaid >= $wageDue && $wageDue > 0) {
                $status = 'paid';
            } elseif ($wagePaid > 0) {
                $status = 'partial';
            }

            return [
                'driver_name'             => $driver->name,
                'phone'                   => $driver->phone,
                'vehicle_name'            => $vehicleName ?? 'Unassigned',
                'daily_wage'              => (float)$driver->daily_wage,
                'working_days_this_month' => $workingDays,
                'leave_days'              => $leaveDays,
                'adjustment_amount'       => $adjustmentAmount,
                'adjustment_reason'       => $adjustmentReason,
                'total_wage_due'          => (float)$wageDue,
                'wage_paid'               => (float)$wagePaid,
                'wage_pending'            => (float)$wagePending,
                'status'                  => $status,
            ];
        });

        $totalWageDue = $driverReports->sum('total_wage_due');
        $totalWagePaid = $driverReports->sum('wage_paid');
        $totalWagePending = $driverReports->sum('wage_pending');

        return $this->successResponse([
            'report_meta' => [
                'month'         => Carbon::parse($month)->format('F Y'),
                'generated_at'  => now()->toDateTimeString(),
                'admin_name'    => $adminUser->name,
                'business_name' => $adminUser->adminSettings?->business_name ?? 'N/A',
            ],
            'drivers'            => $driverReports,
            'total_wage_due'     => (float)$totalWageDue,
            'total_wage_paid'    => (float)$totalWagePaid,
            'total_wage_pending' => (float)$totalWagePending,
        ], 'Driver wage report generated');
    }
}

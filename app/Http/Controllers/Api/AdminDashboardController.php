<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\Driver;
use App\Models\Student;
use App\Models\AutoPassenger;
use App\Models\Transaction;
use App\Models\Due;
use App\Models\WhatsappLog;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AdminDashboardController extends Controller
{
    use ApiResponse;

    /**
     * Get dashboard summary counters and metrics for the logged-in admin.
     */
    public function summary(): JsonResponse
    {
        $adminId = auth()->id();
        $now = Carbon::now();

        // 1. Vehicle counts
        $vehiclesTotal = Vehicle::where('admin_id', $adminId)->count();
        $vehiclesActive = Vehicle::where('admin_id', $adminId)->where('is_active', true)->count();
        $vehiclesBuses = Vehicle::where('admin_id', $adminId)->where('type', 'bus')->count();
        $vehiclesAutos = Vehicle::where('admin_id', $adminId)->where('type', 'auto')->count();

        // 2. Driver counts
        $driversTotal = Driver::where('admin_id', $adminId)->count();
        $driversActive = Driver::where('admin_id', $adminId)->where('is_active', true)->count();
        $driversAssigned = Driver::where('admin_id', $adminId)
            ->whereHas('driverAssignments', function ($q) {
                $q->whereNull('relieved_date');
            })->count();
        $driversUnassigned = $driversTotal - $driversAssigned;

        // 3. Student counts
        $studentsTotal = Student::where('admin_id', $adminId)->count();
        $studentsActive = Student::where('admin_id', $adminId)->where('is_active', true)->count();
        $studentsAssigned = Student::where('admin_id', $adminId)
            ->whereHas('studentAssignments', function ($q) {
                $q->whereNull('removed_date');
            })->count();
        $studentsUnassigned = $studentsTotal - $studentsAssigned;

        // 4. Passenger counts
        $passengersTotal = AutoPassenger::where('admin_id', $adminId)->count();
        $passengersActive = AutoPassenger::where('admin_id', $adminId)->where('is_active', true)->count();

        // 5. Financial statistics
        $collectedToday = Transaction::where('admin_id', $adminId)
            ->whereDate('created_at', Carbon::today())
            ->sum('amount');

        $collectedThisWeek = Transaction::where('admin_id', $adminId)
            ->where('created_at', '>=', now()->startOfWeek())
            ->sum('amount');

        $collectedThisMonth = Transaction::where('admin_id', $adminId)
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->sum('amount');

        // Dues summary for this month
        $duesThisMonth = Due::where('admin_id', $adminId)
            ->where(function ($q) use ($now) {
                $q->where(function ($q2) use ($now) {
                    $q2->whereMonth('due_for_month', $now->month)
                       ->whereYear('due_for_month', $now->year);
                })->orWhere(function ($q2) use ($now) {
                    $q2->whereMonth('due_for_date', $now->month)
                       ->whereYear('due_for_date', $now->year);
                });
            })->get();

        $pendingThisMonth = $duesThisMonth->where('is_paid', false)->sum('due_amount');
        $paidThisMonth = $duesThisMonth->where('is_paid', true)->sum('due_amount');
        $totalDuesThisMonth = $duesThisMonth->sum('due_amount');

        $overdue = Due::where('admin_id', $adminId)
            ->where('is_paid', false)
            ->where(function ($q) use ($now) {
                $q->where('due_for_month', '<', $now->copy()->startOfMonth())
                  ->orWhere('due_for_date', '<', $now->copy()->startOfMonth());
            })
            ->sum('due_amount');

        $collectionRate = $totalDuesThisMonth > 0
            ? round(($paidThisMonth / $totalDuesThisMonth) * 100, 1)
            : 0;

        // 6. WhatsApp statistics
        $whatsappSentToday = WhatsappLog::where('admin_id', $adminId)
            ->where('status', 'sent')
            ->whereDate('created_at', Carbon::today())
            ->count();

        $whatsappFailedToday = WhatsappLog::where('admin_id', $adminId)
            ->where('status', 'failed')
            ->whereDate('created_at', Carbon::today())
            ->count();

        $whatsappPending = WhatsappLog::where('admin_id', $adminId)
            ->where('status', 'pending')
            ->count();

        return $this->successResponse([
            'vehicles' => [
                'total' => $vehiclesTotal,
                'active' => $vehiclesActive,
                'buses' => $vehiclesBuses,
                'autos' => $vehiclesAutos,
            ],
            'drivers' => [
                'total' => $driversTotal,
                'active' => $driversActive,
                'assigned' => $driversAssigned,
                'unassigned' => $driversUnassigned,
            ],
            'students' => [
                'total' => $studentsTotal,
                'active' => $studentsActive,
                'assigned_to_bus' => $studentsAssigned,
                'unassigned' => $studentsUnassigned,
            ],
            'passengers' => [
                'total' => $passengersTotal,
                'active' => $passengersActive,
            ],
            'finance' => [
                'collected_today' => (float)$collectedToday,
                'collected_this_week' => (float)$collectedThisWeek,
                'collected_this_month' => (float)$collectedThisMonth,
                'pending_this_month' => (float)$pendingThisMonth,
                'overdue' => (float)$overdue,
                'collection_rate' => (float)$collectionRate,
            ],
            'whatsapp' => [
                'sent_today' => $whatsappSentToday,
                'failed_today' => $whatsappFailedToday,
                'pending' => $whatsappPending,
            ]
        ], 'Admin dashboard summary retrieved successfully');
    }

    /**
     * Get recent 15 transactions for the logged-in admin.
     */
    public function recentTransactions(): JsonResponse
    {
        $adminId = auth()->id();

        $transactions = Transaction::where('admin_id', $adminId)
            ->with(['vehicle', 'reference'])
            ->latest()
            ->limit(15)
            ->get()
            ->map(function ($tx) {
                return [
                    'id' => $tx->id,
                    'amount' => (float)$tx->amount,
                    'transaction_type' => $tx->transaction_type,
                    'payment_method' => $tx->payment_method,
                    'created_at' => $tx->created_at,
                    'vehicle_name' => $tx->vehicle?->name,
                    'person_name' => $tx->reference?->student_name ?? $tx->reference?->name,
                ];
            });

        return $this->successResponse($transactions, 'Recent transactions retrieved');
    }

    /**
     * Get top 10 pending/overdue dues of student and passenger types.
     */
    public function pendingDues(): JsonResponse
    {
        $adminId = auth()->id();
        $now = Carbon::now();

        // 1. Student dues
        $studentDues = Due::where('admin_id', $adminId)
            ->where('is_paid', false)
            ->where('reference_type', 'student')
            ->with(['vehicle', 'reference'])
            ->oldest('due_for_month')
            ->limit(10)
            ->get()
            ->map(function ($due) use ($now) {
                $dueDate = $due->due_for_month ? Carbon::parse($due->due_for_month) : null;
                $daysOverdue = $dueDate ? $dueDate->diffInDays($now, false) : 0;
                // Force positive value for past dues, and make sure we don't display negative values if it's due in future
                $daysOverdue = max(0, (int)$daysOverdue);

                return [
                    'due_id' => $due->id,
                    'student_id' => $due->reference_id,
                    'student_name' => $due->reference?->student_name ?? 'N/A',
                    'bus_name' => $due->vehicle?->name ?? 'N/A',
                    'month' => $dueDate ? $dueDate->format('F Y') : 'N/A',
                    'amount' => (float)$due->due_amount,
                    'days_overdue' => $daysOverdue,
                ];
            });

        // 2. Passenger dues
        $passengerDues = Due::where('admin_id', $adminId)
            ->where('is_paid', false)
            ->where('reference_type', 'auto_passenger')
            ->with(['vehicle', 'reference'])
            ->oldest('due_for_date')
            ->limit(10)
            ->get()
            ->map(function ($due) use ($now) {
                $dueDate = $due->due_for_date ? Carbon::parse($due->due_for_date) : null;
                $daysOverdue = $dueDate ? $dueDate->diffInDays($now, false) : 0;
                $daysOverdue = max(0, (int)$daysOverdue);

                return [
                    'due_id' => $due->id,
                    'passenger_id' => $due->reference_id,
                    'passenger_name' => $due->reference?->name ?? 'N/A',
                    'auto_name' => $due->vehicle?->name ?? 'N/A',
                    'date' => $dueDate ? $dueDate->format('Y-m-d') : 'N/A',
                    'amount' => (float)$due->due_amount,
                    'days_overdue' => $daysOverdue,
                ];
            });

        return $this->successResponse([
            'student_dues' => $studentDues,
            'passenger_dues' => $passengerDues,
        ], 'Pending dues retrieved');
    }

    /**
     * Get revenue grouped by month split by type (student_fees vs auto_fares).
     */
    public function monthlyRevenue(): JsonResponse
    {
        $adminId = auth()->id();
        $startDate = now()->subMonths(5)->startOfMonth();

        $transactions = Transaction::where('admin_id', $adminId)
            ->where('created_at', '>=', $startDate)
            ->get(['amount', 'transaction_type', 'created_at']);

        $trend = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthKey = $date->format('Y-m');
            $monthLabel = $date->format('M Y');
            $trend[$monthKey] = [
                'month' => $monthLabel,
                'total' => 0.0,
                'student_fees' => 0.0,
                'auto_fares' => 0.0,
                'transactions_count' => 0,
            ];
        }

        foreach ($transactions as $tx) {
            $key = $tx->created_at->format('Y-m');
            if (isset($trend[$key])) {
                $amount = (float)$tx->amount;
                $trend[$key]['total'] += $amount;
                $trend[$key]['transactions_count']++;

                if ($tx->transaction_type === 'student_fee') {
                    $trend[$key]['student_fees'] += $amount;
                } elseif ($tx->transaction_type === 'auto_daily') {
                    $trend[$key]['auto_fares'] += $amount;
                }
            }
        }

        return $this->successResponse(array_values($trend), 'Monthly revenue details retrieved');
    }

    /**
     * Get performance tracking per vehicle for the current month.
     */
    public function vehiclePerformance(): JsonResponse
    {
        $adminId = auth()->id();
        $now = Carbon::now();

        $vehicles = Vehicle::where('admin_id', $adminId)
            ->with(['driverAssignments' => function ($q) {
                $q->whereNull('relieved_date')->with('driver');
            }])
            ->withCount(['studentAssignments' => function ($q) {
                $q->whereNull('removed_date');
            }])
            ->withCount(['autoPassengers' => function ($q) {
                $q->where('is_active', true);
            }])
            ->get();

        $result = [];

        foreach ($vehicles as $vehicle) {
            $revenue = Transaction::where('vehicle_id', $vehicle->id)
                ->whereMonth('created_at', $now->month)
                ->whereYear('created_at', $now->year)
                ->sum('amount');

            $pendingCount = Due::where('vehicle_id', $vehicle->id)
                ->where('is_paid', false)
                ->count();

            $pendingAmount = Due::where('vehicle_id', $vehicle->id)
                ->where('is_paid', false)
                ->sum('due_amount');

            $activeAssignment = $vehicle->driverAssignments->first();
            $hasDriver = !is_null($activeAssignment);
            $driverName = $hasDriver ? $activeAssignment->driver?->name : null;

            $passengerCount = $vehicle->type === 'bus'
                ? (int)$vehicle->student_assignments_count
                : (int)$vehicle->auto_passengers_count;

            $result[] = [
                'vehicle_id' => $vehicle->id,
                'vehicle_name' => $vehicle->name,
                'type' => $vehicle->type,
                'revenue_this_month' => (float)$revenue,
                'pending_dues_count' => (int)$pendingCount,
                'pending_dues_amount' => (float)$pendingAmount,
                'passenger_count' => $passengerCount,
                'has_driver' => $hasDriver,
                'driver_name' => $driverName,
            ];
        }

        // Sort by pending dues amount descending
        usort($result, function ($a, $b) {
            return $b['pending_dues_amount'] <=> $a['pending_dues_amount'];
        });

        return $this->successResponse($result, 'Vehicle performance metrics retrieved');
    }
}

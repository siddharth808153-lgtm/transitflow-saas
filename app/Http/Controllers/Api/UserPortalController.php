<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\AutoPassenger;
use App\Models\Due;
use App\Models\Transaction;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class UserPortalController extends Controller
{
    use ApiResponse;

    /**
     * Get authenticated user's full profile including linked students and passengers.
     */
    public function myProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. Fetch linked students
        $students = Student::where('user_id', $user->id)
            ->with(['studentAssignments' => function ($q) {
                $q->whereNull('removed_date')->with('vehicle');
            }])
            ->get()
            ->map(function ($student) {
                $activeAssignment = $student->studentAssignments->first();
                
                // Get pending dues count and total amount
                $dues = Due::where('reference_type', 'student')
                    ->where('reference_id', $student->id)
                    ->where('is_paid', false)
                    ->get();

                return [
                    'id'                  => $student->id,
                    'student_name'        => $student->student_name,
                    'class'               => $student->class,
                    'section'             => $student->section,
                    'current_bus'         => $activeAssignment ? [
                        'vehicle_name'   => $activeAssignment->vehicle?->name ?? 'N/A',
                        'monthly_fee'    => (float)$activeAssignment->monthly_fee,
                        'assigned_since' => $activeAssignment->assigned_date ? $activeAssignment->assigned_date->toDateString() : null,
                    ] : null,
                    'pending_dues_count'  => $dues->count(),
                    'pending_dues_amount' => (float)$dues->sum('due_amount'),
                ];
            });

        // 2. Fetch linked auto passengers
        $passengers = AutoPassenger::where('user_id', $user->id)
            ->with('vehicle')
            ->get()
            ->map(function ($passenger) {
                $duesCount = Due::where('reference_type', 'auto_passenger')
                    ->where('reference_id', $passenger->id)
                    ->where('is_paid', false)
                    ->count();

                return [
                    'id'                 => $passenger->id,
                    'name'               => $passenger->name,
                    'vehicle_name'       => $passenger->vehicle?->name ?? 'N/A',
                    'daily_fare'         => (float)$passenger->daily_fare,
                    'pending_dues_count' => $duesCount,
                ];
            });

        return $this->successResponse([
            'user'       => [
                'id'    => $user->id,
                'name'  => $user->name,
                'phone' => $user->phone,
                'email' => $user->email,
            ],
            'students'   => $students,
            'passengers' => $passengers,
        ], 'User profile retrieved successfully');
    }

    /**
     * Get paginated transaction history for the user's students and passengers.
     */
    public function myPayments(Request $request): JsonResponse
    {
        $user = $request->user();

        // Get linked student and passenger IDs
        $studentIds = Student::where('user_id', $user->id)->pluck('id')->toArray();
        $passengerIds = AutoPassenger::where('user_id', $user->id)->pluck('id')->toArray();

        // Build query
        $query = Transaction::with('vehicle')
            ->where(function ($q) use ($studentIds, $passengerIds) {
                $q->where(fn($sq) => $sq->where('reference_type', 'student')->whereIn('reference_id', $studentIds))
                  ->orWhere(fn($sq) => $sq->where('reference_type', 'auto_passenger')->whereIn('reference_id', $passengerIds));
            });

        // Filters
        if ($request->filled('month')) {
            $year = Carbon::parse($request->month)->year;
            $monthNum = Carbon::parse($request->month)->month;
            $query->where(function($q) use ($year, $monthNum) {
                $q->where(fn($sq) => $sq->whereYear('payment_for_month', $year)->whereMonth('payment_for_month', $monthNum))
                  ->orWhere(fn($sq) => $sq->whereYear('payment_for_date', $year)->whereMonth('payment_for_date', $monthNum));
            });
        }

        if ($request->filled('type')) {
            if ($request->type === 'student') {
                $query->where('reference_type', 'student');
            } elseif ($request->type === 'passenger') {
                $query->where('reference_type', 'auto_passenger');
            }
        }

        // Summary calculations
        $now = now();
        $totalPaidThisMonthQuery = Transaction::where(function ($q) use ($studentIds, $passengerIds) {
                $q->where(fn($sq) => $sq->where('reference_type', 'student')->whereIn('reference_id', $studentIds))
                  ->orWhere(fn($sq) => $sq->where('reference_type', 'auto_passenger')->whereIn('reference_id', $passengerIds));
            })
            ->whereYear('created_at', $now->year)
            ->whereMonth('created_at', $now->month);
            
        $totalPaidAllTimeQuery = Transaction::where(function ($q) use ($studentIds, $passengerIds) {
                $q->where(fn($sq) => $sq->where('reference_type', 'student')->whereIn('reference_id', $studentIds))
                  ->orWhere(fn($sq) => $sq->where('reference_type', 'auto_passenger')->whereIn('reference_id', $passengerIds));
            });

        $lastPaymentDate = $totalPaidAllTimeQuery->max('created_at');

        // Execute paginated listing
        $payments = $query->orderBy('created_at', 'desc')->paginate(15);

        return $this->successResponse([
            'summary'  => [
                'total_paid_this_month' => (float)$totalPaidThisMonthQuery->sum('amount'),
                'total_paid_all_time'   => (float)$totalPaidAllTimeQuery->sum('amount'),
                'last_payment_date'     => $lastPaymentDate ? Carbon::parse($lastPaymentDate)->toDateString() : null,
            ],
            'payments' => $payments->items(),
            'pagination' => [
                'current_page' => $payments->currentPage(),
                'last_page'    => $payments->lastPage(),
                'per_page'     => $payments->perPage(),
                'total'        => $payments->total(),
            ]
        ], 'Payment history retrieved successfully');
    }

    /**
     * Get all pending/unpaid dues for user's students and passengers.
     */
    public function myDues(Request $request): JsonResponse
    {
        $user = $request->user();

        // Get linked student and passenger IDs
        $studentIds = Student::where('user_id', $user->id)->pluck('id')->toArray();
        $passengerIds = AutoPassenger::where('user_id', $user->id)->pluck('id')->toArray();

        $now = now();

        // 1. Fetch student dues
        $studentDues = Due::where('reference_type', 'student')
            ->whereIn('reference_id', $studentIds)
            ->where('is_paid', false)
            ->with(['vehicle', 'reference', 'admin'])
            ->get()
            ->map(function ($due) use ($now) {
                $dueDate = $due->due_for_month ? Carbon::parse($due->due_for_month) : null;
                $daysOverdue = $dueDate ? $dueDate->diffInDays($now, false) : 0;
                $daysOverdue = max(0, (int)$daysOverdue);

                return [
                    'due_id'       => $due->id,
                    'student_name' => $due->reference?->student_name ?? 'N/A',
                    'bus_name'     => $due->vehicle?->name ?? 'N/A',
                    'month'        => $dueDate ? $dueDate->format('F Y') : 'N/A',
                    'amount'       => (float)$due->due_amount,
                    'is_overdue'   => $daysOverdue > 0,
                    'days_overdue' => $daysOverdue,
                    'admin_phone'  => $due->admin?->phone ?? '',
                ];
            });

        // 2. Fetch passenger dues
        $passengerDues = Due::where('reference_type', 'auto_passenger')
            ->whereIn('reference_id', $passengerIds)
            ->where('is_paid', false)
            ->with(['vehicle', 'reference', 'admin'])
            ->get()
            ->map(function ($due) use ($now) {
                $dueDate = $due->due_for_date ? Carbon::parse($due->due_for_date) : null;
                $daysOverdue = $dueDate ? $dueDate->diffInDays($now, false) : 0;
                $daysOverdue = max(0, (int)$daysOverdue);

                return [
                    'due_id'         => $due->id,
                    'passenger_name' => $due->reference?->name ?? 'N/A',
                    'auto_name'      => $due->vehicle?->name ?? 'N/A',
                    'date'           => $dueDate ? $dueDate->format('d M Y') : 'N/A',
                    'amount'         => (float)$due->due_amount,
                    'is_overdue'     => $daysOverdue > 0,
                    'admin_phone'    => $due->admin?->phone ?? '',
                ];
            });

        $totalPending = $studentDues->sum('amount') + $passengerDues->sum('amount');

        return $this->successResponse([
            'student_dues'   => $studentDues,
            'passenger_dues' => $passengerDues,
            'total_pending'  => (float)$totalPending,
        ], 'Pending dues retrieved successfully');
    }

    /**
     * Get specific student detailed information including history.
     */
    public function studentDetail($studentId): JsonResponse
    {
        $student = Student::where('user_id', auth()->id())->findOrFail($studentId);

        // Fetch active assignment
        $activeAssignment = $student->studentAssignments()->whereNull('removed_date')->with('vehicle')->first();

        // 12 months payment/dues status history
        $duesHistory = Due::where('reference_type', 'student')
            ->where('reference_id', $studentId)
            ->orderBy('due_for_month', 'desc')
            ->limit(12)
            ->get()
            ->map(function ($due) {
                return [
                    'due_id'     => $due->id,
                    'month'      => $due->due_for_month ? Carbon::parse($due->due_for_month)->format('F Y') : 'N/A',
                    'amount'     => (float)$due->due_amount,
                    'is_paid'    => $due->is_paid,
                    'paid_at'    => $due->paid_at ? $due->paid_at->toDateTimeString() : null,
                ];
            });

        // Next month's due if generated
        $nextMonthDate = now()->addMonth()->startOfMonth()->toDateString();
        $upcomingDueObj = Due::where('reference_type', 'student')
            ->where('reference_id', $studentId)
            ->where('due_for_month', $nextMonthDate)
            ->first();

        $upcomingDue = $upcomingDueObj ? [
            'due_id'  => $upcomingDueObj->id,
            'month'   => Carbon::parse($upcomingDueObj->due_for_month)->format('F Y'),
            'amount'  => (float)$upcomingDueObj->due_amount,
            'is_paid' => $upcomingDueObj->is_paid,
        ] : null;

        return $this->successResponse([
            'student'            => $student,
            'current_assignment' => $activeAssignment ? [
                'bus_name' => $activeAssignment->vehicle?->name ?? 'N/A',
                'fee'      => (float)$activeAssignment->monthly_fee,
                'since'    => $activeAssignment->assigned_date ? $activeAssignment->assigned_date->toDateString() : null,
            ] : null,
            'payment_history'   => $duesHistory,
            'upcoming_due'      => $upcomingDue,
        ], 'Student details retrieved successfully');
    }
}

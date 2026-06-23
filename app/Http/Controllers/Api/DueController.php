<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Due;
use App\Models\Student;
use App\Models\AutoPassenger;
use App\Models\Transaction;
use App\Models\VehicleLog;
use App\Jobs\SendPaymentWhatsappJob;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DueController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of dues.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Due::query()->with(['reference', 'vehicle']);

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        // Apply filters
        if ($request->has('vehicle_id') && $request->vehicle_id !== '') {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        if ($request->has('reference_type') && $request->reference_type !== '') {
            $query->where('reference_type', $request->reference_type);
        }

        if ($request->has('is_paid') && $request->is_paid !== '') {
            $query->where('is_paid', filter_var($request->is_paid, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('month') && $request->month !== '') {
            // month is in format YYYY-MM
            $month = $request->month;
            $query->whereRaw("DATE_FORMAT(due_for_month, '%Y-%m') = ?", [$month])
                ->orWhereRaw("DATE_FORMAT(due_for_date, '%Y-%m') = ?", [$month]);
        }

        // For overdue status
        if ($request->has('status') && $request->status === 'overdue') {
            $query->where('is_paid', false)
                ->where(function ($q) {
                    $q->where('due_for_month', '<', Carbon::now()->startOfMonth())
                        ->orWhere('due_for_date', '<', Carbon::now()->startOfMonth());
                });
        }

        $dues = $query->latest()->paginate(20);

        return $this->successResponse([
            'dues' => $dues->items(),
            'pagination' => [
                'current_page' => $dues->currentPage(),
                'last_page'    => $dues->lastPage(),
                'per_page'     => $dues->perPage(),
                'total'        => $dues->total(),
            ]
        ], 'Dues retrieved successfully');
    }

    /**
     * Batch generate monthly dues for students.
     */
    public function generateMonthlyDues(Request $request): JsonResponse
    {
        if (auth()->user()->role !== 'admin') {
            return $this->errorResponse('Access denied. Admins only.', 403);
        }

        $request->validate([
            'month' => 'required|date_format:Y-m',
        ]);

        $monthStr = $request->month . '-01'; // Get first day of the given month
        $monthDate = Carbon::parse($monthStr);
        
        $adminId = auth()->id();

        // Active students of this admin with active assignments
        $students = Student::where('admin_id', $adminId)
            ->where('is_active', true)
            ->whereHas('studentAssignments', function ($q) {
                $q->whereNull('removed_date');
            })
            ->with(['studentAssignments' => function ($q) {
                $q->whereNull('removed_date');
            }])
            ->get();

        $generated = 0;
        $skipped = 0;

        foreach ($students as $student) {
            $activeAssignment = $student->studentAssignments->first();
            if (!$activeAssignment) {
                $skipped++;
                continue;
            }

            // Check if due already exists for this student and this month
            $exists = Due::where('reference_type', 'student')
                ->where('reference_id', $student->id)
                ->whereRaw("DATE_FORMAT(due_for_month, '%Y-%m') = ?", [$request->month])
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            Due::create([
                'admin_id'       => $adminId,
                'vehicle_id'     => $activeAssignment->vehicle_id,
                'reference_id'   => $student->id,
                'reference_type' => 'student',
                'due_amount'     => $activeAssignment->monthly_fee,
                'due_for_month'  => $monthDate,
                'is_paid'        => false,
            ]);

            $generated++;
        }

        return $this->successResponse([
            'generated' => $generated,
            'skipped'   => $skipped,
        ], "Generated {$generated} monthly dues, skipped {$skipped} existing/unassigned.");
    }

    /**
     * Batch generate daily dues for passengers on a route.
     */
    public function generateDailyDues(Request $request): JsonResponse
    {
        if (auth()->user()->role !== 'admin') {
            return $this->errorResponse('Access denied. Admins only.', 403);
        }

        $request->validate([
            'date'       => 'required|date',
            'vehicle_id' => 'required|exists:vehicles,id',
        ]);

        $date = Carbon::parse($request->date)->format('Y-m-d');
        $adminId = auth()->id();

        // Get all active auto_passengers for this vehicle
        $passengers = AutoPassenger::where('admin_id', $adminId)
            ->where('vehicle_id', $request->vehicle_id)
            ->where('is_active', true)
            ->get();

        $generated = 0;
        $skipped = 0;

        foreach ($passengers as $passenger) {
            // Check if daily due already exists
            $exists = Due::where('reference_type', 'auto_passenger')
                ->where('reference_id', $passenger->id)
                ->whereDate('due_for_date', $date)
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            Due::create([
                'admin_id'       => $adminId,
                'vehicle_id'     => $request->vehicle_id,
                'reference_id'   => $passenger->id,
                'reference_type' => 'auto_passenger',
                'due_amount'     => $passenger->daily_fare,
                'due_for_date'   => $date,
                'is_paid'        => false,
            ]);

            $generated++;
        }

        return $this->successResponse([
            'generated' => $generated,
            'skipped'   => $skipped,
        ], "Generated {$generated} daily dues, skipped {$skipped} existing.");
    }

    /**
     * Mark a due as paid (automatically creating a transaction record).
     */
    public function markAsPaid(Request $request, $id): JsonResponse
    {
        if (auth()->user()->role !== 'admin') {
            return $this->errorResponse('Access denied. Admins only.', 403);
        }

        $request->validate([
            'payment_method' => 'required|string|in:cash,upi,bank,other',
            'notes'          => 'nullable|string|max:500',
        ]);

        $due = Due::where('admin_id', auth()->id())->findOrFail($id);

        if ($due->is_paid) {
            return $this->errorResponse('This due is already paid.', 400);
        }

        // Create transaction automatically
        $transaction = Transaction::create([
            'admin_id'          => auth()->id(),
            'vehicle_id'        => $due->vehicle_id,
            'transaction_type'  => $due->reference_type === 'student' ? 'student_fee' : 'auto_daily',
            'reference_id'      => $due->reference_id,
            'reference_type'    => $due->reference_type,
            'amount'            => $due->due_amount,
            'payment_method'    => $request->payment_method,
            'payment_for_month' => $due->due_for_month,
            'payment_for_date'  => $due->due_for_date,
            'notes'             => $request->notes,
            'collected_by'      => auth()->id(),
        ]);

        // Update Due
        $due->update([
            'is_paid'        => true,
            'paid_at'        => now(),
            'transaction_id' => $transaction->id,
        ]);

        // Dispatch WhatsApp Job
        SendPaymentWhatsappJob::dispatch($transaction);

        // Log to VehicleLogs
        VehicleLog::create([
            'admin_id'       => auth()->id(),
            'vehicle_id'     => $due->vehicle_id,
            'event_type'     => 'payment_received',
            'reference_id'   => $due->reference_id,
            'reference_type' => $due->reference_type,
            'note'           => "Due marked paid via " . strtoupper($request->payment_method),
            'performed_by'   => auth()->id(),
        ]);

        return $this->successResponse([
            'success'     => true,
            'transaction' => $transaction,
        ], 'Payment recorded and due updated successfully');
    }

    /**
     * Get summary metrics for the dashboard.
     */
    public function summary(Request $request): JsonResponse
    {
        $adminId = auth()->id();
        $isSuper = auth()->user()->role === 'super_admin';

        $now = Carbon::now();

        // 1. Total collected this month (sum of transactions recorded in current month)
        $txQuery = Transaction::query();
        if (!$isSuper) {
            $txQuery->where('admin_id', $adminId);
        }
        $totalCollected = $txQuery->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->sum('amount');

        // 2. Dues summary this month
        $duesThisMonthQuery = Due::query();
        if (!$isSuper) {
            $duesThisMonthQuery->where('admin_id', $adminId);
        }
        
        // Paid/Unpaid dues of this month (either due_for_month = this month, or due_for_date is in this month)
        $duesThisMonth = $duesThisMonthQuery->where(function($q) use ($now) {
            $q->whereMonth('due_for_month', $now->month)->whereYear('due_for_month', $now->year)
              ->orWhereMonth('due_for_date', $now->month)->whereYear('due_for_date', $now->year);
        })->get();

        $paidThisMonth = $duesThisMonth->where('is_paid', true)->sum('due_amount');
        $pendingThisMonth = $duesThisMonth->where('is_paid', false)->sum('due_amount');
        $totalDuesThisMonth = $duesThisMonth->sum('due_amount');

        // 3. Overdue (unpaid dues from previous months)
        $overdueQuery = Due::query();
        if (!$isSuper) {
            $overdueQuery->where('admin_id', $adminId);
        }
        $totalOverdue = $overdueQuery->where('is_paid', false)
            ->where(function ($q) use ($now) {
                $q->where('due_for_month', '<', $now->copy()->startOfMonth())
                  ->orWhere('due_for_date', '<', $now->copy()->startOfMonth());
            })
            ->sum('due_amount');

        // 4. Pending counts
        $studentPendingQuery = Due::query()->where('is_paid', false)->where('reference_type', 'student');
        if (!$isSuper) {
            $studentPendingQuery->where('admin_id', $adminId);
        }
        $studentPendingCount = $studentPendingQuery->where(function($q) use ($now) {
            $q->whereMonth('due_for_month', $now->month)->whereYear('due_for_month', $now->year);
        })->count();

        $passengerPendingQuery = Due::query()->where('is_paid', false)->where('reference_type', 'auto_passenger');
        if (!$isSuper) {
            $passengerPendingQuery->where('admin_id', $adminId);
        }
        $passengerPendingCount = $passengerPendingQuery->where(function($q) use ($now) {
            $q->whereMonth('due_for_date', $now->month)->whereYear('due_for_date', $now->year);
        })->count();

        // 5. Collection rate percentage (this month's paid / this month's total dues)
        $collectionRate = $totalDuesThisMonth > 0 
            ? round(($paidThisMonth / $totalDuesThisMonth) * 100, 1) 
            : 0;

        return $this->successResponse([
            'total_collected_this_month' => (float)$totalCollected,
            'total_pending_this_month'   => (float)$pendingThisMonth,
            'total_overdue'              => (float)$totalOverdue,
            'student_dues_pending'       => $studentPendingCount,
            'passenger_dues_pending'     => $passengerPendingCount,
            'collection_rate'            => (float)$collectionRate,
        ], 'Dashboard metrics retrieved');
    }
}

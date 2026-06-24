<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AutoPassenger;
use App\Models\Due;
use App\Models\Student;
use App\Models\Transaction;
use App\Models\Vehicle;
use App\Models\VehicleLog;
use App\Models\WhatsappLog;
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

        // Filter by vehicle_id
        if ($request->has('vehicle_id') && $request->vehicle_id !== '') {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        // Filter by reference_type
        if ($request->has('reference_type') && $request->reference_type !== '') {
            $query->where('reference_type', $request->reference_type);
        }

        // Filter by is_paid
        if ($request->has('is_paid') && $request->is_paid !== '') {
            $query->where('is_paid', filter_var($request->is_paid, FILTER_VALIDATE_BOOLEAN));
        }

        // Filter by month (YYYY-MM format)
        if ($request->has('month') && $request->month !== '') {
            $month = $request->month;
            $query->where(function ($q) use ($month) {
                $q->whereRaw("DATE_FORMAT(due_for_month, '%Y-%m') = ?", [$month])
                  ->orWhereRaw("DATE_FORMAT(due_for_date, '%Y-%m') = ?", [$month]);
            });
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
        $request->validate([
            'month' => 'required|date_format:Y-m',
        ]);

        $firstDay = Carbon::createFromFormat('Y-m', $request->month)->startOfMonth();
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
                ->where('due_for_month', $firstDay)
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
                'due_for_month'  => $firstDay,
                'is_paid'        => false,
            ]);

            $generated++;
        }

        return $this->successResponse([
            'generated' => $generated,
            'skipped'   => $skipped,
        ], "Generated {$generated} dues for {$request->month}");
    }

    /**
     * Batch generate daily dues for passengers on a route.
     */
    public function generateDailyDues(Request $request): JsonResponse
    {
        $request->validate([
            'date'       => 'required|date',
            'vehicle_id' => 'required|exists:vehicles,id',
        ]);

        // Check vehicle type = 'auto'
        $vehicle = Vehicle::findOrFail($request->vehicle_id);
        if ($vehicle->type !== 'auto') {
            return $this->errorResponse(
                'Daily dues can only be generated for auto-type vehicles.',
                422
            );
        }

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
        $request->validate([
            'payment_method' => 'required|string|in:cash,upi,bank,other',
            'notes'          => 'nullable|string|max:500',
        ]);

        // Find due and verify it belongs to admin's vehicle
        $due = Due::query();
        if (auth()->user()->role === 'admin') {
            $due->where('admin_id', auth()->id());
        }
        $due = $due->findOrFail($id);

        if ($due->is_paid) {
            return $this->errorResponse('This due is already marked as paid', 422);
        }

        // Determine transaction_type based on reference_type
        $transactionType = $due->reference_type === 'student' ? 'student_fee' : 'auto_daily';

        // Create Transaction automatically
        $transaction = Transaction::create([
            'admin_id'          => auth()->id(),
            'vehicle_id'        => $due->vehicle_id,
            'transaction_type'  => $transactionType,
            'reference_id'      => $due->reference_id,
            'reference_type'    => $due->reference_type,
            'amount'            => $due->due_amount,
            'payment_method'    => $request->payment_method,
            'payment_for_month' => $due->due_for_month,
            'payment_for_date'  => $due->due_for_date,
            'notes'             => $request->notes,
            'collected_by'      => auth()->id(),
        ]);

        // Mark due as paid
        $due->update([
            'is_paid'        => true,
            'paid_at'        => now(),
            'transaction_id' => $transaction->id,
        ]);

        // Get person name and phone for WhatsApp
        $personName = null;
        $recipientPhone = null;

        if ($due->reference_type === 'student') {
            $student = Student::with('user')->find($due->reference_id);
            $personName = $student?->student_name;
            $recipientPhone = $student?->user?->phone;
        } elseif ($due->reference_type === 'auto_passenger') {
            $passenger = AutoPassenger::find($due->reference_id);
            $personName = $passenger?->name;
            $recipientPhone = $passenger?->phone;
        }

        // Build message body
        $messageBody = $this->buildWhatsappMessage(
            $transactionType,
            $personName,
            $due->due_amount,
            $request->payment_method,
            $due->due_for_month,
            $due->due_for_date
        );

        // Create WhatsappLog
        WhatsappLog::create([
            'admin_id'        => auth()->id(),
            'transaction_id'  => $transaction->id,
            'recipient_phone' => $recipientPhone,
            'message_body'    => $messageBody,
            'status'          => 'pending',
        ]);

        // Dispatch SendPaymentWhatsappJob
        SendPaymentWhatsappJob::dispatch($transaction);

        return $this->successResponse([
            'due'         => $due,
            'transaction' => $transaction,
        ], 'Payment recorded');
    }

    /**
     * Get summary metrics for the dashboard.
     */
    public function summary(Request $request): JsonResponse
    {
        $adminId = auth()->id();
        $isSuper = auth()->user()->role === 'super_admin';

        $now = Carbon::now();

        // 1. Total collected this month (sum of transactions)
        $txQuery = Transaction::query();
        if (!$isSuper) {
            $txQuery->where('admin_id', $adminId);
        }
        $totalCollected = (clone $txQuery)
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->sum('amount');

        // 2. Dues summary this month
        $duesThisMonthQuery = Due::query();
        if (!$isSuper) {
            $duesThisMonthQuery->where('admin_id', $adminId);
        }

        $duesThisMonth = (clone $duesThisMonthQuery)->where(function($q) use ($now) {
            $q->where(function ($q2) use ($now) {
                $q2->whereMonth('due_for_month', $now->month)
                   ->whereYear('due_for_month', $now->year);
            })->orWhere(function ($q2) use ($now) {
                $q2->whereMonth('due_for_date', $now->month)
                   ->whereYear('due_for_date', $now->year);
            });
        })->get();

        $paidThisMonth = $duesThisMonth->where('is_paid', true)->sum('due_amount');
        $pendingThisMonth = $duesThisMonth->where('is_paid', false)->sum('due_amount');
        $totalDuesThisMonth = $duesThisMonth->sum('due_amount');

        // 3. Overdue (unpaid dues from previous months)
        $overdueQuery = Due::query();
        if (!$isSuper) {
            $overdueQuery->where('admin_id', $adminId);
        }
        $totalOverdue = (clone $overdueQuery)->where('is_paid', false)
            ->where(function ($q) use ($now) {
                $q->where('due_for_month', '<', $now->copy()->startOfMonth())
                  ->orWhere('due_for_date', '<', $now->copy()->startOfMonth());
            })
            ->sum('due_amount');

        // 4. Pending counts
        $studentPendingQuery = Due::query()
            ->where('is_paid', false)
            ->where('reference_type', 'student');
        if (!$isSuper) {
            $studentPendingQuery->where('admin_id', $adminId);
        }
        $studentPendingCount = (clone $studentPendingQuery)->where(function($q) use ($now) {
            $q->whereMonth('due_for_month', $now->month)->whereYear('due_for_month', $now->year);
        })->count();

        $passengerPendingQuery = Due::query()
            ->where('is_paid', false)
            ->where('reference_type', 'auto_passenger');
        if (!$isSuper) {
            $passengerPendingQuery->where('admin_id', $adminId);
        }
        $passengerPendingCount = (clone $passengerPendingQuery)->where(function($q) use ($now) {
            $q->whereMonth('due_for_date', $now->month)->whereYear('due_for_date', $now->year);
        })->count();

        // 5. Collection rate percentage
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

    /**
     * Build the WhatsApp message body based on transaction type.
     */
    private function buildWhatsappMessage(
        string $type,
        ?string $personName,
        $amount,
        string $paymentMethod,
        $paymentForMonth = null,
        $paymentForDate = null
    ): string {
        $formattedAmount = number_format((float)$amount, 2);
        $method = ucfirst($paymentMethod);

        if ($type === 'student_fee') {
            $monthYear = $paymentForMonth
                ? Carbon::parse($paymentForMonth)->format('F Y')
                : 'N/A';

            return "✅ Payment Received!\n"
                . "Student: {$personName}\n"
                . "Month: {$monthYear}\n"
                . "Amount: ₹{$formattedAmount}\n"
                . "Method: {$method}\n"
                . "Thank you! 🙏";
        }

        if ($type === 'auto_daily') {
            $dateStr = $paymentForDate
                ? Carbon::parse($paymentForDate)->format('d M Y')
                : 'N/A';

            return "✅ Fare Received!\n"
                . "Passenger: {$personName}\n"
                . "Date: {$dateStr}\n"
                . "Amount: ₹{$formattedAmount}\n"
                . "Method: {$method}\n"
                . "Thank you! 🙏";
        }

        return "✅ Payment of ₹{$formattedAmount} recorded via {$method}. Thank you! 🙏";
    }
}

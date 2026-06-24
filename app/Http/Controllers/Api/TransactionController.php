<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AutoPassenger;
use App\Models\Due;
use App\Models\Student;
use App\Models\Transaction;
use App\Models\WhatsappLog;
use App\Jobs\SendPaymentWhatsappJob;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class TransactionController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of transactions.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Transaction::query()
            ->with(['vehicle', 'collector']);

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        // Apply filters
        if ($request->has('transaction_type') && $request->transaction_type !== 'all' && $request->transaction_type !== '') {
            $query->where('transaction_type', $request->transaction_type);
        }

        if ($request->has('vehicle_id') && $request->vehicle_id !== '') {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        if ($request->has('payment_method') && $request->payment_method !== 'all' && $request->payment_method !== '') {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->has('date_from') && $request->date_from !== '') {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to !== '') {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $transactions = $query->latest()->paginate(20);

        // Summary counts for meta
        $adminScope = Transaction::query();
        if (auth()->user()->role === 'admin') {
            $adminScope->where('admin_id', auth()->id());
        }
        $now = Carbon::now();

        $todayTotal = (clone $adminScope)->whereDate('created_at', $now->toDateString())->sum('amount');
        $thisMonthTotal = (clone $adminScope)
            ->whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->sum('amount');

        return $this->successResponse([
            'transactions' => $transactions->items(),
            'pagination' => [
                'current_page' => $transactions->currentPage(),
                'last_page'    => $transactions->lastPage(),
                'per_page'     => $transactions->perPage(),
                'total'        => $transactions->total(),
            ],
            'meta' => [
                'today_total'      => (float)$todayTotal,
                'this_month_total' => (float)$thisMonthTotal,
            ]
        ], 'Transactions retrieved successfully');
    }

    /**
     * Store a newly created transaction.
     */
    public function store(Request $request): JsonResponse
    {
        // Enforce Admin Only for creation
        if (auth()->user()->role !== 'admin') {
            return $this->errorResponse('Access denied. Admins only.', 403);
        }

        $validated = $request->validate([
            'vehicle_id'        => 'required|exists:vehicles,id',
            'transaction_type'  => 'required|string|in:student_fee,auto_daily,driver_wage',
            'reference_id'      => 'required|integer',
            'reference_type'    => 'required|string|in:student,auto_passenger,driver',
            'amount'            => 'required|numeric|min:1',
            'payment_method'    => 'required|string|in:cash,upi,bank,other',
            'payment_for_month' => 'required_if:transaction_type,student_fee|nullable|date',
            'payment_for_date'  => 'required_if:transaction_type,auto_daily|nullable|date',
            'notes'             => 'nullable|string|max:500',
        ]);

        // Verify reference exists and belongs to admin
        $recipientPhone = null;
        $personName = null;

        if ($request->reference_type === 'student') {
            $student = Student::where('id', $request->reference_id)
                ->where('admin_id', auth()->id())
                ->first();
            if (!$student) {
                return $this->errorResponse('Record not found', 404);
            }
            $personName = $student->student_name;
            // Get phone from parent (user)
            $recipientPhone = $student->user?->phone;
        } elseif ($request->reference_type === 'auto_passenger') {
            $passenger = AutoPassenger::where('id', $request->reference_id)
                ->where('admin_id', auth()->id())
                ->first();
            if (!$passenger) {
                return $this->errorResponse('Record not found', 404);
            }
            $personName = $passenger->name;
            $recipientPhone = $passenger->phone;
        }

        $validated['admin_id'] = auth()->id();
        $validated['collected_by'] = auth()->id();

        // Create transaction
        $transaction = Transaction::create($validated);

        // Find and update matching Due record
        $dueQuery = Due::where('reference_type', $request->reference_type)
            ->where('reference_id', $request->reference_id)
            ->where('is_paid', false);

        if ($request->transaction_type === 'student_fee' && $request->payment_for_month) {
            $month = date('Y-m', strtotime($request->payment_for_month));
            $dueQuery->whereRaw("DATE_FORMAT(due_for_month, '%Y-%m') = ?", [$month]);
        } elseif ($request->transaction_type === 'auto_daily' && $request->payment_for_date) {
            $dueQuery->whereDate('due_for_date', $request->payment_for_date);
        }

        $due = $dueQuery->first();

        if ($due) {
            $due->update([
                'is_paid'        => true,
                'paid_at'        => now(),
                'transaction_id' => $transaction->id,
            ]);
        }

        // Build WhatsApp message body
        $messageBody = $this->buildWhatsappMessage(
            $request->transaction_type,
            $personName,
            $request->amount,
            $request->payment_method,
            $request->payment_for_month,
            $request->payment_for_date
        );

        // Create WhatsappLog record
        $whatsappLog = WhatsappLog::create([
            'admin_id'        => auth()->id(),
            'transaction_id'  => $transaction->id,
            'recipient_phone' => $recipientPhone,
            'message_body'    => $messageBody,
            'status'          => 'pending',
        ]);

        // Dispatch SendPaymentWhatsappJob
        SendPaymentWhatsappJob::dispatch($transaction);

        // Load whatsapp_logs for response
        $transaction->load('whatsappLogs');

        return $this->successResponse($transaction, 'Payment recorded', 201);
    }

    /**
     * Display the specified transaction.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $query = Transaction::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $transaction = $query->with(['vehicle', 'collector', 'whatsappLogs'])->findOrFail($id);

        // Eager load polymorphic reference relation details
        $transaction->load('reference');

        return $this->successResponse($transaction, 'Transaction details retrieved');
    }

    /**
     * Remove the specified transaction (Permanent Records — FORBIDDEN).
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        return $this->errorResponse('Transactions are permanent records and cannot be deleted.', 403);
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

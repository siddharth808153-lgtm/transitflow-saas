<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Due;
use App\Models\Transaction;
use App\Models\VehicleLog;
use App\Jobs\SendPaymentWhatsappJob;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        if ($request->has('reference_type') && $request->reference_type !== '') {
            $query->where('reference_type', $request->reference_type);
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

        return $this->successResponse([
            'transactions' => $transactions->items(),
            'pagination' => [
                'current_page' => $transactions->currentPage(),
                'last_page'    => $transactions->lastPage(),
                'per_page'     => $transactions->perPage(),
                'total'        => $transactions->total(),
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
            'transaction_type'  => 'required|string|in:student_fee,auto_daily,driver_wage,other',
            'reference_id'      => 'required|integer',
            'reference_type'    => 'required|string|in:student,auto_passenger,driver',
            'amount'            => 'required|numeric|min:1',
            'payment_method'    => 'required|string|in:cash,upi,bank,other',
            'payment_for_month' => 'required_if:transaction_type,student_fee|nullable|date',
            'payment_for_date'  => 'required_if:transaction_type,auto_daily|nullable|date',
            'notes'             => 'nullable|string|max:500',
        ]);

        $validated['admin_id'] = auth()->id();
        $validated['collected_by'] = auth()->id();

        // Create transaction
        $transaction = Transaction::create($validated);

        // Find and update matching Due record if applicable
        $dueQuery = Due::where('reference_type', $request->reference_type)
            ->where('reference_id', $request->reference_id)
            ->where('is_paid', false);

        if ($request->transaction_type === 'student_fee') {
            // Match month (YYYY-MM format check)
            $month = date('Y-m', strtotime($request->payment_for_month));
            $dueQuery->whereRaw("DATE_FORMAT(due_for_month, '%Y-%m') = ?", [$month]);
        } elseif ($request->transaction_type === 'auto_daily') {
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

        // Dispatch SendPaymentWhatsappJob (placeholder job)
        SendPaymentWhatsappJob::dispatch($transaction);

        // Log action in vehicle logs
        VehicleLog::create([
            'admin_id'       => auth()->id(),
            'vehicle_id'     => $request->vehicle_id,
            'event_type'     => $request->transaction_type === 'driver_wage' ? 'driver_paid' : 'payment_received',
            'reference_id'   => $request->reference_id,
            'reference_type' => $request->reference_type,
            'note'           => "Payment of ₹" . number_format($request->amount, 2) . " recorded via " . strtoupper($request->payment_method),
            'performed_by'   => auth()->id(),
        ]);

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

        $transaction = $query->with(['vehicle', 'collector'])->findOrFail($id);

        // Eager load polymorphic reference relation details
        $transaction->load('reference');

        return $this->successResponse($transaction, 'Transaction details retrieved');
    }

    /**
     * Remove the specified transaction (Permanent Records check - FORBIDDEN).
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        return $this->errorResponse('Transactions cannot be deleted. They are permanent records.', 403);
    }
}

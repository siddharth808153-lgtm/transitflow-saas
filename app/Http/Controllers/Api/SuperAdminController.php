<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Driver;
use App\Models\Student;
use App\Models\AutoPassenger;
use App\Models\Transaction;
use App\Models\Due;
use App\Models\AdminSetting;
use App\Traits\ApiResponse;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SuperAdminController extends Controller
{
    use ApiResponse;

    /**
     * Get platform-wide dashboard statistics.
     */
    public function platformStats(): JsonResponse
    {
        $now = Carbon::now();

        $totalAdmins = User::where('role', 'admin')->count();
        $activeAdmins = User::where('role', 'admin')->where('is_active', true)->count();
        $totalVehicles = Vehicle::count();
        $totalDrivers = Driver::count();
        $totalStudents = Student::count();
        $totalPassengers = AutoPassenger::count();

        // Revenue this month
        $revenueThisMonth = Transaction::whereMonth('created_at', $now->month)
            ->whereYear('created_at', $now->year)
            ->sum('amount');

        // Revenue last month
        $lastMonth = $now->copy()->subMonth();
        $revenueLastMonth = Transaction::whereMonth('created_at', $lastMonth->month)
            ->whereYear('created_at', $lastMonth->year)
            ->sum('amount');

        // Total unpaid pending dues generated this month
        $duesThisMonth = Due::where(function ($q) use ($now) {
            $q->where(function ($q2) use ($now) {
                $q2->whereMonth('due_for_month', $now->month)
                   ->whereYear('due_for_month', $now->year);
            })->orWhere(function ($q2) use ($now) {
                $q2->whereMonth('due_for_date', $now->month)
                   ->whereYear('due_for_date', $now->year);
            });
        })->get();

        $pendingDuesThisMonth = $duesThisMonth->where('is_paid', false)->sum('due_amount');
        $paidDuesThisMonth = $duesThisMonth->where('is_paid', true)->sum('due_amount');
        $totalDuesThisMonth = $duesThisMonth->sum('due_amount');

        // Collection Rate
        $collectionRate = $totalDuesThisMonth > 0
            ? round(($paidDuesThisMonth / $totalDuesThisMonth) * 100, 1)
            : 0;

        $whatsappConnectedAdmins = AdminSetting::whereNotNull('whatsapp_sender_phone')
            ->where('whatsapp_sender_phone', '!=', '')
            ->count();

        return $this->successResponse([
            'total_admins'              => $totalAdmins,
            'active_admins'             => $activeAdmins,
            'total_vehicles'            => $totalVehicles,
            'total_drivers'             => $totalDrivers,
            'total_students'            => $totalStudents,
            'total_passengers'          => $totalPassengers,
            'total_revenue_this_month'  => (float)$revenueThisMonth,
            'total_revenue_last_month'  => (float)$revenueLastMonth,
            'total_pending_dues'        => (float)$pendingDuesThisMonth,
            'whatsapp_connected_admins' => $whatsappConnectedAdmins,
            'platform_collection_rate'  => (float)$collectionRate,
        ], 'Platform stats retrieved successfully');
    }

    /**
     * Get paginated list of all admins with metadata.
     */
    public function adminsList(Request $request): JsonResponse
    {
        $query = User::where('role', 'admin')
            ->with(['adminSettings'])
            ->withCount(['vehicles', 'drivers', 'students', 'autoPassengers']);

        // Search filter
        if ($request->has('search') && $request->search !== '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Status filter
        if ($request->has('is_active') && $request->is_active !== '') {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $admins = $query->paginate(15);

        // Map and append additional aggregates for each admin
        $now = Carbon::now();
        $admins->getCollection()->transform(function ($admin) use ($now) {
            $revenueThisMonth = Transaction::where('admin_id', $admin->id)
                ->whereMonth('created_at', $now->month)
                ->whereYear('created_at', $now->year)
                ->sum('amount');

            $pendingDues = Due::where('admin_id', $admin->id)
                ->where('is_paid', false)
                ->sum('due_amount');

            $adminData = $admin->toArray();
            $adminData['revenue_this_month'] = (float)$revenueThisMonth;
            $adminData['pending_dues'] = (float)$pendingDues;
            $adminData['admin_settings'] = $admin->adminSettings;

            return $adminData;
        });

        return response()->json([
            'success' => true,
            'message' => 'Admins retrieved successfully',
            'data' => [
                'admins' => $admins->items(),
                'pagination' => [
                    'current_page' => $admins->currentPage(),
                    'last_page'    => $admins->lastPage(),
                    'per_page'     => $admins->perPage(),
                    'total'        => $admins->total(),
                ]
            ]
        ]);
    }

    /**
     * Get single admin details.
     */
    public function adminDetail($id): JsonResponse
    {
        $admin = User::where('role', 'admin')
            ->with(['adminSettings'])
            ->findOrFail($id);

        // Vehicles with current active driver
        $vehicles = $admin->vehicles()
            ->with(['driverAssignments' => function ($q) {
                $q->whereNull('relieved_date')->with('driver');
            }])
            ->get();

        $driversCount = $admin->drivers()->count();
        $studentsCount = $admin->students()->count();
        $passengersCount = $admin->autoPassengers()->count();

        // Monthly revenue for last 6 months (array for chart)
        $revenueTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthKey = $date->format('Y-m');
            $monthLabel = $date->format('M Y');
            
            $rev = Transaction::where('admin_id', $admin->id)
                ->whereMonth('created_at', $date->month)
                ->whereYear('created_at', $date->year)
                ->sum('amount');

            $revenueTrend[] = [
                'month' => $monthLabel,
                'revenue' => (float)$rev,
            ];
        }

        // Recent 10 transactions
        $recentTransactions = Transaction::where('admin_id', $admin->id)
            ->with(['vehicle', 'reference'])
            ->latest()
            ->limit(10)
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

        return $this->successResponse([
            'admin' => $admin,
            'vehicles' => $vehicles,
            'counts' => [
                'drivers' => $driversCount,
                'students' => $studentsCount,
                'passengers' => $passengersCount,
            ],
            'revenue_trend' => $revenueTrend,
            'recent_transactions' => $recentTransactions,
            'whatsapp_status' => [
                'connected' => !empty($admin->adminSettings?->whatsapp_sender_phone),
                'sender_phone' => $admin->adminSettings?->whatsapp_sender_phone,
            ],
            'created_at' => $admin->created_at,
            'last_login' => $admin->updated_at,
        ], 'Admin details retrieved successfully');
    }

    /**
     * Toggle active status. Revoke Sanctum tokens if deactivating.
     */
    public function toggleAdminStatus($id): JsonResponse
    {
        $admin = User::where('role', 'admin')->findOrFail($id);

        $admin->is_active = !$admin->is_active;
        $admin->save();

        if (!$admin->is_active) {
            $admin->tokens()->delete();
        }

        $status = $admin->is_active ? 'activated' : 'deactivated';

        return $this->successResponse(
            new UserResource($admin),
            "Admin {$status} successfully"
        );
    }

    /**
     * Get platform-wide revenue trend for last 12 months.
     */
    public function monthlyRevenueTrend(): JsonResponse
    {
        $startDate = now()->subMonths(11)->startOfMonth();
        $transactions = Transaction::where('created_at', '>=', $startDate)
            ->get(['amount', 'created_at']);

        $trend = [];
        for ($i = 11; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthKey = $date->format('Y-m');
            $monthLabel = $date->format('M Y');
            $trend[$monthKey] = [
                'month' => $monthLabel,
                'revenue' => 0.0,
                'transactions' => 0,
            ];
        }

        foreach ($transactions as $tx) {
            $key = $tx->created_at->format('Y-m');
            if (isset($trend[$key])) {
                $trend[$key]['revenue'] += (float)$tx->amount;
                $trend[$key]['transactions']++;
            }
        }

        return $this->successResponse(array_values($trend), 'Monthly revenue trend retrieved');
    }

    /**
     * Get revenue trend for specific admin for last 6 months.
     */
    public function adminRevenueTrend($id): JsonResponse
    {
        // Verify user exists and is admin
        User::where('role', 'admin')->findOrFail($id);

        $startDate = now()->subMonths(5)->startOfMonth();
        $transactions = Transaction::where('admin_id', $id)
            ->where('created_at', '>=', $startDate)
            ->get(['amount', 'created_at']);

        $trend = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthKey = $date->format('Y-m');
            $monthLabel = $date->format('M Y');
            $trend[$monthKey] = [
                'month' => $monthLabel,
                'revenue' => 0.0,
                'transactions' => 0,
            ];
        }

        foreach ($transactions as $tx) {
            $key = $tx->created_at->format('Y-m');
            if (isset($trend[$key])) {
                $trend[$key]['revenue'] += (float)$tx->amount;
                $trend[$key]['transactions']++;
            }
        }

        return $this->successResponse(array_values($trend), 'Admin revenue trend retrieved');
    }
}

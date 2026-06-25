<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DueController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\PassengerController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VehicleController;
use App\Http\Controllers\Api\WhatsappController;
use App\Http\Controllers\Api\SuperAdminController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\UserPortalController;
use App\Http\Controllers\Api\ReportsController;
use App\Http\Controllers\Api\DriverLeaveController;
use App\Http\Controllers\Api\DriverWageAdjustmentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| These routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group.
|
*/

// ─── 0. Health Check ───────────────────────────────────────────────────────
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()->toISOString()]);
});

// ─── 1. Public Routes (No Auth) ────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
});

Route::post('/whatsapp/status-update', [WhatsappController::class, 'statusUpdate']);

// ─── 2. Protected Routes (Require Sanctum Auth) ────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth routes available to all authenticated users
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::patch('/change-password', [AuthController::class, 'changePassword']);
    });

    // ─── Super Admin Only ───────────────────────────────────────────────
    Route::middleware('super_admin')->prefix('auth')->group(function () {
        Route::post('/create-admin', [AuthController::class, 'createAdmin']);
    });

    // ─── Admin Only ─────────────────────────────────────────────────────
    Route::middleware('admin')->prefix('auth')->group(function () {
        Route::post('/create-user', [AuthController::class, 'createUser']);
    });

    // ─── Admin or Super Admin Routes ────────────────────────────────────
    Route::middleware('admin_or_super')->group(function () {

        // Transactions
        Route::get('/transactions', [TransactionController::class, 'index']);
        Route::post('/transactions', [TransactionController::class, 'store']);
        Route::get('/transactions/{id}', [TransactionController::class, 'show']);
        Route::delete('/transactions/{id}', [TransactionController::class, 'destroy']);

        // Dues
        Route::get('/dues', [DueController::class, 'index']);
        Route::get('/dues/summary', [DueController::class, 'summary']);
        Route::post('/dues/generate-monthly', [DueController::class, 'generateMonthlyDues']);
        Route::post('/dues/generate-daily', [DueController::class, 'generateDailyDues']);
        Route::post('/dues/{id}/mark-paid', [DueController::class, 'markAsPaid']);

        // Vehicles
        Route::apiResource('vehicles', VehicleController::class);
        Route::get('/vehicles/{id}/current-driver', [VehicleController::class, 'currentDriver']);
        Route::get('/vehicles/{id}/current-students', [VehicleController::class, 'currentStudents']);
        Route::get('/vehicles/{id}/logs', [VehicleController::class, 'logs']);

        // Drivers
        Route::apiResource('drivers', DriverController::class);
        Route::post('/drivers/{id}/assign', [DriverController::class, 'assign']);
        Route::post('/drivers/{id}/relieve', [DriverController::class, 'relieve']);
        Route::get('/drivers/{driver_id}/leaves', [DriverLeaveController::class, 'getLeaves']);
        Route::post('/drivers/leaves', [DriverLeaveController::class, 'store']);
        Route::delete('/drivers/leaves/{id}', [DriverLeaveController::class, 'destroy']);
        Route::get('/drivers/{driver_id}/wage-adjustments', [DriverWageAdjustmentController::class, 'getAdjustments']);
        Route::post('/drivers/wage-adjustments', [DriverWageAdjustmentController::class, 'store']);

        // Students
        Route::apiResource('students', StudentController::class);
        Route::post('/students/{id}/assign', [StudentController::class, 'assign']);
        Route::post('/students/{id}/remove', [StudentController::class, 'remove']);
        Route::get('/students/{id}/assignments', [StudentController::class, 'assignments']);
        Route::get('/students/{id}/dues', [StudentController::class, 'dues']);

        // Passengers
        Route::apiResource('passengers', PassengerController::class);
        Route::get('/passengers/{id}/dues', [PassengerController::class, 'dues']);

        // Users (parent list for dropdown)
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);

        // WhatsApp settings/status
        Route::post('/whatsapp/connect', [WhatsappController::class, 'connect']);
        Route::post('/whatsapp/disconnect', [WhatsappController::class, 'disconnect']);
        Route::get('/whatsapp/status', [WhatsappController::class, 'connectionStatus']);
        Route::get('/whatsapp/logs', [WhatsappController::class, 'getLogs']);
        Route::get('/settings', [WhatsappController::class, 'getSettings']);
        Route::patch('/settings', [WhatsappController::class, 'updateSettings']);
    });
});

// ─── 3. Super Admin Dashboard (Require Sanctum & Super Admin) ────────────────
Route::middleware(['auth:sanctum', 'super_admin'])->prefix('super-admin')->group(function () {
    Route::get('/stats', [SuperAdminController::class, 'platformStats']);
    Route::get('/admins', [SuperAdminController::class, 'adminsList']);
    Route::get('/admins/{id}', [SuperAdminController::class, 'adminDetail']);
    Route::patch('/admins/{id}/toggle-status', [SuperAdminController::class, 'toggleAdminStatus']);
    Route::get('/revenue-trend', [SuperAdminController::class, 'monthlyRevenueTrend']);
    Route::get('/admins/{id}/revenue-trend', [SuperAdminController::class, 'adminRevenueTrend']);
});

// ─── 4. Admin Dashboard (Require Sanctum & Admin) ────────────────────────────
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin-dashboard')->group(function () {
    Route::get('/summary', [AdminDashboardController::class, 'summary']);
    Route::get('/recent-transactions', [AdminDashboardController::class, 'recentTransactions']);
    Route::get('/pending-dues', [AdminDashboardController::class, 'pendingDues']);
    Route::get('/monthly-revenue', [AdminDashboardController::class, 'monthlyRevenue']);
    Route::get('/vehicle-performance', [AdminDashboardController::class, 'vehiclePerformance']);
});

// ─── 5. User Portal (Require Sanctum & role: user) ───────────────────────────
Route::middleware(['auth:sanctum'])->prefix('portal')->group(function () {
    Route::get('/profile', [UserPortalController::class, 'myProfile']);
    Route::get('/payments', [UserPortalController::class, 'myPayments']);
    Route::get('/dues', [UserPortalController::class, 'myDues']);
    Route::get('/students/{id}', [UserPortalController::class, 'studentDetail']);
});

// ─── 6. Reports (Require Sanctum & admin or super admin) ─────────────────────
Route::middleware(['auth:sanctum', 'admin_or_super'])->prefix('reports')->group(function () {
    Route::get('/monthly-collection', [ReportsController::class, 'monthlyCollectionReport']);
    Route::get('/dues', [ReportsController::class, 'dueReport']);
    Route::get('/vehicle-summary', [ReportsController::class, 'vehicleSummaryReport']);
    Route::get('/driver-wages', [ReportsController::class, 'driverWageReport']);
});

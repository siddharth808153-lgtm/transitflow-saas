<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DueController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\PassengerController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VehicleController;
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

// ─── Public Routes (No Auth) ────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// ─── Protected Routes (Require Sanctum Auth) ────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth routes available to all authenticated users
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });

    // ─── Super Admin Only ───────────────────────────────────────────────
    Route::middleware('super_admin')->prefix('auth')->group(function () {
        Route::post('/create-admin', [AuthController::class, 'createAdmin']);
        Route::get('/admins', [AuthController::class, 'listAdmins']);
        Route::patch('/admins/{id}/toggle-status', [AuthController::class, 'toggleAdminStatus']);
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

        // Students
        Route::apiResource('students', StudentController::class);
        Route::post('/students/{id}/assign', [StudentController::class, 'assign']);
        Route::post('/students/{id}/remove', [StudentController::class, 'remove']);
        Route::get('/students/{id}/assignments', [StudentController::class, 'assignments']);
        Route::get('/students/{id}/dues', [StudentController::class, 'dues']);

        // Passengers
        Route::apiResource('passengers', PassengerController::class);
        Route::get('/passengers/{id}/dues', [PassengerController::class, 'dues']);

        // Users list (for parent dropdown)
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
    });
});

<?php

use App\Http\Controllers\Api\AuthController;
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
});

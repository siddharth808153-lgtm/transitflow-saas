<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Jobs\SendWelcomeWhatsappJob;
use App\Models\AdminSetting;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponse;

    /**
     * Login a user via phone + password.
     * Returns a Sanctum token for API authentication.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'phone'    => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('phone', $request->phone)
            ->where('is_active', true)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return $this->errorResponse('Invalid credentials or account is deactivated.', 401);
        }

        // Single session: delete all existing tokens for this user
        $user->tokens()->delete();

        // Create a new Sanctum token
        $token = $user->createToken('auth-token')->plainTextToken;

        return $this->successResponse([
            'user'       => new UserResource($user),
            'token'      => $token,
            'token_type' => 'Bearer',
        ], 'Login successful');
    }

    /**
     * Register a new admin account (public self-registration).
     */
    public function register(Request $request): JsonResponse
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'phone'    => 'required|string|unique:users,phone',
            'email'    => 'nullable|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $admin = User::create([
            'name'      => $request->name,
            'phone'     => $request->phone,
            'email'     => $request->email,
            'password'  => Hash::make($request->password),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        // Create a blank AdminSetting record for this admin
        AdminSetting::create([
            'admin_id' => $admin->id,
        ]);

        // Auto-login: create a Sanctum token
        $token = $admin->createToken('auth-token')->plainTextToken;

        return $this->successResponse([
            'user'       => new UserResource($admin),
            'token'      => $token,
            'token_type' => 'Bearer',
        ], 'Registration successful', 201);
    }

    /**
     * Logout the authenticated user by deleting the current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->successResponse(null, 'Logged out successfully');
    }

    /**
     * Get the authenticated user's profile.
     * If admin, also returns their admin_settings.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = [
            'user' => new UserResource($user),
        ];

        // If the user is an admin, include their settings
        if ($user->role === 'admin') {
            $user->load('adminSettings');
            $data['settings'] = $user->adminSettings;
        }

        return $this->successResponse($data, 'Profile retrieved');
    }

    /**
     * Create a new admin account. (Super Admin only)
     */
    public function createAdmin(Request $request): JsonResponse
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'phone'    => 'required|string|unique:users,phone',
            'email'    => 'nullable|email|unique:users,email',
            'password' => 'required|string|min:8',
        ]);

        $admin = User::create([
            'name'       => $request->name,
            'phone'      => $request->phone,
            'email'      => $request->email,
            'password'   => Hash::make($request->password),
            'role'       => 'admin',
            'is_active'  => true,
            'created_by' => auth()->id(),
        ]);

        // Create a blank AdminSetting record for this admin
        AdminSetting::create([
            'admin_id' => $admin->id,
        ]);

        // Dispatch welcome WhatsApp job (placeholder)
        SendWelcomeWhatsappJob::dispatch($admin);

        return $this->successResponse([
            'user' => new UserResource($admin),
        ], 'Admin created successfully', 201);
    }

    /**
     * Create a new user (parent/passenger) under the current admin. (Admin only)
     */
    public function createUser(Request $request): JsonResponse
    {
        $request->validate([
            'name'     => 'required|string|max:255',
            'phone'    => 'required|string|unique:users,phone',
            'email'    => 'nullable|email|unique:users,email',
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name'       => $request->name,
            'phone'      => $request->phone,
            'email'      => $request->email,
            'password'   => Hash::make($request->password),
            'role'       => 'user',
            'is_active'  => true,
            'created_by' => auth()->id(),
        ]);

        return $this->successResponse([
            'user' => new UserResource($user),
        ], 'User created successfully', 201);
    }

    /**
     * List all admins with counts of vehicles, drivers, students. (Super Admin only)
     */
    public function listAdmins(Request $request): JsonResponse
    {
        $admins = User::where('role', 'admin')
            ->withCount(['vehicles', 'drivers', 'students'])
            ->paginate(20);

        return $this->successResponse([
            'admins' => UserResource::collection($admins),
            'pagination' => [
                'current_page' => $admins->currentPage(),
                'last_page'    => $admins->lastPage(),
                'per_page'     => $admins->perPage(),
                'total'        => $admins->total(),
            ],
        ], 'Admins retrieved');
    }

    /**
     * Toggle an admin's active status. If deactivating, revoke all their tokens. (Super Admin only)
     */
    public function toggleAdminStatus(Request $request, int $id): JsonResponse
    {
        $admin = User::where('role', 'admin')->findOrFail($id);

        // Flip the is_active boolean
        $admin->is_active = !$admin->is_active;
        $admin->save();

        // If deactivating, revoke all their Sanctum tokens
        if (!$admin->is_active) {
            $admin->tokens()->delete();
        }

        $status = $admin->is_active ? 'activated' : 'deactivated';

        return $this->successResponse([
            'user'      => new UserResource($admin),
            'is_active' => $admin->is_active,
        ], "Admin {$status} successfully");
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'old_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->old_password, $user->password)) {
            return $this->errorResponse('The provided current password does not match your record.', 422);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return $this->successResponse(null, 'Password changed successfully');
    }

    /**
     * Impersonate a user.
     */
    public function impersonate(Request $request, $id): JsonResponse
    {
        $targetUser = User::findOrFail($id);
        $currentUser = auth()->user();

        // 1. Super Admin can impersonate any Admin or User
        // 2. Admin can impersonate any User created by them
        if ($currentUser->role === 'super_admin') {
            if ($targetUser->role === 'super_admin') {
                return $this->errorResponse('Super Admins cannot impersonate other Super Admins.', 403);
            }
        } elseif ($currentUser->role === 'admin') {
            if ($targetUser->role !== 'user' || $targetUser->created_by !== $currentUser->id) {
                return $this->errorResponse('Unauthorized to impersonate this user.', 403);
            }
        } else {
            return $this->errorResponse('Unauthorized.', 403);
        }

        // Revoke target user's existing tokens
        $targetUser->tokens()->delete();

        // Create a new token for the target user
        $token = $targetUser->createToken('impersonate-token')->plainTextToken;

        return $this->successResponse([
            'user'       => new UserResource($targetUser),
            'token'      => $token,
            'token_type' => 'Bearer',
        ], 'Impersonation successful');
    }
}

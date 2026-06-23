<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of users.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if (auth()->user()->role === 'admin') {
            $query->where('created_by', auth()->id());
        }

        $users = $query->get();

        return $this->successResponse($users, 'Users retrieved successfully');
    }

    /**
     * Store a newly created user (parent/passenger) in storage.
     */
    public function store(Request $request): JsonResponse
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

        return $this->successResponse($user, 'User created successfully', 201);
    }
}

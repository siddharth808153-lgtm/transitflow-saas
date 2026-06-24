<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of users (parents) created by this admin.
     * Used for parent dropdown in student form.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::where('role', 'user')
            ->where('created_by', auth()->id());

        // Filter by search (name or phone)
        if ($request->has('search') && $request->search !== '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('phone', 'like', '%' . $search . '%');
            });
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
            'password' => 'required|string|min:6',
        ]);

        $plainPassword = $request->password;

        $user = User::create([
            'name'       => $request->name,
            'phone'      => $request->phone,
            'password'   => Hash::make($plainPassword),
            'role'       => 'user',
            'is_active'  => true,
            'created_by' => auth()->id(),
        ]);

        // Return user with one-time generated password shown in response
        $userData = $user->toArray();
        $userData['generated_password'] = $plainPassword;

        return $this->successResponse($userData, 'User created successfully', 201);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AutoPassenger;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PassengerController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of passengers.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AutoPassenger::query()->with('vehicle');

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $passengers = $query->get();

        return $this->successResponse($passengers, 'Passengers retrieved successfully');
    }

    /**
     * Store a newly created passenger in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'phone'      => 'required|string|max:20',
            'vehicle_id' => 'required|exists:vehicles,id',
            'daily_fare' => 'required|numeric|min:0',
            'user_id'    => 'nullable|exists:users,id',
            'is_active'  => 'nullable|boolean',
        ]);

        $validated['admin_id'] = auth()->id();
        $validated['is_active'] = $validated['is_active'] ?? true;

        $passenger = AutoPassenger::create($validated);

        return $this->successResponse($passenger, 'Passenger created successfully', 201);
    }

    /**
     * Display the specified passenger.
     */
    public function show($id): JsonResponse
    {
        $query = AutoPassenger::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $passenger = $query->findOrFail($id);

        $passenger->load(['vehicle', 'user']);

        // Attach recent transactions
        $passenger->transactions = $passenger->admin->transactions()
            ->where('reference_type', 'auto_passenger')
            ->where('reference_id', $id)
            ->latest()
            ->take(10)
            ->get();

        return $this->successResponse($passenger, 'Passenger details retrieved successfully');
    }

    /**
     * Update the specified passenger in storage.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $query = AutoPassenger::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $passenger = $query->findOrFail($id);

        $validated = $request->validate([
            'name'       => 'sometimes|required|string|max:255',
            'phone'      => 'sometimes|required|string|max:20',
            'vehicle_id' => 'sometimes|required|exists:vehicles,id',
            'daily_fare' => 'sometimes|required|numeric|min:0',
            'user_id'    => 'nullable|exists:users,id',
            'is_active'  => 'sometimes|required|boolean',
        ]);

        $passenger->update($validated);

        return $this->successResponse($passenger, 'Passenger details updated successfully');
    }

    /**
     * Remove the specified passenger from storage.
     */
    public function destroy($id): JsonResponse
    {
        $query = AutoPassenger::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $passenger = $query->findOrFail($id);
        $passenger->delete();

        return $this->successResponse(null, 'Passenger deleted successfully');
    }

    /**
     * Get dues for the specified passenger.
     */
    public function dues($id): JsonResponse
    {
        $query = AutoPassenger::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $passenger = $query->findOrFail($id);

        $dues = $passenger->admin->dues()
            ->where('reference_type', 'auto_passenger')
            ->where('reference_id', $id)
            ->latest()
            ->get();

        return $this->successResponse($dues, 'Passenger dues retrieved successfully');
    }
}

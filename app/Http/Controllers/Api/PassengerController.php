<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AutoPassenger;
use App\Models\Due;
use App\Models\Vehicle;
use App\Models\VehicleLog;
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
        $query = AutoPassenger::query()->with(['vehicle', 'user']);

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        // Filter by search (name)
        if ($request->has('search') && $request->search !== '') {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Filter by vehicle_id
        if ($request->has('vehicle_id') && $request->vehicle_id !== '') {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        // Filter by is_active
        if ($request->has('is_active') && $request->is_active !== '') {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $passengers = $query->paginate(20);

        return $this->successResponse([
            'data' => $passengers->items(),
            'pagination' => [
                'current_page' => $passengers->currentPage(),
                'last_page'    => $passengers->lastPage(),
                'per_page'     => $passengers->perPage(),
                'total'        => $passengers->total(),
            ]
        ], 'Passengers retrieved successfully');
    }

    /**
     * Store a newly created passenger in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'phone'      => 'required|string|unique:auto_passengers,phone',
            'vehicle_id' => 'required|exists:vehicles,id',
            'daily_fare' => 'required|numeric|min:0',
            'user_id'    => 'nullable|exists:users,id',
            'is_active'  => 'boolean',
        ]);

        // Check vehicle type = 'auto'
        $vehicle = Vehicle::findOrFail($validated['vehicle_id']);
        if ($vehicle->type !== 'auto') {
            return $this->errorResponse(
                'Passengers can only be assigned to auto-type vehicles, not buses.',
                422
            );
        }

        $validated['admin_id'] = auth()->id();
        $validated['is_active'] = $validated['is_active'] ?? true;

        $passenger = AutoPassenger::create($validated);

        // Log the addition
        VehicleLog::create([
            'admin_id'       => auth()->id(),
            'vehicle_id'     => $validated['vehicle_id'],
            'event_type'     => 'passenger_added',
            'reference_id'   => $passenger->id,
            'reference_type' => 'auto_passenger',
            'note'           => "Passenger '{$passenger->name}' was added to this vehicle.",
            'performed_by'   => auth()->id(),
        ]);

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

        // Log the removal
        VehicleLog::create([
            'admin_id'       => $passenger->admin_id,
            'vehicle_id'     => $passenger->vehicle_id,
            'event_type'     => 'passenger_removed',
            'reference_id'   => $passenger->id,
            'reference_type' => 'auto_passenger',
            'note'           => "Passenger '{$passenger->name}' was removed.",
            'performed_by'   => auth()->id(),
        ]);

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

        $dues = Due::where('reference_type', 'auto_passenger')
            ->where('reference_id', $id)
            ->with('transaction')
            ->orderBy('due_for_date', 'desc')
            ->get();

        return $this->successResponse($dues, 'Passenger dues retrieved successfully');
    }
}

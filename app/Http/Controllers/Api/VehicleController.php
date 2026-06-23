<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Models\VehicleLog;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of vehicles.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Vehicle::query()
            ->currentDriver()
            ->withCount(['studentAssignments' => function ($q) {
                $q->whereNull('removed_date');
            }]);

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $vehicles = $query->paginate(20);

        return $this->successResponse([
            'vehicles' => $vehicles->items(),
            'pagination' => [
                'current_page' => $vehicles->currentPage(),
                'last_page'    => $vehicles->lastPage(),
                'per_page'     => $vehicles->perPage(),
                'total'        => $vehicles->total(),
            ]
        ], 'Vehicles retrieved successfully');
    }

    /**
     * Store a newly created vehicle in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'type'       => 'required|string|in:bus,auto',
            'wage_type'  => 'required|string|in:monthly,daily',
            'capacity'   => 'required|integer|min:1',
            'is_active'  => 'nullable|boolean',
        ]);

        $validated['admin_id'] = auth()->id();
        $validated['is_active'] = $validated['is_active'] ?? true;

        $vehicle = Vehicle::create($validated);

        // Log the creation
        VehicleLog::create([
            'admin_id'     => $vehicle->admin_id,
            'vehicle_id'   => $vehicle->id,
            'event_type'   => 'vehicle_created',
            'note'         => "Vehicle '{$vehicle->name}' was created.",
            'performed_by' => auth()->id(),
        ]);

        return $this->successResponse($vehicle, 'Vehicle created successfully', 201);
    }

    /**
     * Display the specified vehicle.
     */
    public function show($id): JsonResponse
    {
        $query = Vehicle::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $vehicle = $query->findOrFail($id);

        $vehicle->load([
            'driverAssignments' => function ($q) {
                $q->whereNull('relieved_date')->with('driver');
            },
            'studentAssignments' => function ($q) {
                $q->whereNull('removed_date')->with('student.user');
            },
            'autoPassengers' => function ($q) {
                $q->where('is_active', true);
            }
        ]);

        return $this->successResponse($vehicle, 'Vehicle details retrieved successfully');
    }

    /**
     * Update the specified vehicle in storage.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $query = Vehicle::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $vehicle = $query->findOrFail($id);

        $validated = $request->validate([
            'name'       => 'sometimes|required|string|max:255',
            'type'       => 'sometimes|required|string|in:bus,auto',
            'wage_type'  => 'sometimes|required|string|in:monthly,daily',
            'capacity'   => 'sometimes|required|integer|min:1',
            'is_active'  => 'sometimes|required|boolean',
        ]);

        $vehicle->update($validated);

        // Log the update
        VehicleLog::create([
            'admin_id'     => $vehicle->admin_id,
            'vehicle_id'   => $vehicle->id,
            'event_type'   => 'vehicle_updated',
            'note'         => "Vehicle '{$vehicle->name}' details were updated.",
            'performed_by' => auth()->id(),
        ]);

        return $this->successResponse($vehicle, 'Vehicle updated successfully');
    }

    /**
     * Remove the specified vehicle from storage (Soft Delete).
     */
    public function destroy($id): JsonResponse
    {
        $query = Vehicle::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $vehicle = $query->findOrFail($id);
        $vehicle->delete();

        // Log the deletion
        VehicleLog::create([
            'admin_id'     => $vehicle->admin_id,
            'vehicle_id'   => $id,
            'event_type'   => 'vehicle_deleted',
            'note'         => "Vehicle '{$vehicle->name}' was deleted.",
            'performed_by' => auth()->id(),
        ]);

        return $this->successResponse(null, 'Vehicle deleted successfully');
    }

    /**
     * Get the current driver of the vehicle.
     */
    public function currentDriver($id): JsonResponse
    {
        $query = Vehicle::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $vehicle = $query->findOrFail($id);

        $activeAssignment = $vehicle->driverAssignments()
            ->whereNull('relieved_date')
            ->with('driver')
            ->first();

        return $this->successResponse($activeAssignment ? $activeAssignment->driver : null, 'Current driver retrieved');
    }

    /**
     * Get the current active students assigned to this vehicle.
     */
    public function currentStudents($id): JsonResponse
    {
        $query = Vehicle::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $vehicle = $query->findOrFail($id);

        $students = $vehicle->studentAssignments()
            ->whereNull('removed_date')
            ->with('student.user')
            ->get()
            ->pluck('student');

        return $this->successResponse($students, 'Current students retrieved');
    }

    /**
     * Get the logs for this vehicle.
     */
    public function logs($id): JsonResponse
    {
        $query = Vehicle::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $vehicle = $query->findOrFail($id);

        $logs = $vehicle->vehicleLogs()
            ->with('performedBy')
            ->latest()
            ->get();

        return $this->successResponse($logs, 'Vehicle logs retrieved');
    }
}

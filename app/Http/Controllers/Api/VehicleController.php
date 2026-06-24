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
            ->with(['driverAssignments' => function ($q) {
                $q->whereNull('relieved_date')->with('driver');
            }])
            ->withCount(['studentAssignments' => function ($q) {
                $q->whereNull('removed_date');
            }]);

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        // Filter by type
        if ($request->has('type') && $request->type !== '') {
            $query->where('type', $request->type);
        }

        // Filter by is_active
        if ($request->has('is_active') && $request->is_active !== '') {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        // Filter by search (name)
        if ($request->has('search') && $request->search !== '') {
            $query->where('name', 'like', '%' . $request->search . '%');
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
        // Enforce admin only
        if (auth()->user()->role !== 'admin') {
            return $this->errorResponse('Access denied. Admins only.', 403);
        }

        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'type'       => 'required|string|in:auto,bus',
            'wage_type'  => 'required|string|in:daily,monthly',
            'capacity'   => 'nullable|integer|min:1',
            'is_active'  => 'boolean',
        ]);

        $validated['admin_id'] = auth()->id();
        $validated['is_active'] = $validated['is_active'] ?? true;

        $vehicle = Vehicle::create($validated);

        // Log the creation as vehicle_activated
        VehicleLog::create([
            'admin_id'     => $vehicle->admin_id,
            'vehicle_id'   => $vehicle->id,
            'event_type'   => 'vehicle_activated',
            'note'         => "Vehicle '{$vehicle->name}' was created and activated.",
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
            'admin.adminSettings',
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
            'name'       => 'nullable|string|max:255',
            'type'       => 'nullable|string|in:auto,bus',
            'wage_type'  => 'nullable|string|in:daily,monthly',
            'capacity'   => 'nullable|integer|min:1',
            'is_active'  => 'nullable|boolean',
        ]);

        // Filter out null values to allow partial updates
        $validated = array_filter($validated, fn($v) => $v !== null);

        $oldIsActive = $vehicle->is_active;

        $vehicle->update($validated);

        // Log is_active status changes
        if (isset($validated['is_active'])) {
            $newIsActive = (bool)$validated['is_active'];
            if ($oldIsActive && !$newIsActive) {
                VehicleLog::create([
                    'admin_id'     => $vehicle->admin_id,
                    'vehicle_id'   => $vehicle->id,
                    'event_type'   => 'vehicle_deactivated',
                    'note'         => "Vehicle '{$vehicle->name}' was deactivated.",
                    'performed_by' => auth()->id(),
                ]);
            } elseif (!$oldIsActive && $newIsActive) {
                VehicleLog::create([
                    'admin_id'     => $vehicle->admin_id,
                    'vehicle_id'   => $vehicle->id,
                    'event_type'   => 'vehicle_activated',
                    'note'         => "Vehicle '{$vehicle->name}' was activated.",
                    'performed_by' => auth()->id(),
                ]);
            }
        }

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

        // Check for active driver assignment
        $hasActiveDriver = $vehicle->driverAssignments()
            ->whereNull('relieved_date')
            ->exists();

        if ($hasActiveDriver) {
            return $this->errorResponse(
                'Cannot delete vehicle with an active driver. Please relieve the driver first.',
                422
            );
        }

        // Check for active student assignments
        $hasActiveStudents = $vehicle->studentAssignments()
            ->whereNull('removed_date')
            ->exists();

        if ($hasActiveStudents) {
            return $this->errorResponse(
                'Cannot delete vehicle with active students. Please remove students first.',
                422
            );
        }

        $vehicle->delete();

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

        return $this->successResponse($activeAssignment, 'Current driver retrieved');
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

        $assignments = $vehicle->studentAssignments()
            ->whereNull('removed_date')
            ->with('student.user')
            ->get();

        return $this->successResponse($assignments, 'Current students retrieved');
    }

    /**
     * Get the logs for this vehicle.
     */
    public function logs(Request $request, $id): JsonResponse
    {
        $query = Vehicle::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $vehicle = $query->findOrFail($id);

        $logsQuery = $vehicle->vehicleLogs()
            ->with('performedBy')
            ->latest();

        // Optional filter by event_type
        if ($request->has('event_type') && $request->event_type !== '') {
            $logsQuery->where('event_type', $request->event_type);
        }

        $logs = $logsQuery->paginate(20);

        return $this->successResponse([
            'logs' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'per_page'     => $logs->perPage(),
                'total'        => $logs->total(),
            ]
        ], 'Vehicle logs retrieved');
    }
}

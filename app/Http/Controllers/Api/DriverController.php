<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\DriverAssignment;
use App\Models\Vehicle;
use App\Models\VehicleLog;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DriverController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of drivers.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Driver::query()->with(['driverAssignments' => function ($q) {
            $q->whereNull('relieved_date')->with('vehicle');
        }]);

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        // Filter by is_active
        if ($request->has('is_active') && $request->is_active !== '') {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        // Filter by search (name or phone)
        if ($request->has('search') && $request->search !== '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('phone', 'like', '%' . $search . '%');
            });
        }

        // Filter by assigned (true = currently assigned, false = unassigned)
        if ($request->has('assigned') && $request->assigned !== '') {
            $assigned = filter_var($request->assigned, FILTER_VALIDATE_BOOLEAN);
            if ($assigned) {
                $query->whereHas('driverAssignments', function ($q) {
                    $q->whereNull('relieved_date');
                });
            } else {
                $query->whereDoesntHave('driverAssignments', function ($q) {
                    $q->whereNull('relieved_date');
                });
            }
        }

        $drivers = $query->paginate(20);

        return $this->successResponse([
            'drivers' => $drivers->items(),
            'pagination' => [
                'current_page' => $drivers->currentPage(),
                'last_page'    => $drivers->lastPage(),
                'per_page'     => $drivers->perPage(),
                'total'        => $drivers->total(),
            ]
        ], 'Drivers retrieved successfully');
    }

    /**
     * Store a newly created driver in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255',
            'phone'          => 'required|string|unique:drivers,phone',
            'license_number' => 'nullable|string|max:50',
            'daily_wage'     => 'nullable|numeric|min:0',
            'is_active'      => 'boolean',
        ]);

        $validated['admin_id'] = auth()->id();
        $validated['is_active'] = $validated['is_active'] ?? true;

        $driver = Driver::create($validated);

        return $this->successResponse($driver, 'Driver created successfully', 201);
    }

    /**
     * Display the specified driver.
     */
    public function show($id): JsonResponse
    {
        $query = Driver::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $driver = $query->findOrFail($id);

        $driver->load(['driverAssignments' => function ($q) {
            $q->with('vehicle')->orderBy('assigned_date', 'desc');
        }]);

        return $this->successResponse($driver, 'Driver details retrieved successfully');
    }

    /**
     * Update the specified driver in storage.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $query = Driver::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $driver = $query->findOrFail($id);

        $validated = $request->validate([
            'name'           => 'nullable|string|max:255',
            'phone'          => 'nullable|string|max:20',
            'license_number' => 'nullable|string|max:50',
            'daily_wage'     => 'nullable|numeric|min:0',
            'is_active'      => 'nullable|boolean',
        ]);

        // Filter null values for partial update
        $validated = array_filter($validated, fn($v) => $v !== null);

        $driver->update($validated);

        return $this->successResponse($driver, 'Driver updated successfully');
    }

    /**
     * Remove the specified driver from storage (Soft Delete).
     */
    public function destroy($id): JsonResponse
    {
        $query = Driver::query();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
        }

        $driver = $query->findOrFail($id);

        // Check for active assignment
        if ($driver->isCurrentlyAssigned()) {
            return $this->errorResponse(
                'Cannot delete driver currently assigned to a vehicle.',
                422
            );
        }

        $driver->delete();

        return $this->successResponse(null, 'Driver deleted successfully');
    }

    /**
     * Assign driver to a vehicle.
     */
    public function assign(Request $request, $id): JsonResponse
    {
        $driverQuery = Driver::query();
        if (auth()->user()->role === 'admin') {
            $driverQuery->where('admin_id', auth()->id());
        }
        $driver = $driverQuery->findOrFail($id);

        $request->validate([
            'vehicle_id'    => 'required|exists:vehicles,id',
            'assigned_date' => 'required|date',
        ]);

        // Check vehicle belongs to auth admin
        $vehicleQuery = Vehicle::query();
        if (auth()->user()->role === 'admin') {
            $vehicleQuery->where('admin_id', auth()->id());
        }
        $vehicle = $vehicleQuery->findOrFail($request->vehicle_id);

        // Check if the vehicle already has an active driver
        $activeVehicleAssignment = DriverAssignment::where('vehicle_id', $request->vehicle_id)
            ->whereNull('relieved_date')
            ->first();

        if ($activeVehicleAssignment) {
            return $this->errorResponse(
                'This vehicle already has an active driver. Please relieve the current driver first.',
                422
            );
        }

        // Check if driver already has an active assignment
        $activeDriverAssignment = DriverAssignment::where('driver_id', $id)
            ->whereNull('relieved_date')
            ->first();

        if ($activeDriverAssignment) {
            return $this->errorResponse(
                'This driver is already assigned to a vehicle. Please relieve them first.',
                422
            );
        }

        // Create new assignment
        $assignment = DriverAssignment::create([
            'driver_id'     => $driver->id,
            'vehicle_id'    => $request->vehicle_id,
            'admin_id'      => auth()->id(),
            'assigned_date' => $request->assigned_date,
            'assigned_by'   => auth()->id(),
        ]);

        // Log the assignment
        VehicleLog::create([
            'admin_id'       => auth()->id(),
            'vehicle_id'     => $request->vehicle_id,
            'event_type'     => 'driver_assigned',
            'reference_id'   => $driver->id,
            'reference_type' => 'driver',
            'note'           => "Driver '{$driver->name}' was assigned to this vehicle.",
            'performed_by'   => auth()->id(),
        ]);

        $assignment->load(['driver', 'vehicle']);

        return $this->successResponse($assignment, 'Driver assigned successfully');
    }

    /**
     * Relieve the driver from their active vehicle assignment.
     */
    public function relieve(Request $request, $id): JsonResponse
    {
        $driverQuery = Driver::query();
        if (auth()->user()->role === 'admin') {
            $driverQuery->where('admin_id', auth()->id());
        }
        $driver = $driverQuery->findOrFail($id);

        $request->validate([
            'relieved_date'     => 'required|date',
            'reason_for_change' => 'nullable|string|max:255',
        ]);

        $activeAssignment = DriverAssignment::where('driver_id', $id)
            ->whereNull('relieved_date')
            ->first();

        if (!$activeAssignment) {
            return $this->errorResponse('Driver has no active assignment', 404);
        }

        $activeAssignment->update([
            'relieved_date'     => $request->relieved_date,
            'reason_for_change' => $request->reason_for_change,
        ]);

        // Log the relief
        VehicleLog::create([
            'admin_id'       => $activeAssignment->admin_id,
            'vehicle_id'     => $activeAssignment->vehicle_id,
            'event_type'     => 'driver_relieved',
            'reference_id'   => $driver->id,
            'reference_type' => 'driver',
            'note'           => "Driver '{$driver->name}' was relieved: " . ($request->reason_for_change ?? 'No reason provided'),
            'performed_by'   => auth()->id(),
        ]);

        return $this->successResponse($activeAssignment, 'Driver relieved from vehicle assignment successfully');
    }
}

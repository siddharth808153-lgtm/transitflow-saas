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
        $query = Driver::query()->currentVehicle();

        if (auth()->user()->role === 'admin') {
            $query->where('admin_id', auth()->id());
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
            'phone'          => 'required|string|max:20',
            'license_number' => 'nullable|string|max:50',
            'daily_wage'     => 'required|numeric|min:0',
            'is_active'      => 'nullable|boolean',
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
            $q->with('vehicle')->latest();
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
            'name'           => 'sometimes|required|string|max:255',
            'phone'          => 'sometimes|required|string|max:20',
            'license_number' => 'nullable|string|max:50',
            'daily_wage'     => 'sometimes|required|numeric|min:0',
            'is_active'      => 'sometimes|required|boolean',
        ]);

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

        // Check if the vehicle already has an active driver
        $activeVehicleAssignment = DriverAssignment::where('vehicle_id', $request->vehicle_id)
            ->whereNull('relieved_date')
            ->first();

        if ($activeVehicleAssignment) {
            return $this->errorResponse('Vehicle already has an active driver', 422);
        }

        // Relieve any current active assignment of this driver
        $activeDriverAssignment = DriverAssignment::where('driver_id', $id)
            ->whereNull('relieved_date')
            ->first();

        if ($activeDriverAssignment) {
            $activeDriverAssignment->update([
                'relieved_date'     => $request->assigned_date,
                'reason_for_change' => 'Reassigned to another vehicle.',
            ]);

            VehicleLog::create([
                'admin_id'       => $activeDriverAssignment->admin_id,
                'vehicle_id'     => $activeDriverAssignment->vehicle_id,
                'event_type'     => 'driver_relieved',
                'reference_id'   => $driver->id,
                'reference_type' => 'driver',
                'note'           => "Driver '{$driver->name}' was relieved due to re-assignment.",
                'performed_by'   => auth()->id(),
            ]);
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
            return $this->errorResponse('Driver does not have any active vehicle assignment', 400);
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

        return $this->successResponse(null, 'Driver relieved from vehicle assignment successfully');
    }
}

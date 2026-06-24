<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\DriverLeave;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DriverLeaveController extends Controller
{
    use ApiResponse;

    /**
     * Get leaves for a specific driver.
     */
    public function getLeaves(Request $request, $driverId): JsonResponse
    {
        $driver = Driver::where('id', $driverId);

        if (auth()->user()->role === 'admin') {
            $driver->where('admin_id', auth()->id());
        }

        $driver = $driver->first();
        if (!$driver) {
            return $this->errorResponse('Driver not found', 404);
        }

        $leaves = DriverLeave::where('driver_id', $driverId)
            ->orderBy('date', 'desc')
            ->get();

        return $this->successResponse($leaves, 'Driver leaves retrieved successfully');
    }

    /**
     * Store a driver leave.
     */
    public function store(Request $request): JsonResponse
    {
        if (auth()->user()->role !== 'admin') {
            return $this->errorResponse('Access denied. Admins only.', 403);
        }

        $validated = $request->validate([
            'driver_id'  => 'required|exists:drivers,id',
            'date'        => 'required|date_format:Y-m-d',
            'leave_type'  => 'required|string|in:full,half',
            'notes'       => 'nullable|string|max:500',
        ]);

        // Verify driver belongs to admin
        $driver = Driver::where('id', $request->driver_id)
            ->where('admin_id', auth()->id())
            ->first();

        if (!$driver) {
            return $this->errorResponse('Driver not found or access denied.', 404);
        }

        // Check if leave already exists for this date and driver
        $exists = DriverLeave::where('driver_id', $request->driver_id)
            ->where('date', $request->date)
            ->exists();

        if ($exists) {
            return $this->errorResponse('A leave assignment already exists for this date.', 422);
        }

        $validated['admin_id'] = auth()->id();
        $leave = DriverLeave::create($validated);

        return $this->successResponse($leave, 'Driver leave logged successfully', 201);
    }

    /**
     * Delete a driver leave.
     */
    public function destroy($id): JsonResponse
    {
        if (auth()->user()->role !== 'admin') {
            return $this->errorResponse('Access denied. Admins only.', 403);
        }

        $leave = DriverLeave::where('id', $id)
            ->where('admin_id', auth()->id())
            ->first();

        if (!$leave) {
            return $this->errorResponse('Leave record not found or access denied.', 404);
        }

        $leave->delete();

        return $this->successResponse(null, 'Leave record deleted successfully');
    }
}

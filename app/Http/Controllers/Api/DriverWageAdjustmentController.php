<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\DriverWageAdjustment;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DriverWageAdjustmentController extends Controller
{
    use ApiResponse;

    /**
     * Get wage adjustments for a specific driver.
     */
    public function getAdjustments(Request $request, $driverId): JsonResponse
    {
        $driver = Driver::where('id', $driverId);

        if (auth()->user()->role === 'admin') {
            $driver->where('admin_id', auth()->id());
        }

        $driver = $driver->first();
        if (!$driver) {
            return $this->errorResponse('Driver not found', 404);
        }

        $adjustments = DriverWageAdjustment::where('driver_id', $driverId)
            ->orderBy('month', 'desc')
            ->get();

        return $this->successResponse($adjustments, 'Driver wage adjustments retrieved successfully');
    }

    /**
     * Store or update a driver wage adjustment.
     */
    public function store(Request $request): JsonResponse
    {
        if (auth()->user()->role !== 'admin') {
            return $this->errorResponse('Access denied. Admins only.', 403);
        }

        $request->validate([
            'driver_id'         => 'required|exists:drivers,id',
            'month'             => 'required|date_format:Y-m',
            'adjustment_amount' => 'required|numeric',
            'reason'            => 'nullable|string|max:500',
        ]);

        // Verify driver belongs to admin
        $driver = Driver::where('id', $request->driver_id)
            ->where('admin_id', auth()->id())
            ->first();

        if (!$driver) {
            return $this->errorResponse('Driver not found or access denied.', 404);
        }

        // Use updateOrCreate since driver_id + month is unique
        $adjustment = DriverWageAdjustment::updateOrCreate(
            [
                'driver_id' => $request->driver_id,
                'month'     => $request->month,
            ],
            [
                'admin_id'          => auth()->id(),
                'adjustment_amount' => $request->adjustment_amount,
                'reason'            => $request->reason,
            ]
        );

        return $this->successResponse($adjustment, 'Driver wage adjustment saved successfully', 200);
    }
}

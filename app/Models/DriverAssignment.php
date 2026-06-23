<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DriverAssignment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'driver_id',
        'vehicle_id',
        'admin_id',
        'assigned_date',
        'relieved_date',
        'reason_for_change',
        'assigned_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'assigned_date' => 'date',
            'relieved_date' => 'date',
        ];
    }

    // ─── Relationships ──────────────────────────────────────────────────

    /**
     * The driver being assigned.
     */
    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    /**
     * The vehicle the driver is assigned to.
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    /**
     * The admin under whom this assignment falls.
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * The user who made this assignment.
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    // ─── Scopes ─────────────────────────────────────────────────────────

    /**
     * Scope: only active assignments (relieved_date IS NULL).
     */
    public function scopeActive($query)
    {
        return $query->whereNull('relieved_date');
    }
}

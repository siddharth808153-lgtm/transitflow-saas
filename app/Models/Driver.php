<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Driver extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'admin_id',
        'name',
        'phone',
        'license_number',
        'daily_wage',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'daily_wage' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    // ─── Relationships ──────────────────────────────────────────────────

    /**
     * The admin who manages this driver.
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * All vehicle assignments for this driver.
     */
    public function driverAssignments(): HasMany
    {
        return $this->hasMany(DriverAssignment::class);
    }

    /**
     * All leaves for this driver.
     */
    public function leaves(): HasMany
    {
        return $this->hasMany(DriverLeave::class);
    }

    /**
     * All wage adjustments for this driver.
     */
    public function wageAdjustments(): HasMany
    {
        return $this->hasMany(DriverWageAdjustment::class);
    }

    // ─── Scopes ─────────────────────────────────────────────────────────

    /**
     * Scope: eager-load the current active vehicle assignment.
     */
    public function scopeCurrentVehicle($query)
    {
        return $query->with(['driverAssignments' => function ($q) {
            $q->whereNull('relieved_date');
        }]);
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    /**
     * Get the active assignment (relieved_date IS NULL).
     */
    public function getActiveAssignmentAttribute(): ?DriverAssignment
    {
        return $this->driverAssignments()->whereNull('relieved_date')->first();
    }

    /**
     * Check if the driver is currently assigned to any vehicle.
     */
    public function isCurrentlyAssigned(): bool
    {
        return $this->driverAssignments()->whereNull('relieved_date')->exists();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vehicle extends Model
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
        'type',
        'wage_type',
        'capacity',
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
            'is_active' => 'boolean',
        ];
    }

    // ─── Relationships ──────────────────────────────────────────────────

    /**
     * The admin who owns this vehicle.
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * Driver assignments for this vehicle.
     */
    public function driverAssignments(): HasMany
    {
        return $this->hasMany(DriverAssignment::class);
    }

    /**
     * Student assignments for this vehicle.
     */
    public function studentAssignments(): HasMany
    {
        return $this->hasMany(StudentAssignment::class);
    }

    /**
     * Auto passengers on this vehicle.
     */
    public function autoPassengers(): HasMany
    {
        return $this->hasMany(AutoPassenger::class);
    }

    /**
     * Transactions for this vehicle.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    /**
     * Dues for this vehicle.
     */
    public function dues(): HasMany
    {
        return $this->hasMany(Due::class);
    }

    /**
     * Vehicle logs (audit trail).
     */
    public function vehicleLogs(): HasMany
    {
        return $this->hasMany(VehicleLog::class);
    }

    // ─── Scopes ─────────────────────────────────────────────────────────

    /**
     * Get the currently active driver assignment (relieved_date IS NULL).
     */
    public function scopeCurrentDriver($query)
    {
        return $query->with(['driverAssignments' => function ($q) {
            $q->whereNull('relieved_date');
        }]);
    }

    /**
     * Get the currently active student assignments (removed_date IS NULL).
     */
    public function scopeCurrentStudents($query)
    {
        return $query->with(['studentAssignments' => function ($q) {
            $q->whereNull('removed_date');
        }]);
    }

    // ─── Accessors ──────────────────────────────────────────────────────

    /**
     * Get the current active driver assignment.
     */
    public function getActiveDriverAssignmentAttribute(): ?DriverAssignment
    {
        return $this->driverAssignments()->whereNull('relieved_date')->first();
    }

    /**
     * Get the currently active student assignments.
     */
    public function getActiveStudentAssignmentsAttribute()
    {
        return $this->studentAssignments()->whereNull('removed_date')->get();
    }
}

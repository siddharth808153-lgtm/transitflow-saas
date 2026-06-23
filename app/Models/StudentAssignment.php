<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentAssignment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'student_id',
        'vehicle_id',
        'admin_id',
        'monthly_fee',
        'assigned_date',
        'removed_date',
        'removal_reason',
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
            'monthly_fee' => 'decimal:2',
            'assigned_date' => 'date',
            'removed_date' => 'date',
        ];
    }

    // ─── Relationships ──────────────────────────────────────────────────

    /**
     * The student being assigned.
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * The vehicle (bus) the student is assigned to.
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
     * Scope: only active assignments (removed_date IS NULL).
     */
    public function scopeActive($query)
    {
        return $query->whereNull('removed_date');
    }
}

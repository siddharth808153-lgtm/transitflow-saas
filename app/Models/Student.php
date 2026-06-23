<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'admin_id',
        'student_name',
        'class',
        'section',
        'join_date',
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
            'join_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    // ─── Relationships ──────────────────────────────────────────────────

    /**
     * The parent user account.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * The admin who manages this student.
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * All vehicle assignments for this student.
     */
    public function studentAssignments(): HasMany
    {
        return $this->hasMany(StudentAssignment::class);
    }

    // ─── Scopes ─────────────────────────────────────────────────────────

    /**
     * Scope: eager-load the current active vehicle assignment.
     */
    public function scopeCurrentVehicle($query)
    {
        return $query->with(['studentAssignments' => function ($q) {
            $q->whereNull('removed_date');
        }]);
    }

    // ─── Accessors ──────────────────────────────────────────────────────

    /**
     * Get the active assignment (removed_date IS NULL).
     */
    public function getActiveAssignmentAttribute(): ?StudentAssignment
    {
        return $this->studentAssignments()->whereNull('removed_date')->first();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Due extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'admin_id',
        'vehicle_id',
        'reference_id',
        'reference_type',
        'due_amount',
        'due_for_month',
        'due_for_date',
        'is_paid',
        'paid_at',
        'transaction_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'due_amount' => 'decimal:2',
            'due_for_month' => 'date',
            'due_for_date' => 'date',
            'is_paid' => 'boolean',
            'paid_at' => 'datetime',
        ];
    }

    // ─── Relationships ──────────────────────────────────────────────────

    /**
     * The admin this due belongs to.
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * The vehicle this due is for.
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    /**
     * Polymorphic reference (Student, AutoPassenger, or Driver).
     */
    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * The transaction that paid this due.
     */
    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}

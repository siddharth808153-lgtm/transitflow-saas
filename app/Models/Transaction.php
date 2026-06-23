<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Transaction extends Model
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
        'transaction_type',
        'reference_id',
        'reference_type',
        'amount',
        'payment_for_month',
        'payment_for_date',
        'payment_method',
        'notes',
        'collected_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'payment_for_month' => 'date',
            'payment_for_date' => 'date',
        ];
    }

    // ─── Relationships ──────────────────────────────────────────────────

    /**
     * The admin who recorded this transaction.
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * The vehicle this transaction is for.
     */
    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }

    /**
     * The user who collected the payment.
     */
    public function collector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'collected_by');
    }

    /**
     * Polymorphic reference (Student, AutoPassenger, or Driver).
     */
    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Dues linked to this transaction.
     */
    public function dues(): HasMany
    {
        return $this->hasMany(Due::class);
    }

    /**
     * WhatsApp logs for this transaction.
     */
    public function whatsappLogs(): HasMany
    {
        return $this->hasMany(WhatsappLog::class);
    }
}

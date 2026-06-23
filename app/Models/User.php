<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'phone',
        'email',
        'password',
        'role',
        'is_active',
        'created_by',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    // ─── Relationships ──────────────────────────────────────────────────

    /**
     * The admin who created this user.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Users created by this admin.
     */
    public function createdUsers(): HasMany
    {
        return $this->hasMany(User::class, 'created_by');
    }

    /**
     * Vehicles owned by this admin.
     */
    public function vehicles(): HasMany
    {
        return $this->hasMany(Vehicle::class, 'admin_id');
    }

    /**
     * Drivers managed by this admin.
     */
    public function drivers(): HasMany
    {
        return $this->hasMany(Driver::class, 'admin_id');
    }

    /**
     * Students managed by this admin.
     */
    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'admin_id');
    }

    /**
     * Auto passengers managed by this admin.
     */
    public function autoPassengers(): HasMany
    {
        return $this->hasMany(AutoPassenger::class, 'admin_id');
    }

    /**
     * Transactions recorded by this admin.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'admin_id');
    }

    /**
     * Dues under this admin.
     */
    public function dues(): HasMany
    {
        return $this->hasMany(Due::class, 'admin_id');
    }

    /**
     * WhatsApp logs for this admin.
     */
    public function whatsappLogs(): HasMany
    {
        return $this->hasMany(WhatsappLog::class, 'admin_id');
    }

    /**
     * Admin settings (one-to-one).
     */
    public function adminSettings(): HasOne
    {
        return $this->hasOne(AdminSetting::class, 'admin_id');
    }

    /**
     * Vehicle logs for this admin.
     */
    public function vehicleLogs(): HasMany
    {
        return $this->hasMany(VehicleLog::class, 'admin_id');
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isUser(): bool
    {
        return $this->role === 'user';
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('driver_wage_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users');
            $table->foreignId('driver_id')->constrained('drivers')->onDelete('cascade');
            $table->string('month'); // YYYY-MM format
            $table->decimal('adjustment_amount', 10, 2);
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->unique(['driver_id', 'month']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('driver_wage_adjustments');
    }
};

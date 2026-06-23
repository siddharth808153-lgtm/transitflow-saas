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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('vehicle_id')->constrained('vehicles')->onDelete('cascade');
            $table->enum('transaction_type', ['student_fee', 'auto_daily', 'driver_wage']);
            $table->unsignedBigInteger('reference_id');
            $table->string('reference_type');
            $table->decimal('amount', 10, 2);
            $table->date('payment_for_month')->nullable();
            $table->date('payment_for_date')->nullable();
            $table->enum('payment_method', ['cash', 'upi', 'bank', 'other'])->default('cash');
            $table->text('notes')->nullable();
            $table->foreignId('collected_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            // Polymorphic index
            $table->index(['reference_id', 'reference_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};

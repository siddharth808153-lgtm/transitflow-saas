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
        Schema::create('admin_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->unique()->constrained('users')->onDelete('cascade');
            $table->string('business_name')->nullable();
            $table->string('whatsapp_sender_phone')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('currency')->default('INR');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admin_settings');
    }
};

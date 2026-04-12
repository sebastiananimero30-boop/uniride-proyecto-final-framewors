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
    Schema::create('trip_passengers', function (Blueprint $table) {
        $table->id();
        $table->foreignId('trip_id')->constrained()->onDelete('cascade');
        $table->foreignId('passenger_id')->constrained('users')->onDelete('cascade');
        $table->string('pickup_point')->nullable();
        $table->enum('status', ['pendiente', 'confirmado', 'cancelado'])->default('pendiente');
        $table->timestamp('cancelled_at')->nullable();
        $table->text('cancel_reason')->nullable();
        $table->timestamps();

        $table->unique(['trip_id', 'passenger_id']);
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trip_passengers');
    }
};

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
    Schema::create('trips', function (Blueprint $table) {
        $table->id();
        $table->foreignId('driver_id')->constrained('users')->onDelete('cascade');
        $table->foreignId('vehicle_id')->constrained()->onDelete('cascade');
        $table->string('origin');
        $table->decimal('origin_lat', 10, 7)->nullable();
        $table->decimal('origin_lng', 10, 7)->nullable();
        $table->string('destination');
        $table->decimal('destination_lat', 10, 7)->nullable();
        $table->decimal('destination_lng', 10, 7)->nullable();
        $table->dateTime('departure_time');
        $table->integer('available_seats');
        $table->decimal('price_per_seat', 8, 2)->default(0);
        $table->enum('status', ['publicado', 'confirmado', 'en_curso', 'completado', 'cancelado'])->default('publicado');
        $table->text('notes')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trips');
    }
};

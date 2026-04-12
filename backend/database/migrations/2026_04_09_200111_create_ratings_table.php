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
    Schema::create('ratings', function (Blueprint $table) {
        $table->id();
        $table->foreignId('trip_id')->constrained()->onDelete('cascade');
        $table->foreignId('rater_id')->constrained('users')->onDelete('cascade');
        $table->foreignId('rated_id')->constrained('users')->onDelete('cascade');
        $table->integer('score')->between(1, 5);
        $table->text('comment')->nullable();
        $table->timestamps();

        $table->unique(['trip_id', 'rater_id', 'rated_id']);
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ratings');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('flights', function (Blueprint $table) {
            $table->id();
            $table->string('flight_number'); // e.g. GA-581, ID-6672, JT-660
            $table->string('airline'); // e.g. Garuda Indonesia, Batik Air, Lion Air
            $table->string('airline_logo')->nullable();
            $table->string('origin'); // e.g. Jakarta (CGK), Surabaya (SUB)
            $table->string('destination'); // e.g. Samarinda (AAP)
            $table->string('scheduled_time'); // e.g. 08:30 WITA
            $table->string('estimated_time')->nullable(); // e.g. 08:45 WITA
            $table->string('terminal')->default('T1');
            $table->string('gate')->nullable(); // e.g. Gate 3
            $table->enum('flight_type', ['departure', 'arrival']);
            $table->enum('status', ['scheduled', 'boarding', 'departed', 'delayed', 'landed', 'cancelled'])->default('scheduled');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('flights');
    }
};

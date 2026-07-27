<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g. Roti 'O, Dunkin Donuts, Oasis Lounge, Damri Bus, Airport Taxi
            $table->enum('category', ['food_beverage', 'retail', 'lounge', 'transportation', 'services']);
            $table->string('location'); // e.g. Terminal Keberangkatan Lt. 2
            $table->string('operating_hours')->default('06:00 - 20:00 WITA');
            $table->string('contact_phone')->nullable();
            $table->string('image')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};

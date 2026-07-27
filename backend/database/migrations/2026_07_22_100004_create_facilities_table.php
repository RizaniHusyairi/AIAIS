<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facilities', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g., Executive Lounge, Musholla Utama, Charging Station, Ruang Menyusui, Klinik Kesehatan
            $table->string('category'); // e.g. Umum, Layanan Khusus, Keagamaan, Transportasi, Kesehatan
            $table->string('location_description'); // e.g. Lantai 2 Terminal Keberangkatan
            $table->string('icon')->nullable(); // Lucide icon name
            $table->text('description')->nullable();
            $table->boolean('is_operational')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facilities');
    }
};

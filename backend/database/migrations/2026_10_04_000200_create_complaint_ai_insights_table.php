<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Hasil analisis AI pengaduan beserta jejak auditnya. Lihat App\Models\ComplaintAiInsight.
 *
 * Tanpa foreign key ke `complaints`: tabel itu milik portal v1 dan tipe
 * kolom `id`-nya tidak dijamin cocok. Baris yatim dibersihkan oleh
 * ComplaintController::destroy.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaint_ai_insights', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('complaint_id')->index();
            $table->string('model', 100);
            $table->json('result');
            $table->unsignedInteger('input_tokens')->default(0);
            $table->unsignedInteger('output_tokens')->default(0);
            $table->unsignedBigInteger('requested_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_ai_insights');
    }
};

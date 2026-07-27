<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('category'); // e.g., Regulasi, Laporan Tahunan, Formulir, Panduan Penumpang
            $table->string('file_type')->default('PDF');
            $table->string('file_size')->default('1.2 MB');
            $table->string('file_url');
            $table->integer('download_count')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};

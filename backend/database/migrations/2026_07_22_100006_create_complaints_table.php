<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique(); // e.g. TKT-20260722-XXXX
            $table->string('reporter_name');
            $table->string('reporter_email');
            $table->string('reporter_phone');
            $table->string('category'); // e.g., Kebersihan, Keamanan, Fasilitas, Pelayanan, Bagasi, Transportasi
            $table->string('subject');
            $table->text('description');
            $table->string('attachment')->nullable();
            $table->enum('status', ['submitted', 'in_progress', 'resolved', 'rejected'])->default('submitted');
            $table->text('admin_response')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};

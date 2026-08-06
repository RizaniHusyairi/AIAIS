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
        Schema::create('chat_threads', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique();
            $table->string('visitor_name');
            $table->string('visitor_email')->nullable();
            $table->string('visitor_phone')->nullable();
            $table->string('category')->default('Informasi & Saran');
            $table->string('subject');
            $table->enum('status', ['open', 'active', 'resolved', 'closed'])->default('open');
            $table->timestamp('last_activity_at')->useCurrent();
            $table->timestamps();
        });

        Schema::create('chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_thread_id')->constrained('chat_threads')->onDelete('cascade');
            $table->enum('sender_type', ['visitor', 'admin']);
            $table->string('sender_name');
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_messages');
        Schema::dropIfExists('chat_threads');
    }
};

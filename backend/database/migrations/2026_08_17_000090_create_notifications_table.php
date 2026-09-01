<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel notifikasi bawaan Laravel — penyimpan lonceng panel.
 *
 * Selama ini tabelnya tidak pernah ikut repositori: ia terlanjur ada di server
 * yang dipasang lebih dulu, dan hanya dibuat manual di dalam berkas uji. Pada
 * pemasangan bersih, `migrate --seed` karena itu menghasilkan lonceng dan
 * seluruh halaman notifikasi yang membalas galat — gejala yang menyesatkan,
 * sebab yang kurang bukan kodenya melainkan satu tabel.
 *
 * Penomorannya sengaja mendahului `push_subscriptions` (000100): keduanya
 * bagian dari kanal yang sama, dan lonceng adalah dasarnya.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Penjaga `hasTable`, bukan `create` polos. Server yang sudah berjalan
        // sejak sebelum berkas ini ada tetap memiliki tabelnya, dan migrasi
        // yang menabraknya akan menghentikan seluruh penerapan versi baru.
        if (Schema::hasTable('notifications')) {
            return;
        }

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type', 125);
            $table->string('notifiable_type', 125);
            $table->unsignedBigInteger('notifiable_id');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['notifiable_type', 'notifiable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};

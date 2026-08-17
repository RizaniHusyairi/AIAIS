<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Langganan notifikasi push milik petugas panel.
 *
 * Satu baris = satu PERANGKAT, bukan satu pemakai. Petugas yang menyalakan
 * notifikasi di laptop kantor dan di ponselnya punya dua langganan, dan
 * keduanya harus menerima — mematikan salah satunya tidak boleh mematikan yang
 * lain.
 *
 * `endpoint` unik karena itulah pengenal perangkat yang diberikan peramban;
 * langganan ulang pada perangkat yang sama menghasilkan endpoint yang sama dan
 * harus menimpa, bukan menggandakan.
 *
 * ============================================================
 * ISINYA BUKAN RAHASIA, TETAPI TETAP TIDAK PERNAH KELUAR
 * ============================================================
 *
 * `p256dh` dan `auth` adalah kunci enkripsi milik perangkat. Siapa pun yang
 * memegang ketiganya dapat mengirim notifikasi ke perangkat itu. Karena itu
 * tabel ini tidak punya endpoint publik mana pun, dan modelnya menyembunyikan
 * ketiga kolom dari serialisasi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Endpoint server push bisa panjang; 500 sudah dengan kelonggaran.
            $table->string('endpoint', 500)->unique();
            $table->string('p256dh', 255);
            $table->string('auth', 255);

            // Membantu petugas mengenali perangkat mana yang dimatikan.
            $table->string('device', 150)->nullable();

            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel absensi rapat, dalam bentuk warisan v1.
 *
 * Kedua tabel ini lahir di v1 dan tidak pernah punya migrasi `create` di v2 —
 * migrasi sesudahnya (`add_public_token_to_meetings`) langsung menambah kolom,
 * dan diam-diam tidak berbuat apa-apa bila tabelnya belum ada. Akibatnya bentuk
 * tabelnya hanya tercatat di `db_apt`, dan tes harus menyalinnya sendiri.
 *
 * Di basis data v1 migrasi ini tidak berbuat apa-apa (`hasTable`). Gunanya
 * dua: bentuk tabelnya kini tertulis di kode, dan tes menjalankan migrasi yang
 * sama dengan produksi alih-alih salinan tangan yang bisa menyimpang.
 *
 * Bentuknya disalin dari `php artisan db:table` atas `db_apt` — termasuk
 * kunci asing ber-`cascade`, yang membuat menghapus rapat ikut menghapus
 * baris kehadirannya. `public_token` SENGAJA tidak ada di sini: ia milik
 * migrasi berikutnya, persis urutan yang dialami basis data sungguhan.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('meetings')) {
            Schema::create('meetings', function (Blueprint $table) {
                $table->id();
                $table->string('title', 125);
                $table->string('slug', 125)->unique();
                $table->date('date');
                $table->time('start_time');
                $table->string('location', 125);
                $table->string('organizer', 125);
                $table->string('organizer_nip', 125)->nullable();
                $table->boolean('is_active')->default(true);
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('attendances')) {
            Schema::create('attendances', function (Blueprint $table) {
                $table->id();
                $table->foreignId('meeting_id')->constrained()->cascadeOnDelete();
                $table->string('name', 125);
                $table->string('department', 125);
                $table->string('phone', 125)->nullable();
                // Lintasan berkas di v2; v1 sempat menyimpan isinya di sini.
                $table->mediumText('signature')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        // Sengaja kosong. Kedua tabel ini milik v1 dan berisi daftar hadir
        // bertanda tangan yang tidak punya salinan pengganti; membatalkan
        // migrasi tidak boleh menjadi jalan untuk menghapusnya.
    }
};

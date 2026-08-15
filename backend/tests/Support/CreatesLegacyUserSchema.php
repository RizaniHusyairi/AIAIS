<?php

namespace Tests\Support;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bangun tabel seperlunya untuk menguji autentikasi.
 *
 * Tes TIDAK memakai `RefreshDatabase`. Migrasi v2 bersifat aditif di atas
 * basis data warisan v1 — banyak di antaranya `Schema::table('news', ...)`
 * dan sejenisnya — sehingga menjalankannya di atas SQLite kosong pasti gagal.
 * Itu bukan cacat migrasinya; memang begitulah arsitekturnya.
 *
 * Sebagai gantinya, tes membangun sendiri dua tabel yang benar-benar disentuh
 * lapisan autentikasi, dengan bentuk kolom yang sama seperti di `db_apt`.
 * Cakupannya sempit dan itu disengaja: penjaga kewenangan menolak permintaan
 * sebelum controller mana pun berjalan, jadi tidak ada tabel domain yang
 * pernah tersentuh.
 */
trait CreatesLegacyUserSchema
{
    protected function createLegacyUserSchema(): void
    {
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('users');

        // Bentuk kolom mengikuti `users` warisan v1: dua bendera kewenangan
        // terpisah, penanda persetujuan, dan penghapusan lunak.
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->boolean('is_admin')->default(false);
            $table->tinyInteger('is_staff')->default(0);
            $table->string('name');
            $table->string('email')->unique();
            $table->string('avatar')->nullable();
            $table->string('phone')->nullable();
            $table->string('address')->nullable();
            $table->boolean('is_accepted')->default(false);
            $table->timestamp('email_verified_at')->nullable();
            $table->text('fcm_token')->nullable();
            $table->string('password');
            $table->string('remember_token', 100)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // Dipakai alur lupa/reset kata sandi. Namanya bergaya Laravel 11+,
        // berbeda dari `password_resets` warisan v1 — lihat migrasi
        // 2026_08_13_000000.
        Schema::dropIfExists('password_reset_tokens');
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });
    }

    /** Buat satu akun dengan peran dan status tertentu. */
    protected function buatPengguna(string $role, bool $disetujui = true, array $extra = []): User
    {
        $user = User::create(array_merge([
            'name' => 'Uji '.$role,
            'email' => $role.'-'.uniqid().'@contoh.test',
            'password' => 'rahasia123',
            'phone' => (string) random_int(1000000000, 9999999999),
        ], $extra));

        // Disetel terpisah: `role` dan `is_accepted` sengaja di luar
        // `$fillable`, supaya kewenangan tidak pernah dapat diisi lewat mass
        // assignment. Tes ini sekaligus membuktikan jalur itu memang tertutup.
        $user->role = $role;
        $user->is_accepted = $disetujui;
        $user->save();

        return $user;
    }
}

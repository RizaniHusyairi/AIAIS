<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jenis kelamin dan pihak yang diwakili, pada daftar hadir rapat.
 *
 * `gender` berupa `string` berisi kode `L`/`P`, bukan `enum` — menambah nilai
 * tidak boleh menuntut ALTER (lihat `Attendance::GENDERS`).
 *
 * `represents` mencatat pihak yang DIWAKILI peserta, misalnya "Kepala Dinas
 * Perhubungan". Daftar hadir rapat koordinasi lazim memuat kolom "mewakili",
 * karena undangan ditujukan kepada pimpinan yang kerap mengutus stafnya.
 *
 * Keduanya NULLABLE di basis data: baris yang ditulis sebelum migrasi ini —
 * dan baris yang masih ditulis v1 sampai cutover — tidak punya nilainya, dan
 * mengarang isinya bukan tugas migrasi. Kewajiban mengisi jenis kelamin
 * dijaga validasi controller untuk isian baru.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('attendances') || Schema::hasColumn('attendances', 'gender')) {
            return;
        }

        Schema::table('attendances', function (Blueprint $table) {
            $table->string('gender', 1)->nullable()->after('name');
            $table->string('represents', 125)->nullable()->after('department');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('attendances', 'gender')) {
            return;
        }

        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn(['gender', 'represents']);
        });
    }
};

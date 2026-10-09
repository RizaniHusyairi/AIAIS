<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Nomor HP yang dinormalkan, dijaga indeks unik per rapat.
 *
 * Penolakan absensi ganda sebelumnya hanya pemeriksaan di PHP: muat semua
 * peserta rapat, bandingkan nomornya, baru simpan. Dua kiriman yang tiba
 * hampir bersamaan — tombol yang tertekan dua kali di jaringan lambat, persis
 * keadaan yang hendak dicegah — sama-sama lolos pemeriksaan sebelum salah
 * satunya sempat tersimpan. Hanya basis data yang dapat menolak keduanya
 * secara pasti.
 *
 * Kolom `phone` tetap menyimpan apa yang diketik peserta; itulah yang tercetak
 * di daftar hadir. `phone_normalized` hanya penanda pembanding.
 *
 * PENGISIAN BARIS LAMA. Baris yang sudah ada diberi nilainya, KECUALI:
 *  - nomor yang tidak berisi angka sama sekali — dibiarkan NULL;
 *  - kemunculan kedua dan seterusnya dari nomor yang sama pada rapat yang sama
 *    — dibiarkan NULL. Barisnya tidak dihapus: itu daftar hadir bertanda
 *    tangan, dan memutuskan baris mana yang "salah" adalah urusan petugas,
 *    bukan migrasi. NULL tidak bertabrakan pada indeks unik.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('attendances') || Schema::hasColumn('attendances', 'phone_normalized')) {
            return;
        }

        Schema::table('attendances', function (Blueprint $table) {
            $table->string('phone_normalized', 20)->nullable()->after('phone');
        });

        $terpakai = [];

        DB::table('attendances')->orderBy('id')->each(function ($baris) use (&$terpakai) {
            $nomor = $this->normalkan($baris->phone);
            $kunci = $baris->meeting_id.':'.$nomor;

            if ($nomor === null || isset($terpakai[$kunci])) {
                return;
            }

            $terpakai[$kunci] = true;
            DB::table('attendances')->where('id', $baris->id)->update(['phone_normalized' => $nomor]);
        });

        // Dipasang SESUDAH pengisian, supaya pengisiannya tidak ditolak di
        // tengah jalan oleh indeks yang belum siap menerima NULL ganda.
        Schema::table('attendances', function (Blueprint $table) {
            $table->unique(['meeting_id', 'phone_normalized'], 'attendances_meeting_phone_unique');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('attendances', 'phone_normalized')) {
            return;
        }

        Schema::table('attendances', function (Blueprint $table) {
            $table->dropUnique('attendances_meeting_phone_unique');
            $table->dropColumn('phone_normalized');
        });
    }

    /**
     * Salinan `Attendance::normalkanNomor()` pada saat migrasi ini ditulis.
     *
     * Disalin, bukan dipanggil: migrasi harus tetap menghasilkan isi yang sama
     * meski aturan di model kelak berubah.
     */
    private function normalkan(?string $nomor): ?string
    {
        $angka = preg_replace('/\D/', '', (string) $nomor);

        if ($angka === '') {
            return null;
        }

        if (str_starts_with($angka, '62')) {
            $angka = '0'.substr($angka, 2);
        }

        return substr($angka, 0, 20);
    }
};

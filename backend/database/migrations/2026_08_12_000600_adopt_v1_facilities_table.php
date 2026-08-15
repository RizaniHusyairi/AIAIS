<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Pakai tabel `facilities` warisan v1, dan buang tabel kembar yang sempat
 * dibuat untuknya.
 *
 * Koreksi atas keputusan sebelumnya. Tabel `facilities` v1 semula dibaca
 * sebagai inventaris teknis internal, sehingga v2 dibuatkan tabel sendiri
 * bernama `passenger_facilities`. Pembacaan itu keliru: halaman publik v1
 * (landing-menu/informasi-publik/fasilitas) justru menampilkan seluruh isi
 * tabel ini, dikelompokkan menjadi Fasilitas Sisi Udara, Sisi Darat, dan Umum.
 * Tabel itu memang halaman fasilitas untuk pengunjung, dan membiarkan v2
 * memakai tabel kosong berarti membuang 22 baris data sungguhan.
 *
 * `details` — larik JSON berisi butir-butir keterangan — dipertahankan apa
 * adanya dan sekaligus diringkas ke `description` yang dipakai v2 sekarang,
 * supaya tidak ada keterangan yang hilang sambil menunggu tampilannya
 * memanfaatkan bentuk lariknya.
 */
return new class extends Migration
{
    /** Nilai kategori v1 → label yang layak tampil di antarmuka. */
    private const CATEGORY_LABELS = [
        'udara' => 'Sisi Udara',
        'darat' => 'Sisi Darat',
        'umum' => 'Umum',
    ];

    public function up(): void
    {
        Schema::dropIfExists('passenger_facilities');

        Schema::table('facilities', function (Blueprint $table) {
            $table->string('location_description')->nullable()->after('category');
            $table->string('icon')->nullable()->after('location_description');
            $table->text('description')->nullable()->after('icon');
            $table->boolean('is_operational')->default(true)->after('description');

            // Enum dilepas: kategori baru tidak boleh menuntut migrasi ALTER.
            $table->string('category', 60)->change();

            // Muat menampung URL penuh, dan boleh kosong bila gambarnya belum ada.
            $table->string('image_path', 500)->nullable()->change();
        });

        foreach (self::CATEGORY_LABELS as $kode => $label) {
            DB::table('facilities')->where('category', $kode)->update(['category' => $label]);
        }

        $this->ringkasDetailsKeDescription();
    }

    /**
     * Turunkan `description` dari larik `details`, tanpa menyentuh baris yang
     * keterangannya memang kosong — mengarang isi bukan tugas migrasi.
     */
    private function ringkasDetailsKeDescription(): void
    {
        DB::table('facilities')->select('id', 'details')->orderBy('id')
            ->chunk(100, function ($rows) {
                foreach ($rows as $row) {
                    $details = json_decode((string) $row->details, true);

                    if (! is_array($details)) {
                        continue;
                    }

                    $butir = array_values(array_filter(
                        array_map(fn ($d) => trim((string) $d), $details),
                        fn ($d) => $d !== '',
                    ));

                    if ($butir === []) {
                        continue;
                    }

                    DB::table('facilities')->where('id', $row->id)
                        ->update(['description' => implode("\n", $butir)]);
                }
            });
    }

    public function down(): void
    {
        foreach (self::CATEGORY_LABELS as $kode => $label) {
            DB::table('facilities')->where('category', $label)->update(['category' => $kode]);
        }

        Schema::table('facilities', function (Blueprint $table) {
            $table->dropColumn(['location_description', 'icon', 'description', 'is_operational']);
        });
    }
};

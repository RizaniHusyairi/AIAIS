<?php

namespace App\Support;

use App\Models\Advertisement;
use App\Models\Auction;
use App\Models\License;
use App\Models\Rental;
use App\Models\Submission;
use App\Models\TenantApplication;
use App\Models\WorkPermit;

/**
 * Daftar jenis pengajuan layanan bandara.
 *
 * SATU tempat yang mengetahui perbedaan antarjenis, sehingga controller,
 * rute, dan validasinya cukup ditulis sekali. Enam jenis di bawah berbagi
 * seluruh alurnya — kirim, tinjau, putuskan — dan hanya berbeda pada nama
 * kolom judul, nama kolom jenis, serta beberapa medan tambahan.
 *
 * KENAPA REGISTRI, BUKAN ENAM CONTROLLER: perbedaannya benar-benar hanya
 * data. Enam controller berisi alur yang sama akan menyimpang satu per satu —
 * satu lupa menyaring `user_id`, satu lagi lupa menghapus berkas. Penyimpangan
 * semacam itu tidak terlihat pada tinjauan kode karena tiap berkasnya tampak
 * benar sendiri-sendiri.
 *
 * YANG SENGAJA DI LUAR REGISTRI: `fieldtrips` (sudah selesai dan teruji lebih
 * dulu, menjadi acuan bentuk), serta `slots`, `extend_advances`, dan
 * `ojt_students` — ketiganya bukan varian dari bentuk ini melainkan formulir
 * yang benar-benar berbeda, dan memaksakannya ke sini akan membuat registri
 * ini menjadi tempat penampungan pengecualian.
 */
class SubmissionRegistry
{
    /**
     * @return array<string, array{
     *   model: class-string<Submission>,
     *   label: string,
     *   title_field: string,
     *   title_label: string,
     *   type_field: string,
     *   type_label: string,
     *   types: string[],
     *   more_field: string|null,
     *   extra: array<string, array{rule: string, label: string}>
     * }>
     */
    public static function all(): array
    {
        return [
            'tenant' => [
                'model' => TenantApplication::class,
                'label' => 'Pengajuan Tenant',
                'title_field' => 'business_name',
                'title_label' => 'Nama Usaha',
                'type_field' => 'business_type',
                'type_label' => 'Bidang Usaha',
                'types' => ['Makanan & Minuman', 'Ritel', 'Jasa', 'Oleh-oleh', 'Lainnya'],
                // `rental_type` menerangkan ruang yang diminta, bukan jenis
                // usahanya — karena itu ia medan tambahan, bukan `type_field`.
                'more_field' => 'rental_more',
                'extra' => [
                    'rental_type' => ['rule' => 'required|string|max:125', 'label' => 'Jenis Ruang'],
                ],
            ],

            'sewa' => [
                'model' => Rental::class,
                'label' => 'Pengajuan Sewa',
                'title_field' => 'rental_name',
                'title_label' => 'Nama Pengajuan',
                'type_field' => 'rental_type',
                'type_label' => 'Jenis Sewa',
                'types' => ['Ruang Usaha', 'Lahan', 'Reklame', 'Peralatan', 'Lainnya'],
                'more_field' => 'rental_more',
                'extra' => [
                    'location' => ['rule' => 'nullable|string|max:125', 'label' => 'Lokasi'],
                    'area' => ['rule' => 'nullable|integer|min:0', 'label' => 'Luas (m2)'],
                    'quantity' => ['rule' => 'nullable|integer|min:0', 'label' => 'Jumlah'],
                ],
            ],

            'perizinan-usaha' => [
                'model' => License::class,
                'label' => 'Perizinan Usaha',
                'title_field' => 'license_name',
                'title_label' => 'Nama Izin',
                'type_field' => 'license_type',
                'type_label' => 'Jenis Izin',
                'types' => ['Izin Usaha', 'Izin Operasional', 'Perpanjangan', 'Lainnya'],
                'more_field' => 'license_more',
                'extra' => [],
            ],

            'pengiklanan' => [
                'model' => Advertisement::class,
                'label' => 'Pengajuan Pengiklanan',
                'title_field' => 'ad_name',
                'title_label' => 'Nama Iklan',
                'type_field' => 'ad_type',
                'type_label' => 'Jenis Media',
                'types' => ['Billboard', 'Videotron', 'Banner', 'Digital Signage', 'Lainnya'],
                'more_field' => null,
                'extra' => [],
            ],

            'beauty-contest' => [
                'model' => Auction::class,
                'label' => 'Beauty Contest',
                'title_field' => 'name',
                'title_label' => 'Nama Peserta / Badan Usaha',
                'type_field' => 'lelang_type',
                'type_label' => 'Jenis',
                'types' => ['Ruang Usaha', 'Lahan', 'Reklame', 'Lainnya'],
                'more_field' => null,
                'extra' => [],
            ],

            'izin-kerja' => [
                'model' => WorkPermit::class,
                'label' => 'Izin Kerja',
                'title_field' => 'work_type',
                'title_label' => 'Jenis Pekerjaan',
                // Tabel ini tidak punya kolom judul terpisah dari jenisnya;
                // `work_type` mengisi keduanya. Lokasi dan rentang tanggalnya
                // yang membedakan satu izin dari izin lain.
                'type_field' => 'work_type',
                'type_label' => 'Jenis Pekerjaan',
                'types' => ['Konstruksi', 'Pemeliharaan', 'Instalasi', 'Survei', 'Lainnya'],
                'more_field' => null,
                'extra' => [
                    'location' => ['rule' => 'required|string|max:125', 'label' => 'Lokasi Pekerjaan'],
                    'start_date' => ['rule' => 'required|date', 'label' => 'Tanggal Mulai'],
                    'end_date' => ['rule' => 'required|date|after_or_equal:start_date', 'label' => 'Tanggal Selesai'],
                ],
            ],
        ];
    }

    /** Slug yang dikenali; dipakai pula sebagai batasan parameter rute. */
    public static function slugs(): array
    {
        return array_keys(self::all());
    }

    /** @return array<string, mixed>|null */
    public static function get(string $slug): ?array
    {
        return self::all()[$slug] ?? null;
    }
}

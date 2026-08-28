<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\AirportStat;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Angka ringkas bandara pada beranda.
 *
 * Strukturnya mengikuti `ExternalLinkController` — modul terdekat bentuknya:
 * berurut, dapat dinonaktifkan, tanpa unggahan berkas.
 *
 * Daftar publik hanya memuat baris aktif; daftar admin memuat semuanya lengkap
 * dengan penandanya, mengikuti aturan lintas-lapis di CLAUDE.md ("publik
 * menyaring, admin menampilkan semua"). PENYARINGAN PER BLOK TIDAK DILAKUKAN
 * DI SINI: satu baris boleh tampil di tiga tempat sekaligus, dan memecahnya
 * menjadi tiga endpoint berarti tiga permintaan untuk satu halaman yang sama.
 * Frontend menyaring `show_*` sendiri atas daftar yang sudah ada di tangannya.
 */
class AirportStatController extends Controller
{
    /** Daftar publik — hanya angka yang aktif. */
    public function index()
    {
        $stats = AirportStat::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return ApiResponse::success($stats, 'Angka ringkas bandara');
    }

    /** Daftar admin — termasuk yang dinonaktifkan. */
    public function adminIndex()
    {
        $stats = AirportStat::orderBy('sort_order')->orderBy('id')->get();

        return ApiResponse::success($stats, 'Daftar seluruh angka bandara');
    }

    public function store(Request $request)
    {
        $stat = AirportStat::create($this->validated($request));

        return ApiResponse::success($stat, 'Angka berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $stat = AirportStat::findOrFail($id);
        $stat->update($this->validated($request, $stat->id));

        return ApiResponse::success($stat->fresh(), 'Angka berhasil diperbarui');
    }

    public function destroy($id)
    {
        AirportStat::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Angka berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        $data = $request->validate([
            /* Disusun sebagai larik, bukan rangkaian teks seperti kolom lain:
               `Rule::unique(...)->ignore()` sebuah objek dan tidak dapat
               digabung ke dalam string aturan. */
            'slug' => array_filter([
                $ignoreId !== null ? 'sometimes' : null,
                'required',
                'string',
                'max:60',
                'regex:/^[a-z0-9-]+$/',
                Rule::unique('airport_stats', 'slug')->ignore($ignoreId),
            ]),
            'icon' => 'nullable|string|max:50',
            'value' => $partial.'required|string|max:50',
            'label_id' => $partial.'required|string|max:100',
            'label_en' => $partial.'required|string|max:100',
            'show_about' => 'boolean',
            'show_numbers' => 'boolean',
            'show_hero' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ], [
            'slug.required' => 'Kode angka wajib diisi.',
            'slug.regex' => 'Kode angka hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
            'slug.unique' => 'Kode angka itu sudah dipakai.',
            'value.required' => 'Nilai yang ditampilkan wajib diisi.',
            'label_id.required' => 'Label Bahasa Indonesia wajib diisi.',
            'label_en.required' => 'Label Bahasa Inggris wajib diisi.',
        ]);

        /*
         * Ketiga bendera dan `is_active` dinormalkan di sini karena panel
         * mengirimnya lewat JSON maupun formulir, dan "false" sebagai teks
         * bernilai benar. Kesalahan yang sama sudah pernah terjadi pada modul
         * pejabat; lihat `OfficialController`.
         *
         * Hanya kunci yang benar-benar dikirim yang disentuh, supaya
         * pembaruan sebagian tidak diam-diam mematikan bendera yang tidak
         * ikut dikirim.
         */
        foreach (['show_about', 'show_numbers', 'show_hero', 'is_active'] as $bendera) {
            if ($request->has($bendera)) {
                $data[$bendera] = $request->boolean($bendera);
            }
        }

        return $data;
    }
}

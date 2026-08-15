<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\PpidRegulation;
use Illuminate\Http\Request;

/**
 * Regulasi PPID — dasar hukum keterbukaan informasi publik.
 *
 * Daftar publik hanya memuat peraturan yang tautan dokumennya benar-benar
 * terisi; daftar admin memuat semuanya supaya petugas melihat mana yang belum
 * lengkap. Pemisahan ini sama dengan modul Regulasi Surat, hanya saja di sini
 * dokumennya berupa tautan luar sehingga tidak ada berkas yang diperiksa.
 *
 * Hasilnya dikirim datar, tidak dikelompokkan per kategori: pengelompokan dan
 * pencarian dilakukan di sisi klien, sesuai pola daftar publik lainnya.
 */
class PpidRegulationController extends Controller
{
    /** Daftar publik. `?category=` menyaring kelompok peraturan. */
    public function index(Request $request)
    {
        $category = $request->query('category');

        if ($category !== null && ! in_array($category, PpidRegulation::CATEGORIES, true)) {
            return ApiResponse::error('Kelompok peraturan tidak dikenali.', null, 422);
        }

        $regulations = PpidRegulation::query()
            ->when($category, fn ($q) => $q->where('category', $category))
            // Peraturan tanpa tautan tidak dapat dibuka pengunjung; menampilkannya
            // hanya menghasilkan tautan mati pada halaman dasar hukum.
            ->whereNotNull('document_link')
            ->where('document_link', '!=', '')
            ->orderByDesc('published_date')
            ->get();

        return ApiResponse::success($this->sortByCategoryOrder($regulations), 'Daftar regulasi PPID');
    }

    /** Daftar admin — termasuk peraturan yang tautannya belum diisi. */
    public function adminIndex()
    {
        $regulations = PpidRegulation::orderByDesc('published_date')->get();

        return ApiResponse::success($this->sortByCategoryOrder($regulations), 'Daftar seluruh regulasi PPID');
    }

    /**
     * Urutkan menurut urutan kelompok pada PpidRegulation::CATEGORIES.
     *
     * Diurutkan di sini, bukan di basis data, karena urutan yang benar bersifat
     * hierarkis — undang-undang, lalu peraturan komisi, lalu peraturan menteri —
     * dan urutan itu tidak dapat diperoleh dengan mengurutkan namanya menurut
     * abjad. Menaruhnya di PHP juga menghindari FIELD() yang khas MySQL.
     */
    private function sortByCategoryOrder(iterable $regulations)
    {
        $urutan = array_flip(PpidRegulation::CATEGORIES);

        return collect($regulations)
            ->sortBy(fn ($r) => $urutan[$r->category] ?? count($urutan))
            ->values();
    }

    public function store(Request $request)
    {
        $regulation = PpidRegulation::create($this->validated($request));

        return ApiResponse::success($regulation, 'Regulasi berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $regulation = PpidRegulation::findOrFail($id);
        $regulation->update($this->validated($request, $regulation->id));

        return ApiResponse::success($regulation->fresh(), 'Regulasi berhasil diperbarui');
    }

    public function destroy($id)
    {
        PpidRegulation::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Regulasi berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    /**
     * Aturan validasi bersama tambah & ubah.
     *
     * `sometimes` pada pengubahan membuat pembaruan sebagian tetap sah —
     * mengganti tautan saja tidak perlu mengirim ulang seluruh kolom.
     */
    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        return $request->validate([
            'category' => $partial.'required|in:'.implode(',', PpidRegulation::CATEGORIES),
            'title' => $partial.'required|string|max:500',
            'document_link' => $partial.'required|url|max:500',
            'published_date' => 'nullable|date',
        ], [
            'category.in' => 'Kelompok peraturan tidak dikenali.',
            'title.required' => 'Judul peraturan wajib diisi.',
            'document_link.required' => 'Tautan dokumen peraturan wajib diisi.',
            'document_link.url' => 'Tautan dokumen peraturan tidak sah.',
        ]);
    }
}

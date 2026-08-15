<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\PeriodicDocument;
use Illuminate\Http\Request;

/**
 * Informasi Berkala — dokumen yang wajib diumumkan secara rutin.
 *
 * Daftar publik hanya memuat dokumen yang tautannya terisi; daftar admin
 * memuat semuanya lengkap dengan penanda, supaya petugas melihat mana yang
 * belum lengkap. Pengelompokan per kategori dikerjakan di sisi klien.
 */
class PeriodicDocumentController extends Controller
{
    /** Daftar publik. `?category=` menyaring kelompok dokumen. */
    public function index(Request $request)
    {
        $documents = PeriodicDocument::query()
            ->when($request->query('category'), fn ($q, $c) => $q->where('category', $c))
            // Dokumen tanpa tautan hanya menghasilkan tautan mati bagi pengunjung.
            ->whereNotNull('document_path')
            ->where('document_path', '!=', '')
            ->orderBy('category')
            ->orderByDesc('published_date')
            ->get();

        return ApiResponse::success($documents, 'Daftar informasi berkala');
    }

    /** Daftar admin — termasuk dokumen yang tautannya belum diisi. */
    public function adminIndex()
    {
        $documents = PeriodicDocument::orderBy('category')
            ->orderByDesc('published_date')
            ->get();

        return ApiResponse::success($documents, 'Daftar seluruh informasi berkala');
    }

    public function store(Request $request)
    {
        $document = PeriodicDocument::create($this->validated($request));

        return ApiResponse::success($document, 'Dokumen berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $document = PeriodicDocument::findOrFail($id);
        $document->update($this->validated($request, $document->id));

        return ApiResponse::success($document->fresh(), 'Dokumen berhasil diperbarui');
    }

    public function destroy($id)
    {
        PeriodicDocument::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Dokumen berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    /**
     * Aturan validasi bersama tambah & ubah.
     *
     * `category` sengaja tidak dibatasi daftar tertutup: petugas menambah
     * kelompok baru sendiri lewat panel admin, sebagaimana di v1.
     */
    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        return $request->validate([
            'category' => $partial.'required|string|max:150',
            'title' => $partial.'required|string|max:500',
            'document_path' => $partial.'required|url|max:500',
            'published_date' => $partial.'required|date',
            'pejabat_name' => 'nullable|string|max:150',
        ], [
            'category.required' => 'Kelompok dokumen wajib diisi.',
            'title.required' => 'Judul dokumen wajib diisi.',
            'document_path.required' => 'Tautan dokumen wajib diisi.',
            'document_path.url' => 'Tautan dokumen tidak sah.',
            'published_date.required' => 'Tanggal terbit wajib diisi.',
        ]);
    }
}

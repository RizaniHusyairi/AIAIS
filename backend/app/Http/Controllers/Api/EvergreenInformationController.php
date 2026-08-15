<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\EvergreenInformation;
use Illuminate\Http\Request;

/**
 * Informasi Setiap Saat — dokumen yang tersedia kapan pun diminta.
 *
 * Bentuknya sama dengan Informasi Berkala: daftar publik menyaring dokumen
 * yang tautannya kosong, daftar admin menampilkan semuanya dengan penanda.
 */
class EvergreenInformationController extends Controller
{
    /** Daftar publik. `?category=` menyaring kelompok dokumen. */
    public function index(Request $request)
    {
        $items = EvergreenInformation::query()
            ->when($request->query('category'), fn ($q, $c) => $q->where('category', $c))
            ->whereNotNull('document_link')
            ->where('document_link', '!=', '')
            ->orderBy('category')
            ->orderByDesc('published_date')
            ->get();

        return ApiResponse::success($items, 'Daftar informasi setiap saat');
    }

    /** Daftar admin — termasuk dokumen yang tautannya belum diisi. */
    public function adminIndex()
    {
        $items = EvergreenInformation::orderBy('category')
            ->orderByDesc('published_date')
            ->get();

        return ApiResponse::success($items, 'Daftar seluruh informasi setiap saat');
    }

    public function store(Request $request)
    {
        $item = EvergreenInformation::create($this->validated($request));

        return ApiResponse::success($item, 'Dokumen berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $item = EvergreenInformation::findOrFail($id);
        $item->update($this->validated($request, $item->id));

        return ApiResponse::success($item->fresh(), 'Dokumen berhasil diperbarui');
    }

    public function destroy($id)
    {
        EvergreenInformation::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Dokumen berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        return $request->validate([
            'category' => $partial.'required|string|max:150',
            'title' => $partial.'required|string|max:500',
            'document_link' => $partial.'required|url|max:500',
            'published_date' => $partial.'required|date',
        ], [
            'category.required' => 'Kelompok dokumen wajib diisi.',
            'title.required' => 'Judul dokumen wajib diisi.',
            'document_link.required' => 'Tautan dokumen wajib diisi.',
            'document_link.url' => 'Tautan dokumen tidak sah.',
            'published_date.required' => 'Tanggal terbit wajib diisi.',
        ]);
    }
}

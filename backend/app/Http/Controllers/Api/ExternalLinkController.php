<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\ExternalLink;
use Illuminate\Http\Request;

/**
 * Tautan Terkait — portal resmi pemerintah di luar aptpairport.id.
 *
 * Daftar publik hanya memuat tautan yang aktif; daftar admin memuat semuanya
 * lengkap dengan penandanya. Urutannya mengikuti `sort_order` yang ditetapkan
 * petugas, bukan abjad — kelompok dan urutan itu bagian dari penyajiannya.
 * Pengelompokan dikerjakan di sisi klien.
 */
class ExternalLinkController extends Controller
{
    /** Daftar publik — hanya tautan aktif. */
    public function index()
    {
        $links = ExternalLink::query()
            ->where('is_active', true)
            ->whereNotNull('url')
            ->where('url', '!=', '')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return ApiResponse::success($links, 'Daftar tautan terkait');
    }

    /** Daftar admin — termasuk tautan yang dinonaktifkan. */
    public function adminIndex()
    {
        $links = ExternalLink::orderBy('sort_order')->orderBy('name')->get();

        return ApiResponse::success($links, 'Daftar seluruh tautan terkait');
    }

    public function store(Request $request)
    {
        $link = ExternalLink::create($this->validated($request));

        return ApiResponse::success($link, 'Tautan berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $link = ExternalLink::findOrFail($id);
        $link->update($this->validated($request, $link->id));

        return ApiResponse::success($link->fresh(), 'Tautan berhasil diperbarui');
    }

    public function destroy($id)
    {
        ExternalLink::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Tautan berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        return $request->validate([
            'name' => $partial.'required|string|max:100',
            'url' => $partial.'required|url|max:500',
            'description' => 'nullable|string|max:255',
            'icon' => 'nullable|string|max:50',
            'group' => $partial.'required|string|max:100',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ], [
            'name.required' => 'Nama tautan wajib diisi.',
            'url.required' => 'Alamat tautan wajib diisi.',
            'url.url' => 'Alamat tautan tidak sah.',
            'group.required' => 'Kelompok tautan wajib diisi.',
        ]);
    }
}

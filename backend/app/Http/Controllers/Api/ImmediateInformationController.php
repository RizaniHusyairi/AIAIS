<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\ImmediateInformation;
use Illuminate\Http\Request;

/**
 * Informasi Serta-Merta — pengumuman keselamatan yang disiarkan tanpa diminta.
 *
 * Berbeda dari halaman PPID lain, isinya bukan dokumen melainkan peringatan
 * yang ditautkan ke pos media sosial bandara. Karena itu penyaringan publiknya
 * berdasarkan `link_url`, bukan tautan dokumen.
 */
class ImmediateInformationController extends Controller
{
    /** Daftar publik, terbaru lebih dulu. */
    public function index()
    {
        $items = ImmediateInformation::query()
            ->whereNotNull('link_url')
            ->where('link_url', '!=', '')
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($items, 'Daftar informasi serta-merta');
    }

    /** Daftar admin — termasuk peringatan yang tautannya belum diisi. */
    public function adminIndex()
    {
        $items = ImmediateInformation::orderByDesc('created_at')->get();

        return ApiResponse::success($items, 'Daftar seluruh informasi serta-merta');
    }

    public function store(Request $request)
    {
        $item = ImmediateInformation::create($this->validated($request));

        return ApiResponse::success($item, 'Informasi berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $item = ImmediateInformation::findOrFail($id);
        $item->update($this->validated($request, $item->id));

        return ApiResponse::success($item->fresh(), 'Informasi berhasil diperbarui');
    }

    public function destroy($id)
    {
        ImmediateInformation::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Informasi berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        return $request->validate([
            'uraian' => $partial.'required|string|max:500',
            'keterangan' => $partial.'required|string|max:2000',
            'link_url' => $partial.'required|url|max:500',
            'link_text' => 'nullable|string|max:150',
        ], [
            'uraian.required' => 'Judul informasi wajib diisi.',
            'keterangan.required' => 'Keterangan informasi wajib diisi.',
            'link_url.required' => 'Tautan informasi wajib diisi.',
            'link_url.url' => 'Tautan informasi tidak sah.',
        ]);
    }
}

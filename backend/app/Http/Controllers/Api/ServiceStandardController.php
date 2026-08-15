<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\ServiceStandard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Standar Pelayanan — dokumen tolok ukur penyelenggaraan pelayanan.
 *
 * Berbeda dari modul lain, daftar publik di sini TIDAK menyaring dokumen yang
 * berkasnya belum ada. Alasannya: ketiga jenis dokumen ini wajib diumumkan
 * keberadaannya menurut UU 25/2009, dan menyembunyikan yang belum terbit
 * membuat pengunjung mengira dokumennya tidak pernah ada. Yang dikirim adalah
 * penandanya (`has_document`), dan tampilan menuliskan "belum tersedia" alih-alih
 * memasang tombol yang berujung 404.
 *
 * Yang disaring hanyalah baris nonaktif — itu keputusan sadar petugas.
 */
class ServiceStandardController extends Controller
{
    /** Folder penyimpanan berkas standar pelayanan pada cakram publik. */
    private const DIR = 'standar-pelayanan';

    /** Daftar publik — hanya baris aktif, termasuk yang dokumennya belum ada. */
    public function index()
    {
        $items = ServiceStandard::where('is_active', true)
            ->orderByDesc('published_date')
            ->get();

        return ApiResponse::success($this->sortByTypeOrder($items), 'Daftar standar pelayanan');
    }

    /** Daftar admin — termasuk baris yang dinonaktifkan. */
    public function adminIndex()
    {
        $items = ServiceStandard::orderByDesc('published_date')->get();

        return ApiResponse::success($this->sortByTypeOrder($items), 'Daftar seluruh standar pelayanan');
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);
        $validated += $this->resolveDocument($request);

        $item = ServiceStandard::create($validated);

        return ApiResponse::success($item, 'Dokumen berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $item = ServiceStandard::findOrFail($id);
        $validated = $this->validated($request, $item->id);

        // Berkas lama baru dihapus setelah yang baru tersimpan, supaya
        // kegagalan unggahan tidak meninggalkan baris tanpa dokumen.
        $document = $this->resolveDocument($request);

        if ($document !== []) {
            $old = $item->file_path;
            $item->update($validated + $document);
            $this->deleteStoredFile($old);
        } else {
            $item->update($validated);
        }

        return ApiResponse::success($item->fresh(), 'Dokumen berhasil diperbarui');
    }

    public function destroy($id)
    {
        $item = ServiceStandard::findOrFail($id);
        $path = $item->file_path;

        $item->delete();
        $this->deleteStoredFile($path);

        return ApiResponse::success(null, 'Dokumen berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        return $request->validate([
            'type' => $partial.'required|in:'.implode(',', ServiceStandard::TYPES),
            'title' => $partial.'required|string|max:500',
            'document_number' => 'nullable|string|max:150',
            'description' => 'nullable|string|max:2000',
            'published_date' => $partial.'required|date',
            'is_active' => 'boolean',
        ], [
            'type.in' => 'Jenis dokumen tidak dikenali.',
            'title.required' => 'Judul dokumen wajib diisi.',
            'published_date.required' => 'Tanggal terbit wajib diisi.',
        ]);
    }

    /**
     * Tentukan asal dokumen dari unggahan (`file`) atau tautan (`document_link`).
     *
     * Keduanya opsional — dokumen yang belum terbit tetap boleh dicatat,
     * karena keberadaannya sendiri wajib diumumkan. Larik kosong berarti
     * pemanggil tidak mengirim keduanya, jadi nilai lama dipertahankan.
     */
    private function resolveDocument(Request $request): array
    {
        if ($request->hasFile('file')) {
            $request->validate([
                'file' => 'file|mimes:pdf|max:20480',   // 20 MB
            ], [
                'file.mimes' => 'Berkas dokumen harus berformat PDF.',
                'file.max' => 'Ukuran berkas dokumen maksimal 20 MB.',
            ]);

            // Nama berkas diacak: nama unggahan asli kerap memuat spasi.
            return [
                'file_path' => $request->file('file')->storeAs(
                    self::DIR,
                    Str::uuid().'.pdf',
                    'public',
                ),
                'document_link' => null,
            ];
        }

        if ($request->exists('document_link')) {
            $link = trim((string) $request->input('document_link', ''));

            if ($link === '') {
                // Dikosongkan dengan sengaja: dokumennya ditarik kembali.
                return ['document_link' => null, 'file_path' => null];
            }

            $request->validate([
                'document_link' => 'url|max:500',
            ], [
                'document_link.url' => 'Tautan dokumen tidak sah.',
            ]);

            return ['document_link' => $link, 'file_path' => null];
        }

        return [];
    }

    /** Hapus berkas pada cakram; tautan milik server lain dibiarkan. */
    private function deleteStoredFile(?string $path): void
    {
        if (empty($path) || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return;
        }

        Storage::disk('public')->delete($path);
    }

    /** Urutkan menurut alur dokumen pada ServiceStandard::TYPES. */
    private function sortByTypeOrder(iterable $items)
    {
        $urutan = array_flip(ServiceStandard::TYPES);

        return collect($items)
            ->sortBy(fn ($i) => $urutan[$i->type] ?? count($urutan))
            ->values();
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\PpidProfileDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Dokumen halaman Profil PPID — SK Tim PPID dan Laporan Bulanan.
 *
 * Seperti `ServiceStandardController`, daftar publik di sini TIDAK menyaring
 * dokumen yang berkasnya belum ada: keberadaan SK dan laporan bulanan wajib
 * diumumkan menurut UU 14/2008, dan menyembunyikan yang belum terbit membuat
 * pengunjung mengira dokumennya tidak pernah ada. Yang dikirim adalah
 * penandanya (`has_document`), dan tampilan menuliskan "belum terbit".
 *
 * Yang disaring hanyalah baris nonaktif — itu keputusan sadar petugas.
 */
class PpidProfileDocumentController extends Controller
{
    /** Folder penyimpanan berkas profil PPID pada cakram publik. */
    private const DIR = 'ppid-profil';

    /** Daftar publik — hanya baris aktif, termasuk yang dokumennya belum ada. */
    public function index()
    {
        $items = PpidProfileDocument::where('is_active', true)
            ->orderByDesc('is_current')
            ->orderByDesc('published_date')
            ->get();

        return ApiResponse::success($items, 'Dokumen profil PPID');
    }

    /** Daftar admin — termasuk baris yang dinonaktifkan. */
    public function adminIndex()
    {
        $items = PpidProfileDocument::orderByDesc('is_current')
            ->orderByDesc('published_date')
            ->get();

        return ApiResponse::success($items, 'Seluruh dokumen profil PPID');
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);
        $validated += $this->resolveDocument($request);

        $item = DB::transaction(function () use ($validated) {
            $item = PpidProfileDocument::create($validated);
            $this->jagaSatuSkBerlaku($item);

            return $item;
        });

        return ApiResponse::success($item->fresh(), 'Dokumen berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $item = PpidProfileDocument::findOrFail($id);
        $validated = $this->validated($request, $item->id);

        // Berkas lama baru dihapus setelah yang baru tersimpan, supaya
        // kegagalan unggahan tidak meninggalkan baris tanpa dokumen.
        $document = $this->resolveDocument($request);
        $old = $item->file_path;

        DB::transaction(function () use ($item, $validated, $document) {
            $item->update($validated + $document);
            $this->jagaSatuSkBerlaku($item);
        });

        if ($document !== []) {
            $this->deleteStoredFile($old);
        }

        return ApiResponse::success($item->fresh(), 'Dokumen berhasil diperbarui');
    }

    public function destroy($id)
    {
        $item = PpidProfileDocument::findOrFail($id);
        $path = $item->file_path;

        $item->delete();
        $this->deleteStoredFile($path);

        return ApiResponse::success(null, 'Dokumen berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        $validated = $request->validate([
            'type' => $partial.'required|in:'.implode(',', PpidProfileDocument::TYPES),
            'title' => $partial.'required|string|max:500',
            'document_number' => 'nullable|string|max:150',
            'description' => 'nullable|string|max:2000',
            'published_date' => $partial.'required|date',
            'is_current' => 'boolean',
            'is_active' => 'boolean',
        ], [
            'type.in' => 'Jenis dokumen tidak dikenali.',
            'title.required' => 'Judul dokumen wajib diisi.',
            'published_date.required' => 'Tanggal dokumen wajib diisi.',
        ]);

        // Multipart mengirim boolean sebagai '1'/'0'; `boolean()` yang
        // menerjemahkannya, bukan aturan validasi.
        foreach (['is_current', 'is_active'] as $bendera) {
            if ($request->exists($bendera)) {
                $validated[$bendera] = $request->boolean($bendera);
            }
        }

        // Penanda "berlaku" hanya bermakna bagi SK — ia menunjuk SK yang sedang
        // menetapkan tim. Dibiarkan menempel pada laporan, daftar publik akan
        // menampilkan lencana yang tak berarti.
        if (($validated['type'] ?? null) === PpidProfileDocument::TYPE_LAPORAN) {
            $validated['is_current'] = false;
        }

        return $validated;
    }

    /**
     * Hanya boleh ada satu SK yang berlaku.
     *
     * Dua SK yang sama-sama bertanda "berlaku" adalah keadaan yang tidak boleh
     * dapat dicapai lewat panel — halaman publik memilih salah satunya untuk
     * ditonjolkan, dan pilihan itu akan bergantung pada urutan baris, bukan
     * pada keputusan petugas.
     */
    private function jagaSatuSkBerlaku(PpidProfileDocument $item): void
    {
        if ($item->type !== PpidProfileDocument::TYPE_SK || ! $item->is_current) {
            return;
        }

        PpidProfileDocument::where('type', PpidProfileDocument::TYPE_SK)
            ->where('id', '!=', $item->id)
            ->where('is_current', true)
            ->update(['is_current' => false]);
    }

    /**
     * Tentukan asal dokumen dari unggahan (`file`) atau tautan (`document_link`).
     *
     * Keduanya opsional — dokumen yang belum terbit tetap boleh dicatat, karena
     * keberadaannya sendiri wajib diumumkan. Larik kosong berarti pemanggil
     * tidak mengirim keduanya, jadi nilai lama dipertahankan.
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
}

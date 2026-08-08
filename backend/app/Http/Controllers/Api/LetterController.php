<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Letter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Regulasi — Surat Keputusan & Surat Edaran.
 *
 * Daftar publik hanya memuat surat yang berkasnya benar-benar dapat dibuka;
 * daftar admin memuat semuanya, lengkap dengan penanda `has_file` supaya
 * petugas melihat surat mana yang berkasnya hilang. Pemisahan ini menirukan
 * perilaku v1, yang di sana tersebar di beberapa controller.
 */
class LetterController extends Controller
{
    /** Folder penyimpanan berkas surat pada cakram publik. */
    private const DIR = 'letters';

    /** Daftar publik. `?type=keputusan|edaran` menyaring jenis surat. */
    public function index(Request $request)
    {
        $type = $request->query('type');

        if ($type !== null && ! in_array($type, Letter::TYPES, true)) {
            return ApiResponse::error('Jenis surat tidak dikenali.', null, 422);
        }

        $letters = Letter::query()
            ->when($type, fn ($q) => $q->where('type', $type))
            ->orderByDesc('issue_date')
            ->get()
            ->filter->has_file          // berkas hantu tidak pernah tayang
            ->values();

        return ApiResponse::success($letters, 'Daftar surat regulasi bandara');
    }

    /** Daftar admin — termasuk surat yang berkasnya hilang. */
    public function adminIndex()
    {
        $letters = Letter::orderByDesc('issue_date')->get();

        return ApiResponse::success($letters, 'Daftar seluruh surat regulasi');
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);
        $validated['file_path'] = $this->resolveFilePath($request);

        $letter = Letter::create($validated);

        return ApiResponse::success($letter, 'Surat berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $letter = Letter::findOrFail($id);

        $validated = $this->validated($request, $letter->id);

        // Berkas lama baru dihapus setelah yang baru tersimpan, supaya
        // kegagalan unggahan tidak meninggalkan surat tanpa berkas.
        $newPath = $this->resolveFilePath($request, required: false);

        if ($newPath !== null) {
            $old = $letter->file_path;
            $validated['file_path'] = $newPath;
            $letter->update($validated);
            $this->deleteStoredFile($old);
        } else {
            $letter->update($validated);
        }

        return ApiResponse::success($letter->fresh(), 'Surat berhasil diperbarui');
    }

    public function destroy($id)
    {
        $letter = Letter::findOrFail($id);
        $path = $letter->file_path;

        $letter->delete();
        $this->deleteStoredFile($path);

        return ApiResponse::success(null, 'Surat berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    /**
     * Aturan validasi bersama tambah & ubah.
     *
     * `sometimes` pada pengubahan membuat pembaruan sebagian tetap sah —
     * mengganti berkas saja tidak perlu mengirim ulang seluruh kolom.
     */
    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        return $request->validate([
            'type' => $partial . 'required|in:' . implode(',', Letter::TYPES),
            'number' => [
                ...($ignoreId !== null ? ['sometimes'] : []),
                'required', 'string', 'max:255',
                Rule::unique('letters', 'number')->ignore($ignoreId),
            ],
            'title' => $partial . 'required|string|max:255',
            'issue_date' => $partial . 'required|date',
        ], [
            'type.in' => 'Jenis surat hanya boleh keputusan atau edaran.',
            'number.unique' => 'Nomor surat ini sudah terdaftar.',
        ]);
    }

    /**
     * Tentukan lintasan berkas dari unggahan (`file`) atau URL (`file_url`).
     *
     * Dua jalur ini disediakan karena sebagian dokumen masih dilayani server
     * v1: petugas dapat menempelkan URL-nya tanpa harus mengunduh lalu
     * mengunggah ulang berkas yang sama.
     */
    private function resolveFilePath(Request $request, bool $required = true): ?string
    {
        if ($request->hasFile('file')) {
            $request->validate([
                'file' => 'file|mimes:pdf|max:20480',   // 20 MB
            ], [
                'file.mimes' => 'Berkas surat harus berformat PDF.',
                'file.max' => 'Ukuran berkas surat maksimal 20 MB.',
            ]);

            // Nama berkas diacak: nama unggahan asli kerap memuat spasi dan
            // karakter yang menyulitkan pembuatan URL.
            return $request->file('file')->storeAs(
                self::DIR,
                Str::uuid() . '.pdf',
                'public',
            );
        }

        $url = trim((string) $request->input('file_url', ''));

        if ($url !== '') {
            $request->validate([
                'file_url' => 'url',
            ], [
                'file_url.url' => 'Tautan berkas surat tidak sah.',
            ]);

            return $url;
        }

        if ($required) {
            abort(response()->json([
                'success' => false,
                'message' => 'Unggah berkas PDF surat atau isi tautan berkasnya.',
                'errors' => ['file' => ['Berkas surat wajib diisi.']],
            ], 422));
        }

        return null;
    }

    /** Hapus berkas pada cakram; URL milik server lain dibiarkan. */
    private function deleteStoredFile(?string $path): void
    {
        if (empty($path) || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return;
        }

        Storage::disk('public')->delete($path);
    }
}

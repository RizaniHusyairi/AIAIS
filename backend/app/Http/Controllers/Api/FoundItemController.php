<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\FoundItem;
use App\Models\LostReport;
use App\Support\CetakanPdf;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Catatan barang temuan — seluruhnya internal.
 *
 * TIDAK ADA SATU PUN RUTE PUBLIK DI SINI, dan itu disengaja. Katalog barang
 * temuan yang terbuka memberi siapa saja seluruh keterangan yang dibutuhkan
 * untuk mengaku sebagai pemiliknya. Pengunjung melaporkan kehilangannya lewat
 * `LostReportController`, petugas yang mencocokkan.
 */
class FoundItemController extends Controller
{
    /** Folder foto barang pada cakram publik. */
    private const DIR = 'found-items';

    public function adminIndex(Request $request)
    {
        $status = $request->query('status');

        $barang = FoundItem::query()
            ->with('lostReport:id,found_item_id,ticket_number,reporter_name,status')
            ->when(
                $status && in_array($status, FoundItem::STATUSES, true),
                fn ($q) => $q->where('status', $status),
            )
            ->orderByDesc('found_at')
            ->get();

        return ApiResponse::success($barang, 'Daftar barang temuan');
    }

    public function store(Request $request)
    {
        $validated = $this->validasi($request);

        if ($request->hasFile('photo')) {
            $validated['photo'] = $this->simpanFoto($request);
        }

        $validated['code'] = $this->buatKode();
        $validated['status'] = 'stored';

        $barang = FoundItem::create($validated);

        return ApiResponse::success($barang, 'Barang temuan berhasil dicatat', null, 201);
    }

    /**
     * Perbarui catatan barang.
     *
     * Dilayani `PUT` maupun `POST /{id}` — foto dikirim sebagai multipart, dan
     * peramban tidak dapat mengirim multipart lewat `PUT`. Pola yang sama
     * dipakai rute `letters`.
     */
    public function update(Request $request, $id)
    {
        $barang = FoundItem::findOrFail($id);

        $validated = $this->validasi($request, wajib: false);

        if ($request->hasFile('photo')) {
            $lama = $barang->photo;
            $validated['photo'] = $this->simpanFoto($request);

            if (! empty($lama)) {
                Storage::disk('public')->delete($lama);
            }
        }

        // Status dan seluruh kolom serah terima TIDAK dapat disentuh dari sini
        // — keduanya hanya berpindah lewat `handover()` dan pencocokan, yang
        // masing-masing menuntut keterangan tambahan. Membiarkannya di sini
        // membuka jalan menandai barang "sudah diserahkan" tanpa satu pun
        // catatan tentang siapa yang menerimanya.
        $barang->update($validated);

        return ApiResponse::success($barang->fresh('lostReport'), 'Catatan barang temuan berhasil diperbarui');
    }

    /**
     * Serah terima barang kepada pemiliknya.
     *
     * Nomor identitas pengambil dicatat tetapi tidak pernah ikut terserialisasi
     * ke JSON (`FoundItem::$hidden`). Ia hanya muncul pada berita acara yang
     * dicetak dan ditandatangani di loket.
     */
    public function handover(Request $request, $id)
    {
        $barang = FoundItem::findOrFail($id);

        if (in_array($barang->status, ['returned', 'disposed'], true)) {
            return ApiResponse::error('Barang ini sudah diserahkan atau dimusnahkan.', null, 422);
        }

        $validated = $request->validate([
            'receiver_name' => 'required|string|max:150',
            'receiver_id_type' => 'required|string|in:' . implode(',', FoundItem::ID_TYPES),
            'receiver_id_number' => 'required|string|max:60',
            'handover_officer' => 'required|string|max:150',
            'handover_note' => 'nullable|string|max:2000',
        ], [
            'receiver_name.required' => 'Nama pengambil wajib diisi.',
            'receiver_id_type.required' => 'Jenis identitas pengambil wajib dipilih.',
            'receiver_id_type.in' => 'Jenis identitas tidak dikenali.',
            'receiver_id_number.required' => 'Nomor identitas pengambil wajib diisi.',
            'handover_officer.required' => 'Nama petugas yang menyerahkan wajib diisi.',
        ]);

        DB::transaction(function () use ($barang, $validated) {
            $barang->update($validated + [
                'status' => 'returned',
                'returned_at' => now(),
            ]);

            // Laporan yang tertaut ikut ditutup — kalau tidak, petugas
            // berikutnya masih melihatnya sebagai pencarian yang berjalan.
            LostReport::where('found_item_id', $barang->id)->update([
                'status' => 'returned',
                'responded_at' => now(),
            ]);
        });

        return ApiResponse::success($barang->fresh('lostReport'), 'Serah terima berhasil dicatat');
    }

    /**
     * Berita acara serah terima.
     *
     * SELURUH WAKTU DILEWATKAN `CetakanPdf`. `APP_TIMEZONE` bernilai UTC
     * sementara dokumennya menuliskan WITA; melewatkan `->found_at` mentah
     * menghasilkan selisih delapan jam pada dokumen yang ditandatangani. Itu
     * sudah pernah terjadi dua kali pada modul lain — sekali di kaki halaman,
     * sekali lagi di badan tabel sesudah kaki halamannya diperbaiki.
     */
    public function handoverPdf(Request $request, $id)
    {
        $barang = FoundItem::with('lostReport')->findOrFail($id);

        if ($barang->status !== 'returned') {
            return ApiResponse::error(
                'Berita acara hanya dapat dicetak setelah serah terima dicatat.',
                null,
                422,
            );
        }

        $pdf = Pdf::loadView('pdf.lost-handover', [
            'judul' => 'Berita Acara Serah Terima Barang Temuan',
            'periode' => 'Nomor Barang: ' . $barang->code,
            'dicetakPada' => CetakanPdf::dicetakPada(),
            'dicetakOleh' => $request->user()?->name,
            'barang' => $barang,
            'laporan' => $barang->lostReport,
            'ditemukanPada' => CetakanPdf::waktu($barang->found_at),
            'diserahkanPada' => CetakanPdf::waktu($barang->returned_at),
        ])->setPaper('a4', 'portrait');

        return $pdf->download('berita-acara-' . Str::lower($barang->code) . '.pdf');
    }

    public function destroy($id)
    {
        $barang = FoundItem::findOrFail($id);
        $foto = $barang->photo;

        DB::transaction(function () use ($barang) {
            // Laporan yang tertaut dilepas, bukan ikut terhapus — laporan itu
            // milik warga, bukan milik catatan gudang.
            LostReport::where('found_item_id', $barang->id)
                ->update(['found_item_id' => null, 'status' => 'searching']);

            $barang->delete();
        });

        if (! empty($foto)) {
            Storage::disk('public')->delete($foto);
        }

        return ApiResponse::success(null, 'Catatan barang temuan berhasil dihapus');
    }

    /* ------------------------------------------------------------------ */

    /** Aturan validasi bersama `store` dan `update`. */
    private function validasi(Request $request, bool $wajib = true): array
    {
        $w = $wajib ? 'required' : 'sometimes|required';

        return $request->validate([
            'category' => "$w|string|in:" . implode(',', FoundItem::CATEGORIES),
            'description' => "$w|string|max:5000",
            'found_area' => "$w|string|max:100",
            'found_at' => "$w|date|before_or_equal:now",
            'finder_name' => 'nullable|string|max:150',
            'storage_location' => 'nullable|string|max:150',
            'photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ], [
            'category.required' => 'Kategori barang wajib dipilih.',
            'category.in' => 'Kategori barang tidak dikenali.',
            'description.required' => 'Ciri-ciri barang wajib diisi.',
            'found_area.required' => 'Lokasi penemuan wajib diisi.',
            'found_at.required' => 'Waktu penemuan wajib diisi.',
            'found_at.before_or_equal' => 'Waktu penemuan tidak boleh di masa depan.',
            'photo.image' => 'Foto harus berupa gambar (JPG, PNG, atau WEBP).',
            'photo.max' => 'Ukuran foto maksimal 5 MB.',
        ]);
    }

    private function simpanFoto(Request $request): string
    {
        return $request->file('photo')->storeAs(
            self::DIR,
            Str::uuid() . '.' . $request->file('photo')->extension(),
            'public',
        );
    }

    /** Kode internal barang; dipakai petugas menandai fisik barangnya. */
    private function buatKode(): string
    {
        do {
            $kode = 'TMN-' . date('Ymd') . '-' . Str::upper(Str::random(4));
        } while (FoundItem::where('code', $kode)->exists());

        return $kode;
    }
}

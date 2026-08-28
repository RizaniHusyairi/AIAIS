<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\FieldTrip;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Support\Notifikasi;

/**
 * Pengajuan kunjungan lapangan (field trip).
 *
 * Modul pengajuan PERTAMA yang diporting, jadi bentuknya menjadi pola bagi
 * delapan berikutnya. Tiga hal yang menentukan bentuk itu:
 *
 *  1. **Pemohon hanya melihat miliknya sendiri.** Tiap kueri sisi warga
 *     disaring `user_id` milik penggugat, dan `show`/unduh berkas memeriksa
 *     kepemilikan sebelum menjawab. Tanpa itu, satu id yang ditebak membuka
 *     surat pengantar sekolah pemohon lain.
 *
 *  2. **Berkas syarat di cakram privat**, sama seperti scan KTP permohonan
 *     informasi. Isinya surat berkop instansi lengkap dengan nama dan tanda
 *     tangan pejabat.
 *
 *  3. **Dua cacat v1 diperbaiki, tidak ditiru.** Lihat `updateStatus()`.
 */
class FieldTripController extends Controller
{
    /** Jenis kunjungan yang dikenali. */
    public const TYPES = ['Sekolah', 'Perguruan Tinggi', 'Instansi', 'Komunitas', 'Lainnya'];

    /* ------------------------- sisi pemohon ------------------------- */

    /** Daftar pengajuan milik pemohon yang sedang masuk. */
    public function index(Request $request)
    {
        $items = FieldTrip::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($items, 'Daftar pengajuan field trip Anda');
    }

    public function show(Request $request, $id)
    {
        $item = $this->milikPemohon($request, $id);

        return $item instanceof FieldTrip
            ? ApiResponse::success($item, 'Rincian pengajuan field trip')
            : $item;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'fieldtrip_name' => 'required|string|max:125',
            'description' => 'required|string',
            'fieldtrip_type' => ['required', Rule::in(self::TYPES)],
            'documents' => 'required|array|min:1|max:5',
            'documents.*' => 'file|mimes:pdf,doc,docx|max:2048',
        ], [
            'fieldtrip_name.required' => 'Nama kegiatan wajib diisi.',
            'fieldtrip_name.max' => 'Nama kegiatan maksimal 125 karakter.',
            'description.required' => 'Uraian kegiatan wajib diisi.',
            'fieldtrip_type.required' => 'Jenis pemohon wajib dipilih.',
            'fieldtrip_type.in' => 'Jenis pemohon tidak dikenali.',
            'documents.required' => 'Surat pengantar wajib diunggah.',
            'documents.min' => 'Unggah sekurang-kurangnya satu berkas.',
            'documents.max' => 'Maksimal 5 berkas per pengajuan.',
            'documents.*.mimes' => 'Berkas harus berformat PDF, DOC, atau DOCX.',
            'documents.*.max' => 'Ukuran tiap berkas maksimal 2MB.',
        ]);

        // Nama berkas memakai UUID, bukan nama asli bertimestamp seperti v1.
        // Nama asli kerap memuat spasi dan nama instansi pemohon — keduanya
        // tidak layak muncul pada lintasan penyimpanan.
        $lintasan = [];

        foreach ($request->file('documents') as $berkas) {
            $lintasan[] = $berkas->storeAs(
                'fieldtrips',
                Str::uuid().'.'.$berkas->getClientOriginalExtension(),
                FieldTrip::DISK
            );
        }

        $item = FieldTrip::create([
            ...$data,
            'documents' => $lintasan,
            'user_id' => $request->user()->id,
        ]);

        Notifikasi::kirim('pengajuan', null, 'Kunjungan Lapangan', '/admin/fieldtrips');

        return ApiResponse::success($item, 'Pengajuan field trip berhasil dikirim', null, 201);
    }

    /**
     * Unduh satu berkas syarat milik sendiri.
     *
     * Berkasnya dirujuk lewat INDEKS pada larik, bukan lintasan yang dikirim
     * pemanggil. Menerima lintasan berarti membiarkan pemanggil menyusun
     * lintasannya sendiri, dan satu `../` yang lolos membuka seisi cakram.
     */
    public function downloadDocument(Request $request, $id, $index)
    {
        $item = $this->milikPemohon($request, $id);

        if (! $item instanceof FieldTrip) {
            return $item;
        }

        return $this->kirimBerkas($item, (int) $index);
    }

    /* ------------------------- sisi petugas ------------------------- */

    public function adminIndex(Request $request)
    {
        $items = FieldTrip::with('user:id,name,email,phone')
            ->when($request->query('status'), fn ($q, $s) => $q->where('submission_status', $s))
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($items, 'Daftar pengajuan field trip');
    }

    public function adminShow($id)
    {
        $item = FieldTrip::with('user:id,name,email,phone')->findOrFail($id);

        return ApiResponse::success($item, 'Rincian pengajuan field trip');
    }

    public function adminDownloadDocument($id, $index)
    {
        return $this->kirimBerkas(FieldTrip::findOrFail($id), (int) $index);
    }

    /**
     * Petugas memutuskan pengajuan.
     *
     * DUA CACAT v1 DIPERBAIKI DI SINI, keduanya berupa penjaga yang tidak
     * pernah menyala:
     *
     *  - v1 menulis `required_if:status,Ditolak,...` padahal nama medannya
     *    `submission_status`. Karena medan bernama `status` tidak pernah ada
     *    dalam permintaan, syaratnya tak pernah berlaku — petugas dapat
     *    menolak pengajuan TANPA menyebutkan alasan, dan pemohon menerima
     *    penolakan kosong yang tidak dapat ditindaklanjuti.
     *  - Dengan cacat yang sama, pengajuan dapat disetujui tanpa melampirkan
     *    surat balasan, sehingga status "Disetujui" tidak membawa apa pun yang
     *    bisa dibawa pemohon ke lapangan.
     *
     * Keduanya kini benar-benar diwajibkan.
     */
    public function updateStatus(Request $request, $id)
    {
        $item = FieldTrip::findOrFail($id);

        $data = $request->validate([
            'submission_status' => ['required', Rule::in(FieldTrip::STAFF_STATUSES)],
            'staff_notes' => 'required_if:submission_status,Ditolak,Revisi Diperlukan|nullable|string',
            'reply_document_path' => 'required_if:submission_status,Disetujui|nullable|url|max:500',
        ], [
            'submission_status.required' => 'Status keputusan wajib dipilih.',
            'submission_status.in' => 'Status keputusan tidak dikenali.',
            'staff_notes.required_if' => 'Catatan wajib diisi bila pengajuan ditolak atau diminta revisi.',
            'reply_document_path.required_if' => 'Tautan surat balasan wajib diisi bila pengajuan disetujui.',
            'reply_document_path.url' => 'Surat balasan harus berupa tautan yang sah.',
            'reply_document_path.max' => 'Tautan surat balasan maksimal 500 karakter.',
        ]);

        $item->submission_status = $data['submission_status'];
        $item->staff_notes = $data['staff_notes'] ?? null;

        // Tautan balasan hanya melekat pada keputusan menyetujui; keputusan
        // lain yang menyisakan tautan lama akan membingungkan pemohon.
        $item->reply_document_path = $data['submission_status'] === 'Disetujui'
            ? $data['reply_document_path']
            : null;

        $item->save();

        return ApiResponse::success($item->fresh(), 'Keputusan pengajuan berhasil disimpan');
    }

    public function destroy($id)
    {
        $item = FieldTrip::findOrFail($id);
        $item->hapusBerkas();
        $item->delete();

        return ApiResponse::success(null, 'Pengajuan field trip berhasil dihapus beserta berkasnya');
    }

    /* -------------------------------------------------------------- */

    /**
     * Ambil pengajuan milik penggugat, atau respons galat.
     *
     * Pengajuan milik orang lain dijawab 404, BUKAN 403. Membedakan keduanya
     * memberi tahu penebak bahwa nomor itu ada — cukup untuk memetakan berapa
     * banyak pengajuan yang masuk dan kapan.
     */
    private function milikPemohon(Request $request, $id)
    {
        $item = FieldTrip::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        return $item ?? ApiResponse::error('Pengajuan tidak ditemukan', null, 404);
    }

    private function kirimBerkas(FieldTrip $item, int $index)
    {
        $lintasan = $item->documents[$index] ?? null;

        if (! $lintasan || ! Storage::disk(FieldTrip::DISK)->exists($lintasan)) {
            return ApiResponse::error('Berkas tidak ditemukan', null, 404);
        }

        return Storage::disk(FieldTrip::DISK)->download($lintasan);
    }
}

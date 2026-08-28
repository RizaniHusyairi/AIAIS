<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\ExtendAdvance;
use App\Models\ExtendAdvanceSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Support\Notifikasi;

/**
 * Extend Advance — permohonan beroperasi di luar jam layanan bandara.
 *
 * Alur bertanda tangannya dijelaskan pada model. Yang perlu diketahui saat
 * membaca controller ini:
 *
 *  - `store()` MENYALIN teks pernyataan yang berlaku ke barisnya. Pernyataan
 *    itu dapat berubah bila NOTAM-nya berubah, dan yang mengikat adalah bunyi
 *    yang benar-benar ditandatangani PIC.
 *  - Pengajuan tanpa pernyataan bertanda tangan TIDAK dapat diputuskan
 *    petugas. Menyetujuinya berarti mengizinkan penerbangan di luar jam
 *    layanan tanpa ada yang memikul risikonya — v1 tidak menjaga ini.
 *  - Berkas bertanda tangan ke cakram privat; v1 menaruhnya di cakram publik.
 */
class ExtendAdvanceController extends Controller
{
    /* ------------------------- sisi pemohon ------------------------- */

    public function index(Request $request)
    {
        $items = ExtendAdvance::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($items, 'Daftar pengajuan extend advance Anda');
    }

    public function show(Request $request, $id)
    {
        $item = $this->milikPemohon($request, $id);

        return $item instanceof ExtendAdvance
            ? ApiResponse::success($item, 'Rincian pengajuan extend advance')
            : $item;
    }

    /** Teks pernyataan yang berlaku; dibaca formulir sebelum mengirim. */
    public function statement()
    {
        $teks = ExtendAdvanceSetting::pernyataan();

        // Bila belum diatur, TIDAK diisi contoh karangan: pernyataan ini
        // merujuk NOTAM yang berlaku dan mengikat secara hukum. Lebih baik
        // formulirnya menyatakan pernyataannya belum tersedia.
        return ApiResponse::success(['statement' => $teks], 'Pernyataan tanggung jawab extend advance');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'operator' => 'required|string|max:125',
            'aircraft_type' => 'required|string|max:125',
            'registration_and_flight_number' => 'required|string|max:125',
            'flight_date' => 'required|date',
            'eobt' => 'required|date_format:H:i',
            'aobt' => 'required|date_format:H:i',
            'route' => 'required|string|max:125',
            'take_off_alternate' => 'nullable|string|max:125',
            'purpose_of_flight' => 'required|string|max:125',
            'pic_name' => 'required|string|max:125',
        ], [
            'operator.required' => 'Nama operator wajib diisi.',
            'aircraft_type.required' => 'Tipe pesawat wajib diisi.',
            'registration_and_flight_number.required' => 'Registrasi dan nomor penerbangan wajib diisi.',
            'flight_date.required' => 'Tanggal penerbangan wajib diisi.',
            'eobt.required' => 'EOBT wajib diisi.',
            'eobt.date_format' => 'EOBT harus dalam format jam:menit, misalnya 23:30.',
            'aobt.required' => 'AOBT wajib diisi.',
            'aobt.date_format' => 'AOBT harus dalam format jam:menit, misalnya 23:45.',
            'route.required' => 'Rute wajib diisi.',
            'purpose_of_flight.required' => 'Tujuan penerbangan wajib diisi.',
            'pic_name.required' => 'Nama Pilot In Command wajib diisi.',
        ]);

        $item = new ExtendAdvance($data);
        $item->user_id = $request->user()->id;
        $item->statement_notes = ExtendAdvanceSetting::pernyataan();
        $item->submission_status = ExtendAdvance::MENUNGGU_TANDA_TANGAN;
        $item->save();

        return ApiResponse::success(
            $item->fresh(),
            'Pengajuan tersimpan. Unduh surat pernyataan, mintakan tanda tangan Pilot In Command, lalu unggah kembali.',
            null,
            201
        );
    }

    /**
     * Unggah surat pernyataan yang sudah ditandatangani.
     *
     * Barulah di sini pengajuannya berstatus `Diajukan` dan masuk antrean
     * petugas. Berkas lama dihapus bila ada — kasusnya nyata: pengajuan yang
     * diminta revisi akan diunggahi berkas pengganti.
     */
    public function uploadSigned(Request $request, $id)
    {
        $item = $this->milikPemohon($request, $id);

        if (! $item instanceof ExtendAdvance) {
            return $item;
        }

        $request->validate([
            'signed_document' => 'required|file|mimes:pdf|max:2048',
        ], [
            'signed_document.required' => 'Berkas pernyataan bertanda tangan wajib diunggah.',
            'signed_document.mimes' => 'Berkas harus berformat PDF.',
            'signed_document.max' => 'Ukuran berkas maksimal 2MB.',
        ]);

        $lama = $item->getAttributes()['signed_document_path'] ?? null;

        if ($lama && Storage::disk(ExtendAdvance::DISK)->exists($lama)) {
            Storage::disk(ExtendAdvance::DISK)->delete($lama);
        }

        $item->signed_document_path = $request->file('signed_document')->storeAs(
            'extend-advance/signed',
            Str::uuid().'.pdf',
            ExtendAdvance::DISK
        );
        $item->submission_status = 'Diajukan';
        $item->save();

        Notifikasi::kirim('pengajuan', null, 'Extend Advance', '/admin/extend-advance');

        return ApiResponse::success($item->fresh(), 'Pernyataan bertanda tangan berhasil diunggah. Pengajuan Anda kini menunggu peninjauan petugas.');
    }

    public function downloadSigned(Request $request, $id)
    {
        $item = $this->milikPemohon($request, $id);

        return $item instanceof ExtendAdvance ? $this->kirimBerkas($item) : $item;
    }

    /* ------------------------- sisi petugas ------------------------- */

    public function adminIndex(Request $request)
    {
        $items = ExtendAdvance::with('user:id,name,email,phone')
            ->when($request->query('status'), fn ($q, $s) => $q->where('submission_status', $s))
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($items, 'Daftar pengajuan extend advance');
    }

    public function adminDownloadSigned($id)
    {
        return $this->kirimBerkas(ExtendAdvance::findOrFail($id));
    }

    public function updateStatus(Request $request, $id)
    {
        $item = ExtendAdvance::findOrFail($id);

        // Penjaga yang TIDAK ada di v1: tanpa pernyataan bertanda tangan,
        // tidak ada yang memikul risiko penerbangan di luar jam layanan.
        if (! $item->has_signed_document) {
            return ApiResponse::error(
                'Pengajuan ini belum memiliki surat pernyataan bertanda tangan Pilot In Command, sehingga belum dapat diputuskan.',
                null,
                422
            );
        }

        $data = $request->validate([
            'submission_status' => ['required', Rule::in(ExtendAdvance::STAFF_STATUSES)],
            'staff_notes' => 'required_if:submission_status,Ditolak,Revisi Diperlukan|nullable|string',
            'reply_document_path' => 'required_if:submission_status,Disetujui|nullable|url|max:500',
        ], [
            'submission_status.required' => 'Status keputusan wajib dipilih.',
            'submission_status.in' => 'Status keputusan tidak dikenali.',
            'staff_notes.required_if' => 'Catatan wajib diisi bila pengajuan ditolak atau diminta revisi.',
            'reply_document_path.required_if' => 'Tautan surat balasan wajib diisi bila pengajuan disetujui.',
            'reply_document_path.url' => 'Surat balasan harus berupa tautan yang sah.',
        ]);

        $item->submission_status = $data['submission_status'];
        $item->staff_notes = $data['staff_notes'] ?? null;
        $item->reply_document_path = $data['submission_status'] === 'Disetujui'
            ? $data['reply_document_path']
            : null;

        $item->save();

        return ApiResponse::success($item->fresh(), 'Keputusan pengajuan berhasil disimpan');
    }

    /** Ubah teks pernyataan yang berlaku bagi pengajuan BARU. */
    public function updateStatement(Request $request)
    {
        $data = $request->validate([
            'statement_notes' => 'required|string',
        ], [
            'statement_notes.required' => 'Teks pernyataan wajib diisi.',
        ]);

        ExtendAdvanceSetting::updateOrCreate(
            ['key' => 'statement_notes'],
            ['value' => $data['statement_notes']],
        );

        return ApiResponse::success(
            ['statement' => $data['statement_notes']],
            'Teks pernyataan diperbarui. Pengajuan yang sudah dibuat tetap memakai bunyi lama yang ditandatangani.'
        );
    }

    public function destroy($id)
    {
        $item = ExtendAdvance::findOrFail($id);
        $lintasan = $item->getAttributes()['signed_document_path'] ?? null;

        if ($lintasan && Storage::disk(ExtendAdvance::DISK)->exists($lintasan)) {
            Storage::disk(ExtendAdvance::DISK)->delete($lintasan);
        }

        $item->delete();

        return ApiResponse::success(null, 'Pengajuan extend advance berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    private function milikPemohon(Request $request, $id)
    {
        $item = ExtendAdvance::where('id', $id)->where('user_id', $request->user()->id)->first();

        return $item ?? ApiResponse::error('Pengajuan tidak ditemukan', null, 404);
    }

    private function kirimBerkas(ExtendAdvance $item)
    {
        $lintasan = $item->getAttributes()['signed_document_path'] ?? null;

        if (! $lintasan || ! Storage::disk(ExtendAdvance::DISK)->exists($lintasan)) {
            return ApiResponse::error('Berkas tidak ditemukan', null, 404);
        }

        return Storage::disk(ExtendAdvance::DISK)->download($lintasan);
    }
}

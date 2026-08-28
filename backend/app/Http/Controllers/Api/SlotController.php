<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Slot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Support\Notifikasi;

/**
 * Pengajuan slot penerbangan charter.
 *
 * Yang diperiksa petugas di sini adalah rencana penerbangannya, bukan
 * berkasnya — karena itu medannya rinci dan divalidasi ketat:
 *
 *  - kode bandara empat huruf (ICAO), bukan teks bebas; kode yang salah
 *    membuat slot diberikan untuk rute yang keliru;
 *  - jadwal tiba tidak boleh mendahului jadwal berangkat;
 *  - asal dan tujuan tidak boleh sama.
 *
 * Ketiganya TIDAK ada di v1. Berkas pendukung tetap diterima, tetapi tidak
 * wajib: sebagian pengajuan charter memang hanya berisi rencana penerbangan.
 */
class SlotController extends Controller
{
    /* ------------------------- sisi pemohon ------------------------- */

    public function index(Request $request)
    {
        $items = Slot::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($items, 'Daftar pengajuan slot charter Anda');
    }

    public function show(Request $request, $id)
    {
        $item = $this->milikPemohon($request, $id);

        return $item instanceof Slot
            ? ApiResponse::success($item, 'Rincian pengajuan slot charter')
            : $item;
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->aturan(), $this->pesan());

        $lintasan = [];

        foreach ($request->file('documents') ?? [] as $berkas) {
            $lintasan[] = $berkas->storeAs(
                'slots',
                Str::uuid().'.'.$berkas->getClientOriginalExtension(),
                Slot::DISK
            );
        }

        $item = Slot::create([
            ...$data,
            'documents' => $lintasan,
            'user_id' => $request->user()->id,
        ]);

        Notifikasi::kirim('pengajuan', null, 'Slot Charter', '/admin/slots');

        return ApiResponse::success($item, 'Pengajuan slot charter berhasil dikirim', null, 201);
    }

    public function downloadDocument(Request $request, $id, $index)
    {
        $item = $this->milikPemohon($request, $id);

        return $item instanceof Slot
            ? $this->kirimBerkas($item, (int) $index)
            : $item;
    }

    /* ------------------------- sisi petugas ------------------------- */

    public function adminIndex(Request $request)
    {
        $items = Slot::with('user:id,name,email,phone')
            ->when($request->query('status'), fn ($q, $s) => $q->where('submission_status', $s))
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($items, 'Daftar pengajuan slot charter');
    }

    public function adminDownloadDocument($id, $index)
    {
        return $this->kirimBerkas(Slot::findOrFail($id), (int) $index);
    }

    public function updateStatus(Request $request, $id)
    {
        $item = Slot::findOrFail($id);

        $data = $request->validate([
            'submission_status' => ['required', Rule::in(Slot::STAFF_STATUSES)],
            'staff_notes' => 'required_if:submission_status,Ditolak,Revisi Diperlukan|nullable|string',
            'reply_document_path' => 'required_if:submission_status,Disetujui|nullable|url|max:500',
            'admin_comments' => 'nullable|string',
        ], [
            'submission_status.required' => 'Status keputusan wajib dipilih.',
            'submission_status.in' => 'Status keputusan tidak dikenali.',
            'staff_notes.required_if' => 'Catatan wajib diisi bila pengajuan ditolak atau diminta revisi.',
            'reply_document_path.required_if' => 'Tautan surat balasan wajib diisi bila pengajuan disetujui.',
            'reply_document_path.url' => 'Surat balasan harus berupa tautan yang sah.',
        ]);

        $item->submission_status = $data['submission_status'];
        $item->staff_notes = $data['staff_notes'] ?? null;
        $item->admin_comments = $data['admin_comments'] ?? null;
        $item->reply_document_path = $data['submission_status'] === 'Disetujui'
            ? $data['reply_document_path']
            : null;

        $item->save();

        return ApiResponse::success($item->fresh(), 'Keputusan pengajuan slot berhasil disimpan');
    }

    public function destroy($id)
    {
        $item = Slot::findOrFail($id);

        // Penghapusan LUNAK — berkasnya sengaja tidak ikut dihapus. Slot yang
        // pernah diberikan adalah jejak operasional; membuang berkasnya
        // membuat catatan yang tersisa tidak dapat ditelusuri lagi.
        $item->delete();

        return ApiResponse::success(null, 'Pengajuan slot berhasil dihapus dari daftar');
    }

    /* -------------------------------------------------------------- */

    /** @return array<string, mixed> */
    private function aturan(): array
    {
        return [
            'aircraft_registration' => 'required|string|max:10',
            'aircraft_type' => 'required|string|max:50',
            'departure_schedule' => 'required|date',
            'arrival_schedule' => 'required|date|after:departure_schedule',
            // Empat huruf ICAO; `WALS` untuk APT Pranoto. Regex-nya menolak
            // angka dan spasi, dua isian keliru yang paling sering terjadi.
            'origin_airport' => 'required|string|size:4|regex:/^[A-Za-z]{4}$/',
            'destination_airport' => 'required|string|size:4|regex:/^[A-Za-z]{4}$/|different:origin_airport',
            'flight_type' => ['required', Rule::in(Slot::FLIGHT_TYPES)],
            'flight_more' => 'nullable|string|max:125',
            'documents' => 'nullable|array|max:5',
            'documents.*' => 'file|mimes:pdf,doc,docx|max:2048',
        ];
    }

    /** @return array<string, string> */
    private function pesan(): array
    {
        return [
            'aircraft_registration.required' => 'Registrasi pesawat wajib diisi.',
            'aircraft_type.required' => 'Tipe pesawat wajib diisi.',
            'departure_schedule.required' => 'Jadwal keberangkatan wajib diisi.',
            'arrival_schedule.required' => 'Jadwal kedatangan wajib diisi.',
            'arrival_schedule.after' => 'Jadwal kedatangan harus setelah jadwal keberangkatan.',
            'origin_airport.required' => 'Bandara asal wajib diisi.',
            'origin_airport.size' => 'Kode bandara asal harus 4 huruf ICAO, misalnya WALS.',
            'origin_airport.regex' => 'Kode bandara asal hanya boleh berisi huruf.',
            'destination_airport.required' => 'Bandara tujuan wajib diisi.',
            'destination_airport.size' => 'Kode bandara tujuan harus 4 huruf ICAO, misalnya WALS.',
            'destination_airport.regex' => 'Kode bandara tujuan hanya boleh berisi huruf.',
            'destination_airport.different' => 'Bandara tujuan tidak boleh sama dengan bandara asal.',
            'flight_type.required' => 'Jenis penerbangan wajib dipilih.',
            'flight_type.in' => 'Jenis penerbangan tidak dikenali.',
            'documents.max' => 'Maksimal 5 berkas per pengajuan.',
            'documents.*.mimes' => 'Berkas harus berformat PDF, DOC, atau DOCX.',
            'documents.*.max' => 'Ukuran tiap berkas maksimal 2MB.',
        ];
    }

    private function milikPemohon(Request $request, $id)
    {
        $item = Slot::where('id', $id)->where('user_id', $request->user()->id)->first();

        return $item ?? ApiResponse::error('Pengajuan tidak ditemukan', null, 404);
    }

    private function kirimBerkas(Slot $item, int $index)
    {
        $lintasan = $item->documents[$index] ?? null;

        if (! $lintasan || ! Storage::disk(Slot::DISK)->exists($lintasan)) {
            return ApiResponse::error('Berkas tidak ditemukan', null, 404);
        }

        return Storage::disk(Slot::DISK)->download($lintasan);
    }
}

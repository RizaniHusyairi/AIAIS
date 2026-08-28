<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Submission;
use App\Support\SubmissionRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Support\Notifikasi;

/**
 * Satu controller untuk enam jenis pengajuan layanan bandara.
 *
 * Jenisnya datang sebagai parameter rute `{jenis}` dan diselesaikan lewat
 * `SubmissionRegistry`. Alurnya identik dengan `FieldTripController` yang
 * ditulis lebih dulu sebagai acuan — termasuk seluruh keputusan yang
 * dijelaskan di sana:
 *
 *  - pemohon hanya melihat miliknya sendiri; milik orang lain dijawab 404,
 *    bukan 403, supaya nomor yang ditebak tidak membocorkan keberadaannya;
 *  - berkas syarat di cakram privat, dirujuk lewat INDEKS bukan lintasan;
 *  - menolak wajib disertai catatan, menyetujui wajib melampirkan tautan
 *    surat balasan — dua penjaga yang di v1 ditulis tetapi tidak pernah
 *    menyala karena salah menyebut nama medan.
 *
 * Slug yang tidak dikenali dijawab 404 di sini, meskipun rutenya sudah
 * dibatasi `whereIn`. Pembatasan rute menjaga URL, sedangkan pemeriksaan ini
 * menjaga controller — dan controller yang tidak memeriksa akan meledak
 * dengan galat null yang tak terbaca bila kelak dipanggil dari tempat lain.
 */
class SubmissionController extends Controller
{
    /* ------------------------- sisi pemohon ------------------------- */

    public function index(Request $request, string $jenis)
    {
        $def = $this->definisi($jenis);

        if (! is_array($def)) {
            return $def;
        }

        $items = $def['model']::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($items, 'Daftar '.$def['label'].' Anda');
    }

    public function show(Request $request, string $jenis, $id)
    {
        $def = $this->definisi($jenis);

        if (! is_array($def)) {
            return $def;
        }

        $item = $this->milikPemohon($def, $request, $id);

        return $item instanceof Submission
            ? ApiResponse::success($item, 'Rincian '.$def['label'])
            : $item;
    }

    public function store(Request $request, string $jenis)
    {
        $def = $this->definisi($jenis);

        if (! is_array($def)) {
            return $def;
        }

        $data = $request->validate(
            $this->aturan($def),
            $this->pesan($def),
        );

        $model = new $def['model'];

        $lintasan = [];

        foreach ($request->file('documents') as $berkas) {
            $lintasan[] = $berkas->storeAs(
                $model->folderBerkas(),
                Str::uuid().'.'.$berkas->getClientOriginalExtension(),
                $def['model']::DISK
            );
        }

        $item = $def['model']::create([
            ...$data,
            'documents' => $lintasan,
            'user_id' => $request->user()->id,
        ]);

        Notifikasi::kirim('pengajuan', null, $def['label'], '/admin/pengajuan/'.$jenis);

        return ApiResponse::success($item, $def['label'].' berhasil dikirim', null, 201);
    }

    public function downloadDocument(Request $request, string $jenis, $id, $index)
    {
        $def = $this->definisi($jenis);

        if (! is_array($def)) {
            return $def;
        }

        $item = $this->milikPemohon($def, $request, $id);

        return $item instanceof Submission
            ? $this->kirimBerkas($item, (int) $index)
            : $item;
    }

    /* ------------------------- sisi petugas ------------------------- */

    public function adminIndex(Request $request, string $jenis)
    {
        $def = $this->definisi($jenis);

        if (! is_array($def)) {
            return $def;
        }

        $items = $def['model']::with('user:id,name,email,phone')
            ->when($request->query('status'), fn ($q, $s) => $q->where('submission_status', $s))
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($items, 'Daftar '.$def['label']);
    }

    public function adminDownloadDocument(string $jenis, $id, $index)
    {
        $def = $this->definisi($jenis);

        if (! is_array($def)) {
            return $def;
        }

        return $this->kirimBerkas($def['model']::findOrFail($id), (int) $index);
    }

    /** Lihat catatan pada `FieldTripController::updateStatus` untuk cacat v1 yang diperbaiki. */
    public function updateStatus(Request $request, string $jenis, $id)
    {
        $def = $this->definisi($jenis);

        if (! is_array($def)) {
            return $def;
        }

        $item = $def['model']::findOrFail($id);

        $data = $request->validate([
            'submission_status' => ['required', Rule::in($def['model']::STAFF_STATUSES)],
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
        $item->reply_document_path = $data['submission_status'] === 'Disetujui'
            ? $data['reply_document_path']
            : null;

        $item->save();

        return ApiResponse::success($item->fresh(), 'Keputusan pengajuan berhasil disimpan');
    }

    public function destroy(string $jenis, $id)
    {
        $def = $this->definisi($jenis);

        if (! is_array($def)) {
            return $def;
        }

        $item = $def['model']::findOrFail($id);
        $item->hapusBerkas();
        $item->delete();

        return ApiResponse::success(null, $def['label'].' berhasil dihapus beserta berkasnya');
    }

    /** Keterangan jenis pengajuan; dipakai formulir publik menyusun medannya. */
    public function types()
    {
        $keluaran = [];

        foreach (SubmissionRegistry::all() as $slug => $def) {
            $keluaran[] = [
                'slug' => $slug,
                'label' => $def['label'],
                'title_label' => $def['title_label'],
                'type_label' => $def['type_label'],
                'types' => $def['types'],
                'has_more' => $def['more_field'] !== null,
                'extra' => array_map(
                    fn ($e, $k) => ['field' => $k, 'label' => $e['label'], 'required' => str_contains($e['rule'], 'required')],
                    $def['extra'],
                    array_keys($def['extra']),
                ),
            ];
        }

        return ApiResponse::success($keluaran, 'Jenis pengajuan layanan bandara');
    }

    /* -------------------------------------------------------------- */

    /** @return array<string, mixed>|JsonResponse */
    private function definisi(string $jenis)
    {
        $def = SubmissionRegistry::get($jenis);

        return $def ?? ApiResponse::error('Jenis pengajuan tidak dikenali.', null, 404);
    }

    /** @return array<string, mixed> */
    private function aturan(array $def): array
    {
        $aturan = [
            $def['title_field'] => 'required|string|max:125',
            'description' => 'required|string',
            'documents' => 'required|array|min:1|max:5',
            'documents.*' => 'file|mimes:pdf,doc,docx|max:2048',
        ];

        // Pada `izin-kerja`, judul dan jenisnya kolom yang sama; menulis
        // aturannya dua kali akan menimpa yang pertama dengan yang kedua.
        if ($def['type_field'] !== $def['title_field']) {
            $aturan[$def['type_field']] = ['required', Rule::in($def['types'])];
        } else {
            $aturan[$def['title_field']] = ['required', Rule::in($def['types'])];
        }

        if ($def['more_field'] !== null) {
            $aturan[$def['more_field']] = 'nullable|string|max:125';
        }

        foreach ($def['extra'] as $medan => $e) {
            $aturan[$medan] = $e['rule'];
        }

        return $aturan;
    }

    /** @return array<string, string> */
    private function pesan(array $def): array
    {
        $pesan = [
            $def['title_field'].'.required' => $def['title_label'].' wajib diisi.',
            $def['type_field'].'.required' => $def['type_label'].' wajib dipilih.',
            $def['type_field'].'.in' => $def['type_label'].' tidak dikenali.',
            'description.required' => 'Uraian wajib diisi.',
            'documents.required' => 'Berkas syarat wajib diunggah.',
            'documents.min' => 'Unggah sekurang-kurangnya satu berkas.',
            'documents.max' => 'Maksimal 5 berkas per pengajuan.',
            'documents.*.mimes' => 'Berkas harus berformat PDF, DOC, atau DOCX.',
            'documents.*.max' => 'Ukuran tiap berkas maksimal 2MB.',
        ];

        foreach ($def['extra'] as $medan => $e) {
            $pesan[$medan.'.required'] = $e['label'].' wajib diisi.';
        }

        // Rentang tanggal terbalik adalah kekeliruan yang paling sering
        // terjadi pada izin kerja, dan pesan bawaannya tidak menjelaskan apa pun.
        $pesan['end_date.after_or_equal'] = 'Tanggal selesai tidak boleh mendahului tanggal mulai.';

        return $pesan;
    }

    private function milikPemohon(array $def, Request $request, $id)
    {
        $item = $def['model']::where('id', $id)
            ->where('user_id', $request->user()->id)
            ->first();

        return $item ?? ApiResponse::error('Pengajuan tidak ditemukan', null, 404);
    }

    private function kirimBerkas(Submission $item, int $index)
    {
        $lintasan = $item->documents[$index] ?? null;

        if (! $lintasan || ! Storage::disk($item::DISK)->exists($lintasan)) {
            return ApiResponse::error('Berkas tidak ditemukan', null, 404);
        }

        return Storage::disk($item::DISK)->download($lintasan);
    }
}

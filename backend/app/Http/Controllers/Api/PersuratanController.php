<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Persuratan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Surat dinas dan rantai verifikasinya.
 *
 * ============================================================
 * OTORISASI — bagian terpenting controller ini
 * ============================================================
 *
 * Portal v1 praktis TIDAK memeriksa siapa yang menggerakkan surat. Tiga lubang
 * nyata yang ditemukan saat kodenya dibaca, dan ketiganya ditutup di sini:
 *
 *  1. `finalApprove` v1 sama sekali tidak memeriksa apakah pelakunya memang
 *     penandatangan akhir surat itu. Setiap akun staff dapat menyetujui surat
 *     dinas siapa pun — termasuk surat yang mencantumkan pejabat lain sebagai
 *     penanda tangan.
 *  2. `rejectVerification` v1 mencari tahap milik pelaku, lalu MENOLAK SURATNYA
 *     tanpa syarat meski tahapnya tidak ditemukan. Setiap akun staff dapat
 *     menolak surat mana pun, bahkan yang tidak melibatkannya sama sekali.
 *  3. `requestRevision` dan `submitRevision` tidak memeriksa apa pun. Siapa
 *     saja dapat memulangkan surat orang lain, dan siapa saja dapat mengirim
 *     ulang surat yang bukan miliknya.
 *
 * Di sini setiap perpindahan tahap diperiksa terhadap `assigned_to_user_id` —
 * penunjuk giliran — atau terhadap peran spesifik yang bersangkutan. Surat yang
 * sudah `Disetujui`/`Ditolak` tidak dapat digerakkan lagi oleh siapa pun.
 *
 * Seluruh perpindahan dibungkus transaksi: rantai yang setengah berpindah
 * (tahap tercatat disetujui tetapi giliran tidak beralih) akan macet tanpa ada
 * yang dapat melanjutkannya.
 */
class PersuratanController extends Controller
{
    /* ------------------------- daftar & rincian ------------------------- */

    /**
     * Daftar surat, disaring peran pemanggil.
     *
     * `?scope=` — `mine` (surat yang saya buat), `inbox` (giliran saya),
     * `verifier` (pernah/sedang melibatkan saya), `approver` (saya
     * penandatangannya). Tanpa itu, seluruh surat.
     */
    public function adminIndex(Request $request)
    {
        $uid = $request->user()->id;

        $surat = Persuratan::with(['user:id,name', 'assignee:id,name', 'finalApprover:id,name'])
            ->withCount('verifications')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('scope'), fn ($q, $scope) => match ($scope) {
                'mine' => $q->where('user_id', $uid),
                'inbox' => $q->where('assigned_to_user_id', $uid),
                'verifier' => $q->whereHas('verifications', fn ($v) => $v->where('user_id', $uid)),
                'approver' => $q->where('final_approver_id', $uid),
                default => $q,
            })
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($surat, 'Daftar surat dinas');
    }

    public function adminShow($id)
    {
        $surat = Persuratan::with([
            'user:id,name', 'assignee:id,name', 'finalApprover:id,name',
            'verifications.user:id,name', 'revisions.user:id,name', 'events.actor:id,name',
        ])->findOrFail($id);

        return ApiResponse::success($surat, 'Rincian surat dinas');
    }

    /* ------------------------- pembuatan ------------------------- */

    public function store(Request $request)
    {
        $pembuat = $request->user();

        $data = $request->validate([
            'letter_type' => 'required|string|max:125',
            'letter_date' => 'required|date',
            'recipient_address' => 'required|string',
            'subject' => 'required|string|max:125',
            'final_approver_id' => [
                'required', 'exists:users,id',
                // Penandatangan tidak boleh dirinya sendiri. v1 mengizinkannya,
                // sehingga siapa pun dapat membuat surat lalu menandatanganinya
                // sendiri tanpa seorang pun meninjau.
                Rule::notIn([$pembuat->id]),
            ],
            'verifiers' => 'nullable|array',
            'verifiers.*' => 'exists:users,id',
            'collaborators' => 'nullable|array',
            'collaborators.*' => 'exists:users,id',
            'attachments' => 'nullable|array',
            'attachments.*' => ['url', $this->aturanInang()],
        ], [
            'letter_type.required' => 'Jenis surat wajib diisi.',
            'letter_date.required' => 'Tanggal surat wajib diisi.',
            'recipient_address.required' => 'Alamat tujuan wajib diisi.',
            'subject.required' => 'Perihal wajib diisi.',
            'final_approver_id.required' => 'Pejabat penandatangan akhir wajib dipilih.',
            'final_approver_id.exists' => 'Pejabat yang dipilih tidak ditemukan.',
            'final_approver_id.not_in' => 'Anda tidak dapat menandatangani surat yang Anda buat sendiri.',
            'verifiers.*.exists' => 'Salah satu verifikator yang dipilih tidak ditemukan.',
        ]);

        $verifikator = array_values(array_unique($data['verifiers'] ?? []));

        // Verifikator ganda membuat orang yang sama diminta menyetujui dua kali;
        // v1 tidak menyaringnya. Pembuat surat juga tidak boleh menjadi
        // verifikator atas suratnya sendiri.
        if (in_array($pembuat->id, $verifikator, true)) {
            return ApiResponse::error('Anda tidak dapat menjadi verifikator surat yang Anda buat sendiri.', null, 422);
        }

        if (in_array((int) $data['final_approver_id'], $verifikator, true)) {
            return ApiResponse::error('Penandatangan akhir tidak perlu dicantumkan lagi sebagai verifikator.', null, 422);
        }

        $surat = DB::transaction(function () use ($data, $verifikator, $pembuat) {
            $surat = new Persuratan([
                'letter_type' => $data['letter_type'],
                'letter_date' => $data['letter_date'],
                'recipient_address' => $data['recipient_address'],
                'subject' => $data['subject'],
                'final_approver_id' => $data['final_approver_id'],
                'collaborators' => array_values(array_unique($data['collaborators'] ?? [])),
                'attachments' => array_values(array_unique($data['attachments'] ?? [])),
            ]);
            $surat->user_id = $pembuat->id;

            if ($verifikator !== []) {
                $surat->status = Persuratan::TAHAP_VERIFIKASI;
                $surat->assigned_to_user_id = $verifikator[0];
            } else {
                // Tanpa verifikator, surat langsung ke penandatangan akhir.
                //
                // v1 menulis `Auth::user()->supervisor_id ?: final_approver_id`,
                // padahal kolom `supervisor_id` TIDAK ADA di tabel users —
                // ekspresinya selalu jatuh ke cabang kedua. Di sini cabang yang
                // memang berjalan itu ditulis apa adanya, tanpa berpura-pura
                // ada hierarki atasan yang belum diimplementasikan.
                $surat->status = Persuratan::TAHAP_ATASAN;
                $surat->assigned_to_user_id = $data['final_approver_id'];
            }

            $surat->save();

            foreach ($verifikator as $i => $uid) {
                $surat->verifications()->create([
                    'user_id' => $uid,
                    'order' => $i + 1,
                    'status' => 'Menunggu',
                ]);
            }

            $surat->catat('created', $pembuat->id, ['subject' => $surat->subject]);
            $surat->catat('assigned', $pembuat->id, [
                'to_user_id' => $surat->assigned_to_user_id,
                'reason' => $verifikator !== [] ? 'first_verifier' : 'no_verifier_final_approval',
            ]);

            if ($verifikator !== []) {
                $surat->catat('verification_requested', $pembuat->id, ['queue_size' => count($verifikator)]);
            }

            return $surat;
        });

        return ApiResponse::success(
            $surat->fresh()->load('verifications.user:id,name'),
            'Surat berhasil dibuat dan diteruskan ke '.($verifikator !== [] ? 'verifikator pertama' : 'penandatangan akhir'),
            null,
            201
        );
    }

    /* ------------------------- perpindahan tahap ------------------------- */

    /** Verifikator menyetujui tahapnya; giliran beralih ke tahap berikutnya. */
    public function approveVerification(Request $request, $id)
    {
        $surat = Persuratan::findOrFail($id);
        $uid = $request->user()->id;

        if ($galat = $this->tolakBilaSelesai($surat)) {
            return $galat;
        }

        $tahap = $surat->tahapMilik($uid);

        if ($tahap === null || $surat->assigned_to_user_id !== $uid) {
            return ApiResponse::error('Giliran verifikasi surat ini bukan pada Anda.', null, 403);
        }

        DB::transaction(function () use ($surat, $tahap, $uid) {
            $tahap->update(['status' => 'Disetujui', 'comments' => request('comments')]);
            $surat->catat('verified', $uid, ['order' => $tahap->order]);

            $berikutnya = $surat->verifikasiBerikutnya();

            if ($berikutnya !== null) {
                $surat->status = Persuratan::TAHAP_VERIFIKASI;
                $surat->assigned_to_user_id = $berikutnya->user_id;
                $alasan = 'next_verifier';
            } else {
                $surat->status = Persuratan::TAHAP_ATASAN;
                $surat->assigned_to_user_id = $surat->final_approver_id;
                $alasan = 'final_approval';
            }

            $surat->save();
            $surat->catat('assigned', $uid, ['to_user_id' => $surat->assigned_to_user_id, 'reason' => $alasan]);
        });

        return ApiResponse::success($this->muat($surat), 'Verifikasi disetujui dan diteruskan ke tahap berikutnya');
    }

    /**
     * Verifikator menolak — surat berhenti.
     *
     * Penolakan WAJIB disertai alasan, dan hanya dapat dilakukan pemegang
     * giliran. v1 menolak suratnya tanpa syarat bahkan ketika tahap milik
     * pelaku tidak ditemukan sama sekali.
     */
    public function rejectVerification(Request $request, $id)
    {
        $surat = Persuratan::findOrFail($id);
        $uid = $request->user()->id;

        if ($galat = $this->tolakBilaSelesai($surat)) {
            return $galat;
        }

        $data = $request->validate(['comments' => 'required|string'], [
            'comments.required' => 'Alasan penolakan wajib diisi.',
        ]);

        $tahap = $surat->tahapMilik($uid);
        $penandatangan = $surat->status === Persuratan::TAHAP_ATASAN && $surat->final_approver_id === $uid;

        if (($tahap === null && ! $penandatangan) || $surat->assigned_to_user_id !== $uid) {
            return ApiResponse::error('Surat ini bukan pada giliran Anda, sehingga tidak dapat Anda tolak.', null, 403);
        }

        DB::transaction(function () use ($surat, $tahap, $uid, $data) {
            $tahap?->update(['status' => 'Ditolak', 'comments' => $data['comments']]);

            $surat->status = 'Ditolak';
            $surat->assigned_to_user_id = null;
            $surat->save();

            $surat->catat('rejected', $uid, ['comments' => $data['comments']]);
        });

        return ApiResponse::success($this->muat($surat), 'Surat ditolak');
    }

    /** Minta revisi — surat kembali ke pembuatnya. */
    public function requestRevision(Request $request, $id)
    {
        $surat = Persuratan::findOrFail($id);
        $uid = $request->user()->id;

        if ($galat = $this->tolakBilaSelesai($surat)) {
            return $galat;
        }

        $data = $request->validate(['comments' => 'required|string'], [
            'comments.required' => 'Catatan revisi wajib diisi.',
        ]);

        if ($surat->assigned_to_user_id !== $uid) {
            return ApiResponse::error('Surat ini bukan pada giliran Anda.', null, 403);
        }

        DB::transaction(function () use ($surat, $uid, $data) {
            $surat->revisions()->create([
                'user_id' => $uid,
                'comments' => $data['comments'],
                'previous_status' => $surat->status,
            ]);

            $surat->status = 'Revisi Diperlukan';
            $surat->assigned_to_user_id = $surat->user_id;
            $surat->save();

            $surat->catat('revision_requested', $uid, ['comments' => $data['comments']]);
        });

        return ApiResponse::success($this->muat($surat), 'Surat dikembalikan kepada pembuatnya untuk direvisi');
    }

    /**
     * Pembuat mengirim ulang surat setelah direvisi.
     *
     * Rantainya DILANJUTKAN dari verifikator yang belum menjawab, bukan diulang
     * dari awal: verifikator yang sudah menyetujui tidak perlu menyetujui dua
     * kali. Perilaku ini ditiru dari v1 dan memang benar.
     */
    public function submitRevision(Request $request, $id)
    {
        $surat = Persuratan::findOrFail($id);
        $uid = $request->user()->id;

        if ($galat = $this->tolakBilaSelesai($surat)) {
            return $galat;
        }

        if ($surat->user_id !== $uid) {
            return ApiResponse::error('Hanya pembuat surat yang dapat mengirim revisinya.', null, 403);
        }

        if ($surat->status !== 'Revisi Diperlukan') {
            return ApiResponse::error('Surat ini sedang tidak dalam keadaan menunggu revisi.', null, 422);
        }

        $data = $request->validate([
            'attachments' => 'required|array|min:1',
            'attachments.*' => ['required', 'url', $this->aturanInang()],
        ], [
            'attachments.required' => 'Lampiran hasil revisi wajib disertakan.',
            'attachments.min' => 'Sertakan sekurang-kurangnya satu tautan lampiran.',
        ]);

        DB::transaction(function () use ($surat, $uid, $data) {
            $surat->attachments = array_values(array_unique(array_map('trim', $data['attachments'])));

            $berikutnya = $surat->verifikasiBerikutnya();

            if ($berikutnya !== null) {
                $surat->status = Persuratan::TAHAP_VERIFIKASI;
                $surat->assigned_to_user_id = $berikutnya->user_id;
                $alasan = 'resume_verification';
            } else {
                $surat->status = Persuratan::TAHAP_ATASAN;
                $surat->assigned_to_user_id = $surat->final_approver_id;
                $alasan = 'resume_final_approval';
            }

            $surat->save();

            $surat->catat('revision_submitted', $uid, []);
            $surat->catat('assigned', $uid, ['to_user_id' => $surat->assigned_to_user_id, 'reason' => $alasan]);
        });

        return ApiResponse::success($this->muat($surat), 'Revisi terkirim dan rantai verifikasi dilanjutkan');
    }

    /**
     * Penandatangan akhir menyetujui surat.
     *
     * Pemeriksaan pelaku di sini adalah lubang paling besar pada v1: di sana
     * SETIAP akun staff dapat menandatangani surat siapa pun.
     */
    public function finalApprove(Request $request, $id)
    {
        $surat = Persuratan::findOrFail($id);
        $uid = $request->user()->id;

        if ($galat = $this->tolakBilaSelesai($surat)) {
            return $galat;
        }

        if ($surat->final_approver_id !== $uid) {
            return ApiResponse::error('Hanya penandatangan akhir surat ini yang dapat menyetujuinya.', null, 403);
        }

        // Dua penolakan di atas dan di bawah dipisah dengan sengaja. Menyatukan
        // keduanya membuat penandatangan yang SAH — tetapi suratnya belum
        // selesai diverifikasi — diberi tahu bahwa ia bukan penandatangannya,
        // dan itu keterangan yang menyesatkan.
        if ($surat->status !== Persuratan::TAHAP_ATASAN || $surat->assigned_to_user_id !== $uid) {
            return ApiResponse::error(
                'Surat ini belum melewati seluruh tahap verifikasi, sehingga belum dapat ditandatangani.',
                null,
                422
            );
        }

        $data = $request->validate([
            'signed_document_link' => ['required', 'url', $this->aturanInang()],
        ], [
            'signed_document_link.required' => 'Tautan dokumen bertanda tangan wajib diisi.',
        ]);

        DB::transaction(function () use ($surat, $uid, $data) {
            $surat->status = 'Disetujui';
            $surat->assigned_to_user_id = null;
            $surat->signed_document_link = $data['signed_document_link'];
            $surat->save();

            $surat->catat('final_approved', $uid, ['signed_document_link' => $data['signed_document_link']]);
        });

        return ApiResponse::success($this->muat($surat), 'Surat disetujui dan ditandatangani');
    }

    /**
     * Hapus surat.
     *
     * Hanya pembuatnya, dan hanya selama BELUM ada verifikator yang menjawab.
     * Surat yang sudah pernah dijawab adalah bagian dari jejak persetujuan;
     * menghapusnya menghilangkan bukti bahwa seseorang pernah menyetujui.
     */
    public function destroy(Request $request, $id)
    {
        $surat = Persuratan::findOrFail($id);
        $uid = $request->user()->id;

        if ($surat->user_id !== $uid) {
            return ApiResponse::error('Hanya pembuat surat yang dapat menghapusnya.', null, 403);
        }

        $sudahDijawab = $surat->verifications()->whereIn('status', ['Disetujui', 'Ditolak'])->exists();

        if ($sudahDijawab || $surat->sudahSelesai()) {
            return ApiResponse::error(
                'Surat ini sudah diproses dan tidak dapat dihapus. Ajukan pembatalan kepada penandatangannya.',
                null,
                422
            );
        }

        $surat->delete();

        return ApiResponse::success(null, 'Surat berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    private function tolakBilaSelesai(Persuratan $surat)
    {
        return $surat->sudahSelesai()
            ? ApiResponse::error('Surat ini sudah '.strtolower($surat->status).' dan tidak dapat diubah lagi.', null, 422)
            : null;
    }

    private function muat(Persuratan $surat)
    {
        return $surat->fresh()->load([
            'user:id,name', 'assignee:id,name', 'finalApprover:id,name',
            'verifications.user:id,name', 'revisions.user:id,name', 'events.actor:id,name',
        ]);
    }

    /** Batasi tautan ke inang yang diizinkan; lihat konstanta pada model. */
    private function aturanInang(): callable
    {
        return function (string $attribute, mixed $value, callable $fail) {
            $inang = parse_url((string) $value, PHP_URL_HOST);

            if (! in_array($inang, Persuratan::ALLOWED_ATTACHMENT_HOSTS, true)) {
                $fail('Hanya tautan Google Drive atau Google Docs yang diizinkan.');
            }
        };
    }
}

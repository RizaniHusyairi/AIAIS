<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Meeting;
use App\Support\CetakanPdf;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Absensi rapat.
 *
 * Endpoint publiknya (`showByToken`, `storeByToken`) adalah endpoint tulis
 * KETIGA di portal ini yang berjalan tanpa autentikasi, setelah pengaduan
 * publik dan Posko Nataru. Alasannya sama: peserta rapat berganti tiap
 * pertemuan, dan mensyaratkan akun untuk menandatangani daftar hadir membuat
 * daftarnya tidak terisi sama sekali.
 *
 * Penjaganya berlapis:
 *  - token acak-aman 48 aksara yang tidak pernah ikut respons publik;
 *  - penolakan bila absensinya sudah ditutup petugas;
 *  - pembatasan laju pada rutenya.
 *
 * DUA PENYIMPANGAN v1 YANG TIDAK DITIRU:
 *
 *  1. v1 memakai slug yang diturunkan dari judul rapat, sehingga alamatnya
 *     dapat ditebak. Daftar hadir yang dapat diisi orang luar tidak lagi
 *     membuktikan siapa yang benar-benar hadir.
 *  2. v1 menyimpan gambar tanda tangan di cakram PUBLIK. Di sini berkasnya ke
 *     cakram privat dan hanya dilayani lewat endpoint bertoken.
 */
class MeetingController extends Controller
{
    /** Batas ukuran gambar tanda tangan yang diterima, dalam bita. */
    private const MAKS_TANDA_TANGAN = 512 * 1024;

    /* ------------------------- sisi petugas ------------------------- */

    public function adminIndex(Request $request)
    {
        $items = Meeting::withCount('attendances')
            ->when($request->query('status') === 'aktif', fn ($q) => $q->where('is_active', true))
            ->when($request->query('status') === 'tutup', fn ($q) => $q->where('is_active', false))
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get();

        return ApiResponse::success($items, 'Daftar rapat');
    }

    public function adminShow($id)
    {
        $rapat = Meeting::with('attendances')->withCount('attendances')->findOrFail($id);

        return ApiResponse::success($rapat, 'Rincian rapat dan daftar hadirnya');
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->aturan(), $this->pesan());

        $rapat = new Meeting($data);
        $rapat->user_id = $request->user()->id;
        $rapat->slug = Meeting::slugBaru($data['title']);
        $rapat->public_token = Meeting::tokenBaru();
        $rapat->is_active = true;
        $rapat->save();

        return ApiResponse::success(
            $rapat->fresh()->loadCount('attendances'),
            'Rapat berhasil dibuat. Bagikan tautan absensinya kepada peserta.',
            null,
            201
        );
    }

    public function update(Request $request, $id)
    {
        $rapat = Meeting::findOrFail($id);
        $rapat->update($request->validate($this->aturan(partial: true), $this->pesan()));

        return ApiResponse::success($rapat->fresh()->loadCount('attendances'), 'Rapat berhasil diperbarui');
    }

    /**
     * Buka atau tutup absensi.
     *
     * Menutup absensi adalah cara petugas menyatakan rapatnya selesai; sesudah
     * itu tidak ada tanda tangan baru yang dapat masuk. Perilaku ini ditiru
     * dari v1 dan memang benar — daftar hadir yang masih bisa bertambah
     * berjam-jam sesudah rapat bubar tidak membuktikan kehadiran.
     */
    public function toggle($id)
    {
        $rapat = Meeting::findOrFail($id);
        $rapat->is_active = ! $rapat->is_active;
        $rapat->save();

        return ApiResponse::success(
            $rapat->fresh()->loadCount('attendances'),
            $rapat->is_active ? 'Absensi dibuka kembali' : 'Absensi ditutup'
        );
    }

    /**
     * Tautan absensi, hanya keluar lewat permintaan tersendiri.
     *
     * Tidak pernah ikut pada daftar rapat: siapa pun yang melihat token di
     * layar dapat mengisi daftar hadir. Polanya sama dengan token Posko Nataru.
     */
    public function token($id)
    {
        $rapat = Meeting::findOrFail($id);

        return ApiResponse::success([
            'token' => $rapat->public_token,
            'path' => '/absensi/'.$rapat->public_token,
        ], 'Tautan absensi rapat');
    }

    /** Terbitkan token baru; tautan lama langsung mati. */
    public function rotateToken($id)
    {
        $rapat = Meeting::findOrFail($id);
        $rapat->public_token = Meeting::tokenBaru();
        $rapat->save();

        return ApiResponse::success([
            'token' => $rapat->public_token,
            'path' => '/absensi/'.$rapat->public_token,
        ], 'Tautan absensi diperbarui. Tautan lama tidak berlaku lagi.');
    }

    public function destroyAttendance($id)
    {
        $peserta = Attendance::findOrFail($id);
        $peserta->hapusBerkas();
        $peserta->delete();

        return ApiResponse::success(null, 'Kehadiran berhasil dihapus');
    }

    /** Unduh gambar tanda tangan satu peserta. */
    public function downloadSignature($id)
    {
        $peserta = Attendance::findOrFail($id);
        $lintasan = $peserta->getAttributes()['signature'] ?? null;

        if (! $lintasan || ! Storage::disk(Attendance::DISK)->exists($lintasan)) {
            return ApiResponse::error('Tanda tangan tidak ditemukan', null, 404);
        }

        return Storage::disk(Attendance::DISK)->download($lintasan);
    }

    public function destroy($id)
    {
        $rapat = Meeting::with('attendances')->findOrFail($id);

        foreach ($rapat->attendances as $peserta) {
            $peserta->hapusBerkas();
        }

        $jumlah = $rapat->attendances->count();
        $rapat->delete();

        return ApiResponse::success(null, $jumlah > 0
            ? "Rapat berhasil dihapus beserta {$jumlah} kehadiran dan tanda tangannya"
            : 'Rapat berhasil dihapus');
    }

    /**
     * Cetak daftar hadir.
     *
     * Gambar tanda tangan disematkan sebagai data URI, bukan lintasan berkas:
     * DomPDF membaca berkas lewat sistem berkas, dan menunjuk ke cakram privat
     * dari templat berarti membuka jalan bagi templat lain untuk membaca
     * berkas sembarangan.
     */
    public function exportPdf(Request $request, $id)
    {
        $rapat = Meeting::with('attendances')->findOrFail($id);

        $peserta = $rapat->attendances->map(function (Attendance $a) {
            return [
                'name' => $a->name,
                'department' => $a->department,
                'phone' => $a->phone,
                'signature' => $this->tandaTanganDataUri($a),
            ];
        });

        $pdf = Pdf::loadView('pdf.attendance', [
            'judul' => 'Daftar Hadir Rapat',
            'periode' => $rapat->title,
            'dicetakPada' => CetakanPdf::dicetakPada(),
            'dicetakOleh' => $request->user()?->name,
            'rapat' => $rapat,
            'peserta' => $peserta,
        ])->setPaper('a4', 'portrait');

        return $pdf->download('daftar-hadir-'.$rapat->slug.'.pdf');
    }

    /* ------------------------- sisi peserta ------------------------- */

    /** Keterangan rapat dari tautan bertoken. */
    public function showByToken(string $token)
    {
        $rapat = Meeting::where('public_token', $token)->first();

        if ($rapat === null) {
            return ApiResponse::error('Tautan absensi tidak dikenali.', null, 404);
        }

        return ApiResponse::success([
            'title' => $rapat->title,
            'date' => $rapat->date?->toDateString(),
            'start_time' => $rapat->start_time,
            'location' => $rapat->location,
            'organizer' => $rapat->organizer,
            'is_active' => (bool) $rapat->is_active,
        ], 'Keterangan rapat');
    }

    public function storeByToken(Request $request, string $token)
    {
        $rapat = Meeting::where('public_token', $token)->first();

        if ($rapat === null) {
            return ApiResponse::error('Tautan absensi tidak dikenali.', null, 404);
        }

        if (! $rapat->is_active) {
            return ApiResponse::error('Absensi rapat ini sudah ditutup.', null, 422);
        }

        $data = $request->validate([
            'name' => 'required|string|max:125',
            'department' => 'required|string|max:125',
            'phone' => 'nullable|string|max:125',
            'signature' => 'required|string',
        ], [
            'name.required' => 'Nama wajib diisi.',
            'department.required' => 'Unit kerja atau instansi wajib diisi.',
            'signature.required' => 'Tanda tangan wajib diisi. Goreskan tanda tangan Anda pada kotak yang tersedia.',
        ]);

        $lintasan = $this->simpanTandaTangan($data['signature']);

        if ($lintasan === null) {
            return ApiResponse::error(
                'Tanda tangan tidak dapat dibaca. Ulangi goresan Anda pada kotak yang tersedia.',
                null,
                422
            );
        }

        $peserta = new Attendance([
            'meeting_id' => $rapat->id,
            'name' => $data['name'],
            'department' => $data['department'],
            'phone' => $data['phone'] ?? null,
        ]);
        $peserta->signature = $lintasan;
        $peserta->save();

        return ApiResponse::success(
            ['name' => $peserta->name],
            'Terima kasih, kehadiran Anda sudah tercatat.',
            null,
            201
        );
    }

    /* -------------------------------------------------------------- */

    /**
     * Simpan gambar tanda tangan dari kanvas (data URI PNG).
     *
     * Isinya TIDAK dipercaya begitu saja. Yang diterima hanya PNG, ukurannya
     * dibatasi, dan hasil dekode diperiksa benar-benar gambar — data URI
     * datang dari peramban mana pun tanpa autentikasi, jadi ia harus
     * diperlakukan seperti unggahan berkas dari orang asing.
     */
    private function simpanTandaTangan(string $dataUri): ?string
    {
        if (! preg_match('#^data:image/png;base64,#', $dataUri)) {
            return null;
        }

        $base64 = substr($dataUri, strlen('data:image/png;base64,'));
        $biner = base64_decode(strtr($base64, ' ', '+'), true);

        if ($biner === false || strlen($biner) === 0 || strlen($biner) > self::MAKS_TANDA_TANGAN) {
            return null;
        }

        // Pastikan hasil dekodenya memang PNG, bukan berkas lain yang diberi
        // awalan data URI PNG.
        $info = @getimagesizefromstring($biner);

        if ($info === false || ($info[2] ?? null) !== IMAGETYPE_PNG) {
            return null;
        }

        $lintasan = 'meetings/signatures/'.Str::uuid().'.png';
        Storage::disk(Attendance::DISK)->put($lintasan, $biner);

        return $lintasan;
    }

    /** Gambar tanda tangan sebagai data URI, untuk disematkan pada PDF. */
    private function tandaTanganDataUri(Attendance $peserta): ?string
    {
        $lintasan = $peserta->getAttributes()['signature'] ?? null;

        if (! $lintasan || ! Storage::disk(Attendance::DISK)->exists($lintasan)) {
            return null;
        }

        return 'data:image/png;base64,'.base64_encode(Storage::disk(Attendance::DISK)->get($lintasan));
    }

    /** @return array<string, mixed> */
    private function aturan(bool $partial = false): array
    {
        $ada = $partial ? 'sometimes|' : '';

        return [
            'title' => $ada.'required|string|max:125',
            'date' => $ada.'required|date',
            'start_time' => $ada.'required|date_format:H:i',
            'location' => $ada.'required|string|max:125',
            'organizer' => $ada.'required|string|max:125',
            'organizer_nip' => 'nullable|string|max:125',
        ];
    }

    /** @return array<string, string> */
    private function pesan(): array
    {
        return [
            'title.required' => 'Judul rapat wajib diisi.',
            'date.required' => 'Tanggal rapat wajib diisi.',
            'start_time.required' => 'Jam mulai wajib diisi.',
            'start_time.date_format' => 'Jam mulai harus dalam format jam:menit, misalnya 09:30.',
            'location.required' => 'Tempat rapat wajib diisi.',
            'organizer.required' => 'Penyelenggara wajib diisi.',
        ];
    }
}

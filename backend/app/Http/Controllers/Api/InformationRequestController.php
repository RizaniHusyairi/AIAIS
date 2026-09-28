<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\InformationRequest;
use App\Support\CetakanPdf;
use App\Support\KabarPemohon;
use App\Support\Notifikasi;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Permohonan Informasi Publik — UU 14/2008.
 *
 * Daftar pilihan mengikuti aptpairport.id. Perbedaan dari v1 yang perlu
 * dipertahankan:
 *
 *   1. Identitas pemohon benar-benar disimpan. Di v1, `nama`, `alamat`,
 *      `no_hp`, dan `email` dikirim ke `create()` padahal bukan kolom tabel
 *      dan bukan `$fillable`, jadi diam-diam dibuang.
 *   2. Berkas disimpan pada cakram PRIVAT. Di v1 berkas syarat ditaruh di cakram
 *      `public`, sehingga scan KTP warga dapat dibuka siapa saja yang tahu
 *      atau menebak URL-nya. Di sini hanya petugas bertoken yang bisa.
 *   3. Pemohon menerima nomor tiket dan dapat melacak statusnya sendiri,
 *      mengikuti pola `ComplaintController` yang sudah ada di portal ini.
 *   4. Surat pernyataan tidak lagi menjadi syarat pengajuan baru; berkas
 *      permohonan lama tetap dapat diunduh petugas dari arsip privat.
 */
class InformationRequestController extends Controller
{
    /** Cakram penyimpanan berkas syarat. TIDAK boleh 'public'. */
    private const DISK = 'local';

    private const DIR_KTP = 'permohonan-informasi/ktp';

    /**
     * Cara memperoleh informasi beserta cara mendapat salinan yang cocok.
     *
     * Dua pilihan pertama disalin apa adanya dari formulir v1; "Soft Copy"
     * ditambahkan di v2. Di v1 keenam cara salinan boleh dipadukan dengan
     * cara memperoleh apa pun, sehingga pemohon bisa meminta salinan kertas
     * lewat email. Di sini salinan kertas hanya lewat jalur fisik, salinan
     * digital hanya lewat jalur digital, dan "melihat/membaca" tidak
     * memerlukan salinan sama sekali.
     *
     * HARUS selaras dengan DUKUNGAN_SALINAN di
     * frontend/src/app/ppid/pengajuan-informasi/aturan.ts.
     */
    private const SALINAN_PER_CARA = [
        'Melihat/Membaca/Mendengarkan/Mencatat' => [],
        'Mendapatkan Copy Salinan (Hard Copy)' => ['Langsung', 'Kurir', 'Pos', 'Fax'],
        'Mendapatkan Copy Salinan (Soft Copy)' => ['Email', 'Whatsapp'],
    ];

    /** Cara salinan yang sah untuk gabungan cara memperoleh yang dipilih. */
    private static function salinanDiizinkan(array $caraMemperoleh): array
    {
        $izin = [];
        foreach ($caraMemperoleh as $cara) {
            $izin = array_merge($izin, self::SALINAN_PER_CARA[$cara] ?? []);
        }
        return array_values(array_unique($izin));
    }

    /**
     * Tenggat jawaban menurut UU 14/2008 Pasal 22: 10 hari kerja sejak
     * permohonan diterima. Dihitung sebagai HARI KERJA, bukan hari kalender —
     * inilah angka yang juga tertulis di halaman SOP PPID.
     */
    private const RESPONSE_WORKING_DAYS = 10;

    private function addWorkingDays(Carbon $start, int $days): Carbon
    {
        $date = $start->copy();
        while ($days > 0) {
            $date->addDay();
            if (!$date->isWeekend()) {
                $days--;
            }
        }
        return $date;
    }

    public function store(Request $request)
    {
        // Orang lazim mengetik nomor dengan pemisah ("0812-3456-7890",
        // "+62 812 3456 7890"). Pemisahnya dibuang sebelum validasi supaya
        // nomor yang sah tidak ditolak dan yang tersimpan seragam.
        if (is_string($request->input('phone'))) {
            $request->merge(['phone' => preg_replace('/[\s\-.()]/', '', $request->input('phone'))]);
        }

        $izinSalinan = self::salinanDiizinkan(array_filter((array) $request->input('obtain_method', []), 'is_string'));

        $validated = $request->validate([
            'ktp' => 'required|file|mimes:jpg,jpeg,png,pdf|max:2048',
            'request_from' => 'required|string|max:255',
            'name' => 'required|string|max:255',
            'address' => 'required|string',
            'occupation' => 'required|string|max:255',
            // Opsional: KTP sudah cukup sebagai identitas, dan pemohon tanpa
            // NPWP (pelajar, mahasiswa) tetap berhak mengajukan.
            'npwp' => 'nullable|string|max:100',
            'phone' => 'required|string|regex:/^\+?\d{10,13}$/|max:20',
            'email' => 'required|email|max:255',
            'information_details' => 'required|string',
            'information_purpose' => 'required|string',
            'obtain_method' => 'required|array|min:1',
            'obtain_method.*' => ['required', 'string', Rule::in(array_keys(self::SALINAN_PER_CARA))],
            // Wajib hanya bila cara memperoleh yang dipilih memang menghasilkan
            // salinan; pemohon yang sekadar ingin melihat tidak ditanya.
            'copy_method' => [Rule::requiredIf($izinSalinan !== []), 'array'],
            // Persetujuan pemohon menerima salinan bukti lewat tiap kanal.
            'kabar_email' => 'sometimes|boolean',
            'kabar_whatsapp' => 'sometimes|boolean',
            'copy_method.*' => [
                'required', 'string',
                function (string $attribute, mixed $value, \Closure $fail) use ($izinSalinan) {
                    if ($izinSalinan === []) {
                        $fail('Cara memperoleh yang dipilih tidak memerlukan salinan.');
                    } elseif (!in_array($value, $izinSalinan, true)) {
                        $fail("Salinan lewat {$value} tidak sesuai dengan cara memperoleh yang dipilih.");
                    }
                },
            ],
        ], [
            'ktp.required' => 'Scan KTP wajib diunggah.',
            'ktp.mimes' => 'Scan KTP harus berformat JPG, PNG, atau PDF.',
            'ktp.max' => 'Ukuran file KTP tidak boleh melebihi 2MB.',
            'request_from.required' => 'Asal surat permintaan wajib diisi.',
            'name.required' => 'Nama lengkap wajib diisi.',
            'address.required' => 'Alamat wajib diisi.',
            'occupation.required' => 'Pekerjaan wajib diisi.',
            'phone.required' => 'Nomor HP/WA wajib diisi.',
            'phone.regex' => 'Nomor HP/WA tidak valid.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Email tidak valid.',
            'information_details.required' => 'Rincian informasi wajib diisi.',
            'information_purpose.required' => 'Tujuan penggunaan informasi wajib diisi.',
            'obtain_method.required' => 'Cara memperoleh informasi wajib dipilih.',
            'obtain_method.min' => 'Pilih setidaknya satu cara memperoleh informasi.',
            // Pesan untuk butir larik memakai wildcard `.*` supaya berlaku
            // untuk pilihan ke berapa pun; tanpa ini Laravel jatuh ke pesan
            // bawaan berbahasa Inggris seperti "The selected … is invalid".
            'obtain_method.*.in' => 'Pilihan cara memperoleh informasi tidak dikenali.',
            'copy_method.required' => 'Cara mendapat salinan informasi wajib dipilih.',
        ]);

        $ktpPath = null;

        try {
            // Nama berkas diacak, bukan memakai nama asli unggahan. Nama asli
            // kerap memuat nama dan NIK pemohon, dan v1 menyimpannya apa
            // adanya sehingga daftar direktori membocorkan identitas.
            $ktpPath = $request->file('ktp')->storeAs(
                self::DIR_KTP,
                Str::uuid() . '.' . $request->file('ktp')->extension(),
                self::DISK,
            );

            // "Diterima" berarti tanggal di Samarinda, bukan tanggal UTC.
            // `APP_TIMEZONE` sengaja UTC, sehingga permohonan pukul 00:00–07:59
            // WITA dulu tercatat sebagai hari sebelumnya: awalan tiket mundur
            // sehari dan tenggatnya maju satu hari kerja dari yang dijanjikan
            // formulir. Cap waktu `created_at` tetap UTC seperti kolom lain.
            $now = Carbon::now(CetakanPdf::ZONA);

            $record = InformationRequest::create([
                'ticket_number' => 'PIP-' . $now->format('Ymd') . '-' . strtoupper(Str::random(4)),
                'ktp_path' => $ktpPath,
                'request_from' => $validated['request_from'],
                'name' => $validated['name'],
                'address' => $validated['address'],
                'occupation' => $validated['occupation'],
                'npwp' => $validated['npwp'] ?? null,
                'phone' => $validated['phone'],
                'email' => $validated['email'],
                'information_details' => $validated['information_details'],
                'information_purpose' => $validated['information_purpose'],
                'obtain_method' => implode(', ', $validated['obtain_method']),
                'copy_method' => !empty($validated['copy_method']) ? implode(', ', $validated['copy_method']) : null,
                'status' => 'submitted',
                // Disimpan sebagai tanggal polos supaya kolom DATE tidak
                // menafsirkan ulang jamnya dalam zona lain.
                'due_date' => $this->addWorkingDays($now, self::RESPONSE_WORKING_DAYS)->toDateString(),
            ]);

            Notifikasi::kirim('informasi', $record->ticket_number);

            // Salinan bukti ke pemohon: jalan pemulihan bila tiket di layar
            // tidak sempat dicatat. Pemohon memilih kanalnya di formulir;
            // klien lama yang tidak mengirim pilihan mendapat keduanya.
            $kabar = KabarPemohon::kirim(
                $record,
                $request->boolean('kabar_email', true),
                $request->boolean('kabar_whatsapp', true),
            );

            return ApiResponse::success([
                'ticket_number' => $record->ticket_number,
                'status' => $record->status,
                'submitted_at' => $record->created_at,
                'due_date' => $record->due_date,
                'response_working_days' => self::RESPONSE_WORKING_DAYS,
                'kabar' => $kabar,
            ], 'Permohonan informasi publik berhasil dikirim. Simpan nomor tiket Anda.', null, 201);
        } catch (\Throwable $e) {
            // Berkas sudah telanjur tersimpan tetapi barisnya gagal dibuat —
            // hapus lagi supaya scan KTP tidak menumpuk tanpa pemilik. Inilah
            // yang terjadi di v1: berkas diunggah lebih dulu, lalu insert-nya
            // selalu gagal karena `user_id` NOT NULL.
            if ($ktpPath) {
                Storage::disk(self::DISK)->delete($ktpPath);
            }

            Log::error('Gagal menyimpan permohonan informasi publik', ['error' => $e->getMessage()]);

            return ApiResponse::error(
                'Permohonan tidak dapat disimpan. Silakan coba lagi beberapa saat lagi.',
                null,
                500,
            );
        }
    }

    /** Pelacakan mandiri oleh pemohon. Tidak memerlukan token. */
    public function track(string $ticket)
    {
        $record = InformationRequest::where('ticket_number', $ticket)->first();

        if (!$record) {
            return ApiResponse::error('Nomor tiket permohonan tidak ditemukan', null, 404);
        }

        return ApiResponse::success($record->publicView(), 'Status permohonan informasi');
    }

    /* -------------------------------------------------------------- */
    /*  Admin — wajib token                                            */
    /* -------------------------------------------------------------- */

    public function index()
    {
        $records = InformationRequest::orderBy('created_at', 'desc')->get();
        return ApiResponse::success($records, 'Daftar permohonan informasi publik');
    }

    public function respond(Request $request, $id)
    {
        $record = InformationRequest::findOrFail($id);

        $request->validate([
            'status' => 'required|in:in_progress,fulfilled,rejected',
            'admin_response' => 'required|string',
            'response_link' => 'nullable|url',
            'is_extended' => 'sometimes|boolean',
        ]);

        $record->update([
            'status' => $request->status,
            'admin_response' => $request->admin_response,
            'response_link' => $request->response_link,
            'responded_at' => now(),
            // Perpanjangan 7 hari kerja sesuai UU 14/2008 Pasal 22 ayat (7).
            'is_extended' => $request->boolean('is_extended', $record->is_extended),
            'due_date' => $request->boolean('is_extended') && !$record->is_extended
                ? $this->addWorkingDays(Carbon::parse($record->due_date), 7)
                : $record->due_date,
        ]);

        return ApiResponse::success($record, 'Permohonan informasi berhasil diperbarui');
    }

    /**
     * Unduh berkas syarat. Hanya untuk petugas bertoken.
     *
     * Berkasnya berada di cakram privat sehingga tidak punya URL publik;
     * inilah satu-satunya jalan membukanya.
     */
    public function file($id, string $jenis)
    {
        $record = InformationRequest::findOrFail($id);

        $path = match ($jenis) {
            'ktp' => $record->ktp_path,
            'surat-pernyataan' => $record->statement_path,
            default => null,
        };

        if (!$path || !Storage::disk(self::DISK)->exists($path)) {
            return ApiResponse::error('Berkas tidak ditemukan', null, 404);
        }

        return Storage::disk(self::DISK)->download($path);
    }
}

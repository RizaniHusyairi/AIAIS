<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\OjtStudent;
use App\Support\CetakanPdf;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Support\Notifikasi;

/**
 * Peserta OJT (praktik kerja lapangan).
 *
 * Bukan pengajuan setuju/tolak melainkan rekam peserta: mendaftar, berjalan,
 * selesai. Nilainya masuk ke sertifikat resmi, jadi rata-rata, predikat, dan
 * huruf mutunya DIHITUNG SERVER — lihat `OjtStudent::hitungNilai()`.
 *
 * Berkasnya (kartu identitas, pas foto, sertifikat) semuanya di cakram privat.
 * Ini modul dengan data pribadi terdalam di portal setelah permohonan
 * informasi publik, dan berkasnya hanya dilayani lewat endpoint bertoken.
 */
class OjtController extends Controller
{
    /** Berkas yang boleh diunggah, beserta aturan validasinya. */
    private const BERKAS = [
        'identity_card' => ['kolom' => 'identity_card_path', 'rule' => 'file|mimes:jpg,jpeg,png,pdf|max:2048'],
        'photo' => ['kolom' => 'photo_path', 'rule' => 'file|mimes:jpg,jpeg,png|max:2048'],
        'final_certificate' => ['kolom' => 'final_certificate_path', 'rule' => 'file|mimes:pdf|max:2048'],
    ];

    /* ------------------------- sisi peserta ------------------------- */

    public function index(Request $request)
    {
        $items = OjtStudent::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($items, 'Data OJT Anda');
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->aturan(), $this->pesan());

        $item = new OjtStudent($this->rapikan($data, baru: true));
        $item->user_id = $request->user()->id;
        $item->status = 'Mendaftar';
        $item->save();

        $this->simpanBerkas($request, $item);

        Notifikasi::kirim('pengajuan', null, 'Pendaftaran OJT', '/admin/ojt');

        return ApiResponse::success($item->fresh(), 'Pendaftaran OJT berhasil dikirim', null, 201);
    }

    public function update(Request $request, $id)
    {
        $item = $this->milikPeserta($request, $id);

        if (! $item instanceof OjtStudent) {
            return $item;
        }

        // Data hanya dapat disunting selama belum diproses. Sesudah petugas
        // menjalankannya, perubahan identitas peserta harus lewat petugas —
        // nama dan nomor identitas inilah yang tercetak di sertifikat.
        if ($item->status !== 'Mendaftar') {
            return ApiResponse::error(
                'Data OJT yang sudah diproses petugas tidak dapat diubah sendiri. Hubungi petugas bila ada yang keliru.',
                null,
                422
            );
        }

        $data = $request->validate($this->aturan(partial: true), $this->pesan());

        $item->update($this->rapikan($data));
        $this->simpanBerkas($request, $item);

        return ApiResponse::success($item->fresh(), 'Data OJT berhasil diperbarui');
    }

    public function downloadFile(Request $request, $id, string $jenis)
    {
        $item = $this->milikPeserta($request, $id);

        return $item instanceof OjtStudent ? $this->kirimBerkas($item, $jenis) : $item;
    }

    /* ------------------------- sisi petugas ------------------------- */

    public function adminIndex(Request $request)
    {
        $items = OjtStudent::with('user:id,name,email,phone')
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($items, 'Daftar peserta OJT');
    }

    public function adminDownloadFile($id, string $jenis)
    {
        return $this->kirimBerkas(OjtStudent::findOrFail($id), $jenis);
    }

    public function updateStatus(Request $request, $id)
    {
        $item = OjtStudent::findOrFail($id);

        $data = $request->validate([
            'status' => ['required', Rule::in(OjtStudent::STATUSES)],
            'staff_notes' => 'nullable|string',
        ], [
            'status.required' => 'Status peserta wajib dipilih.',
            'status.in' => 'Status peserta tidak dikenali.',
        ]);

        $item->status = $data['status'];
        $item->staff_notes = $data['staff_notes'] ?? null;
        $item->save();

        return ApiResponse::success($item->fresh(), 'Status peserta OJT berhasil diperbarui');
    }

    /**
     * Simpan daftar nilai.
     *
     * Rata-rata, predikat, dan huruf mutu TIDAK diterima dari pengirim —
     * ketiganya dihitung ulang di server. Nilai ini tercetak pada sertifikat,
     * dan menerima rata-rata kiriman berarti mempercayai perhitungan yang
     * tidak dapat diperiksa. Pola yang sama dipakai load factor Posko Nataru.
     */
    public function updateGrades(Request $request, $id)
    {
        $item = OjtStudent::findOrFail($id);

        // Nilai DIKUNCI sesudah sertifikat bertanda tangan diunggah. Angka yang
        // berubah sesudah sertifikatnya tercetak membuat sertifikat itu
        // berbohong — dan sertifikatnya sudah beredar di tangan peserta.
        if ($item->is_finalized) {
            return ApiResponse::error(
                'Nilai peserta ini sudah dikunci karena sertifikatnya telah diterbitkan. Batalkan finalisasi lebih dahulu bila memang ada yang keliru.',
                null,
                422
            );
        }

        $data = $request->validate([
            'grades' => 'required|array|min:1',
            // Kategori penilaian (Hard Skill, Soft Skill, ...) — v1 menyimpannya
            // di setiap baris. Tanpa aturan ini `validate()` membuangnya, dan
            // menyimpan ulang nilai peserta lama diam-diam menghapus kategorinya.
            'grades.*.type' => 'nullable|string|max:60',
            'grades.*.component' => 'required|string|max:125',
            'grades.*.score' => 'required|numeric|min:0|max:100',
        ], [
            'grades.required' => 'Daftar nilai wajib diisi.',
            'grades.*.component.required' => 'Nama komponen penilaian wajib diisi.',
            'grades.*.score.required' => 'Nilai wajib diisi.',
            'grades.*.score.numeric' => 'Nilai harus berupa angka.',
            'grades.*.score.max' => 'Nilai tidak boleh melebihi 100.',
        ]);

        $item->grades = $data['grades'];

        foreach (OjtStudent::hitungNilai($data['grades']) as $kolom => $nilai) {
            $item->{$kolom} = $nilai;
        }

        $item->save();

        return ApiResponse::success($item->fresh(), 'Nilai peserta OJT berhasil disimpan');
    }

    /**
     * Cetak sertifikat sebagai PDF.
     *
     * Menolak bila nilainya belum ada. Sertifikat OJT tanpa nilai bukan
     * dokumen yang setengah jadi — ia dokumen yang tidak berarti apa pun,
     * dan mencetaknya justru mengundang sertifikat kosong ikut beredar.
     */
    public function exportCertificate(Request $request, $id)
    {
        $item = OjtStudent::findOrFail($id);

        if ($item->average_score === null) {
            return ApiResponse::error(
                'Nilai peserta ini belum diisi, sehingga sertifikatnya belum dapat dicetak.',
                null,
                422
            );
        }

        $pdf = Pdf::loadView('pdf.ojt-certificate', [
            'judul' => 'Sertifikat OJT',
            // Tanggal di blok tanda tangan adalah tanggal cetak, seperti v1:
            // sertifikat dicetak tepat sebelum dimintakan tanda tangan.
            // Zonanya WITA — di UTC, cetakan pagi hari bertanggal kemarin.
            'dicetak' => Carbon::now(CetakanPdf::ZONA),
            'peserta' => $item,
            'latar' => $this->dataUri(resource_path('pdf/sertifikat-ojt-bg.png')),
            'foto' => $this->fotoPeserta($item),
        ])->setPaper('a4', 'landscape');

        // `stream` (inline), bukan `download`: v1 membukanya sebagai pratinjau
        // agar petugas memeriksanya dulu sebelum dicetak.
        return $pdf->stream('sertifikat-ojt-'.Str::slug($item->name).'.pdf');
    }

    /** Pas foto peserta sebagai data URI, dari disk mana pun ia tersimpan. */
    private function fotoPeserta(OjtStudent $item): ?string
    {
        $lintasan = $item->getAttributes()['photo_path'] ?? null;
        $disk = OjtStudent::diskUntuk($lintasan);

        if ($disk === null) {
            return null;
        }

        $mime = Storage::disk($disk)->mimeType($lintasan) ?: 'image/jpeg';

        // DomPDF hanya dapat menggambar JPEG/PNG/GIF; berkas lain dilewati
        // daripada membuat seluruh sertifikat gagal dicetak.
        if (! in_array($mime, ['image/jpeg', 'image/png', 'image/gif'], true)) {
            return null;
        }

        return 'data:'.$mime.';base64,'.base64_encode(Storage::disk($disk)->get($lintasan));
    }

    private function dataUri(string $berkas): ?string
    {
        return is_file($berkas)
            ? 'data:'.mime_content_type($berkas).';base64,'.base64_encode(file_get_contents($berkas))
            : null;
    }

    /**
     * Finalisasi: unggah sertifikat yang sudah ditandatangani.
     *
     * Sesudah ini nilainya terkunci. Alurnya meniru v1 — cetak, mintakan tanda
     * tangan, unggah kembali — tetapi v1 tidak mengunci apa pun sesudahnya.
     */
    public function finalize(Request $request, $id)
    {
        $item = OjtStudent::findOrFail($id);

        if ($item->average_score === null) {
            return ApiResponse::error(
                'Nilai peserta ini belum diisi, sehingga belum dapat difinalisasi.',
                null,
                422
            );
        }

        $request->validate([
            'signed_certificate' => 'required|file|mimes:pdf|max:4096',
        ], [
            'signed_certificate.required' => 'Sertifikat bertanda tangan wajib diunggah.',
            'signed_certificate.mimes' => 'Sertifikat harus berformat PDF.',
            'signed_certificate.max' => 'Ukuran sertifikat maksimal 4MB.',
        ]);

        $lama = $item->getAttributes()['final_certificate_path'] ?? null;

        OjtStudent::hapusSatu($lama);

        $item->final_certificate_path = $request->file('signed_certificate')->storeAs(
            'ojt/certificates',
            Str::uuid().'.pdf',
            OjtStudent::DISK
        );
        $item->status = 'Selesai';
        $item->save();

        return ApiResponse::success(
            $item->fresh(),
            'Sertifikat tersimpan dan nilai peserta kini terkunci.'
        );
    }

    /**
     * Batalkan finalisasi.
     *
     * Ada karena kekeliruan nilai memang mungkin baru ketahuan sesudah
     * sertifikat terbit, dan jalan buntu tanpa jalan keluar akan mendorong
     * orang menyuntingnya langsung lewat basis data. Sertifikat lamanya
     * DIHAPUS — membiarkannya berarti ada dua sertifikat dengan nilai berbeda.
     */
    public function unfinalize($id)
    {
        $item = OjtStudent::findOrFail($id);

        if (! $item->is_finalized) {
            return ApiResponse::error('Peserta ini belum difinalisasi.', null, 422);
        }

        OjtStudent::hapusSatu($item->getAttributes()['final_certificate_path']);

        $item->final_certificate_path = null;
        $item->save();

        return ApiResponse::success(
            $item->fresh(),
            'Finalisasi dibatalkan dan sertifikat lama dihapus. Nilai dapat disunting kembali.'
        );
    }

    public function destroy($id)
    {
        $item = OjtStudent::findOrFail($id);
        $item->hapusBerkas();
        $item->delete();

        return ApiResponse::success(null, 'Data peserta OJT berhasil dihapus beserta berkasnya');
    }

    /* -------------------------------------------------------------- */

    /** @return array<string, mixed> */
    private function aturan(bool $partial = false): array
    {
        $ada = $partial ? 'sometimes|' : '';

        $aturan = [
            'name' => $ada.'required|string|max:125',
            'id_number' => $ada.'required|string|max:125',
            'birth_place' => $ada.'required|string|max:125',
            'birth_date' => $ada.'required|date|before:today',
            'address' => $ada.'required|string',
            'institution' => $ada.'required|string|max:125',
            'major' => $ada.'required|string|max:125',
            'duration' => $ada.'required|string|max:125',
            'start_date' => $ada.'required|date',
            'end_date' => $ada.'required|date|after_or_equal:start_date',
            'phone_number' => $ada.'required|string|max:125',
            'supervisors' => 'nullable|array',
            'supervisors.*' => 'string|max:125',
            'work_units' => 'nullable|array',
            'work_units.*' => 'string|max:125',
        ];

        foreach (self::BERKAS as $medan => $def) {
            $aturan[$medan] = 'nullable|'.$def['rule'];
        }

        return $aturan;
    }

    /** @return array<string, string> */
    private function pesan(): array
    {
        return [
            'name.required' => 'Nama peserta wajib diisi.',
            'id_number.required' => 'Nomor induk/identitas wajib diisi.',
            'birth_place.required' => 'Tempat lahir wajib diisi.',
            'birth_date.required' => 'Tanggal lahir wajib diisi.',
            'birth_date.before' => 'Tanggal lahir harus sebelum hari ini.',
            'address.required' => 'Alamat wajib diisi.',
            'institution.required' => 'Asal institusi wajib diisi.',
            'major.required' => 'Jurusan wajib diisi.',
            'duration.required' => 'Lama pelaksanaan wajib diisi.',
            'start_date.required' => 'Tanggal mulai wajib diisi.',
            'end_date.required' => 'Tanggal selesai wajib diisi.',
            'end_date.after_or_equal' => 'Tanggal selesai tidak boleh mendahului tanggal mulai.',
            'phone_number.required' => 'Nomor telepon wajib diisi.',
            'identity_card.mimes' => 'Kartu identitas harus berformat JPG, PNG, atau PDF.',
            'photo.mimes' => 'Pas foto harus berformat JPG atau PNG.',
            'final_certificate.mimes' => 'Sertifikat harus berformat PDF.',
        ];
    }

    /**
     * Buang medan berkas, lalu pastikan kolom JSON tidak pernah kosong.
     *
     * Berkas ditangani `simpanBerkas()`; membiarkannya lewat `fill()` akan
     * mencoba menyimpan objek UploadedFile ke kolom teks.
     *
     * `supervisors` dan `work_units` bertipe JSON NOT NULL tanpa nilai bawaan
     * di v1, sehingga menghilangkannya membuat penyisipan GAGAL di tingkat
     * SQL — bukan gagal validasi yang terbaca. Padahal keduanya memang belum
     * diketahui saat peserta mendaftar: pembimbing dan unit kerja ditentukan
     * petugas kemudian. Karena itu diisi larik kosong, bukan diwajibkan.
     *
     * Nilai bawaan itu HANYA berlaku saat pembuatan. Pada pembaruan, kolom
     * yang tidak dikirim harus dibiarkan apa adanya — mengisinya larik kosong
     * akan menghapus daftar pembimbing yang sudah ditetapkan petugas, hanya
     * karena peserta menyunting nomor teleponnya.
     */
    private function rapikan(array $data, bool $baru = false): array
    {
        $bersih = array_diff_key($data, array_flip(array_keys(self::BERKAS)));

        foreach (['supervisors', 'work_units'] as $kolom) {
            if (array_key_exists($kolom, $bersih)) {
                $bersih[$kolom] = array_values($bersih[$kolom] ?? []);
            } elseif ($baru) {
                $bersih[$kolom] = [];
            }
        }

        return $bersih;
    }

    private function simpanBerkas(Request $request, OjtStudent $item): void
    {
        foreach (self::BERKAS as $medan => $def) {
            if (! $request->hasFile($medan)) {
                continue;
            }

            $lama = $item->getAttributes()[$def['kolom']] ?? null;

            OjtStudent::hapusSatu($lama);

            $berkas = $request->file($medan);

            $item->{$def['kolom']} = $berkas->storeAs(
                'ojt',
                Str::uuid().'.'.$berkas->getClientOriginalExtension(),
                OjtStudent::DISK
            );
        }

        $item->save();
    }

    private function milikPeserta(Request $request, $id)
    {
        $item = OjtStudent::where('id', $id)->where('user_id', $request->user()->id)->first();

        return $item ?? ApiResponse::error('Data OJT tidak ditemukan', null, 404);
    }

    private function kirimBerkas(OjtStudent $item, string $jenis)
    {
        $def = self::BERKAS[$jenis] ?? null;

        if ($def === null) {
            return ApiResponse::error('Jenis berkas tidak dikenali', null, 404);
        }

        $lintasan = $item->getAttributes()[$def['kolom']] ?? null;

        $disk = OjtStudent::diskUntuk($lintasan);

        if ($disk === null) {
            return ApiResponse::error('Berkas tidak ditemukan', null, 404);
        }

        return Storage::disk($disk)->download($lintasan);
    }
}

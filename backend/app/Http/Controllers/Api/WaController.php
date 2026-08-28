<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\WaCredential;
use App\Models\WaRecipient;
use App\Notifications\AktivitasPusatBantuan;
use App\Services\Notifikasi\WhatsAppGateway;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Notifikasi WhatsApp — kredensial, nomor piket, dan kiriman uji.
 *
 * SELURUH endpoint di kelas ini hanya hidup di dalam grup `admin`. Tidak ada
 * padanan publiknya, dan jangan dibuatkan: isinya kunci gateway dan nomor
 * ponsel petugas. Lihat migrasi `create_wa_tables` untuk kewajiban PDP yang
 * melekat padanya.
 *
 * Sakelar, alamat endpoint, dan pagar harian TIDAK ada di sini — ketiganya
 * bukan rahasia dan tinggal di tabel `settings` bersama penyetelan tampilan
 * lain, disunting lewat `SettingController`.
 */
class WaController extends Controller
{
    /**
     * Keadaan sambungan untuk panel.
     *
     * TIDAK PERNAH mengembalikan kuncinya. Yang dikirim hanya cukup untuk
     * petugas memastikan sambungannya benar: apakah kunci terpasang, empat
     * huruf terakhirnya, perangkat mana, dan berapa sisa kuota hari ini.
     */
    public function status(WhatsAppGateway $gateway)
    {
        $kredensial = WaCredential::aktif();

        return ApiResponse::success([
            'terpasang' => (bool) $kredensial,
            'petunjuk' => $kredensial?->petunjuk(),
            'device_id' => $kredensial?->device_id,
            'siap' => $gateway->siap(),
            'jumlah_nomor' => WaRecipient::where('is_active', true)->count(),
            'terpakai_hari_ini' => $gateway->terpakaiHariIni(),
            'sisa_kuota' => $gateway->sisaKuota(),
            /* Daftar jenis dikirim dari sini, bukan disalin ke frontend:
               sumbernya konstanta notifikasi, dan salinan di peramban akan
               menyimpang begitu satu jenis ditambahkan. */
            'jenis' => collect(AktivitasPusatBantuan::JENIS)
                ->map(fn ($m, $k) => ['kunci' => $k, 'judul' => $m['judul']])
                ->values(),
        ], 'Status sambungan WhatsApp');
    }

    /** Pasang atau ganti kunci gateway. */
    public function simpanKredensial(Request $request)
    {
        $data = $request->validate([
            'token' => 'required|string|min:8|max:255',
            /*
             * Tidak ada isiannya di panel, tetapi tetap divalidasi.
             *
             * Kolomnya berbawaan '0' — penanda "pakai perangkat bawaan kunci
             * API", lihat migrasinya. Kunci gateway bandara selalu punya
             * perangkat bawaan, sehingga menampilkan isian ini hanya memberi
             * petugas satu kesempatan lagi untuk mematikan pengiriman dengan
             * nomor perangkat yang bukan miliknya.
             *
             * Aturannya dipertahankan supaya pemasangan yang benar-benar
             * memerlukan perangkat tertentu dapat mengirimnya lewat API tanpa
             * menyunting controller.
             */
            'device_id' => 'nullable|string|max:30',
        ], [
            'token.required' => 'Kunci API gateway wajib diisi.',
            'token.min' => 'Kunci API terlalu pendek untuk sah.',
        ]);

        $data['device_id'] = trim((string) ($data['device_id'] ?? '')) ?: '0';

        /*
         * Baris lama dihapus, bukan ditambahi.
         *
         * Tabelnya memang berisi satu baris (lihat modelnya). Menumpuk baris
         * berarti menyimpan kunci-kunci lama yang tidak lagi dipakai tetapi
         * masih berlaku di sisi gateway — kebocoran yang menunggu terjadi.
         */
        WaCredential::query()->delete();
        WaCredential::create($data);

        return ApiResponse::success(null, 'Kunci gateway berhasil disimpan');
    }

    public function hapusKredensial()
    {
        WaCredential::query()->delete();

        return ApiResponse::success(null, 'Kunci gateway berhasil dihapus');
    }

    /**
     * Kirim satu pesan uji.
     *
     * Ke SATU nomor yang diketik petugas, bukan ke seluruh daftar piket:
     * memastikan sambungan tidak boleh berarti membunyikan ponsel semua orang,
     * dan tiap kiriman uji tetap memotong kuota harian yang sama.
     */
    public function uji(Request $request, WhatsAppGateway $gateway)
    {
        $data = $request->validate([
            'nomor' => 'required|string|max:30',
        ], [
            'nomor.required' => 'Nomor tujuan uji wajib diisi.',
        ]);

        $nomor = preg_replace('/[^0-9]/', '', $data['nomor']);

        if ($nomor === '') {
            return ApiResponse::error('Nomor tujuan uji tidak sah', null, 422);
        }

        $berhasil = $gateway->kirimSatu(
            $nomor,
            "[AIAIS] Uji sambungan gateway WhatsApp.\nBila pesan ini sampai, notifikasi petugas sudah berjalan.",
        );

        return $berhasil
            ? ApiResponse::success(null, 'Pesan uji berhasil dikirim')
            : ApiResponse::error('Pesan uji gagal dikirim. Periksa kunci, perangkat, dan alamat gateway; rinciannya ada di log server.', null, 502);
    }

    /* ---------------------- nomor piket ---------------------- */

    public function index()
    {
        return ApiResponse::success(
            WaRecipient::orderBy('nama')->get(),
            'Daftar nomor penerima notifikasi',
        );
    }

    public function store(Request $request)
    {
        $nomor = WaRecipient::create($this->validated($request));

        return ApiResponse::success($nomor, 'Nomor berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $nomor = WaRecipient::findOrFail($id);
        $nomor->update($this->validated($request, $nomor->id));

        return ApiResponse::success($nomor->fresh(), 'Nomor berhasil diperbarui');
    }

    public function destroy($id)
    {
        WaRecipient::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Nomor berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        $data = $request->validate([
            'nama' => $partial.'required|string|max:100',
            /*
             * Delapan sampai lima belas digit sesudah tanda baca dibuang.
             * Nomor Indonesia terpendek (mis. 0812xxxxxxx) sudah sebelas digit;
             * batas bawah delapan memberi ruang bagi format luar negeri tanpa
             * meloloskan salah ketik yang jelas seperti "0812".
             */
            'nomor' => [
                ...($ignoreId !== null ? ['sometimes'] : []),
                'required',
                'string',
                'max:30',
                'regex:/^[0-9+\-\s()]{8,25}$/',
                Rule::unique('wa_recipients', 'nomor')->ignore($ignoreId),
            ],
            'jenis' => 'nullable|array',
            'jenis.*' => ['string', Rule::in(array_keys(AktivitasPusatBantuan::JENIS))],
            'is_active' => 'boolean',
        ], [
            'nama.required' => 'Nama pemegang nomor wajib diisi.',
            'nomor.required' => 'Nomor WhatsApp wajib diisi.',
            'nomor.regex' => 'Nomor WhatsApp hanya boleh berisi angka dan tanda baca nomor telepon.',
            'nomor.unique' => 'Nomor itu sudah ada dalam daftar.',
            'jenis.*.in' => 'Ada jenis notifikasi yang tidak dikenali.',
        ]);

        if ($request->has('is_active')) {
            $data['is_active'] = $request->boolean('is_active');
        }

        return $data;
    }
}

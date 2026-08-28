<?php

namespace App\Services\Notifikasi;

use App\Models\Setting;
use App\Models\WaCredential;
use App\Models\WaRecipient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Pengirim pesan lewat gateway WhatsApp.
 *
 * Memakai `Http` seperti `InstagramSync` dan `FlightController`, sehingga dapat
 * dipalsukan pada pengujian dengan cara yang sama.
 *
 * ────────────────────────────────────────────────────────────────────────
 * DUA SUMBER PENYETELAN, DAN PEMBAGIANNYA DISENGAJA
 *
 *   PANEL (basis data)  — sakelar, alamat endpoint, perangkat, pagar harian,
 *                         kunci API, dan daftar nomor tujuan. Semua yang
 *                         berubah dalam pemakaian sehari-hari, sehingga
 *                         menambah satu nomor piket tidak lagi menuntut akses
 *                         server dan penggelaran ulang.
 *
 *   .env                — bentuk permintaan: nama header, awalan nilainya,
 *                         json/form, dan nama medan. Semua itu hanya berubah
 *                         ketika vendornya diganti, dan menaruhnya di panel
 *                         berarti memberi petugas belasan isian yang salah
 *                         satunya cukup untuk mematikan pengiriman tanpa
 *                         gejala yang terbaca.
 *
 * Nilai panel MENIMPA .env bila ada. Basis data yang belum dimigrasi atau
 * kosong membuat seluruhnya jatuh ke .env, sehingga pemasangan lama tetap
 * berjalan tanpa disentuh. Lihat `config/whatsapp.php` untuk padanan vendor
 * lain dan untuk catatan bahwa gateway semacam ini tidak resmi.
 * ────────────────────────────────────────────────────────────────────────
 */
class WhatsAppGateway
{
    /** Kunci penghitung pemakaian harian pada cache. */
    private const KUNCI_HITUNG = 'wa:terkirim:';

    /**
     * Penyetelan dari tabel `settings`, dengan .env sebagai cadangan.
     *
     * Dibaca lewat try/catch: kelas ini dipakai pada pengujian dan pada
     * pemasangan yang basis datanya belum dimigrasi, dan gateway yang meledak
     * karena tabelnya belum ada akan menggagalkan pengiriman warga — persis
     * yang dijanjikan tidak terjadi oleh `Notifikasi::kirim`.
     */
    private ?array $setelan = null;

    private function setelan(string $kunci, mixed $bawaan = null): mixed
    {
        /* Properti instans, BUKAN `static`: satu kiriman menyentuh belasan
           nomor dan tidak perlu menanyai basis data tiap kali, tetapi cache
           tingkat kelas akan bertahan antar pekerjaan pada worker antrean yang
           berumur panjang — dan penyetelan yang baru diubah petugas tidak akan
           pernah terbaca sampai worker-nya dinyalakan ulang. */
        if ($this->setelan === null) {
            try {
                $this->setelan = Setting::pluck('value', 'key')->toArray();
            } catch (\Throwable) {
                $this->setelan = [];
            }
        }

        $nilai = $this->setelan[$kunci] ?? '';

        return $nilai === '' ? $bawaan : $nilai;
    }

    public function siap(): bool
    {
        return $this->aktif()
            && filled($this->token())
            && $this->tujuan() !== [];
    }

    private function aktif(): bool
    {
        $panel = $this->setelan('wa_enabled');

        // Panel menyimpan '1'/'0' sebagai teks, mengikuti `skm_is_active`.
        return $panel === null ? (bool) config('whatsapp.enabled') : $panel === '1';
    }

    private function token(): ?string
    {
        try {
            $kredensial = WaCredential::aktif();
            if ($kredensial && filled($kredensial->token)) {
                return $kredensial->token;
            }
        } catch (\Throwable) {
            // Tabelnya belum ada; jatuh ke .env di bawah.
        }

        return config('whatsapp.token');
    }

    private function endpoint(): string
    {
        return (string) $this->setelan('wa_endpoint', config('whatsapp.endpoint'));
    }

    /**
     * Perangkat pengirim, atau null bila kunci API memakai perangkat bawaannya.
     *
     * '0' DIPERLAKUKAN SAMA DENGAN KOSONG, dan itu bukan kelonggaran: tidak ada
     * perangkat ber-ID 0 pada gateway mana pun — penomorannya mulai dari 1 —
     * sehingga nilai itu dipakai sebagai penanda "tidak ditentukan". Panel
     * menyimpannya sebagai bawaan supaya petugas tidak perlu mengisi apa pun,
     * dan mengirimkannya apa adanya justru akan ditolak gateway sebagai
     * perangkat yang bukan miliknya.
     *
     * Kredensial yang sudah tersimpan bersifat menentukan: bila ada barisnya,
     * nilai `.env` tidak lagi dilirik. Kalau tidak, mematikan perangkat lewat
     * panel akan diam-diam dibatalkan oleh `.env` yang belum ikut diubah.
     */
    private function deviceId(): ?string
    {
        try {
            $kredensial = WaCredential::aktif();

            if ($kredensial) {
                $perangkat = trim((string) $kredensial->device_id);

                return ($perangkat === '' || $perangkat === '0') ? null : $perangkat;
            }
        } catch (\Throwable) {
            // Tabelnya belum ada.
        }

        return config('whatsapp.device_id');
    }

    private function pagarHarian(): int
    {
        return (int) $this->setelan('wa_daily_cap', config('whatsapp.daily_cap'));
    }

    /**
     * Nomor tujuan untuk satu jenis kejadian.
     *
     * Diambil dari tabel `wa_recipients` bila ada isinya; bila tabelnya kosong
     * atau belum ada, jatuh ke daftar `.env` yang lama supaya pemasangan yang
     * belum dipindahkan ke panel tidak mendadak berhenti mengirim.
     *
     * `$jenis` null berarti tanpa penyaringan — dipakai kiriman uji dari panel.
     *
     * @return array<int, string>
     */
    public function tujuan(?string $jenis = null): array
    {
        try {
            $dariPanel = WaRecipient::where('is_active', true)->get()
                ->filter(fn (WaRecipient $r) => $r->menerima($jenis))
                ->map(fn (WaRecipient $r) => $r->nomorBersih())
                ->filter()
                ->unique()
                ->values()
                ->all();

            if ($dariPanel !== []) {
                return $dariPanel;
            }
        } catch (\Throwable) {
            // Tabelnya belum ada; jatuh ke .env di bawah.
        }

        return collect(explode(',', (string) config('whatsapp.recipients')))
            ->map(fn ($n) => preg_replace('/[^0-9]/', '', $n))
            ->filter()
            ->values()
            ->all();
    }

    /** Berapa pesan yang sudah terkirim hari ini. */
    public function terpakaiHariIni(): int
    {
        return (int) Cache::get(self::KUNCI_HITUNG . date('Ymd'), 0);
    }

    public function sisaKuota(): int
    {
        return max(0, $this->pagarHarian() - $this->terpakaiHariIni());
    }

    /**
     * Kirim satu teks ke seluruh nomor tujuan.
     *
     * Mengembalikan jumlah yang benar-benar terkirim. TIDAK pernah melempar:
     * pemanggilnya adalah kanal notifikasi, dan gateway yang sedang bermasalah
     * tidak boleh menggagalkan pengiriman warga maupun menumpuk pekerjaan
     * gagal di antrean.
     */
    public function kirim(string $teks, ?string $jenis = null): int
    {
        if (! $this->siap()) {
            return 0;
        }

        $terkirim = 0;

        foreach ($this->tujuan($jenis) as $nomor) {
            // Diperiksa per nomor, bukan sekali di awal: satu notifikasi ke
            // tiga nomor menghabiskan tiga jatah.
            if ($this->sisaKuota() <= 0) {
                Log::warning('Kuota WhatsApp harian habis; sisa pesan dilewati.', [
                    'kuota' => $this->pagarHarian(),
                ]);
                break;
            }

            if ($this->kirimSatu($nomor, $teks)) {
                $terkirim++;
                Cache::put(
                    self::KUNCI_HITUNG . date('Ymd'),
                    $this->terpakaiHariIni() + 1,
                    // Kedaluwarsa lewat tengah malam; penghitungnya memang
                    // hanya berlaku untuk hari berjalan.
                    now()->endOfDay()->addMinutes(5),
                );
            }
        }

        return $terkirim;
    }

    public function kirimSatu(string $nomor, string $teks): bool
    {
        $header = trim(config('whatsapp.auth_prefix') . ' ' . $this->token());

        $badan = [
            config('whatsapp.field_target') => $nomor,
            config('whatsapp.field_message') => $teks,
        ];

        // Hanya disertakan bila memang diisi: gateway menolak `deviceId` yang
        // bukan miliknya, dan kunci API yang sudah terikat satu perangkat tidak
        // memerlukannya sama sekali.
        if (filled($this->deviceId())) {
            $badan[config('whatsapp.field_device')] = (int) $this->deviceId();
        }

        try {
            $permintaan = Http::withHeaders([config('whatsapp.auth_header') => $header])
                ->timeout((int) config('whatsapp.timeout'));

            // `json` atau `form` — lihat catatan pada `config/whatsapp.php`.
            $permintaan = config('whatsapp.format') === 'form'
                ? $permintaan->asForm()
                : $permintaan->asJson();

            $res = $permintaan->post($this->endpoint(), $badan);
        } catch (\Throwable $e) {
            // Nomor tujuan tidak ikut dicatat: log server pun bukan tempat
            // menumpuk nomor telepon tanpa keperluan.
            Log::warning('Gateway WhatsApp tidak terjangkau: ' . $e->getMessage());

            return false;
        }

        if ($res->failed()) {
            Log::warning('Gateway WhatsApp menolak pesan.', [
                'status' => $res->status(),
                'body' => mb_substr($res->body(), 0, 300),
            ]);

            return false;
        }

        /*
         * Status HTTP saja tidak cukup.
         *
         * Gateway ini selalu membalas dengan amplop `{ success, message, data }`,
         * dan penolakan tingkat aplikasi — kunci tanpa scope `message.send`,
         * nomor yang tidak terdaftar di WhatsApp, perangkat sedang terputus —
         * dapat datang bersama HTTP 200. Tanpa pemeriksaan ini, pesan yang
         * tidak pernah terkirim ikut menghabiskan kuota harian dan tercatat
         * sebagai berhasil.
         */
        if ($res->json('success') === false) {
            Log::warning('Gateway WhatsApp menolak pesan (amplop).', [
                'status' => $res->status(),
                'message' => mb_substr((string) $res->json('message'), 0, 200),
            ]);

            return false;
        }

        return true;
    }
}

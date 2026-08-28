<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * Ada kiriman baru dari warga lewat Pusat Bantuan.
 *
 * Satu kelas untuk kelima jenisnya; yang membedakan hanya `JENIS`. Memecahnya
 * menjadi lima kelas berarti lima tempat yang harus diselaraskan tiap kali
 * bentuk pesannya berubah.
 *
 * ────────────────────────────────────────────────────────────────────────
 * MUATANNYA TIDAK BOLEH MEMUAT DATA PRIBADI
 *
 * Yang dibawa hanya jenis, judul ringkas, nomor tiket, dan lintasan panel.
 * TIDAK ADA nama, nomor ponsel, surel, maupun isi laporan — dan jangan
 * ditambahkan.
 *
 * Alasannya bukan kerapian. Muatan yang sama mengalir ke tiga tempat sekaligus:
 * baris basis data portal, ponsel pribadi petugas lewat push, dan — yang paling
 * menentukan — server vendor gateway WhatsApp yang tidak terikat perjanjian
 * pemrosesan data apa pun. Menambahkan satu nama di sini berarti memindahkan
 * nama itu ke ketiganya sekaligus.
 *
 * Rinciannya dibaca petugas di panel, yang dijaga token.
 * ────────────────────────────────────────────────────────────────────────
 */
class AktivitasPusatBantuan extends Notification implements ShouldQueue
{
    use Queueable;

    /** Jenis kiriman yang dikenali, beserta judul dan tujuan panelnya. */
    public const JENIS = [
        'pengaduan' => ['judul' => 'Pengaduan baru', 'path' => '/admin/complaints'],
        'chat' => ['judul' => 'Percakapan baru', 'path' => '/admin/complaints'],
        'kehilangan' => ['judul' => 'Laporan kehilangan baru', 'path' => '/admin/lapor-hilang'],
        'informasi' => ['judul' => 'Permohonan informasi publik baru', 'path' => '/admin/information-requests'],
        'penilaian' => ['judul' => 'Penilaian layanan baru', 'path' => '/admin/complaints'],
        /*
         * Pengajuan layanan warga — slot charter, field trip, OJT, extend
         * advance, pengiklanan, perizinan, sewa, dan tenant.
         *
         * Satu jenis untuk kedelapannya, bukan delapan. Yang membedakan hanya
         * label layanannya, dan itu dibawa `$rincian`; memecahnya menjadi
         * delapan berarti delapan baris yang harus diselaraskan tiap kali
         * bentuk pesannya berubah — persis yang dihindari catatan di kepala
         * kelas ini.
         *
         * Tujuannya daftar pengajuan; tiap jenis punya halamannya sendiri,
         * tetapi daftar induk inilah satu-satunya yang pasti ada.
         */
        'pengajuan' => ['judul' => 'Pengajuan layanan baru', 'path' => '/admin/dashboard'],
    ];

    /**
     * `$rincian` adalah label LAYANAN, bukan keterangan pemohon.
     *
     * Dipakai jenis `pengajuan` untuk membedakan "Sewa" dari "Slot Charter"
     * pada satu baris notifikasi. Aturan tanpa data pribadi di atas berlaku
     * penuh untuknya: yang boleh masuk hanya nama layanan yang sudah tertulis
     * di menu portal.
     */
    public function __construct(
        public readonly string $jenis,
        public readonly ?string $ticket = null,
        public readonly ?string $rincian = null,
        /**
         * Tujuan panel, bila berbeda dari bawaan jenisnya.
         *
         * Diperlukan `pengajuan`: kedelapan layanan berbagi satu jenis demi
         * penyaringan penerima, tetapi masing-masing punya halaman
         * tersendiri (`/admin/pengajuan/sewa`, `/admin/slots`, ...).
         * Tautan yang mendarat di halaman yang salah membuat petugas
         * mencari-cari kiriman yang baru saja dikabarkan kepadanya.
         */
        public readonly ?string $path = null,
    ) {
    }

    /**
     * Kanal `database` berjalan pada koneksi `sync` — SENGAJA.
     *
     * Notifikasi ini `ShouldQueue` supaya WhatsApp dan push tidak pernah
     * menahan pengiriman warga: keduanya memanggil server luar, dan server luar
     * bisa lambat. Tetapi lonceng di panel tidak boleh ikut menunggu antrean —
     * pemroses antrean di server ini dijalankan cron tiap menit (lihat
     * routes/console.php), jadi lonceng akan telat sampai satu menit tanpa
     * alasan.
     *
     * `sync` membuat barisnya tersimpan sebelum respons dikirim; kanal lain
     * tetap berantre.
     */
    public function viaConnections(): array
    {
        return ['database' => 'sync'];
    }

    /**
     * WHATSAPP TIDAK ADA DI SINI, dan itu disengaja.
     *
     * Kanal notifikasi berjalan sekali untuk TIAP penerima. `database` dan
     * push memang begitu — tiap petugas butuh barisnya sendiri di lonceng, dan
     * tiap perangkat punya langganan pushnya sendiri.
     *
     * WhatsApp tidak: nomornya satu tujuan bersama yang diambil dari
     * konfigurasi, bukan milik masing-masing akun. Menjadikannya kanal berarti
     * tiga akun admin menghasilkan tiga pesan WhatsApp yang sama persis untuk
     * satu kejadian — dan sekaligus menghabiskan tiga kali kuota harian.
     *
     * Karena itu WhatsApp dikirim SEKALI oleh `App\Support\Notifikasi::kirim()`
     * lewat pekerjaan tersendiri.
     */
    public function via(object $notifiable): array
    {
        $kanal = ['database'];

        if (config('webpush.enabled')) {
            $kanal[] = \App\Notifications\Channels\WebPushChannel::class;
        }

        return $kanal;
    }

    /** Baris untuk lonceng panel. */
    public function toDatabase(object $notifiable): array
    {
        return [
            'jenis' => $this->jenis,
            'judul' => $this->judul(),
            'ticket' => $this->ticket,
            'path' => $this->path(),
        ];
    }

    /**
     * Teks WhatsApp.
     *
     * Tiga baris dan tidak lebih: judul, nomor tiket, tautan. Notifikasi yang
     * panjang tidak terbaca di layar kunci — dan tiap kalimat tambahan adalah
     * kesempatan baru untuk keceplosan memasukkan data warga.
     */
    /**
     * `$notifiable` opsional dan memang tidak dipakai.
     *
     * WhatsApp bukan kanal per-penerima (lihat `via()`), jadi pesannya disusun
     * sekali tanpa mengacu ke siapa pun. Parameternya dipertahankan agar
     * bentuknya seragam dengan metode kanal lain.
     */
    public function toWhatsApp(?object $notifiable = null): string
    {
        $baris = ['[AIAIS] ' . $this->judul()];

        if ($this->ticket) {
            $baris[] = $this->ticket;
        }

        $baris[] = rtrim(config('app.frontend_url', config('app.url')), '/') . $this->path();

        return implode("\n", $baris);
    }

    /** Muatan push; bentuknya dibaca penangan `push` di public/sw.js. */
    public function toWebPush(object $notifiable): array
    {
        return [
            'title' => $this->judul(),
            'body' => $this->ticket ?: 'Buka panel untuk melihat rinciannya.',
            'path' => $this->path(),
            'tag' => 'aiais-' . $this->jenis,
        ];
    }

    /* ------------------------------------------------------------------ */

    private function meta(): array
    {
        return self::JENIS[$this->jenis] ?? ['judul' => 'Kiriman baru', 'path' => '/admin/dashboard'];
    }

    private function judul(): string
    {
        $judul = $this->meta()['judul'];

        return $this->rincian ? $judul . ' — ' . $this->rincian : $judul;
    }

    private function path(): string
    {
        return $this->path ?: $this->meta()['path'];
    }
}

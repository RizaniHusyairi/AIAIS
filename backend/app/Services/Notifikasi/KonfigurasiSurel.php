<?php

namespace App\Services\Notifikasi;

use App\Models\MailConfig;

/**
 * Terapkan penyetelan SMTP dari panel ke konfigurasi mail Laravel.
 *
 * Dipanggil saat `mail.manager` pertama kali di-resolve dalam satu proses
 * (lihat AppServiceProvider), sebelum mailer apa pun dibangun — sehingga
 * pemanggil cukup memakai `Mail`/notifikasi biasa tanpa tahu asal setelannya.
 * Worker antrean di proyek ini dinyalakan ulang tiap menit (routes/console.php),
 * jadi perubahan dari panel terbaca paling lambat satu menit kemudian.
 *
 * Tanpa baris di `mail_configs`, atau bila sakelarnya mati, konfigurasi .env
 * dibiarkan apa adanya. Semua pembacaan basis data dibungkus try/catch: tabel
 * yang belum dimigrasi tidak boleh menggagalkan pengiriman apa pun.
 */
class KonfigurasiSurel
{
    /** Nama mailer yang dipasang dari panel. */
    public const MAILER = 'panel';

    /** Pengirim bawaan bila panel tidak menamainya. */
    public const NAMA_BAWAAN = 'PPID Bandara APT Pranoto Samarinda';

    public static function dariPanel(): ?MailConfig
    {
        try {
            $c = MailConfig::aktif();
        } catch (\Throwable) {
            return null; // tabel belum ada
        }

        return $c && $c->aktif && filled($c->host) && filled($c->from_address) ? $c : null;
    }

    /** Susun konfigurasi mailer Laravel dari satu baris panel. */
    public static function mailer(MailConfig $c): array
    {
        $config = [
            'transport' => 'smtp',
            // SSL = SMTPS (umumnya port 465); TLS dan tanpa-enkripsi = smtp biasa.
            'scheme' => $c->enkripsi === 'ssl' ? 'smtps' : 'smtp',
            'host' => $c->host,
            'port' => $c->port,
            'username' => $c->username,
            'password' => $c->password,
            'timeout' => 15,
        ];

        if ($c->enkripsi === 'tls') {
            // TLS dipilih berarti WAJIB STARTTLS: server yang tidak
            // menawarkannya ditolak, bukan diam-diam dikirimi teks polos
            // berisi kata sandi.
            $config['require_tls'] = true;
        } elseif ($c->enkripsi === 'none') {
            $config['auto_tls'] = false;
        }

        return $config;
    }

    public static function terapkan(): void
    {
        $c = self::dariPanel();

        if (! $c) {
            return;
        }

        config([
            'mail.default' => self::MAILER,
            'mail.mailers.' . self::MAILER => self::mailer($c),
            'mail.from.address' => $c->from_address,
            'mail.from.name' => $c->from_name ?: self::NAMA_BAWAAN,
        ]);
    }

    /**
     * Apakah surel benar-benar akan terkirim ke luar.
     *
     * Mailer `log` dan `array` — bawaan .env pengembangan dan pengujian —
     * hanya menulis ke berkas atau memori. Menganggapnya siap membuat layar
     * tiket menjanjikan surel yang tidak akan pernah tiba.
     */
    public static function siap(): bool
    {
        if (self::dariPanel()) {
            return true;
        }

        return ! in_array(config('mail.default'), ['log', 'array', null], true);
    }

    /** Asal penyetelan yang sedang dipakai, untuk panel. */
    public static function sumber(): string
    {
        if (self::dariPanel()) {
            return 'panel';
        }

        return in_array(config('mail.default'), ['log', 'array', null], true) ? 'tidak-ada' : 'env';
    }

    /** Nama pengirim untuk surel ke warga. */
    public static function namaPengirim(): string
    {
        return self::dariPanel()?->from_name ?: self::NAMA_BAWAAN;
    }
}

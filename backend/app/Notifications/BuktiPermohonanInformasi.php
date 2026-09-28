<?php

namespace App\Notifications;

use App\Models\InformationRequest;
use App\Services\Notifikasi\KonfigurasiSurel;
use App\Support\CetakanPdf;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Bukti permohonan informasi publik, dikirim ke PEMOHON sendiri.
 *
 * Nomor tiket adalah tanda bukti permohonan menurut SOP PPID, dan dulu hanya
 * tampil sekali di layar: pemohon yang lupa mencatatnya kehilangan satu-
 * satunya jalan untuk melacak. Salinan lewat email (dan WhatsApp, lihat
 * `teksWhatsApp()`) menjadi jalan pemulihannya.
 *
 * ISINYA SENGAJA MINIM: nomor tiket, tanggal diterima, batas jawaban, dan
 * tautan pelacakan. Rincian permohonan, alamat, dan NPWP TIDAK ikut. Surel
 * dapat diteruskan, dan pesan WhatsApp melewati server vendor gateway yang
 * tidak terikat perjanjian pemrosesan data — lihat `AktivitasPusatBantuan`.
 *
 * Memakai view Blade sendiri, bukan templat bawaan Laravel: templat bawaan
 * menulis nama aplikasi dari `APP_NAME` dan teks berbahasa Inggris di kakinya.
 */
class BuktiPermohonanInformasi extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly InformationRequest $permohonan)
    {
    }

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /** Data bersama untuk surel dan WhatsApp. */
    private function data(): array
    {
        $p = $this->permohonan;

        return [
            'tiket' => $p->ticket_number,
            // `created_at` tersimpan UTC; tampilkan dalam WITA.
            'diterima' => $p->created_at?->copy()->setTimezone(CetakanPdf::ZONA)->translatedFormat('l, d F Y'),
            // Kolom DATE: tanggal polos, tidak perlu digeser zonanya.
            'batas' => $p->due_date?->translatedFormat('l, d F Y'),
            'tautan' => rtrim((string) config('app.frontend_url'), '/')
                . '/ppid/pengajuan-informasi?tiket=' . urlencode($p->ticket_number),
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $data = $this->data();

        return (new MailMessage())
            ->subject("Bukti Permohonan Informasi Publik — {$data['tiket']}")
            ->from(config('mail.from.address'), KonfigurasiSurel::namaPengirim())
            ->view(
                ['html' => 'emails.bukti-permohonan-informasi', 'text' => 'emails.bukti-permohonan-informasi-teks'],
                $data,
            );
    }

    /** Teks WhatsApp; aturan isi minimnya sama dengan surel. */
    public function teksWhatsApp(): string
    {
        $d = $this->data();

        return "*Bukti Permohonan Informasi Publik*\n"
            . "PPID Bandara APT Pranoto Samarinda\n\n"
            . "Nomor tiket: *{$d['tiket']}*\n"
            . "Diterima: {$d['diterima']}\n"
            . "Batas jawaban: {$d['batas']}\n"
            . "(10 hari kerja, dapat diperpanjang 7 hari kerja)\n\n"
            . "Lacak status permohonan:\n{$d['tautan']}\n\n"
            . 'Simpan pesan ini. Pesan otomatis, mohon tidak dibalas.';
    }
}

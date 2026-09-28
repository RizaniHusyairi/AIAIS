<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\MailConfig;
use App\Services\Notifikasi\KonfigurasiSurel;
use App\Support\CetakanPdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

/**
 * Notifikasi surel — server SMTP, pengirim, dan kiriman uji.
 *
 * SELURUH endpoint di kelas ini hanya hidup di grup `role:admin`: isinya
 * kredensial yang dapat dipakai mengirim surel atas nama bandara. Tidak ada
 * padanan publiknya, dan jangan dibuatkan.
 *
 * Penyetelan ini dipakai SEMUA surel portal — bukti permohonan informasi ke
 * warga dan tautan reset kata sandi petugas. Lihat `KonfigurasiSurel`.
 */
class SurelController extends Controller
{
    /**
     * Keadaan penyetelan untuk panel. Kata sandi TIDAK PERNAH dikembalikan;
     * yang dikirim hanya apakah sudah terpasang.
     */
    public function status()
    {
        $c = MailConfig::aktif();

        return ApiResponse::success([
            'terpasang' => (bool) $c,
            'aktif' => (bool) $c?->aktif,
            'host' => $c?->host,
            'port' => $c?->port,
            'enkripsi' => $c?->enkripsi ?? 'tls',
            'username' => $c?->username,
            'ada_sandi' => (bool) $c?->adaSandi(),
            'from_address' => $c?->from_address,
            'from_name' => $c?->from_name,
            // panel | env | tidak-ada — asal penyetelan yang sedang berlaku.
            'sumber' => KonfigurasiSurel::sumber(),
            'siap' => KonfigurasiSurel::siap(),
        ], 'Status penyetelan surel');
    }

    public function simpan(Request $request)
    {
        $data = $request->validate([
            'aktif' => 'boolean',
            'host' => 'required|string|max:255',
            'port' => 'required|integer|min:1|max:65535',
            'enkripsi' => ['required', Rule::in(MailConfig::ENKRIPSI)],
            'username' => 'nullable|string|max:255',
            // Kosong = pertahankan kata sandi lama; panel tidak pernah
            // menerimanya balik, jadi tidak bisa mengirimnya ulang.
            'password' => 'nullable|string|max:255',
            'hapus_sandi' => 'boolean',
            'from_address' => 'required|email|max:255',
            'from_name' => 'nullable|string|max:100',
        ], [
            'host.required' => 'Alamat server SMTP wajib diisi.',
            'port.required' => 'Port wajib diisi.',
            'port.integer' => 'Port harus berupa angka.',
            'port.min' => 'Port tidak sah.',
            'port.max' => 'Port tidak sah.',
            'enkripsi.in' => 'Pilihan enkripsi tidak dikenali.',
            'from_address.required' => 'Alamat pengirim wajib diisi.',
            'from_address.email' => 'Alamat pengirim bukan alamat surel yang sah.',
        ]);

        $c = MailConfig::aktif() ?? new MailConfig();

        $c->fill([
            'aktif' => $request->boolean('aktif'),
            'host' => trim($data['host']),
            'port' => $data['port'],
            'enkripsi' => $data['enkripsi'],
            'username' => filled($data['username'] ?? null) ? trim($data['username']) : null,
            'from_address' => trim($data['from_address']),
            'from_name' => filled($data['from_name'] ?? null) ? trim($data['from_name']) : null,
        ]);

        if ($request->boolean('hapus_sandi')) {
            $c->password = null;
        } elseif (filled($data['password'] ?? null)) {
            $c->password = $data['password'];
        }

        $c->save();

        // Satu baris saja: sisa baris lama berarti kata sandi lama yang masih
        // tersimpan tanpa dipakai.
        MailConfig::where('id', '!=', $c->id)->delete();

        return ApiResponse::success(null, 'Penyetelan surel berhasil disimpan');
    }

    /** Hapus penyetelan panel; pengiriman kembali memakai `MAIL_*` dari .env. */
    public function hapus()
    {
        MailConfig::query()->delete();

        return ApiResponse::success(null, 'Penyetelan surel dihapus; kini memakai .env server');
    }

    /**
     * Kirim satu surel uji ke alamat yang diketik admin.
     *
     * Memakai penyetelan panel yang TERSIMPAN meski sakelarnya belum
     * dinyalakan — admin perlu memastikan server SMTP-nya benar sebelum
     * mengaktifkannya untuk warga.
     */
    public function uji(Request $request)
    {
        $data = $request->validate([
            'alamat' => 'required|email|max:255',
        ], [
            'alamat.required' => 'Alamat tujuan uji wajib diisi.',
            'alamat.email' => 'Alamat tujuan uji tidak sah.',
        ]);

        $c = MailConfig::aktif();
        $mailer = config('mail.default');

        if ($c) {
            $mailer = 'panel-uji';
            config(['mail.mailers.panel-uji' => KonfigurasiSurel::mailer($c)]);
            // Mailer uji dibangun ulang tiap kali: penyetelan baru saja
            // disimpan, dan mailer yang tertinggal di memori masih versi lama.
            Mail::purge($mailer);
        }

        $dari = $c?->from_address ?: config('mail.from.address');
        $nama = $c?->from_name ?: KonfigurasiSurel::NAMA_BAWAAN;

        try {
            Mail::mailer($mailer)->raw(
                "Ini surel uji dari panel admin portal Bandara APT Pranoto Samarinda.\n\n"
                . "Bila surel ini sampai, bukti permohonan informasi dan tautan reset kata sandi "
                . "petugas dapat terkirim lewat server yang sama.\n\n"
                . 'Dikirim: ' . now(CetakanPdf::ZONA)->translatedFormat('d F Y H:i') . ' WITA',
                fn ($m) => $m->to($data['alamat'])->from($dari, $nama)->subject('[AIAIS] Uji pengiriman surel'),
            );
        } catch (\Throwable $e) {
            Log::warning('Surel uji gagal: ' . $e->getMessage());

            return ApiResponse::error(
                'Surel uji gagal dikirim: ' . $this->ringkasGalat($e, $c),
                null,
                502,
            );
        }

        // Mailer log/array "berhasil" tanpa mengirim apa pun; katakan terus terang.
        $transport = config("mail.mailers.{$mailer}.transport");
        if (in_array($transport, ['log', 'array'], true)) {
            return ApiResponse::success(
                ['terkirim' => false],
                "Belum ada server SMTP: surel uji hanya dicatat ke log server (mailer \"{$transport}\"), tidak dikirim.",
            );
        }

        return ApiResponse::success(['terkirim' => true], 'Surel uji terkirim. Periksa kotak masuk (dan folder spam) tujuan.');
    }

    /** Pesan galat SMTP untuk panel: dipendekkan, dan kata sandinya dijamin tidak ikut. */
    private function ringkasGalat(\Throwable $e, ?MailConfig $c): string
    {
        $pesan = mb_substr(trim(preg_replace('/\s+/', ' ', $e->getMessage())), 0, 300);

        if ($c && filled($c->password)) {
            $pesan = str_replace($c->password, '••••', $pesan);
        }

        return $pesan;
    }
}

<?php

namespace App\Support;

use App\Models\Complaint;

/**
 * Menyamarkan data pribadi pengaduan sebelum teksnya meninggalkan server.
 *
 * Analisis AI dijalankan oleh penyedia di luar negeri, sehingga yang dikirim
 * harus seminimal mungkin (UU 27/2022: pemrosesan terbatas dan spesifik).
 * Identitas pelapor — nama, surel, telepon — tidak pernah ikut sama sekali;
 * kelas ini menangani sisa yang kerap terselip di dalam uraian, karena warga
 * sering menulis ulang nomor HP atau NIK-nya di badan pengaduan.
 *
 * Penyamaran ini jaring, bukan jaminan: nama pihak ketiga (petugas, sopir
 * taksi) tidak dapat dikenali dengan pola. Karena itu prompt juga melarang
 * model mengulang nama orang di dalam keluarannya.
 */
class PenyamarPengaduan
{
    /** Bagian nama yang lebih pendek dari ini tidak disamarkan — terlalu mudah bertabrakan dengan kata biasa. */
    private const PANJANG_MIN_NAMA = 3;

    /**
     * Bentuk yang aman dikirim: kategori, subjek, uraian, dan status.
     *
     * @return array{category: string, subject: string, description: string, status: string}
     */
    public function muatan(Complaint $complaint): array
    {
        return [
            'category' => (string) $complaint->category,
            'subject' => $this->samarkan((string) $complaint->subject, $complaint),
            'description' => $this->samarkan((string) $complaint->description, $complaint),
            'status' => (string) $complaint->status,
        ];
    }

    public function samarkan(string $teks, ?Complaint $complaint = null): string
    {
        // Nilai yang sudah diketahui dulu, persis apa adanya: lebih tepat
        // daripada pola, dan menangkap format yang lolos dari pola.
        if ($complaint) {
            $teks = $this->gantiPersis($teks, (string) $complaint->reporter_email, '[SUREL]');
            $teks = $this->gantiPersis($teks, (string) $complaint->reporter_phone, '[TELEPON]');
            $teks = $this->samarkanNama($teks, (string) $complaint->reporter_name);
        }

        $teks = preg_replace('/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i', '[SUREL]', $teks);

        // NIK sebelum telepon: 16 digit beruntun juga cocok dengan pola nomor panjang.
        $teks = preg_replace('/(?<!\d)\d{16}(?!\d)/', '[NIK]', $teks);

        // Nomor seluler Indonesia dengan pemisah spasi, titik, atau strip.
        $teks = preg_replace('/(?<![\d+])(?:\+?62|0)\s?8\d(?:[\s.\-]?\d){6,11}(?!\d)/', '[TELEPON]', $teks);

        // Telepon rumah/kantor: (0541) 123456, 0541-123456.
        $teks = preg_replace('/(?<!\d)\(?0\d{2,3}\)?[\s.\-]?\d{5,8}(?!\d)/', '[TELEPON]', $teks);

        // Deret angka panjang lain — rekening, nomor kartu, KK — baik rapat
        // maupun dikelompokkan ("6472 0123 4567 8901"). Kelompok minimal tiga
        // digit agar tanggal seperti 04-10-2026 14.30 tidak ikut tertelan.
        $teks = preg_replace('/(?<!\d)\d{10,}(?!\d)/', '[NOMOR]', $teks);
        $teks = preg_replace('/(?<!\d)\d{3,6}(?:[\s\-]\d{3,6}){2,}(?!\d)/', '[NOMOR]', $teks);

        return $teks;
    }

    private function gantiPersis(string $teks, string $nilai, string $pengganti): string
    {
        $nilai = trim($nilai);

        return $nilai === '' ? $teks : str_ireplace($nilai, $pengganti, $teks);
    }

    private function samarkanNama(string $teks, string $nama): string
    {
        $nama = trim($nama);
        if ($nama === '') {
            return $teks;
        }

        // Nama lengkap dulu, lalu tiap bagiannya — pelapor sering menyebut
        // dirinya dengan nama depan saja.
        $bagian = array_filter(
            preg_split('/\s+/u', $nama),
            fn ($b) => mb_strlen($b) >= self::PANJANG_MIN_NAMA,
        );

        foreach (array_merge([$nama], $bagian) as $calon) {
            $teks = preg_replace('/(?<!\pL)'.preg_quote($calon, '/').'(?!\pL)/iu', '[NAMA PELAPOR]', $teks);
        }

        return $teks;
    }
}

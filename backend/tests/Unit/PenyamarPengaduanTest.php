<?php

namespace Tests\Unit;

use App\Support\PenyamarPengaduan;
use PHPUnit\Framework\TestCase;

/** Pola penyamaran untuk teks bebas tanpa data pelapor yang diketahui. */
class PenyamarPengaduanTest extends TestCase
{
    private function samarkan(string $teks): string
    {
        return (new PenyamarPengaduan)->samarkan($teks);
    }

    public function test_nomor_seluler_berbagai_format(): void
    {
        foreach (['081234567890', '0812-3456-7890', '0812 3456 7890', '+6281234567890', '62 812.3456.7890'] as $nomor) {
            $this->assertSame('hubungi [TELEPON] ya', $this->samarkan("hubungi {$nomor} ya"), $nomor);
        }
    }

    public function test_nik_surel_dan_deret_angka_panjang(): void
    {
        $this->assertSame('NIK [NIK]', $this->samarkan('NIK 6472012345678901'));
        $this->assertSame('kirim ke [SUREL].', $this->samarkan('kirim ke warga.biasa@mail.co.id.'));
        $this->assertSame('rekening [NOMOR]', $this->samarkan('rekening 1234567890123'));
    }

    public function test_angka_berpemisah_dan_telepon_rumah(): void
    {
        $this->assertSame('NIK [NOMOR] ya', $this->samarkan('NIK 6472 0123 4567 8901 ya'));
        $this->assertSame('kartu [NOMOR]', $this->samarkan('kartu 1234-5678-9012-3456'));
        $this->assertSame('telp [TELEPON]', $this->samarkan('telp (0541) 743000'));
        $this->assertSame('telp [TELEPON]', $this->samarkan('telp 0541-743000'));
    }

    public function test_angka_biasa_dibiarkan(): void
    {
        $teks = 'Penerbangan GA 571 pukul 14.30 tertunda 2 jam di gate 3, tanggal 04-10-2026 14.30, kursi 12 dari 180.';
        $this->assertSame($teks, $this->samarkan($teks));
    }
}

<?php

namespace Tests\Feature;

use App\Support\PengecilFoto;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Pengecilan foto unggahan.
 *
 * Yang dijaga: foto besar benar-benar mengecil, foto kecil tidak dibesarkan,
 * dan foto tegak dari ponsel — yang tersimpan mendatar plus tag EXIF — keluar
 * dalam posisi tegak, bukan rebah.
 */
class PengecilFotoTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    /** Ukuran dan isi bitmap hasil simpan. */
    private function baca(string $lintasan): \GdImage
    {
        return imagecreatefromstring(Storage::disk('public')->get($lintasan));
    }

    public function test_foto_besar_dikecilkan_ke_sisi_terpanjang(): void
    {
        $asli = UploadedFile::fake()->image('besar.jpg', 4000, 3000);

        $lintasan = PengecilFoto::simpan($asli, 'uji', 1600);
        $hasil = $this->baca($lintasan);

        $this->assertSame([1600, 1200], [imagesx($hasil), imagesy($hasil)]);
        $this->assertStringStartsWith('uji/', $lintasan);

        if (gd_info()['WebP Support'] ?? false) {
            $this->assertStringEndsWith('.webp', $lintasan);
        }
    }

    public function test_foto_tegak_dibatasi_pada_tingginya(): void
    {
        $hasil = $this->baca(PengecilFoto::simpan(UploadedFile::fake()->image('tegak.png', 1500, 3000), 'uji', 1600));

        $this->assertSame([800, 1600], [imagesx($hasil), imagesy($hasil)]);
    }

    public function test_foto_kecil_tidak_dibesarkan(): void
    {
        $hasil = $this->baca(PengecilFoto::simpan(UploadedFile::fake()->image('kecil.jpg', 800, 600), 'uji', 1600));

        $this->assertSame([800, 600], [imagesx($hasil), imagesy($hasil)]);
    }

    public function test_orientasi_exif_ponsel_diterapkan(): void
    {
        // Bitmap mendatar 400×200: kiri merah, kanan biru, bertag Orientation=6
        // ("putar 90° searah jarum jam untuk ditampilkan") — persis cara
        // kamera ponsel menyimpan foto yang diambil tegak.
        $im = imagecreatetruecolor(400, 200);
        imagefilledrectangle($im, 0, 0, 199, 199, imagecolorallocate($im, 255, 0, 0));
        imagefilledrectangle($im, 200, 0, 399, 199, imagecolorallocate($im, 0, 0, 255));
        ob_start();
        imagejpeg($im, null, 95);
        $jpeg = ob_get_clean();

        $jalur = tempnam(sys_get_temp_dir(), 'exif').'.jpg';
        file_put_contents($jalur, $this->sisipkanOrientasi($jpeg, 6));
        $berkas = new UploadedFile($jalur, 'ponsel.jpg', 'image/jpeg', null, true);

        $hasil = $this->baca(PengecilFoto::simpan($berkas, 'uji', 1600));

        $this->assertSame([200, 400], [imagesx($hasil), imagesy($hasil)], 'Foto tegak harus keluar tegak.');

        // Diputar searah jarum jam, sisi kiri (merah) naik ke atas.
        $atas = imagecolorsforindex($hasil, imagecolorat($hasil, 100, 50));
        $bawah = imagecolorsforindex($hasil, imagecolorat($hasil, 100, 350));
        $this->assertGreaterThan(200, $atas['red']);
        $this->assertGreaterThan(200, $bawah['blue']);

        @unlink($jalur);
    }

    public function test_berkas_yang_tidak_terbaca_gd_disimpan_apa_adanya(): void
    {
        // Validasi controller tidak akan meloloskan berkas semacam ini; yang
        // diuji di sini hanya bahwa pengecil tidak pernah menggagalkan simpan.
        $berkas = UploadedFile::fake()->createWithContent('rusak.jpg', 'bukan gambar');

        $lintasan = PengecilFoto::simpan($berkas, 'uji', 1600);

        Storage::disk('public')->assertExists($lintasan);
        $this->assertSame('bukan gambar', Storage::disk('public')->get($lintasan));
    }

    /** Sisipkan segmen APP1 EXIF minimal berisi satu tag Orientation. */
    private function sisipkanOrientasi(string $jpeg, int $orientasi): string
    {
        $tiff = "II\x2A\x00\x08\x00\x00\x00"        // header TIFF little-endian, IFD di offset 8
            ."\x01\x00"                              // satu entri
            ."\x12\x01\x03\x00\x01\x00\x00\x00"      // tag 0x0112 Orientation, SHORT, 1 nilai
            .pack('v', $orientasi)."\x00\x00"
            ."\x00\x00\x00\x00";                     // tidak ada IFD berikutnya
        $isi = "Exif\x00\x00".$tiff;

        return substr($jpeg, 0, 2)."\xFF\xE1".pack('n', strlen($isi) + 2).$isi.substr($jpeg, 2);
    }
}

<?php

namespace App\Support;

use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Simpan foto unggahan dalam ukuran yang layak dikirim ke pengunjung.
 *
 * Foto ponsel 12 MP berukuran 3–5 MB dan lebarnya 4000 piksel, padahal layar
 * terlebar yang menampilkannya — lightbox galeri dan hero berita — tidak
 * butuh lebih dari 1600–1920 piksel. Mengirim aslinya ke PWA di jaringan
 * seluler berarti galeri dua belas foto seberat puluhan megabita.
 *
 * Yang dilakukan:
 *   1. memutar foto menurut tag EXIF `Orientation` — ponsel menyimpan foto
 *      tegak sebagai gambar mendatar plus tag, dan GD tidak membacanya;
 *      tanpa langkah ini foto tegak tampil rebah setelah dikecilkan;
 *   2. mengecilkan sisi terpanjang ke batas yang diminta (tidak pernah
 *      membesarkan);
 *   3. menyandikan ulang sebagai WebP, atau JPEG bila GD server tidak
 *      mendukung WebP. Penyandian ulang sekaligus membuang metadata EXIF,
 *      termasuk koordinat GPS tempat foto diambil.
 *
 * KEGAGALAN TIDAK MENGGAGALKAN UNGGAHAN. Berkas yang tidak dapat dibaca GD,
 * atau terlalu besar untuk diolah dengan aman, disimpan apa adanya. Validasi
 * `image|mimes:...` di controller sudah memastikan berkasnya memang gambar;
 * pengecilan adalah penghematan, bukan syarat.
 *
 * Dipakai bersama oleh sampul dan galeri berita; modul berfoto lain boleh
 * ikut memakainya.
 */
class PengecilFoto
{
    /**
     * Batas piksel yang masih diolah. Bitmap GD memakan ±4 bita per piksel
     * plus salinan hasil kecilnya: 40 MP ≈ 200 MB, masih aman di bawah
     * `memory_limit` 512M. Di atas itu berkas disimpan apa adanya — lebih baik
     * foto berat daripada proses PHP yang mati di tengah unggahan.
     */
    public const MAKS_PIKSEL = 40_000_000;

    /** Mutu penyandian; 82 nyaris tak terbedakan dari aslinya untuk foto. */
    public const MUTU = 82;

    /**
     * @param  int  $sisiTerpanjang  batas piksel sisi terpanjang hasil
     * @return string lintasan berkas pada `$disk`
     */
    public static function simpan(UploadedFile $berkas, string $dir, int $sisiTerpanjang, string $disk = 'public'): string
    {
        try {
            $hasil = self::olah($berkas, $sisiTerpanjang);
        } catch (\Throwable $e) {
            Log::warning('Foto tidak dapat dikecilkan; disimpan apa adanya.', [
                'berkas' => $berkas->getClientOriginalName(),
                'galat' => $e->getMessage(),
            ]);
            $hasil = null;
        }

        if ($hasil === null) {
            return $berkas->storeAs($dir, Str::uuid().'.'.$berkas->extension(), $disk);
        }

        [$isi, $ekstensi] = $hasil;
        $lintasan = $dir.'/'.Str::uuid().'.'.$ekstensi;
        Storage::disk($disk)->put($lintasan, $isi);

        return $lintasan;
    }

    /**
     * @return array{0: string, 1: string}|null  [isi berkas, ekstensi], atau
     *         null bila aslinya yang sebaiknya disimpan
     */
    private static function olah(UploadedFile $berkas, int $sisiTerpanjang): ?array
    {
        $jalur = $berkas->getRealPath();
        $info = @getimagesize($jalur);

        if (! $info || $info[0] * $info[1] > self::MAKS_PIKSEL) {
            return null;
        }

        $sumber = @imagecreatefromstring((string) file_get_contents($jalur));
        if (! $sumber instanceof GdImage) {
            return null;
        }

        $diputar = false;
        if ($info[2] === IMAGETYPE_JPEG) {
            [$sumber, $diputar] = self::luruskan($sumber, $jalur);
        }

        $lebar = imagesx($sumber);
        $tinggi = imagesy($sumber);
        $skala = min(1, $sisiTerpanjang / max($lebar, $tinggi));
        $lebarBaru = max(1, (int) round($lebar * $skala));
        $tinggiBaru = max(1, (int) round($tinggi * $skala));

        $webp = function_exists('imagewebp') && (gd_info()['WebP Support'] ?? false);

        $kanvas = imagecreatetruecolor($lebarBaru, $tinggiBaru);
        if ($webp) {
            // WebP menyimpan transparansi; PNG berlatar tembus tetap tembus.
            imagealphablending($kanvas, false);
            imagesavealpha($kanvas, true);
            imagefill($kanvas, 0, 0, imagecolorallocatealpha($kanvas, 0, 0, 0, 127));
        } else {
            // JPEG tak mengenal transparansi; latar tembus menjadi putih,
            // bukan hitam bawaan GD.
            imagefill($kanvas, 0, 0, imagecolorallocate($kanvas, 255, 255, 255));
        }

        imagecopyresampled($kanvas, $sumber, 0, 0, 0, 0, $lebarBaru, $tinggiBaru, $lebar, $tinggi);

        ob_start();
        $webp ? imagewebp($kanvas, null, self::MUTU) : imagejpeg($kanvas, null, self::MUTU);
        $isi = (string) ob_get_clean();

        // Foto yang sudah kecil dan sudah tegak tidak perlu disandikan ulang
        // bila hasilnya malah lebih besar — mis. PNG ikon sederhana.
        if ($skala === 1 && ! $diputar && strlen($isi) >= (int) $berkas->getSize()) {
            return null;
        }

        return [$isi, $webp ? 'webp' : 'jpg'];
    }

    /**
     * Terapkan tag EXIF `Orientation` pada bitmapnya.
     *
     * @return array{0: GdImage, 1: bool}  [bitmap, apakah diubah]
     */
    private static function luruskan(GdImage $gambar, string $jalur): array
    {
        if (! function_exists('exif_read_data')) {
            return [$gambar, false];
        }

        $orientasi = (int) (@exif_read_data($jalur)['Orientation'] ?? 1);

        // 2, 4, 5, 7 adalah versi cermin dari 1, 3, 6, 8.
        if (in_array($orientasi, [2, 4, 5, 7], true)) {
            imageflip($gambar, IMG_FLIP_HORIZONTAL);
        }

        // Sudut `imagerotate` berlawanan arah jarum jam. Sesudah dicerminkan,
        // 5 (transpose) diputar seperti 8, dan 7 (transverse) seperti 6.
        $sudut = match ($orientasi) {
            3, 4 => 180,
            6, 7 => -90,
            5, 8 => 90,
            default => 0,
        };

        if ($sudut !== 0) {
            $gambar = imagerotate($gambar, $sudut, 0);
        }

        return [$gambar, $orientasi !== 1];
    }
}

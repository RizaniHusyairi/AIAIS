<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\Storage;

/**
 * Menyelesaikan nilai kolom berkas menjadi URL siap pakai.
 *
 * Portal v2 hidup di atas basis data portal v1, sehingga satu kolom yang sama
 * bisa memuat tiga bentuk nilai sekaligus:
 *
 *   1. URL penuh    — dokumen yang dilayani pihak lain (tautan Google Drive
 *                     pada modul-modul warisan).
 *   2. Lintasan v2  — "letters/9f3e....pdf", hasil unggahan lewat panel admin
 *                     baru, tersimpan di disk `public`.
 *   3. Lintasan v1  — "uploads/letters/x.pdf", warisan bertahun-tahun,
 *                     tersimpan di disk `legacy` (public/uploads milik v1).
 *   4. Aset v1      — "assets_landing/img/fasilitas/checkin.jpg", gambar yang
 *                     ikut dikirim bersama kode v1, satu tingkat di atas akar
 *                     unggahan; disk `legacy_public`.
 *
 * Bentuk 2 sampai 4 sengaja dibedakan lewat keberadaan berkasnya, bukan lewat
 * tebakan atas awalan lintasannya. Awalan bukan penanda yang bisa dipercaya —
 * ketiganya sama-sama lintasan relatif — dan salah tebak berarti tautan mati
 * pada dokumen resmi.
 */
trait ResolvesFileUrl
{
    /** Disk yang diperiksa berurutan; yang lebih baru didahulukan. */
    private const FILE_DISKS = ['public', 'legacy', 'legacy_public'];

    /** Apakah berkasnya benar-benar dapat dibuka. */
    protected function fileExists(?string $path): bool
    {
        if (empty($path)) {
            return false;
        }

        // URL penuh dianggap ada tanpa diperiksa: memeriksanya lewat jaringan
        // akan membuat setiap permintaan daftar bergantung pada server lain.
        if ($this->isAbsoluteUrl($path)) {
            return true;
        }

        return $this->diskHolding($path) !== null;
    }

    /** URL publik berkas, atau null bila berkasnya tidak ada. */
    protected function fileUrl(?string $path): ?string
    {
        if (empty($path)) {
            return null;
        }

        if ($this->isAbsoluteUrl($path)) {
            return $path;
        }

        $disk = $this->diskHolding($path);

        return $disk === null ? null : Storage::disk($disk)->url($path);
    }

    /** Disk pertama yang benar-benar memuat berkas itu. */
    private function diskHolding(string $path): ?string
    {
        foreach (self::FILE_DISKS as $disk) {
            if (Storage::disk($disk)->exists($path)) {
                return $disk;
            }
        }

        return null;
    }

    protected function isAbsoluteUrl(string $path): bool
    {
        return str_starts_with($path, 'http://') || str_starts_with($path, 'https://');
    }
}

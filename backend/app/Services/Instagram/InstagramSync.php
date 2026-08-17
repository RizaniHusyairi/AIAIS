<?php

namespace App\Services\Instagram;

use App\Models\InstagramCredential;
use App\Models\InstagramPost;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Menarik unggahan Instagram ke tabel lokal.
 *
 * ============================================================
 * DUA SIFAT YANG MENENTUKAN SELURUH KELAS INI
 * ============================================================
 *
 * 1. **Gambarnya disalin, bukan ditautkan.** `media_url` dari Graph API
 *    menunjuk CDN Meta dan mati dalam hitungan jam. Portal menampilkan salinan
 *    lokal; tanpa itu, beranda penuh gambar rusak menjelang sore.
 *
 * 2. **Kegagalan tidak menghapus apa pun.** Instagram tak terjangkau, token
 *    mati, atau satu gambar gagal diunduh — unggahan yang sudah tersimpan
 *    tetap tampil. Yang berhenti bergerak hanyalah `synced_at`, dan panel yang
 *    memberi tahu petugas. Beranda resmi yang mendadak kosong jauh lebih buruk
 *    daripada beranda yang isinya agak tertinggal.
 *
 * Sinkronisasi dijalankan penjadwal di sisi server — TIDAK PERNAH dari
 * peramban pengunjung. Token akan terekspos, dan gangguan di Instagram akan
 * ikut merusak beranda.
 */
class InstagramSync
{
    /** Medan yang diminta dari Graph API. */
    private const FIELDS = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';

    /**
     * Tarik unggahan terbaru dan simpan ke tabel lokal.
     *
     * @return array{diperiksa: int, baru: int, diperbarui: int, gambar_diunduh: int, gambar_gagal: int}
     */
    public function jalankan(): array
    {
        $kredensial = InstagramCredential::aktif();

        if ($kredensial === null) {
            throw new RuntimeException('Kredensial Instagram belum dipasang. Pasang tokennya lewat panel pengelolaan.');
        }

        if ($kredensial->sudahKedaluwarsa()) {
            throw new RuntimeException('Token Instagram sudah kedaluwarsa. Pasang token baru lewat panel pengelolaan.');
        }

        $media = $this->ambilMedia($kredensial->access_token);

        $hitung = ['diperiksa' => 0, 'baru' => 0, 'diperbarui' => 0, 'gambar_diunduh' => 0, 'gambar_gagal' => 0];

        foreach ($media as $item) {
            $igId = $item['id'] ?? null;

            if (! $igId) {
                continue;
            }

            $hitung['diperiksa']++;

            /*
             * `source` ikut menjadi kunci pencarian, bukan hanya `ig_id`.
             *
             * Unggahan manual memang tidak akan pernah tersandingkan karena
             * `ig_id`-nya NULL — tetapi itu kebetulan, bukan aturan, dan
             * kebetulan itu lenyap begitu seseorang kelak mengisi `ig_id`
             * manual dengan nilai penanda. Batasnya ditulis di sini supaya
             * sinkronisasi tidak pernah bisa menimpa tulisan petugas.
             */
            $post = InstagramPost::firstOrNew(['ig_id' => $igId, 'source' => 'api']);
            $baru = ! $post->exists;

            // `is_visible` SENGAJA tidak disentuh. Unggahan yang sudah
            // disembunyikan petugas tidak boleh menyala kembali hanya karena
            // sinkronisasi berikutnya berjalan.
            $post->permalink = $item['permalink'] ?? $post->permalink ?? '';
            $post->media_type = $item['media_type'] ?? 'IMAGE';
            $post->caption = $item['caption'] ?? null;
            $post->posted_at = isset($item['timestamp']) ? Carbon::parse($item['timestamp']) : null;
            $post->synced_at = now();
            $post->save();

            $hitung[$baru ? 'baru' : 'diperbarui']++;

            // Unduh hanya bila salinannya belum ada — URL CDN berubah tiap
            // permintaan, jadi menyandingkannya tidak berarti apa-apa; yang
            // menentukan adalah ada-tidaknya berkas lokal.
            if (blank($post->getAttributes()['local_image_path'] ?? null)) {
                $this->unduhGambar($post, $item)
                    ? $hitung['gambar_diunduh']++
                    : $hitung['gambar_gagal']++;
            }
        }

        return $hitung;
    }

    /**
     * Ambil daftar media dari Graph API.
     *
     * @return array<int, array<string, mixed>>
     */
    private function ambilMedia(string $token): array
    {
        $url = rtrim(config('instagram.base_url'), '/').'/'.config('instagram.version').'/me/media';

        $res = Http::timeout(config('instagram.timeout'))->get($url, [
            'fields' => self::FIELDS,
            'limit' => config('instagram.fetch_limit'),
            'access_token' => $token,
        ]);

        if ($res->failed()) {
            // Pesan Meta diteruskan apa adanya: ia membedakan token kedaluwarsa,
            // izin yang belum lolos App Review, dan akun yang salah tipe —
            // ketiganya menuntut tindakan yang berbeda dari petugas.
            $pesan = $res->json('error.message') ?? 'Instagram menolak permintaan.';

            throw new RuntimeException('Gagal mengambil unggahan Instagram: '.$pesan);
        }

        return $res->json('data') ?? [];
    }

    /**
     * Unduh gambar unggahan ke cakram lokal.
     *
     * Video memakai `thumbnail_url` — memutar video di beranda bukan yang
     * diminta, dan berkas videonya jauh lebih berat daripada gunanya.
     *
     * @param  array<string, mixed>  $item
     */
    private function unduhGambar(InstagramPost $post, array $item): bool
    {
        $sumber = ($item['media_type'] ?? '') === 'VIDEO'
            ? ($item['thumbnail_url'] ?? null)
            : ($item['media_url'] ?? null);

        if (blank($sumber)) {
            return false;
        }

        try {
            $res = Http::timeout(config('instagram.timeout'))->get($sumber);

            if ($res->failed()) {
                return false;
            }

            $biner = $res->body();

            if ($biner === '' || strlen($biner) > config('instagram.max_image_bytes')) {
                return false;
            }

            // Isinya diperiksa benar-benar gambar. Yang diunduh datang dari
            // luar sistem; memercayai `Content-Type` saja berarti memercayai
            // pengirimnya.
            $info = @getimagesizefromstring($biner);

            if ($info === false) {
                return false;
            }

            $ekstensi = match ($info[2] ?? null) {
                IMAGETYPE_PNG => 'png',
                IMAGETYPE_WEBP => 'webp',
                default => 'jpg',
            };

            $lintasan = InstagramPost::FOLDER.'/'.Str::uuid().'.'.$ekstensi;
            Storage::disk(InstagramPost::DISK)->put($lintasan, $biner);

            $post->local_image_path = $lintasan;
            $post->save();

            return true;
        } catch (\Throwable) {
            // Satu gambar gagal tidak boleh menggagalkan seluruh sinkronisasi;
            // barisnya tetap tersimpan dan percobaan berikutnya mengulanginya.
            return false;
        }
    }
}

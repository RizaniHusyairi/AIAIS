<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\News;
use App\Models\NewsImage;
use App\Support\PengecilFoto;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class NewsController extends Controller
{
    /** Tempat foto sampul unggahan v2 disimpan pada cakram `public`. */
    private const DIR_SAMPUL = 'news/covers';

    /** Tempat foto galeri berita disimpan pada cakram `public`. */
    private const DIR_GALERI = 'news/gallery';

    /**
     * Sisi terpanjang foto tersimpan, dalam piksel. Sampul tampil sebagai hero
     * selebar layar, jadi diberi ruang lebih; galeri paling lebar tampil di
     * lightbox, yang di layar laptop umum tidak melewati 1600.
     */
    private const SISI_SAMPUL = 1920;
    private const SISI_GALERI = 1600;

    public function index(Request $request)
    {
        $query = News::where('status', 'published');

        if ($request->has('category') && !empty($request->category)) {
            $query->where('category', $request->category);
        }

        if ($request->has('featured')) {
            $query->where('is_featured', true);
        }

        $news = $query->orderBy('published_at', 'desc')->paginate(10);

        return ApiResponse::success(
            $news->items(),
            'Daftar berita & artikel bandara',
            [
                'current_page' => $news->currentPage(),
                'last_page' => $news->lastPage(),
                'per_page' => $news->perPage(),
                'total' => $news->total(),
            ]
        );
    }

    public function show(Request $request, $slug)
    {
        // Draf dijawab 404 seperti slug yang tidak ada: slug-nya sudah terbentuk
        // sejak disimpan dan bisa bocor, sedangkan isinya belum tentu layak
        // dibaca publik. Pratinjau petugas dirender dari form, bukan dari sini.
        $news = News::where('slug', $slug)->where('status', 'published')->first();
        if (!$news) {
            return ApiResponse::error('Berita tidak ditemukan', null, 404);
        }

        // `track=0` dikirim server Next saat merakit metadata. Tanpa itu satu
        // kunjungan desktop terhitung dua kali: sekali dari server, sekali lagi
        // dari peramban yang memuat isi artikelnya.
        if ($request->query('track') !== '0') {
            $this->catatPembaca($request, $news);
        }

        // Publik hanya menerima foto yang berkasnya ada; kotak gambar kosong di
        // tengah galeri lebih buruk daripada galeri yang satu foto lebih pendek.
        $news->setRelation('images', $news->images()->get()->filter(fn (NewsImage $f) => $f->url !== null)->values());

        return ApiResponse::success($news, 'Detail berita');
    }

    /**
     * Tambah satu pembaca — sekali per pengunjung per berita dalam 30 menit.
     *
     * `views_count` menentukan urutan "Terpopuler", jadi muat ulang halaman,
     * pindah bolak-balik antar-artikel, dan perayap tidak boleh ikut
     * menggelembungkannya. Pengunjung dikenali dari sidik IP + agen peramban
     * yang di-hash: cukup untuk membedakan orang, tanpa menyimpan IP-nya.
     */
    private function catatPembaca(Request $request, News $news): void
    {
        $agen = (string) $request->userAgent();

        if ($agen === '' || preg_match('/bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram/i', $agen)) {
            return;
        }

        $kunci = 'news-view:'.$news->id.':'.hash('sha256', $request->ip().'|'.$agen);

        // `add` hanya berhasil bila kuncinya belum ada, jadi permintaan kedua
        // dalam jendela yang sama tidak menambah apa pun.
        if (Cache::add($kunci, true, now()->addMinutes(30))) {
            $news->increment('views_count');
        }
    }

    public function store(Request $request)
    {
        $validated = $this->validasi($request, true);
        $galeri = $this->rencanaGaleri($request, null);

        if ($sampul = $this->simpanSampul($request)) {
            $validated['thumbnail'] = $sampul;
        }

        $validated['is_featured'] = $request->boolean('is_featured');
        $validated['status'] = $validated['status'] ?? 'published';
        $validated['slug'] = Str::slug($request->title).'-'.time();
        $validated['published_at'] = now();

        $baru = array_filter([$sampul]);

        try {
            $news = DB::transaction(function () use ($validated, $galeri, &$baru) {
                $news = News::create($validated);

                if ($galeri !== null) {
                    $this->terapkanGaleri($news, $galeri, $baru);
                }

                return $news;
            });
        } catch (Throwable $e) {
            $this->buangBerkasBaru($baru);

            throw $e;
        }

        return ApiResponse::success($news->load('images'), 'Berita berhasil dibuat', null, 201);
    }

    /** Semua berita (termasuk draft) untuk panel admin */
    public function adminIndex()
    {
        // Galeri ikut dimuat karena form ubah mengambil beritanya dari daftar
        // ini; foto yang berkasnya hilang tetap dikirim (`url` null) supaya
        // petugas melihatnya dan bisa menggantinya.
        $news = News::with('images')->orderBy('published_at', 'desc')->get();
        return ApiResponse::success($news, 'Seluruh berita & artikel');
    }

    public function update(Request $request, $id)
    {
        $news = News::findOrFail($id);

        $validated = $this->validasi($request, false);
        $galeri = $this->rencanaGaleri($request, $news);

        // Sampul lama baru dihapus sesudah yang baru benar-benar tersimpan,
        // supaya kegagalan unggahan tidak meninggalkan berita tanpa gambar.
        $lama = $news->thumbnail;
        if ($sampul = $this->simpanSampul($request)) {
            $validated['thumbnail'] = $sampul;
        }

        if ($request->has('is_featured')) {
            $validated['is_featured'] = $request->boolean('is_featured');
        }

        if ($request->filled('title') && $request->title !== $news->title) {
            $validated['slug'] = Str::slug($request->title).'-'.time();
        }

        $baru = array_filter([$sampul]);
        $dibuang = [];

        try {
            DB::transaction(function () use ($news, $validated, $galeri, &$baru, &$dibuang) {
                $news->update($validated);

                if ($galeri !== null) {
                    $dibuang = $this->terapkanGaleri($news, $galeri, $baru);
                }
            });
        } catch (Throwable $e) {
            $this->buangBerkasBaru($baru);

            throw $e;
        }

        // Berkas lama baru dibuang sesudah transaksi berhasil — kalau
        // dibuang lebih dulu lalu transaksinya gagal, barisnya kembali
        // menunjuk berkas yang sudah tidak ada.
        if ($sampul) {
            $this->hapusBerkas($lama);
        }
        foreach ($dibuang as $lintasan) {
            $this->hapusBerkas($lintasan);
        }

        return ApiResponse::success($news->load('images'), 'Berita berhasil diperbarui');
    }

    public function destroy($id)
    {
        $news = News::findOrFail($id);
        $lintasan = [$news->thumbnail, ...$news->images()->pluck('path')->all()];

        DB::transaction(function () use ($news) {
            // Dihapus eksplisit, tidak bergantung pada cascade: tabel `news`
            // milik v1 dan sifat kunci asingnya di luar kendali modul ini.
            NewsImage::where('news_id', $news->id)->delete();
            $news->delete();
        });

        foreach ($lintasan as $l) {
            $this->hapusBerkas($l);
        }

        return ApiResponse::success(null, 'Berita berhasil dihapus');
    }

    /**
     * Baca dan periksa susunan galeri yang dikirim panel, sebelum apa pun ditulis.
     *
     * `gallery` adalah JSON berurutan — urutan larik itulah urutan tampil:
     *   `{ "id": 7, "caption": "..." }`      foto yang sudah ada
     *   `{ "upload": 0, "caption": "..." }`  berkas `gallery_files[0]`
     * Foto lama yang tidak disebut berarti dibuang.
     *
     * Bila `gallery` tidak dikirim sama sekali, galeri tidak disentuh (null) —
     * supaya klien yang hanya mengubah status atau judul tidak mengosongkannya.
     *
     * @return array<int, array{id: ?int, file: ?UploadedFile, caption: ?string}>|null
     */
    private function rencanaGaleri(Request $request, ?News $news): ?array
    {
        if (! $request->has('gallery')) {
            return null;
        }

        $susunan = json_decode((string) $request->input('gallery'), true);
        if (! is_array($susunan) || ! array_is_list($susunan)) {
            throw ValidationException::withMessages(['gallery' => 'Susunan galeri tidak terbaca. Muat ulang halaman lalu coba lagi.']);
        }

        $berkas = $request->file('gallery_files', []);

        Validator::make(
            ['gallery' => $susunan, 'gallery_files' => $berkas],
            [
                'gallery' => 'array|max:'.NewsImage::MAX_PER_NEWS,
                'gallery.*' => 'array',
                'gallery.*.id' => 'nullable|integer',
                'gallery.*.upload' => 'nullable|integer|min:0',
                'gallery.*.caption' => 'nullable|string|max:255',
                'gallery_files' => 'array',
                'gallery_files.*' => 'image|mimes:jpg,jpeg,png,webp|max:5120',   // 5 MB
            ],
            [
                'gallery.max' => 'Galeri paling banyak '.NewsImage::MAX_PER_NEWS.' foto.',
                'gallery.*.caption.max' => 'Keterangan foto maksimal 255 karakter.',
                'gallery_files.*.image' => 'Foto galeri harus berupa berkas gambar.',
                'gallery_files.*.mimes' => 'Foto galeri harus berformat JPG, PNG, atau WEBP.',
                'gallery_files.*.max' => 'Ukuran setiap foto galeri maksimal 5 MB.',
            ],
        )->validate();

        $milik = $news ? array_map('intval', $news->images()->pluck('id')->all()) : [];
        $terpakai = [];
        $rencana = [];

        foreach ($susunan as $i => $butir) {
            $id = isset($butir['id']) ? (int) $butir['id'] : null;
            $upload = isset($butir['upload']) ? (int) $butir['upload'] : null;
            $caption = trim((string) ($butir['caption'] ?? '')) ?: null;

            // Setiap butir harus menunjuk tepat satu hal yang sah dan belum
            // dipakai butir lain: foto milik berita INI, atau berkas yang
            // benar-benar ikut terkirim. Id foto berita lain ditolak.
            $sah = $id !== null
                ? in_array($id, $milik, true) && ! in_array("id:$id", $terpakai, true)
                : $upload !== null && isset($berkas[$upload]) && ! in_array("up:$upload", $terpakai, true);

            if (! $sah) {
                throw ValidationException::withMessages([
                    'gallery' => 'Foto galeri ke-'.($i + 1).' tidak dikenali. Muat ulang halaman lalu coba lagi.',
                ]);
            }

            $terpakai[] = $id !== null ? "id:$id" : "up:$upload";
            $rencana[] = ['id' => $id, 'file' => $id === null ? $berkas[$upload] : null, 'caption' => $caption];
        }

        return $rencana;
    }

    /**
     * Terapkan susunan galeri. Dijalankan di dalam transaksi.
     *
     * @param  string[]  $baru  diisi lintasan berkas yang baru disimpan,
     *                          untuk dibuang bila transaksinya gagal
     * @return string[] lintasan foto lama yang harus dibuang sesudah transaksi
     */
    private function terapkanGaleri(News $news, array $rencana, array &$baru): array
    {
        $dipakai = [];

        foreach ($rencana as $urutan => $butir) {
            if ($butir['file']) {
                $lintasan = PengecilFoto::simpan($butir['file'], self::DIR_GALERI, self::SISI_GALERI);
                $baru[] = $lintasan;

                $dipakai[] = NewsImage::create([
                    'news_id' => $news->id,
                    'path' => $lintasan,
                    'caption' => $butir['caption'],
                    'sort_order' => $urutan,
                ])->id;

                continue;
            }

            NewsImage::whereKey($butir['id'])->update([
                'caption' => $butir['caption'],
                'sort_order' => $urutan,
            ]);
            $dipakai[] = $butir['id'];
        }

        $dibuang = NewsImage::where('news_id', $news->id)->whereNotIn('id', $dipakai)->pluck('path')->all();
        NewsImage::where('news_id', $news->id)->whereNotIn('id', $dipakai)->delete();

        return $dibuang;
    }

    /** Buang berkas yang terlanjur disimpan oleh permintaan yang gagal. */
    private function buangBerkasBaru(array $lintasan): void
    {
        foreach ($lintasan as $l) {
            Storage::disk('public')->delete($l);
        }
    }

    /**
     * Aturan tulis-menulis berita.
     *
     * `thumbnail` tetap menerima string karena sebagian berita masih memakai
     * URL penuh peninggalan portal v1; berkas unggahan datang terpisah lewat
     * `cover` supaya keduanya bisa hidup berdampingan.
     */
    private function validasi(Request $request, bool $baru): array
    {
        $wajib = $baru ? 'required' : 'sometimes';

        return $request->validate([
            'title' => $wajib.'|string|max:255',
            'category' => $wajib.'|string|max:100',
            'excerpt' => $wajib.'|string',
            'content' => $wajib.'|string',
            'thumbnail' => 'nullable|string',
            'author' => 'nullable|string|max:255',
            'status' => ['sometimes', Rule::in(News::STATUSES)],
            'is_featured' => 'boolean',
        ], [
            'title.required' => 'Judul berita wajib diisi.',
            'title.max' => 'Judul berita maksimal 255 karakter.',
            'category.required' => 'Kategori wajib dipilih.',
            'excerpt.required' => 'Ringkasan wajib diisi.',
            'content.required' => 'Isi berita wajib diisi.',
            'status.in' => 'Status hanya boleh published atau draft.',
        ]);
    }

    /** Simpan foto sampul bila ada; kembalikan lintasannya. */
    private function simpanSampul(Request $request): ?string
    {
        if (! $request->hasFile('cover')) {
            return null;
        }

        $request->validate([
            'cover' => 'image|mimes:jpg,jpeg,png,webp|max:5120',   // 5 MB
        ], [
            'cover.image' => 'Gambar sampul harus berupa berkas gambar.',
            'cover.mimes' => 'Gambar sampul harus berformat JPG, PNG, atau WEBP.',
            'cover.max' => 'Ukuran gambar sampul maksimal 5 MB.',
        ]);

        return PengecilFoto::simpan($request->file('cover'), self::DIR_SAMPUL, self::SISI_SAMPUL);
    }

    /**
     * Hapus berkas pada cakram v2.
     *
     * Berkas warisan v1 dan URL milik server lain dilewati: keduanya tidak
     * berada di cakram yang dikelola portal ini, dan menghapusnya bukan
     * kewenangan modul ini.
     */
    private function hapusBerkas(?string $lintasan): void
    {
        if (empty($lintasan) || str_starts_with($lintasan, 'http://') || str_starts_with($lintasan, 'https://')) {
            return;
        }

        if (! str_starts_with($lintasan, self::DIR_SAMPUL.'/') && ! str_starts_with($lintasan, self::DIR_GALERI.'/')) {
            return;
        }

        Storage::disk('public')->delete($lintasan);
    }
}

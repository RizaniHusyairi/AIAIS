<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\News;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class NewsController extends Controller
{
    /** Tempat foto sampul unggahan v2 disimpan pada cakram `public`. */
    private const DIR_SAMPUL = 'news/covers';

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

    public function show($slug)
    {
        $news = News::where('slug', $slug)->first();
        if (!$news) {
            return ApiResponse::error('Berita tidak ditemukan', null, 404);
        }

        $news->increment('views_count');

        return ApiResponse::success($news, 'Detail berita');
    }

    public function store(Request $request)
    {
        $validated = $this->validasi($request, true);

        if ($sampul = $this->simpanSampul($request)) {
            $validated['thumbnail'] = $sampul;
        }

        $validated['is_featured'] = $request->boolean('is_featured');
        $validated['status'] = $validated['status'] ?? 'published';
        $validated['slug'] = Str::slug($request->title).'-'.time();
        $validated['published_at'] = now();

        $news = News::create($validated);

        return ApiResponse::success($news, 'Berita berhasil dibuat', null, 201);
    }

    /** Semua berita (termasuk draft) untuk panel admin */
    public function adminIndex()
    {
        $news = News::orderBy('published_at', 'desc')->get();
        return ApiResponse::success($news, 'Seluruh berita & artikel');
    }

    public function update(Request $request, $id)
    {
        $news = News::findOrFail($id);

        $validated = $this->validasi($request, false);

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

        $news->update($validated);

        if (isset($sampul) && $sampul) {
            $this->hapusBerkas($lama);
        }

        return ApiResponse::success($news, 'Berita berhasil diperbarui');
    }

    public function destroy($id)
    {
        $news = News::findOrFail($id);
        $lintasan = $news->thumbnail;
        $news->delete();
        $this->hapusBerkas($lintasan);

        return ApiResponse::success(null, 'Berita berhasil dihapus');
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

        return $request->file('cover')->storeAs(
            self::DIR_SAMPUL,
            Str::uuid().'.'.$request->file('cover')->extension(),
            'public',
        );
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

        if (! str_starts_with($lintasan, self::DIR_SAMPUL.'/')) {
            return;
        }

        Storage::disk('public')->delete($lintasan);
    }
}

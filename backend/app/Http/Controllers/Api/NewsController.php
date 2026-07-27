<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\News;
use Illuminate\Http\Request;

class NewsController extends Controller
{
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
        $validated = $request->validate([
            'title' => 'required|string',
            'category' => 'required|string',
            'excerpt' => 'required|string',
            'content' => 'required|string',
            'thumbnail' => 'nullable|string',
            'is_featured' => 'boolean',
        ]);

        $validated['slug'] = \Illuminate\Support\Str::slug($request->title) . '-' . time();
        $validated['published_at'] = now();
        $validated['status'] = 'published';

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

        $validated = $request->validate([
            'title' => 'sometimes|string',
            'category' => 'sometimes|string',
            'excerpt' => 'sometimes|string',
            'content' => 'sometimes|string',
            'thumbnail' => 'nullable|string',
            'author' => 'nullable|string',
            'status' => 'sometimes|in:draft,published',
            'is_featured' => 'boolean',
        ]);

        if ($request->has('is_featured')) {
            $validated['is_featured'] = $request->boolean('is_featured');
        }

        if ($request->filled('title') && $request->title !== $news->title) {
            $validated['slug'] = \Illuminate\Support\Str::slug($request->title) . '-' . time();
        }

        $news->update($validated);
        return ApiResponse::success($news, 'Berita berhasil diperbarui');
    }

    public function destroy($id)
    {
        $news = News::findOrFail($id);
        $news->delete();
        return ApiResponse::success(null, 'Berita berhasil dihapus');
    }
}

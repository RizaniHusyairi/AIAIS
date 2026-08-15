<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Faq;
use Illuminate\Http\Request;

/**
 * Pertanyaan yang sering diajukan.
 *
 * Daftar publik hanya memuat pertanyaan aktif, urut menurut `sort_order` yang
 * ditetapkan petugas — urutan itu bagian dari penyajiannya, bukan kebetulan.
 * Pengelompokan per kategori dan pencarian dikerjakan di sisi klien.
 *
 * `answer` dikirim sebagai HTML apa adanya. Penyaringannya dilakukan di sisi
 * tampilan (`SafeHtml`), bukan di sini: panel admin perlu menerima kembali
 * markah yang sama persis dengan yang disimpannya untuk disunting, dan
 * menyaringnya di API akan diam-diam mengikis isian petugas setiap kali
 * disimpan ulang.
 */
class FaqController extends Controller
{
    /** Daftar publik. `?featured=1` menyaring yang ditandai penting. */
    public function index(Request $request)
    {
        $faqs = Faq::query()
            ->where('is_active', true)
            ->when($request->boolean('featured'), fn ($q) => $q->where('is_featured', true))
            ->when($request->query('category'), fn ($q, $c) => $q->where('category', $c))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return ApiResponse::success($faqs, 'Daftar pertanyaan yang sering diajukan');
    }

    /** Daftar admin — termasuk pertanyaan yang dinonaktifkan. */
    public function adminIndex()
    {
        return ApiResponse::success(
            Faq::orderBy('sort_order')->orderBy('id')->get(),
            'Daftar seluruh pertanyaan',
        );
    }

    public function store(Request $request)
    {
        $faq = Faq::create($this->validated($request));

        return ApiResponse::success($faq, 'Pertanyaan berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $faq = Faq::findOrFail($id);
        $faq->update($this->validated($request, $faq->id));

        return ApiResponse::success($faq->fresh(), 'Pertanyaan berhasil diperbarui');
    }

    public function destroy($id)
    {
        Faq::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Pertanyaan berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        return $request->validate([
            'question' => $partial.'required|string|max:500',
            'answer' => $partial.'required|string|max:20000',
            'category' => $partial.'required|string|max:100',
            'service_id' => 'nullable|exists:services,id',
            'sort_order' => 'nullable|integer|min:0',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
        ], [
            'question.required' => 'Pertanyaan wajib diisi.',
            'answer.required' => 'Jawaban wajib diisi.',
            'category.required' => 'Kategori wajib diisi.',
            'service_id.exists' => 'Layanan yang dipilih tidak ditemukan.',
        ]);
    }
}

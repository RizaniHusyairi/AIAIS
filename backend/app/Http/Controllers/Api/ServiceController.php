<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Layanan pengajuan bandara.
 *
 * Daftar publik hanya memuat layanan aktif; daftar admin memuat semuanya.
 *
 * CATATAN PENTING soal `submission_url`: nilainya masih menunjuk dasbor
 * pemohon portal v1 ("dashboard/tenant"). Dasbor itu ikut mati saat cutover,
 * sehingga setiap tombol "Ajukan" akan menuju halaman yang tidak ada sampai
 * modul pengajuan v2 dibangun. Halaman publik karena itu memperlakukan
 * lintasan gaya v1 sebagai "belum tersedia" alih-alih memasang tautan mati —
 * lihat `LayananDetailView` di frontend.
 */
class ServiceController extends Controller
{
    /** Daftar publik — hanya layanan aktif. */
    public function index()
    {
        $services = Service::where('is_active', true)->orderBy('id')->get();

        return ApiResponse::success($services, 'Daftar layanan bandara');
    }

    /** Satu layanan berdasarkan slug. */
    public function show(string $slug)
    {
        $service = Service::where('slug', $slug)->where('is_active', true)->first();

        if (! $service) {
            return ApiResponse::error('Layanan tidak ditemukan.', null, 404);
        }

        return ApiResponse::success($service, 'Detail layanan');
    }

    /** Daftar admin — termasuk layanan yang dinonaktifkan. */
    public function adminIndex()
    {
        return ApiResponse::success(Service::orderBy('id')->get(), 'Daftar seluruh layanan');
    }

    public function store(Request $request)
    {
        $service = Service::create($this->validated($request));

        return ApiResponse::success($service, 'Layanan berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $service = Service::findOrFail($id);
        $service->update($this->validated($request, $service->id));

        return ApiResponse::success($service->fresh(), 'Layanan berhasil diperbarui');
    }

    public function destroy($id)
    {
        Service::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Layanan berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        $validated = $request->validate([
            'name' => $partial.'required|string|max:150',
            'slug' => [
                ...($ignoreId !== null ? ['sometimes'] : []),
                'required', 'string', 'max:125', 'regex:/^[a-z0-9-]+$/',
                Rule::unique('services', 'slug')->ignore($ignoreId),
            ],
            'title' => $partial.'required|string|max:255',
            'summary' => 'nullable|string|max:500',
            'description' => 'nullable|string|max:5000',

            'requirements' => 'nullable|array',
            'requirements.*' => 'string|max:500',
            'steps' => 'nullable|array',
            'steps.*' => 'string|max:500',

            'has_pricing' => 'boolean',
            'pricing_info' => 'nullable|array',
            'pricing_info.*.name' => 'required_with:pricing_info|string|max:150',
            'pricing_info.*.price' => 'required_with:pricing_info|string|max:100',

            'submission_url' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ], [
            'name.required' => 'Nama layanan wajib diisi.',
            'slug.required' => 'Slug layanan wajib diisi.',
            'slug.regex' => 'Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.',
            'slug.unique' => 'Slug ini sudah dipakai layanan lain.',
            'title.required' => 'Judul halaman wajib diisi.',
            'pricing_info.*.name.required_with' => 'Nama tarif wajib diisi.',
            'pricing_info.*.price.required_with' => 'Besaran tarif wajib diisi.',
        ]);

        // Tarif tanpa penanda `has_pricing` tidak akan pernah tampil; begitu
        // pula sebaliknya. Diselaraskan di sini supaya keduanya tidak bisa
        // berbeda isi.
        if (array_key_exists('pricing_info', $validated)) {
            $validated['has_pricing'] = ! empty($validated['pricing_info']);
        }

        return $validated;
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\InformationServiceReport;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Laporan Layanan Informasi Publik — laporan tahunan penyelenggaraan PPID.
 *
 * Endpoint publiknya sudah tersedia, tetapi halaman publik v2 BELUM
 * memakainya: tabel warisan v1 baru memuat laporan 2024, sedangkan halaman
 * yang tayang hari ini juga menampilkan laporan 2025. Beralih sekarang berarti
 * menghilangkan laporan yang sudah terbit. Panel admin disediakan lebih dulu
 * supaya kekurangannya dilengkapi; halaman publik menyusul sesudah itu.
 */
class InformationServiceReportController extends Controller
{
    /** Daftar publik, tahun terbaru lebih dulu. */
    public function index()
    {
        $reports = InformationServiceReport::query()
            ->whereNotNull('document_link')
            ->where('document_link', '!=', '')
            ->orderByDesc('publication_year')
            ->get();

        return ApiResponse::success($reports, 'Daftar laporan layanan informasi');
    }

    /** Daftar admin — termasuk laporan yang tautannya belum diisi. */
    public function adminIndex()
    {
        $reports = InformationServiceReport::orderByDesc('publication_year')->get();

        return ApiResponse::success($reports, 'Daftar seluruh laporan layanan informasi');
    }

    public function store(Request $request)
    {
        $report = InformationServiceReport::create($this->validated($request));

        return ApiResponse::success($report, 'Laporan berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $report = InformationServiceReport::findOrFail($id);
        $report->update($this->validated($request, $report->id));

        return ApiResponse::success($report->fresh(), 'Laporan berhasil diperbarui');
    }

    public function destroy($id)
    {
        InformationServiceReport::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Laporan berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    /**
     * Aturan validasi bersama tambah & ubah.
     *
     * Satu laporan per tahun: nomor tahun ganda hampir pasti berarti laporan
     * lama hendak diperbarui, bukan laporan kedua untuk tahun yang sama.
     */
    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $partial = $ignoreId !== null ? 'sometimes|' : '';

        return $request->validate([
            'title' => $partial.'required|string|max:500',
            'publication_year' => [
                ...($ignoreId !== null ? ['sometimes'] : []),
                'required', 'integer', 'min:2000', 'max:2100',
                Rule::unique('information_service_reports', 'publication_year')->ignore($ignoreId),
            ],
            'document_link' => $partial.'required|url|max:500',
        ], [
            'title.required' => 'Judul laporan wajib diisi.',
            'publication_year.required' => 'Tahun laporan wajib diisi.',
            'publication_year.unique' => 'Laporan untuk tahun ini sudah terdaftar.',
            'document_link.required' => 'Tautan laporan wajib diisi.',
            'document_link.url' => 'Tautan laporan tidak sah.',
        ]);
    }
}

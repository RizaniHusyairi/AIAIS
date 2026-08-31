<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    /**
     * Pengumuman yang sedang berlaku.
     *
     * DUA HAL YANG DULU KELIRU DI SINI, dan keduanya baru terlihat ketika
     * papan pengumuman beranda mulai memakainya:
     *
     *   1. `orderBy('priority', 'desc')` mengurutkan KOLOM TEKS menurut abjad,
     *      bukan menurut kegentingannya. Urutannya jadi urgent, medium, low,
     *      high — sehingga pengumuman "high" justru mendarat paling bawah,
     *      persis kebalikan dari maksudnya.
     *   2. `valid_until` diabaikan, sehingga pengumuman yang masa berlakunya
     *      sudah lewat tetap terkirim. Pada papan pengumuman bandara itu
     *      bukan kekeliruan kecil: imbauan yang kedaluwarsa menyesatkan.
     */
    public function index()
    {
        $urutan = "FIELD(priority, 'urgent', 'high', 'medium', 'low')";

        $announcements = Announcement::where('is_active', true)
            ->where(function ($q) {
                // Tanpa tanggal berarti berlaku sampai dicabut petugas.
                $q->whereNull('valid_until')
                    ->orWhereDate('valid_until', '>=', now()->toDateString());
            })
            ->orderByRaw($urutan)
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::success($announcements, 'Pengumuman aktif');
    }

    /** Semua pengumuman (termasuk nonaktif) untuk panel admin */
    public function adminIndex()
    {
        $announcements = Announcement::orderBy('created_at', 'desc')->get();
        return ApiResponse::success($announcements, 'Seluruh pengumuman');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'content' => 'required|string',
            'priority' => 'required|in:low,medium,high,urgent',
            'target_audience' => 'nullable|string',
            'valid_until' => 'nullable|date',
            'is_active' => 'boolean',
        ]);

        $validated['is_active'] = $request->boolean('is_active', true);

        $announcement = Announcement::create($validated);
        return ApiResponse::success($announcement, 'Pengumuman berhasil dibuat', null, 201);
    }

    public function update(Request $request, $id)
    {
        $announcement = Announcement::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string',
            'content' => 'sometimes|string',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'target_audience' => 'nullable|string',
            'valid_until' => 'nullable|date',
            'is_active' => 'boolean',
        ]);

        if ($request->has('is_active')) {
            $validated['is_active'] = $request->boolean('is_active');
        }

        $announcement->update($validated);
        return ApiResponse::success($announcement, 'Pengumuman berhasil diperbarui');
    }

    public function destroy($id)
    {
        $announcement = Announcement::findOrFail($id);
        $announcement->delete();
        return ApiResponse::success(null, 'Pengumuman berhasil dihapus');
    }
}

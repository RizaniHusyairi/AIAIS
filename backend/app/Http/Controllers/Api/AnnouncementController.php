<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    public function index()
    {
        $announcements = Announcement::where('is_active', true)
            ->orderBy('priority', 'desc')
            ->orderBy('created_at', 'desc')
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

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\Facility;
use Illuminate\Http\Request;

class FacilityController extends Controller
{
    public function index(Request $request)
    {
        $query = Facility::where('is_operational', true);

        if ($request->has('category') && !empty($request->category)) {
            $query->where('category', $request->category);
        }

        $facilities = $query->get();
        return ApiResponse::success($facilities, 'Daftar fasilitas bandara');
    }

    /** Semua fasilitas (termasuk non-operasional) untuk panel admin */
    public function adminIndex()
    {
        $facilities = Facility::orderBy('category')->orderBy('name')->get();
        return ApiResponse::success($facilities, 'Seluruh fasilitas bandara');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'category' => 'required|string',
            'location_description' => 'required|string',
            'icon' => 'nullable|string',
            'description' => 'nullable|string',
            'is_operational' => 'boolean',
        ]);

        $validated['is_operational'] = $request->boolean('is_operational', true);

        $facility = Facility::create($validated);
        return ApiResponse::success($facility, 'Fasilitas berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $facility = Facility::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string',
            'category' => 'sometimes|string',
            'location_description' => 'sometimes|string',
            'icon' => 'nullable|string',
            'description' => 'nullable|string',
            'is_operational' => 'boolean',
        ]);

        if ($request->has('is_operational')) {
            $validated['is_operational'] = $request->boolean('is_operational');
        }

        $facility->update($validated);
        return ApiResponse::success($facility, 'Fasilitas berhasil diperbarui');
    }

    public function destroy($id)
    {
        $facility = Facility::findOrFail($id);
        $facility->delete();
        return ApiResponse::success(null, 'Fasilitas berhasil dihapus');
    }
}

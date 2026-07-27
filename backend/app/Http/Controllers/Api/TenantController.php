<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\Tenant;
use Illuminate\Http\Request;

class TenantController extends Controller
{
    public function index(Request $request)
    {
        $query = Tenant::where('is_active', true);

        if ($request->has('category') && !empty($request->category)) {
            $query->where('category', $request->category);
        }

        $tenants = $query->get();
        return ApiResponse::success($tenants, 'Direktori tenant & layanan bandara');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'category' => 'required|in:food_beverage,retail,lounge,transportation,services',
            'location' => 'required|string',
            'operating_hours' => 'required|string',
            'contact_phone' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        $validated['is_active'] = $request->boolean('is_active', true);

        $tenant = Tenant::create($validated);
        return ApiResponse::success($tenant, 'Tenant berhasil ditambahkan', null, 201);
    }

    /** Semua tenant (termasuk nonaktif) untuk panel admin */
    public function adminIndex()
    {
        $tenants = Tenant::orderBy('category')->orderBy('name')->get();
        return ApiResponse::success($tenants, 'Seluruh tenant bandara');
    }

    public function update(Request $request, $id)
    {
        $tenant = Tenant::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string',
            'category' => 'sometimes|in:food_beverage,retail,lounge,transportation,services',
            'location' => 'sometimes|string',
            'operating_hours' => 'sometimes|string',
            'contact_phone' => 'nullable|string',
            'image' => 'nullable|string',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        if ($request->has('is_active')) {
            $validated['is_active'] = $request->boolean('is_active');
        }

        $tenant->update($validated);
        return ApiResponse::success($tenant, 'Tenant berhasil diperbarui');
    }

    public function destroy($id)
    {
        $tenant = Tenant::findOrFail($id);
        $tenant->delete();
        return ApiResponse::success(null, 'Tenant berhasil dihapus');
    }
}

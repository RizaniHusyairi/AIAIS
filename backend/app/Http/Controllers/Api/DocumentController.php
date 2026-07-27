<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\Document;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    public function index()
    {
        $documents = Document::orderBy('created_at', 'desc')->get();
        return ApiResponse::success($documents, 'Daftar dokumen & formulir publik');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string',
            'category' => 'required|string',
            'file_type' => 'required|string',
            'file_size' => 'required|string',
            'file_url' => 'required|string',
        ]);

        $validated['download_count'] = 0;

        $document = Document::create($validated);
        return ApiResponse::success($document, 'Dokumen berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $document = Document::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string',
            'category' => 'sometimes|string',
            'file_type' => 'sometimes|string',
            'file_size' => 'sometimes|string',
            'file_url' => 'sometimes|string',
        ]);

        $document->update($validated);
        return ApiResponse::success($document, 'Dokumen berhasil diperbarui');
    }

    public function destroy($id)
    {
        $document = Document::findOrFail($id);
        $document->delete();
        return ApiResponse::success(null, 'Dokumen berhasil dihapus');
    }
}

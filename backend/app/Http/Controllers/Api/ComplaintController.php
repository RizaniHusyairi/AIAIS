<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\Complaint;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ComplaintController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'reporter_name' => 'required|string',
            'reporter_email' => 'required|email',
            'reporter_phone' => 'required|string',
            'category' => 'required|string',
            'subject' => 'required|string',
            'description' => 'required|string',
        ]);

        $validated['ticket_number'] = 'TKT-' . date('Ymd') . '-' . strtoupper(Str::random(4));
        $validated['status'] = 'submitted';

        $complaint = Complaint::create($validated);

        return ApiResponse::success([
            'ticket_number' => $complaint->ticket_number,
            'status' => $complaint->status,
            'created_at' => $complaint->created_at,
        ], 'Pengaduan online berhasil dikirim. Simpan Nomor Tiket Anda.', null, 201);
    }

    public function track($ticket_number)
    {
        $complaint = Complaint::where('ticket_number', $ticket_number)->first();
        if (!$complaint) {
            return ApiResponse::error('Nomor tiket pengaduan tidak ditemukan', null, 404);
        }

        return ApiResponse::success($complaint, 'Status tiket pengaduan');
    }

    public function index()
    {
        $complaints = Complaint::orderBy('created_at', 'desc')->get();
        return ApiResponse::success($complaints, 'Daftar semua pengaduan publik');
    }

    public function resolve(Request $request, $id)
    {
        $complaint = Complaint::findOrFail($id);
        $request->validate([
            'status' => 'required|in:in_progress,resolved,rejected',
            'admin_response' => 'required|string',
        ]);

        $complaint->update([
            'status' => $request->status,
            'admin_response' => $request->admin_response,
            'responded_at' => now(),
        ]);

        return ApiResponse::success($complaint, 'Pengaduan berhasil diperbarui');
    }
}

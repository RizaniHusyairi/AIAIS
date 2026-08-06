<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\ChatThread;
use App\Models\ChatMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    /**
     * Pengunjung memulai percakapan chat baru.
     */
    public function start(Request $request)
    {
        $validated = $request->validate([
            'visitor_name'  => 'required|string|max:100',
            'visitor_email' => 'nullable|email|max:150',
            'visitor_phone' => 'nullable|string|max:30',
            'category'      => 'required|string|max:100',
            'subject'       => 'required|string|max:200',
            'message'       => 'required|string',
        ]);

        $ticket_number = 'CHAT-' . date('Ymd') . '-' . strtoupper(Str::random(5));

        $thread = ChatThread::create([
            'ticket_number'    => $ticket_number,
            'visitor_name'     => $validated['visitor_name'],
            'visitor_email'    => $validated['visitor_email'] ?? null,
            'visitor_phone'    => $validated['visitor_phone'] ?? null,
            'category'         => $validated['category'],
            'subject'          => $validated['subject'],
            'status'           => 'open',
            'last_activity_at' => now(),
        ]);

        $message = ChatMessage::create([
            'chat_thread_id' => $thread->id,
            'sender_type'    => 'visitor',
            'sender_name'    => $validated['visitor_name'],
            'message'        => $validated['message'],
            'is_read'        => false,
        ]);

        $thread->load('messages');

        return ApiResponse::success($thread, 'Sesi percakapan berhasil dimulai. Simpan Kode Tiket Chat Anda.', null, 201);
    }

    /**
     * Mengambil riwayat percakapan berdasarkan Nomor Tiket Chat.
     */
    public function show($ticket_number)
    {
        $thread = ChatThread::with('messages')->where('ticket_number', $ticket_number)->first();

        if (!$thread) {
            return ApiResponse::error('Sesi percakapan tidak ditemukan. Periksa kembali Kode Tiket Chat Anda.', null, 404);
        }

        // Tandai pesan dari admin sebagai dibaca oleh pengunjung
        ChatMessage::where('chat_thread_id', $thread->id)
            ->where('sender_type', 'admin')
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return ApiResponse::success($thread, 'Detail percakapan chat');
    }

    /**
     * Pengunjung mengirim pesan baru ke dalam percakapan yang ada.
     */
    public function sendVisitorMessage(Request $request, $ticket_number)
    {
        $thread = ChatThread::where('ticket_number', $ticket_number)->first();

        if (!$thread) {
            return ApiResponse::error('Sesi percakapan tidak ditemukan.', null, 404);
        }

        $validated = $request->validate([
            'message' => 'required|string',
        ]);

        $message = ChatMessage::create([
            'chat_thread_id' => $thread->id,
            'sender_type'    => 'visitor',
            'sender_name'    => $thread->visitor_name,
            'message'        => $validated['message'],
            'is_read'        => false,
        ]);

        $thread->update([
            'status'           => $thread->status === 'resolved' || $thread->status === 'closed' ? 'open' : $thread->status,
            'last_activity_at' => now(),
        ]);

        $thread->load('messages');

        return ApiResponse::success($thread, 'Pesan berhasil dikirim.');
    }

    /**
     * [ADMIN] Mengambil daftar seluruh percakapan chat.
     */
    public function adminIndex(Request $request)
    {
        $query = ChatThread::with(['messages' => function ($q) {
            $q->orderBy('created_at', 'asc');
        }]);

        if ($request->has('status') && in_array($request->status, ['open', 'active', 'resolved', 'closed'])) {
            $query->where('status', $request->status);
        }

        $threads = $query->orderBy('last_activity_at', 'desc')->get();

        return ApiResponse::success($threads, 'Daftar sesi percakapan chat');
    }

    /**
     * [ADMIN] Membalas percakapan pengunjung.
     */
    public function adminReply(Request $request, $id)
    {
        $thread = ChatThread::findOrFail($id);

        $validated = $request->validate([
            'message' => 'required|string',
            'status'  => 'nullable|in:open,active,resolved,closed',
        ]);

        $message = ChatMessage::create([
            'chat_thread_id' => $thread->id,
            'sender_type'    => 'admin',
            'sender_name'    => 'Petugas Customer Service',
            'message'        => $validated['message'],
            'is_read'        => false,
        ]);

        // Tandai pesan pengunjung sebagai dibaca
        ChatMessage::where('chat_thread_id', $thread->id)
            ->where('sender_type', 'visitor')
            ->where('is_read', false)
            ->update(['is_read' => true]);

        $newStatus = $validated['status'] ?? 'active';

        $thread->update([
            'status'           => $newStatus,
            'last_activity_at' => now(),
        ]);

        $thread->load('messages');

        return ApiResponse::success($thread, 'Tanggapan berhasil dikirim ke pengunjung.');
    }

    /**
     * [ADMIN] Memperbarui status sesi percakapan.
     */
    public function adminUpdateStatus(Request $request, $id)
    {
        $thread = ChatThread::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:open,active,resolved,closed',
        ]);

        $thread->update([
            'status'           => $validated['status'],
            'last_activity_at' => now(),
        ]);

        return ApiResponse::success($thread, 'Status percakapan berhasil diperbarui.');
    }
}

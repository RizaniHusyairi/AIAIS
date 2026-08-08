<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\ChatThread;
use App\Models\ChatMessage;
use App\Models\Complaint;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Percakapan bantuan antara pengunjung dan petugas.
 *
 * Terbuka tanpa autentikasi — bertanya kepada penyelenggara layanan publik
 * tidak boleh mensyaratkan akun. Dua akibat yang ditangani di sini:
 * endpointnya dibatasi laju (lihat routes/api.php), dan respons publiknya
 * selalu melewati `ChatThread::publicView()` supaya nomor tiket yang tertebak
 * tidak membocorkan surel maupun telepon pengunjung lain.
 */
class ChatController extends Controller
{
    /** Pengunjung memulai percakapan baru. */
    public function start(Request $request)
    {
        $validated = $request->validate([
            'visitor_name'  => 'required|string|max:100',
            'visitor_email' => 'nullable|email|max:150',
            'visitor_phone' => 'nullable|string|max:30',
            // Kategori disamakan dengan pengaduan agar laporan lintas kanal
            // dapat dijumlahkan tanpa memetakan dua daftar yang berbeda.
            'category'      => 'required|string|in:' . implode(',', Complaint::CATEGORIES),
            'subject'       => 'required|string|max:200',
            'message'       => 'required|string|max:5000',
        ], [
            'visitor_name.required' => 'Nama Anda wajib diisi.',
            'visitor_email.email' => 'Alamat surel tidak sah.',
            'category.required' => 'Kategori wajib dipilih.',
            'category.in' => 'Kategori tidak dikenali.',
            'subject.required' => 'Subjek atau topik wajib diisi.',
            'message.required' => 'Pesan wajib diisi.',
            'message.max' => 'Pesan maksimal 5.000 karakter.',
        ]);

        $thread = ChatThread::create([
            'ticket_number'    => 'CHAT-' . date('Ymd') . '-' . strtoupper(Str::random(5)),
            'visitor_name'     => $validated['visitor_name'],
            'visitor_email'    => $validated['visitor_email'] ?? null,
            'visitor_phone'    => $validated['visitor_phone'] ?? null,
            'category'         => $validated['category'],
            'subject'          => $validated['subject'],
            'status'           => 'open',
            'last_activity_at' => now(),
        ]);

        ChatMessage::create([
            'chat_thread_id' => $thread->id,
            'sender_type'    => 'visitor',
            'sender_name'    => $validated['visitor_name'],
            'message'        => $validated['message'],
            'is_read'        => false,
        ]);

        return ApiResponse::success(
            $thread->fresh()->publicView(),
            'Sesi percakapan berhasil dimulai. Simpan Kode Tiket Chat Anda.',
            null,
            201,
        );
    }

    /**
     * Riwayat percakapan menurut nomor tiket.
     *
     * `?since={id}` hanya mengirim pesan yang lebih baru dari id tersebut.
     * Halaman publik menjaring ulang tiap beberapa detik; tanpa ini setiap
     * denyut menarik seluruh percakapan dari awal, dan percakapan panjang
     * membuat biayanya tumbuh terus selama sesi masih terbuka.
     */
    public function show(Request $request, $ticket_number)
    {
        $thread = ChatThread::where('ticket_number', $ticket_number)->first();

        if (! $thread) {
            return ApiResponse::error('Sesi percakapan tidak ditemukan. Periksa kembali Kode Tiket Chat Anda.', null, 404);
        }

        $since = $request->query('since');

        $messages = $thread->messages()
            ->when(is_numeric($since), fn ($q) => $q->where('id', '>', (int) $since))
            ->get();

        // Balasan petugas ditandai terbaca begitu pengunjung membukanya.
        ChatMessage::where('chat_thread_id', $thread->id)
            ->where('sender_type', 'admin')
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return ApiResponse::success(
            $thread->publicView($messages) + ['is_delta' => is_numeric($since)],
            'Detail percakapan chat',
        );
    }

    /** Pengunjung mengirim pesan lanjutan. */
    public function sendVisitorMessage(Request $request, $ticket_number)
    {
        $thread = ChatThread::where('ticket_number', $ticket_number)->first();

        if (! $thread) {
            return ApiResponse::error('Sesi percakapan tidak ditemukan.', null, 404);
        }

        $validated = $request->validate([
            'message' => 'required|string|max:5000',
        ], [
            'message.required' => 'Pesan wajib diisi.',
            'message.max' => 'Pesan maksimal 5.000 karakter.',
        ]);

        ChatMessage::create([
            'chat_thread_id' => $thread->id,
            'sender_type'    => 'visitor',
            'sender_name'    => $thread->visitor_name,
            'message'        => $validated['message'],
            'is_read'        => false,
        ]);

        // Percakapan yang sudah ditutup dibuka kembali bila pengunjung
        // menyusulkan pertanyaan — jawabannya belum tentu tuntas.
        $thread->update([
            'status'           => in_array($thread->status, ChatThread::CLOSED_STATUSES, true) ? 'open' : $thread->status,
            'last_activity_at' => now(),
        ]);

        return ApiResponse::success($thread->fresh()->publicView(), 'Pesan berhasil dikirim.');
    }

    /* -------------------------------------------------------------- */
    /*  Admin                                                          */
    /* -------------------------------------------------------------- */

    /**
     * Daftar percakapan untuk panel petugas.
     *
     * Hanya memuat pesan TERAKHIR tiap percakapan berikut jumlah yang belum
     * dibaca. Sebelumnya seluruh pesan dari seluruh percakapan ikut termuat
     * setiap lima detik — beban yang tumbuh tanpa batas seiring usia portal.
     * Isi lengkapnya diambil `adminShow()` saat satu percakapan dibuka.
     */
    public function adminIndex(Request $request)
    {
        $threads = ChatThread::query()
            ->when(
                in_array($request->query('status'), ChatThread::STATUSES, true),
                fn ($q) => $q->where('status', $request->query('status')),
            )
            ->withCount([
                'messages as unread_count' => fn ($q) => $q->where('sender_type', 'visitor')->where('is_read', false),
                'messages as message_count',
            ])
            ->with(['messages' => fn ($q) => $q->latest('id')->limit(1)])
            ->orderByDesc('last_activity_at')
            ->get()
            ->map(function (ChatThread $t) {
                $data = $t->toArray();
                $data['last_message'] = $t->messages->first();
                unset($data['messages']);
                return $data;
            });

        return ApiResponse::success($threads, 'Daftar sesi percakapan chat');
    }

    /** Isi lengkap satu percakapan, termasuk kontak pengunjung untuk petugas. */
    public function adminShow($id)
    {
        $thread = ChatThread::with('messages')->findOrFail($id);

        return ApiResponse::success($thread, 'Detail percakapan chat');
    }

    public function adminReply(Request $request, $id)
    {
        $thread = ChatThread::findOrFail($id);

        $validated = $request->validate([
            'message' => 'required|string|max:5000',
            'status'  => 'nullable|in:' . implode(',', ChatThread::STATUSES),
        ], [
            'message.required' => 'Pesan balasan wajib diisi.',
        ]);

        ChatMessage::create([
            'chat_thread_id' => $thread->id,
            'sender_type'    => 'admin',
            'sender_name'    => $request->user()?->name ?? 'Petugas Customer Service',
            'message'        => $validated['message'],
            'is_read'        => false,
        ]);

        ChatMessage::where('chat_thread_id', $thread->id)
            ->where('sender_type', 'visitor')
            ->where('is_read', false)
            ->update(['is_read' => true]);

        $thread->update([
            'status'           => $validated['status'] ?? 'active',
            'last_activity_at' => now(),
        ]);

        return ApiResponse::success($thread->fresh()->load('messages'), 'Tanggapan berhasil dikirim ke pengunjung.');
    }

    public function adminUpdateStatus(Request $request, $id)
    {
        $thread = ChatThread::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:' . implode(',', ChatThread::STATUSES),
        ], [
            'status.in' => 'Status percakapan tidak dikenali.',
        ]);

        $thread->update([
            'status'           => $validated['status'],
            'last_activity_at' => now(),
        ]);

        return ApiResponse::success($thread->fresh(), 'Status percakapan berhasil diperbarui.');
    }

    /** Hapus percakapan — paritas dengan panel petugas v1. */
    public function destroy($id)
    {
        $thread = ChatThread::findOrFail($id);
        // Pesannya ikut terhapus lewat onDelete('cascade') pada migrasi.
        $thread->delete();

        return ApiResponse::success(null, 'Sesi percakapan berhasil dihapus');
    }
}

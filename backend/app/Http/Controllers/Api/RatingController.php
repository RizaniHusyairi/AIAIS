<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\ChatThread;
use App\Models\Complaint;
use App\Models\ServiceRating;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Penilaian kepuasan atas tiket layanan.
 *
 * Terbuka tanpa autentikasi seperti kanal layanannya sendiri, tetapi dijaga
 * tiga syarat: tiketnya harus ada, penanganannya harus sudah selesai, dan
 * satu tiket hanya boleh dinilai sekali. Tanpa ketiganya angka SKM dapat
 * digelembungkan siapa saja — dan angka kepuasan karangan lebih buruk
 * daripada tidak punya angka sama sekali.
 */
class RatingController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'ticket_number' => 'required|string|max:100',
            'score' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ], [
            'ticket_number.required' => 'Nomor tiket wajib dikirim.',
            'score.required' => 'Nilai kepuasan wajib dipilih.',
            'score.min' => 'Nilai kepuasan antara 1 sampai 5.',
            'score.max' => 'Nilai kepuasan antara 1 sampai 5.',
            'comment.max' => 'Komentar maksimal 1.000 karakter.',
        ]);

        $ticket = $validated['ticket_number'];

        $channel = $this->resolveChannel($ticket);

        if ($channel === null) {
            return ApiResponse::error('Nomor tiket tidak ditemukan.', null, 404);
        }

        if ($channel === false) {
            return ApiResponse::error(
                'Penilaian baru dapat diberikan setelah penanganan tiket selesai.',
                null,
                422,
            );
        }

        if (ServiceRating::where('ticket_number', $ticket)->exists()) {
            return ApiResponse::error('Tiket ini sudah pernah Anda nilai. Terima kasih.', null, 409);
        }

        $rating = ServiceRating::create([
            'ticket_number' => $ticket,
            'channel' => $channel,
            'score' => $validated['score'],
            'comment' => $validated['comment'] ?? null,
        ]);

        return ApiResponse::success(
            ['score' => $rating->score],
            'Terima kasih. Penilaian Anda membantu kami memperbaiki layanan.',
            null,
            201,
        );
    }

    /** Ringkasan untuk dasbor petugas. */
    public function summary()
    {
        $total = ServiceRating::count();

        $sebaran = ServiceRating::select('score', DB::raw('COUNT(*) as total'))
            ->groupBy('score')
            ->pluck('total', 'score');

        return ApiResponse::success([
            // Null, bukan 0, saat belum ada penilaian: rata-rata dari nol
            // data bukan "nol bintang", melainkan tidak ada nilainya.
            'average' => $total > 0 ? round((float) ServiceRating::avg('score'), 2) : null,
            'total' => $total,
            'distribution' => collect(range(1, 5))
                ->map(fn ($s) => ['score' => $s, 'total' => (int) ($sebaran[$s] ?? 0)])
                ->all(),
            'latest_comments' => ServiceRating::whereNotNull('comment')
                ->latest()
                ->limit(5)
                ->get(['ticket_number', 'channel', 'score', 'comment', 'created_at']),
        ], 'Ringkasan kepuasan layanan');
    }

    /**
     * Tentukan kanal tiket sekaligus periksa kelayakannya dinilai.
     *
     * @return string|false|null  nama kanal bila layak, `false` bila tiketnya
     *                            ada tetapi belum selesai, `null` bila tidak ada.
     */
    private function resolveChannel(string $ticket): string|false|null
    {
        if ($thread = ChatThread::where('ticket_number', $ticket)->first()) {
            return in_array($thread->status, ChatThread::CLOSED_STATUSES, true) ? 'chat' : false;
        }

        if ($complaint = Complaint::where('ticket_number', $ticket)->first()) {
            return in_array($complaint->status, Complaint::CLOSED_STATUSES, true) ? 'complaint' : false;
        }

        return null;
    }
}

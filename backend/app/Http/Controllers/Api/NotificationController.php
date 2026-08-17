<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Notifications\AktivitasPusatBantuan;
use App\Services\Notifikasi\WhatsAppGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Lonceng panel, langganan push, dan keadaan kanal notifikasi.
 *
 * Seluruhnya milik pemakai yang sedang masuk. Tidak ada satu pun endpoint di
 * sini yang dapat membaca notifikasi milik akun lain — notifikasi memuat nomor
 * tiket warga, dan meski tanpa identitas, ia tetap urusan internal.
 */
class NotificationController extends Controller
{
    /** Daftar terbaru beserta jumlah yang belum dibaca. */
    public function index(Request $request)
    {
        $user = $request->user();

        $daftar = $user->notifications()
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn ($n) => [
                'id' => $n->id,
                'jenis' => $n->data['jenis'] ?? null,
                'judul' => $n->data['judul'] ?? 'Notifikasi',
                'ticket' => $n->data['ticket'] ?? null,
                'path' => $n->data['path'] ?? '/admin/dashboard',
                'dibaca' => $n->read_at !== null,
                'created_at' => $n->created_at,
            ]);

        return ApiResponse::success([
            'items' => $daftar,
            'belum_dibaca' => $user->unreadNotifications()->count(),
        ], 'Notifikasi panel');
    }

    public function markRead(Request $request, string $id)
    {
        $notif = $request->user()->notifications()->whereKey($id)->first();

        if (! $notif) {
            return ApiResponse::error('Notifikasi tidak ditemukan.', null, 404);
        }

        $notif->markAsRead();

        return ApiResponse::success(null, 'Ditandai sudah dibaca');
    }

    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return ApiResponse::success(null, 'Semua notifikasi ditandai sudah dibaca');
    }

    public function destroy(Request $request, string $id)
    {
        $request->user()->notifications()->whereKey($id)->delete();

        return ApiResponse::success(null, 'Notifikasi dihapus');
    }

    /* ------------------------- keadaan kanal ------------------------- */

    public function status(Request $request, WhatsAppGateway $wa)
    {
        return ApiResponse::success([
            'whatsapp' => [
                'enabled' => (bool) config('whatsapp.enabled'),
                'siap' => $wa->siap(),
                'jumlah_tujuan' => count($wa->tujuan()),
                'kuota_harian' => (int) config('whatsapp.daily_cap'),
                'terpakai_hari_ini' => $wa->terpakaiHariIni(),

                /*
                 * Setelan gateway yang sedang berlaku.
                 *
                 * Tanpa ini, satu-satunya cara petugas memastikan portal
                 * menunjuk gateway yang benar adalah membuka `.env` di server —
                 * dan kekeliruan endpoint atau nama medan baru ketahuan saat
                 * notifikasi pertama yang sungguhan tidak pernah sampai.
                 *
                 * KUNCINYA TIDAK PERNAH DIKIRIM UTUH. Yang disertakan hanya
                 * awalan `wag_xxxx` untuk mencocokkan kunci mana yang terpasang;
                 * bagian rahasianya tetap di server. Endpoint ini pun sudah di
                 * balik `auth:sanctum`.
                 */
                'gateway' => [
                    'endpoint' => (string) config('whatsapp.endpoint'),
                    'host' => parse_url((string) config('whatsapp.endpoint'), PHP_URL_HOST),
                    'auth_header' => (string) config('whatsapp.auth_header'),
                    'format' => (string) config('whatsapp.format'),
                    'field_target' => (string) config('whatsapp.field_target'),
                    'field_message' => (string) config('whatsapp.field_message'),
                    'device_id' => config('whatsapp.device_id'),
                    'kunci_terpasang' => filled(config('whatsapp.token')),
                    'kunci_awalan' => Str::of((string) config('whatsapp.token'))
                        ->before('.')
                        ->value() ?: null,
                ],
            ],
            'push' => [
                'enabled' => (bool) config('webpush.enabled'),
                'siap' => filled(config('webpush.public_key')) && filled(config('webpush.private_key')),
                // Dipakai peramban untuk mendaftar; kunci PUBLIK, aman dikirim.
                'public_key' => config('webpush.public_key'),
                'perangkat_saya' => PushSubscription::where('user_id', $request->user()->id)->count(),
            ],
            'penerima' => \App\Models\User::penerimaNotifikasi()->count(),
        ], 'Keadaan kanal notifikasi');
    }

    /**
     * Kirim notifikasi uji ke diri sendiri.
     *
     * Tanpa ini, satu-satunya cara mengetahui gateway dan kunci VAPID benar
     * adalah menunggu warga sungguhan mengirim sesuatu — dan menemukan bahwa
     * notifikasinya tidak pernah datang justru pada saat paling dibutuhkan.
     */
    public function test(Request $request)
    {
        $request->user()->notify(new AktivitasPusatBantuan('pengaduan', 'UJI-COBA'));

        return ApiResponse::success(null, 'Notifikasi uji dikirim. Lonceng terisi sekarang; push menyusul dalam semenit.');
    }

    /* ------------------------- langganan push ------------------------- */

    public function subscribe(Request $request)
    {
        $data = $request->validate([
            'endpoint' => 'required|string|max:500',
            'keys.p256dh' => 'required|string|max:255',
            'keys.auth' => 'required|string|max:255',
            'device' => 'nullable|string|max:150',
        ], [
            'endpoint.required' => 'Data langganan tidak lengkap.',
        ]);

        // `updateOrCreate` pada endpoint: mendaftar ulang di perangkat yang
        // sama menghasilkan endpoint yang sama dan harus menimpa, bukan
        // menggandakan barisnya.
        PushSubscription::updateOrCreate(
            ['endpoint' => $data['endpoint']],
            [
                'user_id' => $request->user()->id,
                'p256dh' => $data['keys']['p256dh'],
                'auth' => $data['keys']['auth'],
                'device' => $data['device'] ?? null,
            ],
        );

        return ApiResponse::success(null, 'Notifikasi di perangkat ini dinyalakan');
    }

    public function unsubscribe(Request $request)
    {
        $request->validate(['endpoint' => 'required|string|max:500']);

        PushSubscription::where('user_id', $request->user()->id)
            ->where('endpoint', $request->endpoint)
            ->delete();

        return ApiResponse::success(null, 'Notifikasi di perangkat ini dimatikan');
    }
}

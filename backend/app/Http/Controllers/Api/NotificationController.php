<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use App\Notifications\AktivitasPusatBantuan;
use App\Services\Notifikasi\WhatsAppGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Lonceng panel, langganan push, dan keadaan kanal notifikasi.
 *
 * Seluruhnya milik pemakai yang sedang masuk. Tidak ada satu pun endpoint di
 * sini yang dapat membaca notifikasi milik akun lain — notifikasi memuat nomor
 * tiket warga, dan meski tanpa identitas, ia tetap urusan internal.
 */
class NotificationController extends Controller
{
    /**
     * Riwayat notifikasi, tersaring dan berhalaman.
     *
     * Dipakai dua pemanggil dengan kebutuhan yang berbeda: lonceng pada kepala
     * panel memanggilnya TANPA parameter apa pun dan hanya membaca `items`
     * serta `belum_dibaca`, sementara kotak masuk `/admin/notifikasi`
     * menyaring, mencari, dan menyusuri halaman berikutnya. Karena itu kedua
     * kunci lama itu tidak boleh berpindah tempat — bawaan tanpa parameter
     * harus tetap berupa 30 terbaru, persis seperti sebelumnya.
     *
     * Penyaringan dikerjakan di basis data, bukan di peramban. Riwayat
     * notifikasi tumbuh seumur portal dan tidak ada batas atasnya; mengangkut
     * seluruhnya ke klien sekadar untuk disaring adalah beban yang bertambah
     * tiap hari tanpa pernah surut.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $saring = $request->validate([
            'jenis' => ['nullable', 'string', Rule::in(array_keys(AktivitasPusatBantuan::JENIS))],
            'status' => ['nullable', 'in:belum,sudah'],
            'q' => ['nullable', 'string', 'max:60'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ], [
            'jenis.in' => 'Jenis notifikasi tidak dikenali.',
            'status.in' => 'Penyaring status hanya menerima "belum" atau "sudah".',
        ]);

        $kueri = $user->notifications()->latest();

        if (filled($saring['jenis'] ?? null)) {
            $kueri->where('data->jenis', $saring['jenis']);
        }

        if (($saring['status'] ?? null) === 'belum') {
            $kueri->whereNull('read_at');
        } elseif (($saring['status'] ?? null) === 'sudah') {
            $kueri->whereNotNull('read_at');
        }

        /*
         * Pencarian hanya menyentuh nomor tiket. Muatan notifikasi memang tidak
         * memuat apa pun selain itu yang layak dicari — tidak ada nama maupun
         * isi laporan di dalamnya, dan memang tidak boleh ada.
         *
         * Kata kuncinya dibesarkan hurufnya lebih dulu. MySQL mengembalikan
         * hasil `json_extract` dengan kolasi biner, sehingga `LIKE` di atasnya
         * peka huruf besar-kecil: mengetik "tkt" tidak menemukan "TKT-2026..."
         * dan kotak pencarian tampak rusak. Nomor tiket sendiri selalu huruf
         * besar sejak dibuat — lihat `ComplaintController::store()` — jadi
         * membesarkan kata kunci aman, dan lebih murah daripada `UPPER()` di
         * sisi kolom yang penulisannya berbeda antara MySQL dan SQLite.
         */
        if (filled($saring['q'] ?? null)) {
            $kueri->where('data->ticket', 'like', '%'.Str::upper($saring['q']).'%');
        }

        $halaman = $kueri->paginate((int) ($saring['per_page'] ?? 30));

        return ApiResponse::success([
            'items' => collect($halaman->items())->map(fn ($n) => [
                'id' => $n->id,
                'jenis' => $n->data['jenis'] ?? null,
                'judul' => $n->data['judul'] ?? 'Notifikasi',
                'ticket' => $n->data['ticket'] ?? null,
                'path' => $n->data['path'] ?? '/admin/dashboard',
                'dibaca' => $n->read_at !== null,
                'created_at' => $n->created_at,
            ])->all(),
            'belum_dibaca' => $user->unreadNotifications()->count(),
            'rekap' => $this->rekap($request),
            'jenis_tersedia' => collect(AktivitasPusatBantuan::JENIS)
                ->map(fn ($j, $kunci) => ['kunci' => $kunci, 'judul' => $j['judul']])
                ->values(),
            /*
             * Keterangan halaman ditaruh DI DALAM `data`, bukan pada blok
             * `pagination` di sisi respons.
             *
             * Bukan penyimpangan tanpa sebab: `adminFetch` di frontend hanya
             * meneruskan `json.data` kepada pemanggilnya dan membuang kunci
             * lain apa pun di tingkat atas, sehingga blok `pagination` yang
             * benar sekalipun tidak akan pernah sampai ke tombol "muat lebih
             * banyak" yang membutuhkannya.
             */
            'halaman' => [
                'saat_ini' => $halaman->currentPage(),
                'terakhir' => $halaman->lastPage(),
                'total' => $halaman->total(),
            ],
        ], 'Notifikasi panel');
    }

    /**
     * Jumlah per jenis dan jumlah yang masuk hari ini.
     *
     * Dihitung dengan `COUNT` terpisah per jenis, bukan satu `GROUP BY` atas
     * `json_extract`. Kueri agregat di atas lintasan JSON ditulis berbeda pada
     * MySQL dan SQLite, dan berkas uji berjalan di atas SQLite sementara
     * produksi memakai MySQL — angka yang benar di satu tempat dan diam-diam
     * kosong di tempat lain adalah cara terburuk fitur ini bisa gagal.
     *
     * Kueri ini SENGAJA tidak ikut disaring: rekapnya adalah keadaan seluruh
     * kotak masuk, dan justru dipakai untuk memutuskan saringan mana yang
     * hendak dibuka.
     */
    private function rekap(Request $request): array
    {
        $user = $request->user();

        return [
            'total' => $user->notifications()->count(),
            'belum_dibaca' => $user->unreadNotifications()->count(),
            'hari_ini' => $user->notifications()->whereDate('created_at', today())->count(),
            'per_jenis' => collect(array_keys(AktivitasPusatBantuan::JENIS))
                ->mapWithKeys(fn ($kunci) => [
                    $kunci => $user->notifications()->where('data->jenis', $kunci)->count(),
                ])
                ->all(),
        ];
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

<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\VisitorLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Statistik kunjungan portal publik.
 *
 * Sebelum ini `visitor_logs` tidak pernah ditulis dari permintaan sungguhan
 * dan angka pengunjung pada dasbor admin adalah konstanta yang ditambahkan di
 * kode. Karena angkanya kini tayang di footer untuk dilihat siapa saja,
 * seluruhnya harus berasal dari baris yang benar-benar tercatat.
 *
 * Yang TIDAK disimpan: alamat IP dan identitas apa pun. Penanda pengunjung
 * berupa hash satu arah — lihat `visitorHash()`.
 */
class VisitorController extends Controller
{
    /**
     * Jarak waktu sebelum pengunjung yang sama dihitung ulang untuk halaman
     * yang sama. Tanpa jeda ini, satu orang yang bolak-balik membuka halaman
     * menggelembungkan angka sampai tidak bermakna.
     */
    private const DEDUPE_MINUTES = 30;

    /** Batas "sedang online": kunjungan dalam rentang ini dianggap aktif. */
    private const ONLINE_MINUTES = 5;

    /** Catat satu kunjungan halaman. */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'page_url' => 'required|string|max:255',
        ], [
            'page_url.required' => 'Lintasan halaman wajib dikirim.',
        ]);

        $hash = $this->visitorHash($request);
        $agent = (string) $request->userAgent();

        $duplikat = VisitorLog::where('visitor_hash', $hash)
            ->where('page_url', $validated['page_url'])
            ->where('created_at', '>=', Carbon::now()->subMinutes(self::DEDUPE_MINUTES))
            ->exists();

        // Kunjungan berulang tetap dijawab 200. Frontend tidak perlu — dan
        // tidak boleh — tahu apakah barisnya jadi disimpan; membedakannya
        // hanya akan membocorkan keadaan pencatatan ke pengunjung.
        if (! $duplikat) {
            VisitorLog::create([
                'visitor_hash' => $hash,
                'page_url' => $validated['page_url'],
                'user_agent' => $agent !== '' ? mb_substr($agent, 0, 255) : null,
                'device' => $this->device($agent),
                'browser' => $this->browser($agent),
            ]);
        }

        return ApiResponse::success(null, 'Kunjungan tercatat');
    }

    /** Statistik ringkas untuk footer portal. */
    public function stats()
    {
        $sejak = VisitorLog::min('created_at');

        return ApiResponse::success([
            'total' => VisitorLog::count(),
            'today' => VisitorLog::whereDate('created_at', Carbon::today())->count(),
            'online' => VisitorLog::where('created_at', '>=', Carbon::now()->subMinutes(self::ONLINE_MINUTES))
                ->distinct('visitor_hash')
                ->count('visitor_hash'),
            // Dipakai footer untuk keterangan "Dihitung sejak …", supaya angka
            // yang masih kecil terbaca sebagai awal penghitungan, bukan galat.
            'since' => $sejak ? Carbon::parse($sejak)->toDateString() : null,
        ], 'Statistik kunjungan portal');
    }

    /* -------------------------------------------------------------- */

    /**
     * Penanda pengunjung yang tidak dapat dikembalikan menjadi identitas.
     *
     * IP dan User-Agent digabung lalu di-HMAC dengan APP_KEY. Hasilnya stabil
     * selama sesi penjelajahan yang sama sehingga cukup untuk deduplikasi dan
     * hitungan "sedang online", tetapi tidak dapat dipetakan balik ke orang.
     */
    private function visitorHash(Request $request): string
    {
        return hash_hmac(
            'sha256',
            $request->ip() . '|' . $request->userAgent(),
            (string) config('app.key'),
        );
    }

    /** Golongan perangkat dari User-Agent. Kolomnya sudah lama ada, kini terisi. */
    private function device(string $agent): string
    {
        if (preg_match('/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i', $agent)) {
            return 'Tablet';
        }

        if (preg_match('/Mobile|iPhone|iPod|Android|Windows Phone|BlackBerry|Opera Mini/i', $agent)) {
            return 'Mobile';
        }

        return 'Desktop';
    }

    /**
     * Nama peramban dari User-Agent.
     *
     * Urutan pemeriksaan penting: peramban berbasis Chromium menyertakan
     * "Chrome" pada User-Agent-nya, jadi Edge dan Opera harus diperiksa
     * lebih dulu agar tidak semuanya tercatat sebagai Chrome.
     */
    private function browser(string $agent): string
    {
        foreach ([
            'Edg' => 'Edge',
            'OPR' => 'Opera',
            'SamsungBrowser' => 'Samsung Internet',
            'Firefox' => 'Firefox',
            'Chrome' => 'Chrome',
            'Safari' => 'Safari',
        ] as $tanda => $nama) {
            if (str_contains($agent, $tanda)) {
                return $nama;
            }
        }

        return 'Lainnya';
    }
}

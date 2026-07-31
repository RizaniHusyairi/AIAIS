<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/**
 * Informasi versi portal.
 *
 * Berguna untuk memastikan build mana yang benar-benar terpasang tanpa harus
 * membuka browser, dan dipakai panel admin untuk mendeteksi selisih versi
 * antara frontend dan backend.
 */
class VersionController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $version = (string) config('app.version');

        $data = [
            'name' => config('app.name'),
            'version' => $version,
            'channel' => $this->channel($version),
            // Versi kontrak API — sengaja dipisahkan dari versi produk.
            'api' => config('api.version'),
        ];

        // Detail teknis hanya di luar produksi. Versi framework, versi PHP, dan
        // nama environment mempermudah pemetaan tumpukan oleh penyerang, dan
        // tidak satu pun dibutuhkan antarmuka.
        if (! app()->environment('production')) {
            $data['environment'] = app()->environment();
            $data['laravel'] = app()->version();
            $data['php'] = PHP_VERSION;
            $data['server_time'] = now()->toIso8601String();
        }

        return ApiResponse::success($data, 'Informasi versi portal');
    }

    /** "2.0.0-alpha.1" -> "alpha"; "2.0.0" -> "stable". */
    private function channel(string $version): string
    {
        if (! str_contains($version, '-')) {
            return 'stable';
        }

        $suffix = explode('-', $version, 2)[1];

        return explode('.', $suffix)[0];
    }
}

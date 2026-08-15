<?php

namespace App\Http\Middleware;

use App\Helpers\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tolak akun yang belum disetujui atau sudah dinonaktifkan.
 *
 * Portal v1 memeriksa `is_accepted` hanya sekali, saat login
 * (`LoginController::login`), sehingga mencabut persetujuan seseorang tidak
 * berpengaruh apa-apa sampai ia logout dengan sendirinya. Di sini
 * pemeriksaannya dilakukan pada setiap permintaan: begitu persetujuan dicabut,
 * tindakan berikutnya langsung ditolak.
 *
 * Pesannya sengaja dipertahankan sama dengan v1 — petugas sudah mengenalinya.
 */
class EnsureAccountIsApproved
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return ApiResponse::error('Anda harus masuk terlebih dahulu.', null, 401);
        }

        // Akun yang dihapus lunak sebenarnya sudah tersaring cakupan global
        // SoftDeletes saat token diselesaikan. Diperiksa ulang di sini supaya
        // penjaganya tidak bergantung pada perilaku itu tetap ada.
        if ($user->trashed()) {
            return ApiResponse::error('Akun Anda sudah dinonaktifkan.', null, 403);
        }

        if (! $user->is_accepted) {
            return ApiResponse::error(
                'Akun Anda belum disetujui. Silakan hubungi admin.',
                null,
                403,
            );
        }

        return $next($request);
    }
}

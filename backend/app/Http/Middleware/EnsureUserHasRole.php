<?php

namespace App\Http\Middleware;

use App\Helpers\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Batasi rute pada peran tertentu: `role:admin` atau `role:admin,staff`.
 *
 * Padanan alias `admin` dan `staff` di portal v1, disatukan menjadi satu
 * middleware variadik. `IsUser` milik v1 tidak diporting — isinya hanya
 * memeriksa bahwa pengguna sudah masuk, dan itu sudah tugas `auth:sanctum`.
 *
 * Peran dibaca lewat aksesor `User::role`, yang menurunkannya dari bendera
 * `is_admin`/`is_staff` warisan v1 — jadi tidak ada keadaan kedua yang harus
 * ikut diselaraskan.
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // Tanpa pengguna berarti middleware ini terpasang tanpa `auth:sanctum`
        // di depannya. v1 kebobolan di titik ini: `IsAdmin` membaca
        // `auth()->user()->is_admin` tanpa memeriksa null lebih dulu.
        if ($user === null) {
            return ApiResponse::error('Anda harus masuk terlebih dahulu.', null, 401);
        }

        if (! in_array($user->role, $roles, true)) {
            return ApiResponse::error(
                'Akun Anda tidak berwenang mengakses sumber daya ini.',
                null,
                403,
            );
        }

        return $next($request);
    }
}

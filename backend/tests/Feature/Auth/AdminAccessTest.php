<?php

namespace Tests\Feature\Auth;

use Illuminate\Routing\Route as RouteDefinition;
use Illuminate\Support\Facades\Route;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Setiap rute panel menolak akun yang tidak berwenang.
 *
 * Tes ini sengaja GENERATIF: ia menelusuri tabel rute yang sebenarnya, bukan
 * daftar yang ditulis tangan. Akibatnya rute admin yang ditambahkan besok ikut
 * terlindungi tanpa ada yang perlu ingat memperbarui tes ini — dan sebaliknya,
 * rute yang lalai dijaga tidak bisa lolos diam-diam.
 *
 * Tidak ada tabel domain yang dibuat: penjaga kewenangan menolak permintaan
 * sebelum controller mana pun berjalan, jadi sampainya di 403 justru
 * membuktikan pengujiannya benar.
 */
class AdminAccessTest extends TestCase
{
    use CreatesLegacyUserSchema;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
    }

    public function test_akun_warga_ditolak_di_seluruh_rute_panel(): void
    {
        $warga = $this->buatPengguna('user');
        $token = $warga->createToken('uji')->plainTextToken;

        $diuji = 0;

        foreach ($this->rutePanel() as $route) {
            [$metode, $uri] = $this->permintaanUntuk($route);

            $res = $this->withToken($token)->json($metode, $uri);

            $this->assertSame(
                403,
                $res->getStatusCode(),
                "Rute panel {$metode} {$uri} tidak menolak akun berperan `user`.",
            );

            $diuji++;
        }

        // Jaring pengaman: bila penyaring rutenya suatu saat tidak cocok lagi,
        // tes ini akan lulus tanpa menguji apa pun. Ini yang mencegahnya.
        $this->assertGreaterThan(50, $diuji, 'Rute panel yang teruji terlalu sedikit.');
    }

    /**
     * Staff boleh mengelola konten, tetapi tidak boleh membuka berkas identitas
     * pemohon informasi publik.
     */
    public function test_staff_ditolak_pada_berkas_permohonan_informasi(): void
    {
        $staff = $this->buatPengguna('staff');
        $token = $staff->createToken('uji')->plainTextToken;
        $versi = config('api.version');

        foreach ([
            "/api/{$versi}/admin/information-requests",
            "/api/{$versi}/admin/information-requests/1/file/ktp",
        ] as $uri) {
            $this->withToken($token)->getJson($uri)->assertStatus(403);
        }
    }

    public function test_tanpa_token_seluruh_rute_panel_menjawab_401(): void
    {
        foreach ($this->rutePanel() as $route) {
            [$metode, $uri] = $this->permintaanUntuk($route);

            $this->json($metode, $uri)->assertStatus(401);
        }
    }

    /* -------------------------------------------------------------- */

    /** @return list<RouteDefinition> */
    private function rutePanel(): array
    {
        $prefix = 'api/'.config('api.version').'/admin';

        return array_values(array_filter(
            Route::getRoutes()->getRoutes(),
            fn (RouteDefinition $r) => str_starts_with($r->uri(), $prefix),
        ));
    }

    /**
     * Metode dan URI yang dapat ditembak untuk sebuah definisi rute.
     *
     * Parameter diisi angka 1, KECUALI yang punya batasan pola — misalnya
     * `whereIn('jenis', ['ktp', 'surat-pernyataan'])`. Nilai yang melanggar
     * batasan membuat rutenya tidak cocok sama sekali dan menjawab 404, yang
     * akan terbaca keliru sebagai "tidak dijaga" padahal justru sebaliknya.
     *
     * Nilai parameternya sendiri tidak pernah terpakai: permintaan berhenti di
     * middleware jauh sebelum model apa pun dicari.
     *
     * @return array{0: string, 1: string}
     */
    private function permintaanUntuk(RouteDefinition $route): array
    {
        $metode = collect($route->methods())
            ->first(fn (string $m) => ! in_array($m, ['HEAD', 'OPTIONS'], true)) ?? 'GET';

        $uri = preg_replace_callback(
            '/\{([^}?]+)\??\}/',
            fn (array $m) => $this->nilaiParameter($route, $m[1]),
            $route->uri(),
        );

        return [$metode, '/'.$uri];
    }

    /** Nilai yang memenuhi batasan pola parameter, bila ada. */
    private function nilaiParameter(RouteDefinition $route, string $nama): string
    {
        $pola = $route->wheres[$nama] ?? null;

        if ($pola === null) {
            return '1';
        }

        // `whereIn` menghasilkan alternasi literal ("ktp|surat-pernyataan").
        // Ambil cabang pertamanya; pola lain (mis. "[0-9]+") dipenuhi angka 1.
        $cabang = explode('|', $pola)[0];

        return preg_match('/^[\w-]+$/', $cabang) === 1 ? $cabang : '1';
    }
}

<?php

namespace Tests\Feature\Auth;

use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Masa berlaku dan kemampuan token.
 *
 * Dua penjaga yang saling melengkapi: token berhenti berlaku setelah satu hari
 * kerja, dan token yang diterbitkan untuk bidang lain tidak dapat memukul
 * panel meskipun pemiliknya kebetulan berperan admin.
 */
class TokenTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $endpointPanel;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->endpointPanel = '/api/'.config('api.version').'/admin/analytics';
    }

    public function test_token_baru_membawa_kemampuan_panel(): void
    {
        $admin = $this->buatPengguna('admin');

        $res = $this->postJson('/api/'.config('api.version').'/auth/login', [
            'email' => $admin->email,
            'password' => 'rahasia123',
        ])->assertOk();

        $token = $admin->tokens()->latest('id')->first();

        $this->assertSame('admin-panel', $token->name);
        $this->assertSame(['admin-panel'], $token->abilities);
        $this->assertNotEmpty($res->json('data.token'));
    }

    /**
     * Inilah gunanya kemampuan token: kelak akun warga menerima token
     * `citizen`, dan token itu tidak boleh membuka panel sekalipun perannya
     * suatu saat dinaikkan.
     */
    public function test_token_tanpa_kemampuan_panel_ditolak(): void
    {
        $admin = $this->buatPengguna('admin');
        $token = $admin->createToken('aplikasi-warga', ['citizen'])->plainTextToken;

        $this->withToken($token)->getJson($this->endpointPanel)->assertStatus(403);
    }

    public function test_token_kedaluwarsa_setelah_masa_berlakunya_lewat(): void
    {
        $admin = $this->buatPengguna('admin');
        $token = $admin->createToken('admin-panel', ['admin-panel'])->plainTextToken;

        // Tepat sebelum batas: masih berlaku.
        $this->travel(config('sanctum.expiration') - 5)->minutes();
        $this->withToken($token)->getJson('/api/'.config('api.version').'/auth/me')->assertOk();

        // Melewati batas: ditolak, tanpa perlu ada yang menghapus tokennya.
        $this->travel(10)->minutes();
        $this->lupakanSesi();
        $this->withToken($token)->getJson('/api/'.config('api.version').'/auth/me')->assertStatus(401);
    }

    public function test_masa_berlaku_disetel_delapan_jam(): void
    {
        $this->assertSame(480, config('sanctum.expiration'));
    }

    public function test_logout_mencabut_token_yang_dipakai(): void
    {
        $admin = $this->buatPengguna('admin');
        $token = $admin->createToken('admin-panel', ['admin-panel'])->plainTextToken;
        $versi = config('api.version');

        $this->withToken($token)->postJson("/api/{$versi}/auth/logout")->assertOk();

        $this->lupakanSesi();
        $this->withToken($token)->getJson("/api/{$versi}/auth/me")->assertStatus(401);
    }

    /**
     * Lupakan pengguna yang sudah diselesaikan guard.
     *
     * Dalam satu tes, permintaan kedua memakai instance aplikasi yang sama, dan
     * guard menyimpan pengguna hasil permintaan pertama. Tanpa ini, token yang
     * sudah dicabut atau kedaluwarsa tetap tampak sah — tesnya lulus padahal
     * yang diuji tidak pernah benar-benar dievaluasi ulang.
     */
    private function lupakanSesi(): void
    {
        $this->app['auth']->forgetGuards();
    }
}

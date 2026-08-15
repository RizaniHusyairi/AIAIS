<?php

namespace Tests\Feature\Auth;

use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Pintu masuk panel pengelolaan.
 *
 * Yang diuji bukan hanya "kredensial benar → berhasil", melainkan penolakan
 * yang membedakan v2 dari keadaannya sebelum ini: akun belum disetujui, akun
 * dinonaktifkan, dan — sejak modul pengajuan ada — akun warga yang boleh masuk
 * namun tokennya tidak membuka panel.
 */
class LoginTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $endpoint;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->endpoint = '/api/'.config('api.version').'/auth/login';
    }

    public function test_admin_yang_sah_memperoleh_token(): void
    {
        $admin = $this->buatPengguna('admin');

        $res = $this->postJson($this->endpoint, [
            'email' => $admin->email,
            'password' => 'rahasia123',
        ]);

        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.role', 'admin')
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'name', 'email', 'role']]]);
    }

    public function test_staff_juga_boleh_masuk(): void
    {
        $staff = $this->buatPengguna('staff');

        $this->postJson($this->endpoint, ['email' => $staff->email, 'password' => 'rahasia123'])
            ->assertOk()
            ->assertJsonPath('data.user.role', 'staff');
    }

    public function test_kata_sandi_salah_ditolak(): void
    {
        $admin = $this->buatPengguna('admin');

        $this->postJson($this->endpoint, ['email' => $admin->email, 'password' => 'keliru'])
            ->assertStatus(401)
            ->assertJsonPath('message', 'Kredensial tidak valid');
    }

    /**
     * Warga BOLEH masuk — area pengajuan memang miliknya — tetapi tokennya
     * tidak membuka panel.
     *
     * Sebelum modul pengajuan ada, login warga ditolak mentah dengan 403.
     * Penjagaannya kini berpindah tempat, bukan hilang: tokennya diterbitkan
     * hanya dengan kemampuan `citizen`, sehingga seluruh rute `/admin`
     * menolaknya lewat `ability:admin-panel`. Uji di bawah menegaskan
     * keduanya sekaligus, karena yang berbahaya justru bila bagian pertama
     * lolos sendirian.
     */
    public function test_warga_boleh_masuk_tetapi_tokennya_tidak_membuka_panel(): void
    {
        $warga = $this->buatPengguna('user');

        $res = $this->postJson($this->endpoint, [
            'email' => $warga->email,
            'password' => 'rahasia123',
        ]);

        $res->assertOk()->assertJsonPath('data.user.role', 'user');

        $this->withToken($res->json('data.token'))
            ->getJson('/api/'.config('api.version').'/admin/finances')
            ->assertForbidden();
    }

    /** Token warga hanya membawa kemampuan `citizen`, tidak lebih. */
    public function test_token_warga_hanya_berkemampuan_citizen(): void
    {
        $warga = $this->buatPengguna('user');

        $this->postJson($this->endpoint, ['email' => $warga->email, 'password' => 'rahasia123']);

        $this->assertSame(['citizen'], $warga->tokens()->first()->abilities);
    }

    public function test_akun_belum_disetujui_ditolak_dengan_pesan_v1(): void
    {
        $admin = $this->buatPengguna('admin', disetujui: false);

        $this->postJson($this->endpoint, ['email' => $admin->email, 'password' => 'rahasia123'])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Akun Anda belum disetujui. Silakan hubungi admin.');
    }

    public function test_akun_yang_dinonaktifkan_tidak_dapat_masuk(): void
    {
        $admin = $this->buatPengguna('admin');
        $admin->delete();

        $this->postJson($this->endpoint, ['email' => $admin->email, 'password' => 'rahasia123'])
            ->assertStatus(401);
    }

    /** `me` harus mengirim bentuk yang sama persis dengan respons login. */
    public function test_me_tidak_membocorkan_kolom_internal(): void
    {
        $admin = $this->buatPengguna('admin');

        $res = $this->withToken($admin->createToken('uji')->plainTextToken)
            ->getJson('/api/'.config('api.version').'/auth/me');

        $res->assertOk()
            ->assertJsonPath('data.user.role', 'admin')
            ->assertJsonMissingPath('data.user.is_admin')
            ->assertJsonMissingPath('data.user.is_staff')
            ->assertJsonMissingPath('data.user.phone')
            ->assertJsonMissingPath('data.user.address');
    }
}

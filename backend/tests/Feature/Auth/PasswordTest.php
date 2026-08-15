<?php

namespace Tests\Feature\Auth;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Ganti kata sandi, lupa kata sandi, dan pembatasan lajunya.
 *
 * Yang paling penting diuji di sini bukan "berhasil menggantinya", melainkan
 * dua hal yang mudah terlewat: sesi lama harus mati setelah sandi berganti,
 * dan endpoint lupa-sandi tidak boleh membocorkan alamat mana yang terdaftar.
 */
class PasswordTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $versi;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->versi = config('api.version');
    }

    /* ---------------- ganti sandi sendiri ---------------- */

    public function test_ganti_sandi_mencabut_seluruh_sesi(): void
    {
        $admin = $this->buatPengguna('admin');
        $token = $admin->createToken('admin-panel', ['admin-panel'])->plainTextToken;
        $lain = $admin->createToken('perangkat-lain', ['admin-panel'])->plainTextToken;

        $this->withToken($token)->putJson("/api/{$this->versi}/auth/password", [
            'current_password' => 'rahasia123',
            'password' => 'SandiBaru456',
            'password_confirmation' => 'SandiBaru456',
        ])->assertOk();

        $this->assertTrue(Hash::check('SandiBaru456', $admin->fresh()->password));

        // Sesi di perangkat lain ikut mati — inilah gunanya mengganti sandi
        // ketika curiga bocor.
        $this->app['auth']->forgetGuards();
        $this->withToken($lain)->getJson("/api/{$this->versi}/auth/me")->assertStatus(401);
    }

    public function test_ganti_sandi_menolak_sandi_lama_yang_salah(): void
    {
        $admin = $this->buatPengguna('admin');
        $token = $admin->createToken('admin-panel', ['admin-panel'])->plainTextToken;

        $this->withToken($token)->putJson("/api/{$this->versi}/auth/password", [
            'current_password' => 'keliru',
            'password' => 'SandiBaru456',
            'password_confirmation' => 'SandiBaru456',
        ])->assertStatus(422);

        $this->assertTrue(Hash::check('rahasia123', $admin->fresh()->password));
    }

    /* ---------------- lupa & reset ---------------- */

    public function test_lupa_sandi_mengirim_tautan_ke_portal(): void
    {
        Notification::fake();
        $admin = $this->buatPengguna('admin');

        $this->postJson("/api/{$this->versi}/auth/forgot-password", ['email' => $admin->email])
            ->assertOk();

        Notification::assertSentTo($admin, ResetPassword::class, function (ResetPassword $notif) use ($admin) {
            $tautan = $notif->toMail($admin)->actionUrl;

            // Tautannya harus mendarat di portal, bukan di API.
            return str_starts_with($tautan, rtrim(config('app.frontend_url'), '/').'/admin/reset-sandi')
                && str_contains($tautan, 'token=');
        });
    }

    /**
     * Alamat yang tidak terdaftar menerima jawaban yang sama persis. Kalau
     * berbeda, endpoint ini menjadi alat memeriksa siapa saja pengelola
     * bandara.
     */
    public function test_lupa_sandi_tidak_membocorkan_alamat_terdaftar(): void
    {
        Notification::fake();
        $admin = $this->buatPengguna('admin');

        $terdaftar = $this->postJson("/api/{$this->versi}/auth/forgot-password", ['email' => $admin->email]);
        $asing = $this->postJson("/api/{$this->versi}/auth/forgot-password", ['email' => 'entah@contoh.test']);

        $terdaftar->assertOk();
        $asing->assertOk();
        $this->assertSame($terdaftar->json('message'), $asing->json('message'));
    }

    public function test_reset_dengan_token_sah_mengganti_sandi_dan_mencabut_sesi(): void
    {
        $admin = $this->buatPengguna('admin');
        $sesiLama = $admin->createToken('admin-panel', ['admin-panel'])->plainTextToken;
        $token = app('auth.password.broker')->createToken($admin);

        $this->postJson("/api/{$this->versi}/auth/reset-password", [
            'token' => $token,
            'email' => $admin->email,
            'password' => 'SandiBaru456',
            'password_confirmation' => 'SandiBaru456',
        ])->assertOk();

        $this->assertTrue(Hash::check('SandiBaru456', $admin->fresh()->password));

        $this->app['auth']->forgetGuards();
        $this->withToken($sesiLama)->getJson("/api/{$this->versi}/auth/me")->assertStatus(401);
    }

    public function test_reset_dengan_token_palsu_ditolak(): void
    {
        $admin = $this->buatPengguna('admin');

        $this->postJson("/api/{$this->versi}/auth/reset-password", [
            'token' => 'token-karangan',
            'email' => $admin->email,
            'password' => 'SandiBaru456',
            'password_confirmation' => 'SandiBaru456',
        ])->assertStatus(422);

        $this->assertTrue(Hash::check('rahasia123', $admin->fresh()->password));
    }

    /* ---------------- pembatasan laju ---------------- */

    /**
     * Portal v1 tidak membatasi percobaan masuk sama sekali — controllernya
     * menimpa `login()` bawaan berikut penjaga percobaan berulangnya.
     */
    public function test_login_dibatasi_setelah_lima_percobaan_gagal(): void
    {
        $admin = $this->buatPengguna('admin');
        $endpoint = "/api/{$this->versi}/auth/login";

        for ($i = 0; $i < 5; $i++) {
            $this->postJson($endpoint, ['email' => $admin->email, 'password' => 'keliru'])
                ->assertStatus(401);
        }

        $this->postJson($endpoint, ['email' => $admin->email, 'password' => 'keliru'])
            ->assertStatus(429);

        // Kredensial yang BENAR pun ikut tertahan — itu memang maksudnya.
        $this->postJson($endpoint, ['email' => $admin->email, 'password' => 'rahasia123'])
            ->assertStatus(429);
    }
}

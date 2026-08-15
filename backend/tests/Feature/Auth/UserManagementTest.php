<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Notification;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Manajemen akun oleh admin.
 *
 * Yang diuji terutama adalah hal-hal yang mudah membuat portal tidak dapat
 * dikelola siapa pun: admin menurunkan perannya sendiri, menghapus akunnya
 * sendiri, atau seseorang menaikkan perannya lewat mass assignment.
 */
class UserManagementTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $basis;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->basis = '/api/'.config('api.version').'/admin/users';
    }

    private function sebagaiAdmin(): array
    {
        $admin = $this->buatPengguna('admin');

        return [$admin, $admin->createToken('admin-panel', ['admin-panel'])->plainTextToken];
    }

    /* ---------------- kewenangan ---------------- */

    public function test_staff_tidak_boleh_membuka_manajemen_pengguna(): void
    {
        $staff = $this->buatPengguna('staff');
        $token = $staff->createToken('admin-panel', ['admin-panel'])->plainTextToken;

        $this->withToken($token)->getJson($this->basis)->assertStatus(403);
    }

    /* ---------------- penjaga diri sendiri ---------------- */

    public function test_admin_tidak_dapat_menurunkan_perannya_sendiri(): void
    {
        [$admin, $token] = $this->sebagaiAdmin();

        $this->withToken($token)
            ->putJson("{$this->basis}/{$admin->id}/role", ['role' => 'staff'])
            ->assertStatus(422);

        $this->assertSame('admin', $admin->fresh()->role);
    }

    public function test_admin_tidak_dapat_menghapus_akunnya_sendiri(): void
    {
        [$admin, $token] = $this->sebagaiAdmin();

        $this->withToken($token)->deleteJson("{$this->basis}/{$admin->id}")->assertStatus(422);

        $this->assertNull($admin->fresh()->deleted_at);
    }

    public function test_admin_tidak_dapat_mencabut_persetujuan_dirinya_sendiri(): void
    {
        [$admin, $token] = $this->sebagaiAdmin();

        $this->withToken($token)->putJson("{$this->basis}/{$admin->id}/reject")->assertStatus(422);

        $this->assertTrue((bool) $admin->fresh()->is_accepted);
    }

    /* ---------------- mass assignment ---------------- */

    /**
     * Inilah celah yang terbuka lebar di v1: `User::$guarded = []` membuat
     * `is_admin` dapat diisi lewat badan permintaan mana pun.
     */
    public function test_peran_tidak_dapat_diisi_lewat_pembaruan_biasa(): void
    {
        [, $token] = $this->sebagaiAdmin();
        $korban = $this->buatPengguna('user');

        $this->withToken($token)->putJson("{$this->basis}/{$korban->id}", [
            'name' => 'Nama Baru',
            'role' => 'admin',
            'is_admin' => true,
            'is_accepted' => true,
        ])->assertOk();

        $segar = $korban->fresh();
        $this->assertSame('Nama Baru', $segar->name);
        $this->assertSame('user', $segar->role, 'Peran seharusnya tidak berubah lewat pembaruan biasa.');
    }

    /* ---------------- alur pengelolaan ---------------- */

    public function test_admin_dapat_membuat_akun_tanpa_nomor_telepon(): void
    {
        [, $token] = $this->sebagaiAdmin();

        // Kolom `phone` di v1 bertipe NOT NULL UNIQUE; tanpa pelonggarannya
        // permintaan ini gagal sebagai galat SQL, bukan pesan validasi.
        $this->withToken($token)->postJson($this->basis, [
            'name' => 'Petugas Baru',
            'email' => 'petugas.baru@contoh.test',
            'password' => 'SandiAwal123',
            'role' => 'staff',
        ])->assertCreated()->assertJsonPath('data.role', 'staff');

        $baru = User::where('email', 'petugas.baru@contoh.test')->first();
        $this->assertNull($baru->phone);
        $this->assertTrue((bool) $baru->is_accepted);
    }

    public function test_mencabut_persetujuan_mengakhiri_sesi_pengguna(): void
    {
        [, $token] = $this->sebagaiAdmin();
        $staff = $this->buatPengguna('staff');
        $sesiStaff = $staff->createToken('admin-panel', ['admin-panel'])->plainTextToken;

        $this->withToken($token)->putJson("{$this->basis}/{$staff->id}/reject")->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($sesiStaff)
            ->getJson('/api/'.config('api.version').'/auth/me')
            ->assertStatus(401);
    }

    /**
     * v1 menetapkan kata sandi `Apt123` untuk semua orang dan menampilkannya
     * di layar. Di sini yang dikirim hanya tautan.
     */
    public function test_reset_oleh_admin_mengirim_tautan_dan_tidak_mengembalikan_sandi(): void
    {
        Notification::fake();
        [, $token] = $this->sebagaiAdmin();
        $staff = $this->buatPengguna('staff');

        $res = $this->withToken($token)->postJson("{$this->basis}/{$staff->id}/reset-password")->assertOk();

        Notification::assertSentTo($staff, ResetPassword::class);
        $this->assertStringNotContainsString('password', strtolower(json_encode($res->json('data') ?? [])));
    }

    public function test_mengubah_peran_tidak_menghapus_jabatan_fungsional(): void
    {
        [, $token] = $this->sebagaiAdmin();
        $staff = $this->buatPengguna('staff');

        // v1 memanggil `roles()->detach()` saat status staff dicabut, sehingga
        // seluruh jabatan seseorang lenyap tanpa jejak.
        $this->withToken($token)
            ->putJson("{$this->basis}/{$staff->id}/role", ['role' => 'user'])
            ->assertOk();

        $this->assertSame('user', $staff->fresh()->role);
    }
}

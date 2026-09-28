<?php

namespace Tests\Feature;

use App\Models\MailConfig;
use App\Services\Notifikasi\KonfigurasiSurel;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Penyetelan server surel dari panel admin.
 */
class SurelSettingsTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $basis;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        (require database_path('migrations/2026_09_28_000400_create_mail_configs_table.php'))->up();
        $this->basis = '/api/'.config('api.version').'/admin/surel';
    }

    private function token(string $peran = 'admin'): string
    {
        return $this->buatPengguna($peran)->createToken('admin-panel', ['admin-panel'])->plainTextToken;
    }

    private function isian(array $timpa = []): array
    {
        return array_merge([
            'aktif' => true,
            'host' => 'smtp.contoh.test',
            'port' => 587,
            'enkripsi' => 'tls',
            'username' => 'ppid@contoh.test',
            'password' => 'rahasia-sekali',
            'from_address' => 'ppid@contoh.test',
            'from_name' => 'PPID Uji',
        ], $timpa);
    }

    public function test_staf_tidak_boleh_membuka_penyetelan_surel(): void
    {
        $token = $this->token('staff');

        $this->withToken($token)->getJson($this->basis)->assertForbidden();
        $this->withToken($token)->postJson($this->basis, $this->isian())->assertForbidden();
    }

    public function test_kata_sandi_terenkripsi_dan_tidak_pernah_dikembalikan(): void
    {
        $token = $this->token();

        $this->withToken($token)->postJson($this->basis, $this->isian())->assertOk();

        $mentah = DB::table('mail_configs')->value('password');
        $this->assertNotSame('rahasia-sekali', $mentah);
        $this->assertSame('rahasia-sekali', MailConfig::aktif()->password);

        $res = $this->withToken($token)->getJson($this->basis)->assertOk();
        $res->assertJsonPath('data.ada_sandi', true)
            ->assertJsonPath('data.host', 'smtp.contoh.test')
            ->assertJsonPath('data.sumber', 'panel');
        $this->assertStringNotContainsString('rahasia-sekali', $res->getContent());
    }

    public function test_sandi_kosong_mempertahankan_yang_lama(): void
    {
        $token = $this->token();

        $this->withToken($token)->postJson($this->basis, $this->isian())->assertOk();
        $this->withToken($token)->postJson($this->basis, $this->isian(['password' => '', 'port' => 465, 'enkripsi' => 'ssl']))->assertOk();

        $c = MailConfig::aktif();
        $this->assertSame('rahasia-sekali', $c->password);
        $this->assertSame(465, $c->port);
        $this->assertSame(1, MailConfig::count());
    }

    public function test_penyetelan_panel_diterapkan_ke_mailer(): void
    {
        $this->withToken($this->token())->postJson($this->basis, $this->isian())->assertOk();

        KonfigurasiSurel::terapkan();

        $this->assertSame('panel', config('mail.default'));
        $this->assertSame('smtp.contoh.test', config('mail.mailers.panel.host'));
        $this->assertTrue(config('mail.mailers.panel.require_tls'));
        $this->assertSame('ppid@contoh.test', config('mail.from.address'));
        $this->assertTrue(KonfigurasiSurel::siap());
    }

    public function test_sakelar_mati_membiarkan_env(): void
    {
        $this->withToken($this->token())->postJson($this->basis, $this->isian(['aktif' => false]))->assertOk();

        KonfigurasiSurel::terapkan();

        $this->assertSame('array', config('mail.default'));
        // phpunit.xml memakai mailer `array`: tidak ada yang benar-benar keluar.
        $this->assertFalse(KonfigurasiSurel::siap());
        $this->assertSame('tidak-ada', KonfigurasiSurel::sumber());
    }

    public function test_uji_tanpa_smtp_berterus_terang_tidak_terkirim(): void
    {
        $this->withToken($this->token())->postJson("{$this->basis}/uji", ['alamat' => 'tujuan@contoh.test'])
            ->assertOk()
            ->assertJsonPath('data.terkirim', false);
    }

    public function test_uji_gagal_melaporkan_galat_tanpa_membocorkan_sandi(): void
    {
        $token = $this->token();
        // Port 1 di localhost: sambungan langsung ditolak.
        $this->withToken($token)->postJson($this->basis, $this->isian(['host' => '127.0.0.1', 'port' => 1, 'enkripsi' => 'none']))->assertOk();

        $res = $this->withToken($token)->postJson("{$this->basis}/uji", ['alamat' => 'tujuan@contoh.test'])
            ->assertStatus(502)
            ->assertJsonPath('success', false);

        $this->assertStringContainsString('Surel uji gagal dikirim', $res->json('message'));
        $this->assertStringNotContainsString('rahasia-sekali', $res->getContent());
    }

    public function test_hapus_kembali_ke_env(): void
    {
        $token = $this->token();
        $this->withToken($token)->postJson($this->basis, $this->isian())->assertOk();

        $this->withToken($token)->deleteJson($this->basis)->assertOk();

        $this->assertSame(0, MailConfig::count());
    }
}

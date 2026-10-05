<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Pengingat antrean sesudah login.
 *
 * Yang dijaga: hanya pekerjaan yang menunggu PETUGAS yang dihitung
 * (pengajuan "Revisi Diperlukan" menunggu pemohon), butir nol dibuang, tabel
 * pengajuan yang belum ada dilewati, dan permohonan informasi tetap tertutup
 * bagi staff.
 */
class PendingWorkTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $prefix;

    private const TABEL_PENGAJUAN = ['fieldtrips', 'tenants', 'rentals', 'licenses', 'ads', 'lelangs', 'work_permits', 'slots', 'extend_advances'];

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();

        foreach (['complaints', 'chat_threads', 'lost_reports', 'public_informations', ...self::TABEL_PENGAJUAN] as $t) {
            Schema::dropIfExists($t);
        }

        Schema::create('complaints', fn (Blueprint $t) => [$t->id(), $t->string('status'), $t->timestamps()]);
        Schema::create('chat_threads', fn (Blueprint $t) => [$t->id(), $t->string('status'), $t->timestamps()]);
        Schema::create('lost_reports', fn (Blueprint $t) => [$t->id(), $t->string('status'), $t->timestamps()]);
        Schema::create('public_informations', fn (Blueprint $t) => [$t->id(), $t->string('status'), $t->date('due_date')->nullable(), $t->timestamps()]);

        // Sengaja hanya dua: sisanya dibiarkan tidak ada untuk menguji bahwa
        // tabel v1 yang belum dimigrasi tidak menggagalkan respons.
        foreach (['fieldtrips', 'tenants'] as $t) {
            Schema::create($t, fn (Blueprint $b) => [$b->id(), $b->string('submission_status'), $b->timestamps()]);
        }

        $this->prefix = '/api/'.config('api.version');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function token(string $peran = 'admin'): string
    {
        $user = \App\Models\User::create(['name' => 'Petugas', 'email' => "{$peran}@contoh.id", 'password' => bcrypt('rahasia123')]);
        $user->forceFill(['is_admin' => $peran === 'admin', 'is_staff' => $peran === 'staff' ? 1 : 0, 'is_accepted' => true])->save();

        return $user->createToken('admin-panel', ['admin-panel'])->plainTextToken;
    }

    private function baris(string $tabel, array $isi): void
    {
        DB::table($tabel)->insert($isi + ['created_at' => now(), 'updated_at' => now()]);
    }

    public function test_tanpa_antrean_kelompoknya_kosong(): void
    {
        $this->baris('complaints', ['status' => 'resolved']);
        $this->baris('fieldtrips', ['submission_status' => 'Disetujui']);

        $this->withToken($this->token())->getJson("{$this->prefix}/admin/pending-work")
            ->assertOk()
            ->assertJsonPath('data.total', 0)
            ->assertJsonPath('data.groups', []);
    }

    public function test_hanya_menghitung_yang_menunggu_petugas(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-10 04:00:00', 'UTC'));

        $this->baris('complaints', ['status' => 'submitted']);
        $this->baris('complaints', ['status' => 'in_progress']);
        $this->baris('fieldtrips', ['submission_status' => 'Diajukan']);
        $this->baris('fieldtrips', ['submission_status' => 'Revisi Diperlukan']);
        $this->baris('tenants', ['submission_status' => 'Diajukan']);
        $this->baris('tenants', ['submission_status' => 'Diajukan']);
        $this->baris('public_informations', ['status' => 'submitted', 'due_date' => '2026-10-01']);

        $res = $this->withToken($this->token())->getJson("{$this->prefix}/admin/pending-work");
        $res->assertOk()->assertJsonPath('data.total', 5);

        $kelompok = collect($res->json('data.groups'))->keyBy('key');
        $interaksi = collect($kelompok['interaksi']['items'])->keyBy('key');
        $pengajuan = collect($kelompok['pengajuan']['items'])->keyBy('key');

        // Chat dan laporan kehilangan bernilai nol, jadi tidak ikut.
        $this->assertSame(['complaints', 'information_requests'], $interaksi->keys()->all());
        $this->assertSame(1, $interaksi['information_requests']['overdue']);
        $this->assertSame(['fieldtrips', 'pengajuan:tenant'], $pengajuan->keys()->all());
        $this->assertSame(1, $pengajuan['fieldtrips']['count']);
        $this->assertSame(2, $pengajuan['pengajuan:tenant']['count']);
        $this->assertSame('/admin/pengajuan/tenant', $pengajuan['pengajuan:tenant']['href']);
    }

    public function test_permohonan_informasi_tidak_terlihat_staff(): void
    {
        $this->baris('public_informations', ['status' => 'submitted']);

        $this->withToken($this->token('staff'))->getJson("{$this->prefix}/admin/pending-work")
            ->assertOk()
            ->assertJsonPath('data.total', 0)
            ->assertJsonPath('data.groups', []);
    }
}

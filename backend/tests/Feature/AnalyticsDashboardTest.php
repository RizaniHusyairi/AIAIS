<?php

namespace Tests\Feature;

use App\Models\VisitorLog;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Data dasbor admin.
 *
 * Yang dijaga: tren kunjungan berasal dari `visitor_logs` dan dikelompokkan
 * per hari WITA (bukan kurva karangan seperti sebelumnya), hari kosong
 * bernilai nol, dan permohonan informasi tidak terlihat oleh staff.
 */
class AnalyticsDashboardTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();

        foreach (['visitor_logs', 'fids_flights', 'complaints', 'chat_threads', 'lost_reports', 'public_informations', 'news', 'announcements', 'facilities', 'airport_tenants', 'documents'] as $t) {
            Schema::dropIfExists($t);
        }

        Schema::create('visitor_logs', function (Blueprint $t) {
            $t->id();
            $t->string('visitor_hash', 64)->nullable();
            $t->string('page_url');
            $t->string('user_agent')->nullable();
            $t->string('device')->default('Desktop');
            $t->string('browser')->default('Chrome');
            $t->timestamps();
        });
        Schema::create('fids_flights', fn (Blueprint $t) => [$t->id(), $t->string('status')->nullable(), $t->timestamps()]);
        Schema::create('complaints', fn (Blueprint $t) => [$t->id(), $t->string('ticket_number')->nullable(), $t->string('subject')->nullable(), $t->string('status'), $t->timestamps()]);
        Schema::create('chat_threads', fn (Blueprint $t) => [$t->id(), $t->string('ticket_number')->nullable(), $t->string('subject')->nullable(), $t->string('category')->nullable(), $t->string('status'), $t->timestamps()]);
        Schema::create('lost_reports', fn (Blueprint $t) => [$t->id(), $t->string('ticket_number')->nullable(), $t->string('category')->nullable(), $t->string('lost_area')->nullable(), $t->string('status'), $t->timestamps()]);
        Schema::create('public_informations', fn (Blueprint $t) => [$t->id(), $t->string('ticket_number')->nullable(), $t->string('status'), $t->date('due_date')->nullable(), $t->timestamps()]);
        Schema::create('news', fn (Blueprint $t) => [$t->id(), $t->string('title'), $t->string('status')->nullable(), $t->timestamp('published_at')->nullable(), $t->timestamps()]);
        foreach (['announcements', 'facilities', 'airport_tenants', 'documents'] as $t) {
            Schema::create($t, fn (Blueprint $b) => [$b->id(), $b->timestamps()]);
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

    private function kunjungan(string $utc, string $ip = '10.0.0.1', string $page = '/'): void
    {
        $v = new VisitorLog(['visitor_hash' => $ip, 'page_url' => $page, 'device' => 'Mobile', 'browser' => 'Chrome']);
        $v->created_at = $v->updated_at = Carbon::parse($utc, 'UTC');
        $v->save();
    }

    public function test_tren_dikelompokkan_per_hari_wita_dan_hari_kosong_nol(): void
    {
        // 10 Okt 2026 12.00 WITA.
        Carbon::setTestNow(Carbon::parse('2026-10-10 04:00:00', 'UTC'));

        // 9 Okt 17.00 UTC = 10 Okt 01.00 WITA → masuk hari ini, bukan kemarin.
        $this->kunjungan('2026-10-09 17:00:00', '10.0.0.1');
        $this->kunjungan('2026-10-09 18:00:00', '10.0.0.1');
        $this->kunjungan('2026-10-10 03:00:00', '10.0.0.2');
        // 8 Okt 10.00 WITA.
        $this->kunjungan('2026-10-08 02:00:00', '10.0.0.3');

        $res = $this->withToken($this->token())->getJson("{$this->prefix}/admin/analytics?days=7");

        $res->assertOk()->assertJsonPath('data.range_days', 7)->assertJsonCount(7, 'data.visitor_trend');

        $tren = collect($res->json('data.visitor_trend'))->keyBy('date');
        $this->assertSame(['date' => '2026-10-10', 'views' => 3, 'unique' => 2], $tren['2026-10-10']);
        $this->assertSame(0, $tren['2026-10-09']['views']);
        $this->assertSame(1, $tren['2026-10-08']['views']);
        $this->assertSame(3, $res->json('data.overview.today_visitors'));
        $this->assertSame(['views' => 4, 'unique' => 3], $res->json('data.visitor_period'));
        $this->assertCount(7, $res->json('data.visitor_trend_previous'));

        // Jam WITA: 01.00 dan 02.00 masing-masing satu, 11.00 satu, 10.00 satu.
        $jam = collect($res->json('data.visitor_hourly'))->pluck('views', 'hour');
        $this->assertCount(24, $jam);
        $this->assertSame(1, $jam[1]);
        $this->assertSame(1, $jam[10]);
    }

    public function test_rentang_tidak_dikenal_jatuh_ke_tujuh_hari(): void
    {
        $this->withToken($this->token())->getJson("{$this->prefix}/admin/analytics?days=365")
            ->assertOk()->assertJsonPath('data.range_days', 7);
    }

    public function test_antrean_dan_tenggat_permohonan_hanya_untuk_admin(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-10 04:00:00', 'UTC'));
        DB::table('complaints')->insert(['ticket_number' => 'TKT-1', 'subject' => 'Uji', 'status' => 'submitted', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('public_informations')->insert([
            ['ticket_number' => 'PIP-1', 'status' => 'submitted', 'due_date' => '2026-10-01', 'created_at' => now(), 'updated_at' => now()],
            ['ticket_number' => 'PIP-2', 'status' => 'in_progress', 'due_date' => '2026-10-20', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $admin = collect($this->withToken($this->token('admin'))->getJson("{$this->prefix}/admin/analytics")->json('data.action_queue'))->keyBy('key');
        $this->assertSame(1, $admin['complaints']['count']);
        $this->assertSame(2, $admin['information_requests']['count']);
        $this->assertSame(1, $admin['information_requests']['overdue']);

        $this->app['auth']->forgetGuards();
        $staff = $this->withToken($this->token('staff'))->getJson("{$this->prefix}/admin/analytics");
        $staff->assertOk();
        $this->assertNotContains('information_requests', collect($staff->json('data.action_queue'))->pluck('key'));
        $this->assertNotContains('information_request', collect($staff->json('data.recent_activity'))->pluck('type'));
    }
}

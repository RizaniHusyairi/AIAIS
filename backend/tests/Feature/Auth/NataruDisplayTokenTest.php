<?php

namespace Tests\Feature\Auth;

use App\Models\NataruEvent;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Pemisahan token Posko Nataru.
 *
 * v1 memakai SATU token untuk dua hal yang sangat berbeda: formulir petugas
 * yang MENULIS catatan penerbangan, dan layar TV yang hanya menampilkan. Layar
 * itu terpampang di ruang publik posko dan URL-nya kerap terlihat — pada bilah
 * alamat, saat layar disetel, atau dari foto yang diambil orang.
 *
 * Yang diuji di sini adalah pemisahannya, DUA ARAH: token layar tidak dapat
 * menulis, dan token petugas tidak membuka layar. Menguji satu arah saja
 * meninggalkan separuh lubangnya.
 */
class NataruDisplayTokenTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->createNataruSchema();
        $this->prefix = '/api/'.config('api.version');
    }

    private function createNataruSchema(): void
    {
        Schema::dropIfExists('nataru_flights');
        Schema::dropIfExists('nataru_events');

        Schema::create('nataru_events', function (Blueprint $table) {
            $table->id();
            $table->string('name', 125);
            $table->string('public_token', 64)->nullable()->unique();
            $table->string('display_token', 64)->nullable()->unique();
            $table->date('start_date');
            $table->date('end_date');
            $table->date('peak_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('compare_event_id')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('nataru_flights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nataru_event_id');
            $table->foreignId('user_id')->nullable();
            $table->date('flight_date');
            $table->time('flight_time');
            $table->string('airline', 125);
            $table->string('flight_number', 125);
            $table->string('status_flight', 125);
            $table->string('route', 125);
            $table->string('direction', 20);
            $table->string('aircraft_type', 125)->nullable();
            $table->string('aircraft_registration', 125)->nullable();
            $table->integer('seat_capacity')->nullable();
            $table->integer('pax_adult')->default(0);
            $table->integer('pax_child')->default(0);
            $table->integer('pax_infant')->default(0);
            $table->integer('pax_total')->default(0);
            $table->integer('cargo')->default(0);
            $table->integer('baggage')->default(0);
            $table->decimal('load_factor', 5, 2)->nullable();
            $table->decimal('ticket_price_high', 12, 2)->nullable();
            $table->decimal('ticket_price_low', 12, 2)->nullable();
            $table->string('officer_name', 125);
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    private function buatPeriode(): NataruEvent
    {
        return NataruEvent::create([
            'name' => 'Posko Uji',
            'public_token' => NataruEvent::tokenBaru(),
            'display_token' => NataruEvent::tokenBaru(),
            'start_date' => '2025-12-18',
            'end_date' => '2026-01-05',
            'peak_date' => '2025-12-24',
            'is_active' => true,
        ]);
    }

    /** @return array<string, mixed> */
    private function penerbangan(): array
    {
        return [
            'flight_date' => '2025-12-24',
            'flight_time' => '10:00',
            'airline' => 'Uji Air',
            'flight_number' => 'UJ100',
            'status_flight' => 'Berjadwal',
            'route' => 'WALS-WAAA',
            'direction' => 'departure',
            'pax_adult' => 100,
            'pax_child' => 0,
            'pax_infant' => 0,
            'cargo' => 0,
            'baggage' => 0,
            'officer_name' => 'Petugas Uji',
        ];
    }

    public function test_periode_baru_memperoleh_dua_token_berbeda(): void
    {
        $periode = $this->buatPeriode();

        $this->assertNotSame($periode->public_token, $periode->display_token);
        $this->assertSame(48, strlen($periode->display_token));
    }

    /** LUBANG v1: token layar tidak boleh dapat menulis penerbangan. */
    public function test_token_layar_tidak_dapat_menulis_penerbangan(): void
    {
        $periode = $this->buatPeriode();

        $this->postJson($this->prefix.'/nataru/'.$periode->display_token.'/flights', $this->penerbangan())
            ->assertNotFound();

        $this->assertSame(0, $periode->flights()->count());
    }

    /** Arah sebaliknya: token petugas tidak membuka layar. */
    public function test_token_petugas_tidak_membuka_layar(): void
    {
        $periode = $this->buatPeriode();

        $this->getJson($this->prefix.'/nataru/tv/'.$periode->public_token)->assertNotFound();
    }

    public function test_token_layar_membuka_papan_monitor(): void
    {
        $periode = $this->buatPeriode();

        $this->getJson($this->prefix.'/nataru/tv/'.$periode->display_token)
            ->assertOk()
            ->assertJsonPath('data.event.name', 'Posko Uji');
    }

    /** Kedua token tidak boleh ikut respons mana pun. */
    public function test_kedua_token_tidak_ikut_respons(): void
    {
        $periode = $this->buatPeriode();

        $tv = $this->getJson($this->prefix.'/nataru/tv/'.$periode->display_token);
        $tv->assertOk();
        $this->assertStringNotContainsString($periode->display_token, $tv->getContent());
        $this->assertStringNotContainsString($periode->public_token, $tv->getContent());

        $daftar = $this->withToken($this->buatPengguna('admin')->createToken('uji', ['admin-panel'])->plainTextToken)
            ->getJson($this->prefix.'/admin/nataru/events');

        $daftar->assertOk();
        $this->assertStringNotContainsString($periode->public_token, $daftar->getContent());
        $this->assertStringNotContainsString($periode->display_token, $daftar->getContent());
    }

    /**
     * Perbandingan diselaraskan pada hari puncak, bukan tanggal kalender.
     *
     * Penerbangan sehari sebelum puncak harus jatuh di H-1, betapapun tanggal
     * kalendernya berbeda antarperiode.
     */
    public function test_perbandingan_menyelaraskan_pada_hari_puncak(): void
    {
        $a = $this->buatPeriode();

        $b = NataruEvent::create([
            'name' => 'Posko Uji Lama',
            'public_token' => NataruEvent::tokenBaru(),
            'display_token' => NataruEvent::tokenBaru(),
            'start_date' => '2024-12-18',
            'end_date' => '2025-01-05',
            // Puncaknya jatuh pada TANGGAL BERBEDA — inilah yang diuji.
            'peak_date' => '2024-12-27',
            'is_active' => false,
        ]);

        $a->flights()->create([...$this->penerbangan(), 'flight_date' => '2025-12-23', 'pax_total' => 100]);
        $b->flights()->create([...$this->penerbangan(), 'flight_date' => '2024-12-26', 'pax_total' => 200]);

        $res = $this->withToken($this->buatPengguna('admin')->createToken('uji', ['admin-panel'])->plainTextToken)
            ->getJson($this->prefix.'/admin/nataru/comparison?event_id='.$a->id.'&compare_id='.$b->id);

        $res->assertOk()
            ->assertJsonPath('data.main.reference', 'peak_date')
            ->assertJsonPath('data.series.0.label', 'H-1')
            ->assertJsonPath('data.series.0.main_passengers', 100)
            ->assertJsonPath('data.series.0.compare_passengers', 200);
    }

    public function test_periode_tidak_dapat_dibandingkan_dengan_dirinya_sendiri(): void
    {
        $periode = $this->buatPeriode();

        $this->withToken($this->buatPengguna('admin')->createToken('uji', ['admin-panel'])->plainTextToken)
            ->getJson($this->prefix.'/admin/nataru/comparison?event_id='.$periode->id.'&compare_id='.$periode->id)
            ->assertStatus(422);
    }
}

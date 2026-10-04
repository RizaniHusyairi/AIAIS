<?php

namespace Tests\Feature\Llau;

use App\Models\AirTrafficLog;
use App\Models\LlauFlight;
use App\Models\LlauReport;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\BuildsLlauWorkbook;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Unggahan rekapitulasi LLAU.
 *
 * Yang dijaga: angka yang tayang sama dengan angka di Excel; berkas yang
 * totalnya tidak cocok atau barisnya rusak tidak diam-diam diterapkan;
 * mengunggah ulang bulan yang sama mengganti, bukan menggandakan; dan kaki
 * berkas yang memuat NIP tidak pernah ikut terbaca.
 */
class LlauUploadTest extends TestCase
{
    use BuildsLlauWorkbook, CreatesLegacyUserSchema;

    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->createLlauSchema();
        Storage::fake('local');
        $this->prefix = '/api/'.config('api.version');
    }

    private function admin(): string
    {
        $user = \App\Models\User::create([
            'name' => 'Petugas Operasi',
            'email' => 'operasi@contoh.id',
            'password' => bcrypt('rahasia123'),
        ]);
        $user->forceFill(['is_admin' => true, 'is_accepted' => true])->save();

        return $user->createToken('admin-panel', ['admin-panel'])->plainTextToken;
    }

    private function berkas(string $lintasan, string $nama = 'rekapitulasi DATA_LLAU_AAP_September_2026.xlsx'): UploadedFile
    {
        return new UploadedFile($lintasan, $nama, null, null, true);
    }

    /** Empat penerbangan: dua berjadwal (satu terlambat), satu perintis, satu kedatangan. */
    private function contoh(): array
    {
        return [
            $this->penerbangan(),
            $this->penerbangan(['arah' => 'A', 'asal' => 'CGK', 'tujuan' => 'AAP', 'jadwal' => '09:00:00', 'aktual' => '09:40:00', 'sebab' => 'CUACA', 'transit' => 3]),
            $this->penerbangan(['tgl' => '03-09-2026', 'operator' => 'PT. Smart Cakrawala Aviation', 'icao' => 'SME', 'kegiatan' => 'PERINTIS', 'tujuan' => 'LPU', 'dewasa' => 8, 'anak' => 0, 'bayi' => 0, 'kursi' => 12, 'bagasi' => 60, 'kargo' => 0]),
            $this->penerbangan(['tgl' => '03-09-2026', 'operator' => 'PT. Citilink Indonesia', 'icao' => 'CTV', 'tujuan' => 'SUB', 'jadwal' => '14:00:00', 'aktual' => '14:10:00']),
        ];
    }

    public function test_pratinjau_membaca_tanpa_menyimpan(): void
    {
        $res = $this->withToken($this->admin())->post("{$this->prefix}/admin/llau/preview", [
            'file' => $this->berkas($this->buatLlau($this->contoh())),
        ]);

        $res->assertOk()
            ->assertJsonPath('data.period.period', '2026-09')
            ->assertJsonPath('data.flight_count', 4)
            ->assertJsonPath('data.mismatches', [])
            ->assertJsonPath('data.errors', []);

        $this->assertSame(0, LlauReport::count());
        $this->assertSame(0, LlauFlight::count());
    }

    public function test_menerapkan_mengisi_penerbangan_dan_catatan_harian(): void
    {
        $this->withToken($this->admin())->post("{$this->prefix}/admin/llau", [
            'file' => $this->berkas($this->buatLlau($this->contoh())),
        ])->assertCreated();

        $this->assertSame(4, LlauFlight::count());
        Storage::disk('local')->assertExists(LlauReport::first()->file_path);

        // Penumpang = dewasa + anak + bayi + transit, seperti TOTAL di Excel.
        $hari2 = AirTrafficLog::whereDate('date', '2026-09-02')->first();
        $this->assertSame(1, $hari2->aircraft_departure);
        $this->assertSame(1, $hari2->aircraft_arrival);
        $this->assertSame(103, $hari2->passenger_departure);
        $this->assertSame(106, $hari2->passenger_arrival);
        $this->assertSame(2, AirTrafficLog::count());
    }

    public function test_dasbor_publik_menghitung_ketepatan_waktu_hanya_berjadwal(): void
    {
        $this->withToken($this->admin())->post("{$this->prefix}/admin/llau", [
            'file' => $this->berkas($this->buatLlau($this->contoh())),
        ])->assertCreated();

        $res = $this->getJson("{$this->prefix}/llau")->assertOk();

        $res->assertJsonPath('data.period.period', '2026-09')
            ->assertJsonPath('data.period.summary.flights.total', 4)
            ->assertJsonPath('data.period.summary.passengers.total', 103 + 106 + 8 + 103)
            ->assertJsonPath('data.period.summary.otp.measured', 3)
            ->assertJsonPath('data.period.summary.otp.on_time', 2)
            ->assertJsonPath('data.period.delay_causes.0.name', 'CUACA')
            ->assertJsonPath('data.period.operators.0.name', 'Batik Air')
            ->assertJsonPath('data.trend.0.flights', 4);

        // Baris mentah tidak pernah dikirim ke publik.
        $this->assertStringNotContainsString('PK-XXX', $res->getContent());
        $this->assertStringNotContainsString('ID6677', $res->getContent());
    }

    public function test_total_tidak_cocok_ditolak_kecuali_dinyatakan_diketahui(): void
    {
        $token = $this->admin();
        $lintasan = $this->buatLlau($this->contoh(), jumlah: ['Z' => 999999]);

        $this->withToken($token)->post("{$this->prefix}/admin/llau/preview", ['file' => $this->berkas($lintasan)])
            ->assertOk()
            ->assertJsonPath('data.mismatches.0.column', 'Z');

        $this->withToken($token)->post("{$this->prefix}/admin/llau", ['file' => $this->berkas($lintasan)])
            ->assertStatus(422);
        $this->assertSame(0, LlauReport::count());

        $this->withToken($token)->post("{$this->prefix}/admin/llau", ['file' => $this->berkas($lintasan), 'ignore_mismatch' => '1'])
            ->assertCreated();
        $this->assertTrue(LlauReport::first()->mismatch_ignored);
    }

    public function test_unggah_ulang_bulan_sama_mengganti_bukan_menggandakan(): void
    {
        $token = $this->admin();

        $this->withToken($token)->post("{$this->prefix}/admin/llau", ['file' => $this->berkas($this->buatLlau($this->contoh()))])->assertCreated();
        $berkasLama = LlauReport::first()->file_path;

        $this->withToken($token)->post("{$this->prefix}/admin/llau", ['file' => $this->berkas($this->buatLlau([$this->penerbangan()]))])->assertCreated();

        $this->assertSame(1, LlauReport::count());
        $this->assertSame(1, LlauFlight::count());
        $this->assertSame(1, AirTrafficLog::count());
        Storage::disk('local')->assertMissing($berkasLama);
    }

    public function test_catatan_harian_manual_pada_bulan_itu_ikut_diganti(): void
    {
        AirTrafficLog::create(['date' => '2026-09-20', 'aircraft_arrival' => 9]);
        AirTrafficLog::create(['date' => '2026-08-20', 'aircraft_arrival' => 7]);

        $this->withToken($this->admin())->post("{$this->prefix}/admin/llau", [
            'file' => $this->berkas($this->buatLlau($this->contoh())),
        ])->assertCreated();

        $this->assertNull(AirTrafficLog::whereDate('date', '2026-09-20')->first());
        $this->assertNotNull(AirTrafficLog::whereDate('date', '2026-08-20')->first());
    }

    public function test_tanggal_di_luar_bulan_laporan_membatalkan_unggahan(): void
    {
        $baris = [$this->penerbangan(), $this->penerbangan(['tgl' => '01-10-2026'])];

        $this->withToken($this->admin())->post("{$this->prefix}/admin/llau", ['file' => $this->berkas($this->buatLlau($baris))])
            ->assertStatus(422);

        $this->assertSame(0, LlauReport::count());
    }

    public function test_susunan_kolom_asing_ditolak(): void
    {
        $this->withToken($this->admin())->post("{$this->prefix}/admin/llau/preview", [
            'file' => $this->berkas($this->buatLlau($this->contoh(), templatRusak: true)),
        ])->assertStatus(422);
    }

    public function test_kaki_berkas_bernip_tidak_terbaca(): void
    {
        $hasil = \App\Support\ParserLlau::baca($this->buatLlau($this->contoh()));

        $this->assertCount(4, $hasil['rows']);
        $this->assertStringNotContainsString('19000101', json_encode($hasil));
        $this->assertStringNotContainsString('PENANDA TANGAN', json_encode($hasil));
    }

    public function test_hapus_laporan_menarik_catatan_harian_bulannya(): void
    {
        $token = $this->admin();
        $this->withToken($token)->post("{$this->prefix}/admin/llau", ['file' => $this->berkas($this->buatLlau($this->contoh()))])->assertCreated();
        $laporan = LlauReport::first();

        $this->withToken($token)->deleteJson("{$this->prefix}/admin/llau/{$laporan->id}")->assertOk();

        $this->assertSame(0, LlauFlight::count());
        $this->assertSame(0, AirTrafficLog::count());
        Storage::disk('local')->assertMissing($laporan->file_path);
    }

    public function test_rincian_admin_memuat_baris_dan_kecocokan_excel(): void
    {
        $token = $this->admin();
        $this->withToken($token)->post("{$this->prefix}/admin/llau", [
            'file' => $this->berkas($this->buatLlau(
                array_map(fn ($b) => ['tgl' => str_replace('-09-', '-08-', $b['tgl'])] + $b, $this->contoh()),
                'AGUSTUS',
            )),
        ])->assertCreated();
        $this->withToken($token)->post("{$this->prefix}/admin/llau", [
            'file' => $this->berkas($this->buatLlau($this->contoh())),
        ])->assertCreated();

        $sep = LlauReport::whereDate('period', '2026-09-01')->first();
        $agu = LlauReport::whereDate('period', '2026-08-01')->first();

        $this->withToken($token)->getJson("{$this->prefix}/admin/llau/{$sep->id}")
            ->assertOk()
            ->assertJsonPath('data.report.period', '2026-09')
            ->assertJsonPath('data.report.has_file', true)
            ->assertJsonCount(4, 'data.flights')
            ->assertJsonPath('data.flights.0.row_number', 12)
            ->assertJsonPath('data.totals.0.column', 'S')
            ->assertJsonPath('data.totals.0.excel', 308)
            ->assertJsonPath('data.totals.0.computed', 308)
            ->assertJsonPath('data.previous.id', $agu->id)
            ->assertJsonPath('data.neighbors.older.id', $agu->id)
            ->assertJsonPath('data.neighbors.newer', null)
            ->assertJsonPath('data.signer.nama', mb_strtoupper(config('pejabat.penanda_tangan.nama')))
            ->assertJsonPath('data.signer.nip', config('pejabat.penanda_tangan.nip'));

        // NIP hanya lewat endpoint admin, tidak pernah di dasbor publik.
        $this->assertStringNotContainsString(
            (string) config('pejabat.penanda_tangan.nip'),
            $this->getJson("{$this->prefix}/llau")->getContent(),
        );
    }

    /** Berkas asli memuat NIP: tidak boleh terunduh tanpa sesi admin. */
    public function test_berkas_asli_hanya_untuk_admin(): void
    {
        $token = $this->admin();
        $this->withToken($token)->post("{$this->prefix}/admin/llau", [
            'file' => $this->berkas($this->buatLlau($this->contoh())),
        ])->assertCreated();
        $id = LlauReport::first()->id;

        $this->withToken($token)->get("{$this->prefix}/admin/llau/{$id}/file")->assertOk();

        $this->app['auth']->forgetGuards();
        $this->getJson("{$this->prefix}/admin/llau/{$id}/file", ['Authorization' => ''])->assertUnauthorized();
    }

    public function test_unggah_wajib_masuk(): void
    {
        $this->post("{$this->prefix}/admin/llau", ['file' => $this->berkas($this->buatLlau($this->contoh()))], ['Accept' => 'application/json'])
            ->assertUnauthorized();
    }
}

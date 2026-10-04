<?php

namespace Tests\Feature\Llau;

use App\Models\LlauReport;
use App\Support\PembacaXlsx;
use App\Support\RekapLaporanLlau;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\BuildsLlauWorkbook;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Laporan LLAU bulanan (bentuk surat laporan BLU).
 *
 * Aturan pemasangan rotasi dan pemilihan rute TUJUAN diturunkan dari laporan
 * tangan April–Agustus 2026; tes di sini menjaga aturan itu tetap seperti
 * yang dicocokkan, bukan seperti yang "terasa masuk akal".
 */
class LlauLaporanBulananTest extends TestCase
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

    /** Lembar sumber ditulis terbaru di atas: kaki kronologis dibalik saat ditulis. */
    private function unggah(string $token, array $kronologis): LlauReport
    {
        $berkas = new UploadedFile($this->buatLlau(array_reverse($kronologis)), 'llau.xlsx', null, null, true);
        $this->withToken($token)->post("{$this->prefix}/admin/llau", ['file' => $berkas])->assertCreated();

        return LlauReport::firstOrFail();
    }

    private function baris(array $kaki): array
    {
        return array_map(fn ($k, $i) => [
            'row_number' => 100 - $i, 'flight_date' => $k['tgl'] ?? '2026-09-02',
            'scheduled_at' => '2026-09-02 10:00:00', 'direction' => $k['arah'], 'origin' => $k['asal'],
            'destination' => $k['tujuan'], 'registration' => $k['reg'], 'operator_name' => $k['op'] ?? 'PT. Smart Cakrawala Aviation',
            'flight_category' => 'PERINTIS', 'aircraft_type' => 'C208B', 'seat_capacity' => 12,
            'pax_adult' => 5, 'pax_child' => 0, 'pax_infant' => 0, 'transit_adult' => $k['transit'] ?? 0,
            'transit_child' => 0, 'transit_infant' => 0, 'baggage_kg' => 10, 'cargo_kg' => 0, 'mail_kg' => 0,
        ], $kaki, array_keys($kaki));
    }

    public function test_datang_dipasangkan_dengan_keberangkatan_berikutnya_ke_tujuan_mana_pun(): void
    {
        $rot = RekapLaporanLlau::barisRotasi($this->baris([
            ['arah' => 'A', 'asal' => 'DTD', 'tujuan' => 'AAP', 'reg' => 'PK-SNH'],
            ['arah' => 'D', 'asal' => 'AAP', 'tujuan' => 'LPU', 'reg' => 'PK-SNH'],
        ]));

        $this->assertCount(1, $rot);
        $this->assertSame('DTD - AAP - LPU', $rot[0]['route']);
        $this->assertSame([1, 1], [$rot[0]['arr'], $rot[0]['dep']]);
    }

    public function test_berangkat_hanya_dipasangkan_bila_kembali_dari_bandara_yang_sama(): void
    {
        $rot = RekapLaporanLlau::barisRotasi($this->baris([
            ['arah' => 'D', 'asal' => 'AAP', 'tujuan' => 'BPN', 'reg' => 'PK-SNH'],
            ['arah' => 'A', 'asal' => 'RTU', 'tujuan' => 'AAP', 'reg' => 'PK-SNH'],
            ['arah' => 'A', 'asal' => 'BPN', 'tujuan' => 'AAP', 'reg' => 'PK-SNH'],
            ['arah' => 'D', 'asal' => 'AAP', 'tujuan' => 'RTU', 'reg' => 'PK-SNH'],
        ]));

        // Kedatangan dari RTU dilewati; pesawat kembali dari BPN.
        $this->assertSame(['AAP - BPN - AAP', 'RTU - AAP - RTU'], array_column($rot, 'route'));
    }

    public function test_kaki_tanpa_pasangan_ditulis_literal(): void
    {
        $rot = RekapLaporanLlau::barisRotasi($this->baris([
            ['arah' => 'D', 'asal' => 'AAP', 'tujuan' => 'DTD', 'reg' => 'PK-SNH'],
            ['arah' => 'A', 'asal' => 'LPU', 'tujuan' => 'AAP', 'reg' => 'PK-SNH'],
        ]));

        $this->assertSame(['AAP - DTD', 'LPU - AAP'], array_column($rot, 'route'));
    }

    public function test_varian_biasa_menjumlahkan_transit_ke_penumpang(): void
    {
        $kaki = $this->baris([['arah' => 'A', 'asal' => 'CGK', 'tujuan' => 'AAP', 'reg' => 'PK-A', 'transit' => 3]]);

        $this->assertSame([8, 0, 0], RekapLaporanLlau::barisRotasi($kaki)[0]['pax_arr']);
        $transit = RekapLaporanLlau::barisRotasi($kaki, true)[0];
        $this->assertSame([5, 0, 0], $transit['pax_arr']);
        $this->assertSame([3, 0, 0], $transit['transit_arr']);
    }

    public function test_sebutan_operator_mengikuti_laporan_resmi(): void
    {
        $this->assertSame('WINGS AIR', RekapLaporanLlau::sebutanOperator('PT. Wings Abadi'));
        $this->assertSame('SUSI AIR', RekapLaporanLlau::sebutanOperator('PT. Asi Pudjiastuti Aviation'));
        $this->assertSame('GARUDA INDONESIA', RekapLaporanLlau::sebutanOperator('PT. Garuda Indonesia, Tbk'));
        $this->assertSame('MISSION AVIATION FELLOWSHIP', RekapLaporanLlau::sebutanOperator('Mission Aviation Fellowship'));
    }

    public function test_unduhan_laporan_berbentuk_lampiran_surat(): void
    {
        $token = $this->admin();
        $laporan = $this->unggah($token, [
            $this->penerbangan(['arah' => 'A', 'asal' => 'CGK', 'tujuan' => 'AAP', 'reg' => 'PK-BLC', 'transit' => 2]),
            $this->penerbangan(['reg' => 'PK-BLC']),
            $this->penerbangan(['tgl' => '03-09-2026', 'tipe' => 'g450', 'reg' => 'PK-JET', 'operator' => 'JET ASIA AIRWAYS', 'icao' => 'JAA']),
            $this->penerbangan(['tgl' => '04-09-2026', 'tipe' => 'G450', 'reg' => 'PK-JET', 'operator' => 'JET ASIA AIRWAYS', 'icao' => 'JAA']),
        ]);

        $res = $this->withToken($token)->post("{$this->prefix}/admin/llau/{$laporan->id}/laporan", [
            'varian' => 'biasa', 'ttd_nama' => 'Nama Pejabat', 'ttd_nip' => '19000101 200001 1 001',
        ]);

        $res->assertOk();
        $this->assertStringContainsString('LAPORAN LLAU BULAN SEPTEMBER 2026.xlsx', $res->headers->get('Content-Disposition'));

        $lintasan = tempnam(sys_get_temp_dir(), 'lap');
        file_put_contents($lintasan, $res->getContent());
        $x = new PembacaXlsx($lintasan);
        $this->assertSame(['SEPTEMBER'], $x->namaLembar());
        $sel = $x->baris('SEPTEMBER');

        $this->assertSame('BULAN :  SEPTEMBER 2026', $sel[9]['B']);
        $this->assertSame('CGK - AAP - CGK', $sel[16]['C']);
        $this->assertSame('BATIK AIR', $sel[16]['D']);
        $this->assertSame('2', $sel[16]['B']);

        $semua = json_encode($sel);
        $this->assertStringContainsString('NAMA PEJABAT', $semua);
        $this->assertStringContainsString('NIP.19000101 200001 1 001', $semua);
        $this->assertStringNotContainsString('{{', $semua);

        // Tipe pesawat beda huruf digabung seperti SUMIF Excel.
        $tabelTipe = [];
        $dalam = false;
        foreach ($sel as $r => $c) {
            // "TIPE PESAWAT" juga judul kolom tabel data (baris 11); yang
            // diperiksa tabel ringkasan di bagian kaki.
            if ($r > 15 && ($c['F'] ?? '') === 'TIPE PESAWAT') {
                $dalam = true;
            } elseif ($dalam && ($c['F'] ?? '') === 'JUMLAH') {
                break;
            } elseif ($dalam && isset($c['F'], $c['G']) && is_numeric($c['G'])) {
                $tabelTipe[$c['F']] = [$c['G'], $c['H']];
            }
        }
        // [kedatangan, keberangkatan]; dua keberangkatan "g450" + "G450" dalam satu baris.
        $this->assertSame(['A320' => ['1', '1'], 'G450' => ['0', '2']], $tabelTipe);
    }

    public function test_varian_transit_memisah_kolom_transit(): void
    {
        $token = $this->admin();
        $laporan = $this->unggah($token, [
            $this->penerbangan(['arah' => 'A', 'asal' => 'CGK', 'tujuan' => 'AAP', 'reg' => 'PK-BLC', 'transit' => 2]),
        ]);

        $res = $this->withToken($token)->post("{$this->prefix}/admin/llau/{$laporan->id}/laporan", ['varian' => 'transit'])->assertOk();
        $this->assertStringContainsString('(transit)', $res->headers->get('Content-Disposition'));

        $lintasan = tempnam(sys_get_temp_dir(), 'lap');
        file_put_contents($lintasan, $res->getContent());
        $sel = (new PembacaXlsx($lintasan))->baris('SEPTEMBER');

        $this->assertSame('TRANSIT', $sel[11]['Q']);
        $this->assertSame('100', $sel[16]['K']);
        $this->assertSame('2', $sel[16]['Q']);
    }

    public function test_nip_divalidasi_dan_unduhan_wajib_masuk(): void
    {
        $token = $this->admin();
        $laporan = $this->unggah($token, [$this->penerbangan()]);

        $this->withToken($token)->postJson("{$this->prefix}/admin/llau/{$laporan->id}/laporan", ['varian' => 'biasa', 'ttd_nip' => 'abc'])
            ->assertStatus(422);

        $this->app['auth']->forgetGuards();
        $this->postJson("{$this->prefix}/admin/llau/{$laporan->id}/laporan", ['varian' => 'biasa'], ['Authorization' => ''])
            ->assertUnauthorized();
    }
}

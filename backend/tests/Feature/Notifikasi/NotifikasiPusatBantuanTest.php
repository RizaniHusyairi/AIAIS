<?php

namespace Tests\Feature\Notifikasi;

use App\Models\LostReport;
use App\Models\User;
use App\Notifications\AktivitasPusatBantuan;
use App\Support\Notifikasi;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Notifikasi masuknya aktivitas Pusat Bantuan.
 *
 * Yang dijaga di sini bukan "notifikasinya terkirim", melainkan enam sifat yang
 * membuatnya aman dan tidak berbalik merugikan:
 *
 *  1. ISINYA TIDAK MEMUAT DATA PRIBADI. Muatan yang sama mengalir ke basis
 *     data, ke ponsel pribadi petugas, dan ke server vendor gateway WhatsApp
 *     yang tidak terikat perjanjian pemrosesan data apa pun.
 *  2. PENERIMANYA HANYA `is_admin`. Penyaring yang keliru mengembalikan kosong
 *     tanpa galat, dan notifikasinya diam-diam tidak pernah sampai.
 *  3. KEGAGALAN KANAL TIDAK MENGGAGALKAN KIRIMAN WARGA.
 *  4. WhatsApp dikirim SEKALI meski penerima panelnya banyak.
 *  5. Percakapan panjang tidak membanjiri — ada jeda.
 *  6. Pagar biaya harian benar-benar menahan.
 */
class NotifikasiPusatBantuanTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->buatSkema();
        Storage::fake('public');
        Cache::flush();
        $this->prefix = '/api/'.config('api.version');

        config()->set('whatsapp.enabled', true);
        config()->set('whatsapp.token', 'token-uji');
        config()->set('whatsapp.recipients', '628111111111');
        config()->set('whatsapp.daily_cap', 200);
        // Push dimatikan pada berkas ini; kunci VAPID diuji terpisah.
        config()->set('webpush.enabled', false);
        // Antrean dijalankan langsung supaya pekerjaan WhatsApp benar-benar
        // terjadi di dalam tes, bukan menunggu worker.
        config()->set('queue.default', 'sync');
    }

    private function buatSkema(): void
    {
        Schema::dropIfExists('notifications');
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type', 125);
            $table->string('notifiable_type', 125);
            $table->unsignedBigInteger('notifiable_id');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::dropIfExists('lost_reports');
        Schema::create('lost_reports', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 40)->unique();
            $table->string('reporter_name', 150);
            $table->string('reporter_phone', 40);
            $table->string('reporter_email', 150)->nullable();
            $table->string('category', 60);
            $table->text('item_description');
            $table->string('lost_area', 100);
            $table->timestamp('lost_at');
            $table->string('flight_number', 20)->nullable();
            $table->string('photo', 255)->nullable();
            $table->string('status', 20)->default('submitted');
            $table->unsignedBigInteger('found_item_id')->nullable();
            $table->text('admin_note')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
        });
    }

    /* ------------------------------------------------------------------ */

    private function buatUser(string $email, string $peran): User
    {
        $u = User::create(['name' => 'Uji '.$peran, 'email' => $email, 'password' => bcrypt('rahasia123')]);
        $u->forceFill([
            'is_admin' => $peran === 'admin',
            'is_staff' => $peran === 'staff',
            'is_accepted' => true,
        ])->save();

        return $u;
    }

    private function laporanBaku(array $ganti = []): array
    {
        return array_merge([
            'reporter_name' => 'Siti Rahmawati',
            'reporter_phone' => '081234567890',
            'reporter_email' => 'siti@contoh.id',
            'category' => 'Dompet & Kartu',
            'item_description' => 'Dompet kulit cokelat berisi KTP dan kartu ATM.',
            'lost_area' => 'Gate A2',
            'lost_at' => now()->subHours(2)->toIso8601String(),
        ], $ganti);
    }

    /* ================================================================
       Sifat 1 — tanpa data pribadi
       ================================================================ */

    public function test_muatan_notifikasi_tidak_memuat_data_pribadi_pelapor(): void
    {
        $this->buatUser('admin@uji.id', 'admin');
        Http::fake(['*' => Http::response(['status' => true], 200)]);

        $this->postJson("{$this->prefix}/lost-reports", $this->laporanBaku())->assertStatus(201);

        // (a) baris basis data untuk lonceng
        $baris = \DB::table('notifications')->first();
        $this->assertNotNull($baris, 'Notifikasi tidak tersimpan sama sekali.');

        foreach (['Siti Rahmawati', '081234567890', 'siti@contoh.id', 'Dompet kulit cokelat'] as $rahasia) {
            $this->assertStringNotContainsString($rahasia, $baris->data);
        }

        // (b) badan permintaan ke gateway WhatsApp
        Http::assertSent(function ($req) {
            $badan = (string) $req->body();
            foreach (['Siti', '081234567890', 'siti%40contoh.id', 'siti@contoh.id', 'Dompet kulit'] as $rahasia) {
                if (str_contains($badan, $rahasia)) {
                    return false;
                }
            }

            // Yang memang harus ada: nomor tiket.
            return str_contains(rawurldecode($badan), 'HLG-');
        });
    }

    /* ================================================================
       Sifat 2 — penerima hanya admin
       ================================================================ */

    public function test_hanya_akun_admin_yang_menerima(): void
    {
        $admin = $this->buatUser('admin@uji.id', 'admin');
        $staff = $this->buatUser('staff@uji.id', 'staff');
        $warga = $this->buatUser('warga@uji.id', 'user');

        Http::fake(['*' => Http::response([], 200)]);

        Notifikasi::kirim('pengaduan', 'TKT-UJI');

        $this->assertSame(1, $admin->notifications()->count());
        $this->assertSame(0, $staff->notifications()->count());
        $this->assertSame(0, $warga->notifications()->count());
    }

    public function test_akun_belum_disetujui_tidak_menerima(): void
    {
        $u = $this->buatUser('belum@uji.id', 'admin');
        $u->forceFill(['is_accepted' => false])->save();

        Http::fake(['*' => Http::response([], 200)]);
        Notifikasi::kirim('pengaduan', 'TKT-UJI');

        $this->assertSame(0, $u->notifications()->count());
    }

    /* ================================================================
       Sifat 3 — kegagalan kanal tidak menggagalkan kiriman warga
       ================================================================ */

    public function test_gateway_mati_tidak_menggagalkan_laporan_warga(): void
    {
        $this->buatUser('admin@uji.id', 'admin');
        Http::fake(['*' => Http::response(['error' => 'mati'], 500)]);

        $res = $this->postJson("{$this->prefix}/lost-reports", $this->laporanBaku());

        $res->assertStatus(201);
        $this->assertNotEmpty($res->json('data.ticket_number'));
        $this->assertSame(1, LostReport::count());
    }

    public function test_tanpa_satu_pun_penerima_pun_tidak_menggagalkan(): void
    {
        // Tidak ada akun admin sama sekali.
        Http::fake(['*' => Http::response([], 200)]);

        $this->postJson("{$this->prefix}/lost-reports", $this->laporanBaku())->assertStatus(201);
    }

    /* ================================================================
       Sifat 4 — WhatsApp sekali saja
       ================================================================ */

    public function test_whatsapp_dikirim_sekali_meski_penerima_banyak(): void
    {
        $this->buatUser('admin1@uji.id', 'admin');
        $this->buatUser('admin2@uji.id', 'admin');
        $this->buatUser('admin3@uji.id', 'admin');

        Http::fake(['*' => Http::response([], 200)]);

        Notifikasi::kirim('kehilangan', 'HLG-UJI');

        // Tiga baris lonceng, satu pesan WhatsApp.
        $this->assertSame(3, \DB::table('notifications')->count());
        Http::assertSentCount(1);
    }

    /* ================================================================
       Sifat 5 & 6 — jeda chat dan pagar biaya
       ================================================================ */

    public function test_pagar_biaya_harian_menahan_pengiriman(): void
    {
        $this->buatUser('admin@uji.id', 'admin');
        config()->set('whatsapp.daily_cap', 2);

        Http::fake(['*' => Http::response([], 200)]);

        foreach (range(1, 5) as $i) {
            Notifikasi::kirim('pengaduan', "TKT-{$i}");
        }

        // Lonceng tetap menerima semuanya — pagar ini soal biaya gateway,
        // bukan soal menyembunyikan kejadian dari petugas.
        $this->assertSame(5, \DB::table('notifications')->count());
        Http::assertSentCount(2);
    }

    public function test_muatan_whatsapp_hanya_tiga_baris(): void
    {
        $notif = new AktivitasPusatBantuan('kehilangan', 'HLG-20260817-ABCD1234');
        $teks = $notif->toWhatsApp();

        $baris = explode("\n", $teks);

        $this->assertCount(3, $baris);
        $this->assertStringContainsString('Laporan kehilangan baru', $baris[0]);
        $this->assertSame('HLG-20260817-ABCD1234', $baris[1]);
        $this->assertStringContainsString('/admin/lapor-hilang', $baris[2]);
    }

    /* ================================================================
       Sifat 6 — bentuk permintaan sesuai gateway yang dipakai

       Gateway bandara (wg.aptpairport.id) menuntut JSON, header `X-API-Key`,
       dan medan `to`/`body`. Ketiganya nilai bawaan `config/whatsapp.php`;
       uji ini yang menahannya agar tidak diam-diam berubah — kekeliruan di
       situ menghasilkan 4xx yang pesan galatnya tidak menyebut penyebabnya,
       dan baru ketahuan saat notifikasi sungguhan pertama tidak pernah tiba.
       ================================================================ */

    public function test_permintaan_gateway_berbentuk_json_dengan_header_kunci(): void
    {
        $this->buatUser('admin@uji.id', 'admin');
        Http::fake(['*' => Http::response(['success' => true], 200)]);

        $this->postJson("{$this->prefix}/lost-reports", $this->laporanBaku())->assertStatus(201);

        Http::assertSent(function ($req) {
            $data = $req->data();

            return $req->hasHeader(config('whatsapp.auth_header'), config('whatsapp.token'))
                && str_contains(strtolower((string) $req->header('Content-Type')[0]), 'application/json')
                && ($data[config('whatsapp.field_target')] ?? null) === '628111111111'
                && str_contains((string) ($data[config('whatsapp.field_message')] ?? ''), 'HLG-');
        });
    }

    public function test_device_id_hanya_disertakan_bila_diisi(): void
    {
        $this->buatUser('admin@uji.id', 'admin');
        Http::fake(['*' => Http::response(['success' => true], 200)]);

        // Kunci API gateway bandara sudah terikat perangkat bawaan, jadi medan
        // ini harus ABSEN — gateway menolak `deviceId` yang bukan miliknya.
        $this->postJson("{$this->prefix}/lost-reports", $this->laporanBaku())->assertStatus(201);

        Http::assertSent(fn ($req) => ! array_key_exists(config('whatsapp.field_device'), $req->data()));
    }

    public function test_amplop_success_false_dihitung_gagal(): void
    {
        $this->buatUser('admin@uji.id', 'admin');

        /*
         * Penolakan tingkat aplikasi datang bersama HTTP 200: kunci tanpa scope
         * `message.send`, nomor yang tidak terdaftar di WhatsApp, atau perangkat
         * yang sedang terputus. Tanpa pemeriksaan amplop, pesan yang tidak
         * pernah terkirim ikut menghabiskan kuota harian.
         */
        Http::fake(['*' => Http::response(['success' => false, 'message' => 'Device offline'], 200)]);

        $wa = app(\App\Services\Notifikasi\WhatsAppGateway::class);
        $sebelum = $wa->terpakaiHariIni();

        $this->assertSame(0, $wa->kirim('uji'), 'Balasan success:false seharusnya dihitung gagal.');
        $this->assertSame($sebelum, $wa->terpakaiHariIni(), 'Kuota tidak boleh terpakai untuk pesan yang gagal.');
    }
}

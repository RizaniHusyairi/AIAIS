<?php

namespace Tests\Feature\LostFound;

use App\Models\FoundItem;
use App\Models\LostReport;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Lapor kehilangan barang.
 *
 * Yang dijaga di sini bukan "formulirnya berfungsi", melainkan enam sifat yang
 * membuat modul ini layak dipakai orang yang sedang kehilangan barang:
 *
 *  1. Pelacakan publik TIDAK PERNAH memuat data pribadi pelapor. Nomor tiket
 *     bisa saja tertebak; yang tertebak tidak boleh mendapat nama dan nomor
 *     ponsel orang.
 *  2. Pelacakan publik TIDAK PERNAH memuat rincian barang temuan yang
 *     tercocokkan — termasuk tempat penyimpanannya. Kalau ia bocor, nomor
 *     tiket berubah menjadi kunci pengambilan barang.
 *  3. Nomor identitas pengambil tidak pernah terserialisasi ke JSON mana pun,
 *     termasuk respons admin.
 *  4. Pencocokan menautkan dan melepaskan KEDUA sisi bersama-sama. Barang
 *     berstatus `matched` tanpa laporan yang menautkannya hilang dari seluruh
 *     layar, dan tidak ada yang menyadarinya.
 *  5. Status `matched` tidak dapat dikarang lewat endpoint status.
 *  6. Tiket karangan dijawab 404, bukan 500.
 */
class LostReportTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->createLostFoundSchema();
        Storage::fake('public');
        $this->prefix = '/api/'.config('api.version');
    }

    private function createLostFoundSchema(): void
    {
        Schema::dropIfExists('lost_reports');
        Schema::dropIfExists('found_items');

        Schema::create('found_items', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('category', 60);
            $table->text('description');
            $table->string('found_area', 100);
            $table->timestamp('found_at');
            $table->string('finder_name', 150)->nullable();
            $table->string('storage_location', 150)->nullable();
            $table->string('photo', 255)->nullable();
            $table->string('status', 20)->default('stored');
            $table->timestamp('returned_at')->nullable();
            $table->string('receiver_name', 150)->nullable();
            $table->string('receiver_id_type', 30)->nullable();
            $table->string('receiver_id_number', 60)->nullable();
            $table->string('handover_officer', 150)->nullable();
            $table->text('handover_note')->nullable();
            $table->timestamps();
        });

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

    private function laporanBaku(array $ganti = []): array
    {
        return array_merge([
            'reporter_name' => 'Siti Rahmawati',
            'reporter_phone' => '081234567890',
            'reporter_email' => 'siti@contoh.id',
            'category' => 'Dompet & Kartu',
            'item_description' => 'Dompet kulit cokelat, ada kartu ATM BRI dan SIM.',
            'lost_area' => 'Ruang Tunggu',
            'lost_at' => now()->subHours(3)->format('Y-m-d H:i:s'),
            'flight_number' => 'GA-561',
        ], $ganti);
    }

    private function barangTemuan(array $ganti = []): FoundItem
    {
        return FoundItem::create(array_merge([
            'code' => 'TMN-20260816-AAAA',
            'category' => 'Dompet & Kartu',
            'description' => 'Dompet kulit cokelat berisi kartu.',
            'found_area' => 'Ruang Tunggu',
            'found_at' => now()->subHours(2),
            'storage_location' => 'Loker Pos AVSEC Nomor 7',
            'status' => 'stored',
        ], $ganti));
    }

    /**
     * Petugas panel beserta tokennya.
     *
     * `is_admin` dan `is_accepted` disetel LEWAT `forceFill`, bukan lewat
     * `create()`: keduanya tidak ada di `$fillable` User, sehingga penugasan
     * massal membuangnya tanpa suara dan akunnya lahir sebagai warga biasa
     * yang belum disetujui.
     */
    private function admin(): string
    {
        $user = \App\Models\User::create([
            'name' => 'Petugas Lost & Found',
            'email' => 'lostfound@contoh.id',
            'password' => bcrypt('rahasia123'),
        ]);

        $user->forceFill(['is_admin' => true, 'is_accepted' => true])->save();

        return $user->createToken('admin-panel', ['admin-panel'])->plainTextToken;
    }

    /* ================================================================
       Pengiriman & pelacakan publik
       ================================================================ */

    public function test_pengunjung_dapat_melapor_dan_menerima_nomor_tiket(): void
    {
        $res = $this->postJson("{$this->prefix}/lost-reports", $this->laporanBaku());

        $res->assertStatus(201);
        $tiket = $res->json('data.ticket_number');

        // Delapan karakter acak, bukan empat — lihat kepala berkas model.
        $this->assertMatchesRegularExpression('/^HLG-\d{8}-[A-Z0-9]{8}$/', $tiket);
        $this->assertDatabaseHas('lost_reports', ['ticket_number' => $tiket, 'status' => 'submitted']);
    }

    public function test_kiriman_ganda_tidak_membuat_dua_tiket(): void
    {
        $data = $this->laporanBaku();

        $pertama = $this->postJson("{$this->prefix}/lost-reports", $data)->json('data.ticket_number');
        $kedua = $this->postJson("{$this->prefix}/lost-reports", $data)->json('data.ticket_number');

        $this->assertSame($pertama, $kedua);
        $this->assertSame(1, LostReport::count());
    }

    public function test_waktu_kehilangan_di_masa_depan_ditolak(): void
    {
        $res = $this->postJson("{$this->prefix}/lost-reports", $this->laporanBaku([
            'lost_at' => now()->addDay()->format('Y-m-d H:i:s'),
        ]));

        $res->assertStatus(422);
    }

    public function test_tiket_karangan_dijawab_404(): void
    {
        $this->getJson("{$this->prefix}/lost-reports/track/HLG-20260816-ZZZZZZZZ")
            ->assertStatus(404);
    }

    /**
     * Sifat nomor 1 — data pribadi pelapor tidak pernah keluar.
     *
     * Diperiksa atas JSON MENTAH, bukan lewat `assertJsonMissing`: nilai yang
     * bersarang dalam relasi atau ter-escape bisa lolos dari pemeriksaan
     * berbasis kunci.
     */
    public function test_pelacakan_publik_tidak_membocorkan_data_pelapor(): void
    {
        $tiket = $this->postJson("{$this->prefix}/lost-reports", $this->laporanBaku())
            ->json('data.ticket_number');

        $mentah = $this->getJson("{$this->prefix}/lost-reports/track/{$tiket}")
            ->assertStatus(200)
            ->getContent();

        $this->assertStringNotContainsString('Siti Rahmawati', $mentah);
        $this->assertStringNotContainsString('081234567890', $mentah);
        $this->assertStringNotContainsString('siti@contoh.id', $mentah);
        $this->assertStringNotContainsString('reporter_', $mentah);
    }

    /**
     * Sifat nomor 2 — rincian barang temuan tidak pernah keluar lewat tiket.
     */
    public function test_pelacakan_publik_tidak_membocorkan_barang_temuan(): void
    {
        $token = $this->admin();
        $barang = $this->barangTemuan();

        $laporan = LostReport::create($this->laporanBaku([
            'ticket_number' => LostReport::buatNomorTiket(),
            'status' => 'submitted',
        ]));

        $this->withToken($token)
            ->putJson("{$this->prefix}/admin/lost-reports/{$laporan->id}/match", [
                'found_item_id' => $barang->id,
                'admin_note' => 'Barang serupa ditemukan. Silakan datang ke pos dengan identitas.',
            ])->assertStatus(200);

        $mentah = $this->getJson("{$this->prefix}/lost-reports/track/{$laporan->ticket_number}")
            ->assertStatus(200)
            ->getContent();

        // Statusnya boleh terlihat; isi gudangnya tidak.
        $this->assertStringContainsString('matched', $mentah);
        $this->assertStringNotContainsString('Loker Pos AVSEC', $mentah);
        $this->assertStringNotContainsString('TMN-', $mentah);
        $this->assertStringNotContainsString('storage_location', $mentah);
        $this->assertStringNotContainsString('found_item', $mentah);
    }

    /* ================================================================
       Pencocokan
       ================================================================ */

    public function test_pencocokan_menautkan_kedua_sisi_dan_melepasnya_membalik(): void
    {
        $token = $this->admin();
        $barang = $this->barangTemuan();
        $laporan = LostReport::create($this->laporanBaku([
            'ticket_number' => LostReport::buatNomorTiket(),
        ]));

        $this->withToken($token)
            ->putJson("{$this->prefix}/admin/lost-reports/{$laporan->id}/match", [
                'found_item_id' => $barang->id,
            ])->assertStatus(200);

        $this->assertDatabaseHas('lost_reports', ['id' => $laporan->id, 'status' => 'matched', 'found_item_id' => $barang->id]);
        $this->assertDatabaseHas('found_items', ['id' => $barang->id, 'status' => 'matched']);

        $this->withToken($token)
            ->putJson("{$this->prefix}/admin/lost-reports/{$laporan->id}/match", [
                'found_item_id' => null,
            ])->assertStatus(200);

        // Kedua sisi kembali bersama-sama; tidak ada barang `matched` yatim.
        $this->assertDatabaseHas('lost_reports', ['id' => $laporan->id, 'status' => 'searching', 'found_item_id' => null]);
        $this->assertDatabaseHas('found_items', ['id' => $barang->id, 'status' => 'stored']);
        $this->assertSame(0, FoundItem::where('status', 'matched')->count());
    }

    public function test_barang_yang_sudah_dicocokkan_tidak_dapat_dipakai_dua_kali(): void
    {
        $token = $this->admin();
        $barang = $this->barangTemuan();

        $satu = LostReport::create($this->laporanBaku(['ticket_number' => LostReport::buatNomorTiket()]));
        $dua = LostReport::create($this->laporanBaku([
            'ticket_number' => LostReport::buatNomorTiket(),
            'reporter_phone' => '089999999999',
        ]));

        $this->withToken($token)
            ->putJson("{$this->prefix}/admin/lost-reports/{$satu->id}/match", ['found_item_id' => $barang->id])
            ->assertStatus(200);

        $this->withToken($token)
            ->putJson("{$this->prefix}/admin/lost-reports/{$dua->id}/match", ['found_item_id' => $barang->id])
            ->assertStatus(422);
    }

    public function test_kandidat_disaring_kategori_dan_jendela_waktu(): void
    {
        $token = $this->admin();

        $cocok = $this->barangTemuan();
        $bedaKategori = $this->barangTemuan(['code' => 'TMN-B', 'category' => 'Elektronik']);
        $terlaluLama = $this->barangTemuan(['code' => 'TMN-C', 'found_at' => now()->subDays(30)]);

        $laporan = LostReport::create($this->laporanBaku(['ticket_number' => LostReport::buatNomorTiket()]));

        $ids = collect($this->withToken($token)
            ->getJson("{$this->prefix}/admin/lost-reports/{$laporan->id}/candidates")
            ->assertStatus(200)
            ->json('data'))->pluck('id')->all();

        $this->assertContains($cocok->id, $ids);
        $this->assertNotContains($bedaKategori->id, $ids);
        $this->assertNotContains($terlaluLama->id, $ids);
    }

    /** Sifat nomor 5 — `matched` hanya lahir dari pencocokan sungguhan. */
    public function test_status_matched_tidak_dapat_dikarang_lewat_endpoint_status(): void
    {
        $token = $this->admin();
        $laporan = LostReport::create($this->laporanBaku(['ticket_number' => LostReport::buatNomorTiket()]));

        $this->withToken($token)
            ->putJson("{$this->prefix}/admin/lost-reports/{$laporan->id}/status", ['status' => 'matched'])
            ->assertStatus(422);

        // Begitu pula "sudah diserahkan" tanpa barang yang tertaut.
        $this->withToken($token)
            ->putJson("{$this->prefix}/admin/lost-reports/{$laporan->id}/status", ['status' => 'returned'])
            ->assertStatus(422);
    }

    /* ================================================================
       Serah terima
       ================================================================ */

    public function test_serah_terima_menutup_laporan_dan_menyembunyikan_nomor_identitas(): void
    {
        $token = $this->admin();
        $barang = $this->barangTemuan();
        $laporan = LostReport::create($this->laporanBaku(['ticket_number' => LostReport::buatNomorTiket()]));

        $this->withToken($token)
            ->putJson("{$this->prefix}/admin/lost-reports/{$laporan->id}/match", ['found_item_id' => $barang->id])
            ->assertStatus(200);

        $res = $this->withToken($token)
            ->putJson("{$this->prefix}/admin/found-items/{$barang->id}/handover", [
                'receiver_name' => 'Siti Rahmawati',
                'receiver_id_type' => 'KTP',
                'receiver_id_number' => '6472015678901234',
                'handover_officer' => 'Andi Pratama',
            ])->assertStatus(200);

        $this->assertDatabaseHas('found_items', ['id' => $barang->id, 'status' => 'returned']);
        $this->assertDatabaseHas('lost_reports', ['id' => $laporan->id, 'status' => 'returned']);

        // Sifat nomor 3 — nomornya tersimpan, tetapi tidak pernah ikut JSON.
        $this->assertDatabaseHas('found_items', ['id' => $barang->id, 'receiver_id_number' => '6472015678901234']);
        $this->assertStringNotContainsString('6472015678901234', $res->getContent());

        $daftar = $this->withToken($token)->getJson("{$this->prefix}/admin/found-items")->getContent();
        $this->assertStringNotContainsString('6472015678901234', $daftar);
    }

    public function test_berita_acara_hanya_terbit_setelah_serah_terima(): void
    {
        $token = $this->admin();
        $barang = $this->barangTemuan();

        $this->withToken($token)
            ->getJson("{$this->prefix}/admin/found-items/{$barang->id}/handover-pdf")
            ->assertStatus(422);

        $this->withToken($token)
            ->putJson("{$this->prefix}/admin/found-items/{$barang->id}/handover", [
                'receiver_name' => 'Budi Santoso',
                'receiver_id_type' => 'SIM',
                'receiver_id_number' => 'SIM99887766',
                'handover_officer' => 'Andi Pratama',
            ])->assertStatus(200);

        $res = $this->withToken($token)
            ->get("{$this->prefix}/admin/found-items/{$barang->id}/handover-pdf");

        $res->assertStatus(200);
        $this->assertStringStartsWith('%PDF', $res->getContent());
    }

    /**
     * Berita acara mencetak jam WITA, bukan UTC.
     *
     * Diuji pada templatnya, bukan pada berkas PDF: keluaran DomPDF terkompresi
     * sehingga teksnya tidak dapat dicari, dan mematikan kompresinya tidak
     * membuatnya terbaca.
     *
     * Templat inilah lapisan tempat cacatnya hidup. Bila kelak seseorang
     * menyunting berkas blade-nya untuk mencetak `$barang->found_at` langsung —
     * persis yang sudah dua kali terjadi pada modul lain — jam UTC-nya akan
     * muncul dan tes ini gagal.
     */
    public function test_berita_acara_mencetak_jam_wita_bukan_utc(): void
    {
        // 16 Agustus 2026 pukul 03:23 UTC = 11:23 WITA.
        $barang = $this->barangTemuan([
            'found_at' => \Illuminate\Support\Carbon::parse('2026-08-16 03:23:00', 'UTC'),
            'returned_at' => \Illuminate\Support\Carbon::parse('2026-08-16 06:05:00', 'UTC'),
            'status' => 'returned',
            'receiver_name' => 'Siti Rahmawati',
            'receiver_id_type' => 'KTP',
            'receiver_id_number' => '6472015678901234',
            'handover_officer' => 'Andi Pratama',
        ]);

        $html = view('pdf.lost-handover', [
            'judul' => 'Berita Acara Serah Terima Barang Temuan',
            'periode' => 'Nomor Barang: '.$barang->code,
            'dicetakPada' => \App\Support\CetakanPdf::dicetakPada(),
            'dicetakOleh' => 'Andi Pratama',
            'barang' => $barang,
            'laporan' => null,
            'ditemukanPada' => \App\Support\CetakanPdf::waktu($barang->found_at),
            'diserahkanPada' => \App\Support\CetakanPdf::waktu($barang->returned_at),
        ])->render();

        $this->assertStringContainsString('11:23', $html);
        $this->assertStringContainsString('14:05', $html);
        $this->assertStringNotContainsString('03:23', $html);
        $this->assertStringNotContainsString('06:05', $html);

        // Nomor identitas memang tercetak di sini — dokumen inilah tempatnya.
        $this->assertStringContainsString('6472015678901234', $html);
    }

    /**
     * Menghapus catatan gudang tidak boleh melenyapkan laporan warganya.
     */
    public function test_menghapus_barang_temuan_melepas_laporan_bukan_menghapusnya(): void
    {
        $token = $this->admin();
        $barang = $this->barangTemuan();
        $laporan = LostReport::create($this->laporanBaku(['ticket_number' => LostReport::buatNomorTiket()]));

        $this->withToken($token)
            ->putJson("{$this->prefix}/admin/lost-reports/{$laporan->id}/match", ['found_item_id' => $barang->id])
            ->assertStatus(200);

        $this->withToken($token)
            ->deleteJson("{$this->prefix}/admin/found-items/{$barang->id}")
            ->assertStatus(200);

        $this->assertDatabaseHas('lost_reports', [
            'id' => $laporan->id,
            'found_item_id' => null,
            'status' => 'searching',
        ]);
    }

    /* ================================================================
       Kewenangan
       ================================================================ */

    public function test_katalog_barang_temuan_tidak_punya_jalur_publik(): void
    {
        $this->getJson("{$this->prefix}/found-items")->assertStatus(404);
        $this->getJson("{$this->prefix}/admin/found-items")->assertStatus(401);
    }
}

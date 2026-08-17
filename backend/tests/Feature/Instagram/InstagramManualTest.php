<?php

namespace Tests\Feature\Instagram;

use App\Models\InstagramCredential;
use App\Models\InstagramPost;
use App\Models\Setting;
use App\Services\Instagram\InstagramSync;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Dua sumber konten Instagram: tarikan API dan masukan petugas.
 *
 * Yang dijaga di sini bukan "formulirnya berfungsi", melainkan lima sifat yang
 * membuat kedua sumber itu dapat hidup berdampingan tanpa saling merusak:
 *
 *  1. UNGGAHAN MANUAL SELAMAT DARI SINKRONISASI — tidak tersentuh sedikit pun,
 *     termasuk `is_visible`-nya. Ini sifat terpenting berkas ini: petugas yang
 *     kehilangan tulisannya karena penjadwal berjalan tidak akan memakai panel
 *     itu lagi.
 *  2. MODE MANUAL BENAR-BENAR MENGHENTIKAN PENJADWAL — nol permintaan HTTP,
 *     bukan sekadar hasilnya diabaikan. Panggilan yang gagal tiap tiga jam
 *     selamanya adalah panggilan yang berhenti dibaca orang.
 *  3. Unggahan hasil sinkronisasi MENOLAK disunting lewat endpoint manual.
 *  4. Gambar ikut terhapus saat unggahan manual dihapus.
 *  5. Berpindah mode TIDAK menghapus apa pun.
 */
class InstagramManualTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->buatSkema();
        Storage::fake('public');
        $this->prefix = '/api/'.config('api.version');
    }

    private function buatSkema(): void
    {
        Schema::dropIfExists('instagram_posts');
        Schema::dropIfExists('instagram_credentials');
        Schema::dropIfExists('settings');

        Schema::create('instagram_posts', function (Blueprint $table) {
            $table->id();
            $table->string('source', 10)->default('api');
            $table->string('ig_id', 64)->nullable()->unique();
            $table->string('permalink', 500)->nullable();
            $table->string('media_type', 32);
            $table->string('local_image_path', 255)->nullable();
            $table->text('caption')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->boolean('is_visible')->default(true);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });

        Schema::create('instagram_credentials', function (Blueprint $table) {
            $table->id();
            $table->text('access_token');
            $table->timestamp('expires_at')->nullable();
            $table->string('account_username', 125)->nullable();
            $table->timestamp('last_refreshed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 125);
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }

    /* ------------------------------------------------------------------ */

    private function setelMode(string $mode): void
    {
        Setting::updateOrCreate(['key' => 'instagram_mode'], ['value' => $mode]);
    }

    private function admin(): string
    {
        $user = \App\Models\User::create([
            'name' => 'Admin Portal',
            'email' => 'admin-ig@contoh.id',
            'password' => bcrypt('rahasia123'),
        ]);

        // `is_admin`/`is_accepted` tidak ada di $fillable User — penugasan
        // massal membuangnya tanpa suara.
        $user->forceFill(['is_admin' => true, 'is_accepted' => true])->save();

        return $user->createToken('admin-panel', ['admin-panel'])->plainTextToken;
    }

    private function gambar(): UploadedFile
    {
        return UploadedFile::fake()->image('unggahan.jpg', 600, 600);
    }

    /** Unggahan manual yang sudah tersimpan, lengkap dengan berkasnya. */
    private function unggahanManual(array $ganti = []): InstagramPost
    {
        $lintasan = InstagramPost::FOLDER.'/manual-uji.jpg';
        Storage::disk('public')->put($lintasan, 'isi-gambar');

        return InstagramPost::create(array_merge([
            'source' => 'manual',
            'media_type' => 'IMAGE',
            'caption' => 'Pengumuman perubahan jam layanan konter.',
            'local_image_path' => $lintasan,
            'posted_at' => now()->subDay(),
            'is_visible' => true,
        ], $ganti));
    }

    private function palsukanApi(): void
    {
        Http::fake([
            '*/me/media*' => Http::response(['data' => [[
                'id' => 'IG-001',
                'permalink' => 'https://www.instagram.com/p/ABC123/',
                'media_type' => 'IMAGE',
                'media_url' => 'https://scontent.cdninstagram.com/v/contoh.jpg',
                'caption' => 'Unggahan dari Instagram.',
                'timestamp' => now()->toIso8601String(),
            ]]], 200),
            'scontent.cdninstagram.com/*' => Http::response(hex2bin(
                '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489'
                .'0000000d4944415478da63f8ffff3f0005fe02fea735c0000000000049454e44ae426082'
            ), 200),
        ]);
    }

    /* ================================================================
       Sifat 1 — unggahan manual selamat dari sinkronisasi
       ================================================================ */

    public function test_sinkronisasi_tidak_menyentuh_unggahan_manual(): void
    {
        $this->setelMode('auto');
        InstagramCredential::create([
            'access_token' => 'token-uji',
            'expires_at' => now()->addDays(50),
            'account_username' => 'aptpranotoairport',
        ]);

        $manual = $this->unggahanManual(['caption' => 'Tulisan petugas yang tidak boleh hilang.']);
        $sebelum = $manual->only(['caption', 'local_image_path', 'permalink', 'posted_at', 'is_visible']);

        $this->palsukanApi();
        app(InstagramSync::class)->jalankan();

        $sesudah = $manual->fresh()->only(['caption', 'local_image_path', 'permalink', 'posted_at', 'is_visible']);

        $this->assertEquals($sebelum, $sesudah);
        $this->assertSame('manual', $manual->fresh()->source);

        // Unggahan API tetap masuk, jadi keduanya benar-benar berdampingan.
        $this->assertSame(1, InstagramPost::where('source', 'api')->count());
        $this->assertSame(1, InstagramPost::where('source', 'manual')->count());
    }

    public function test_unggahan_manual_yang_disembunyikan_tidak_menyala_lagi(): void
    {
        $this->setelMode('auto');
        InstagramCredential::create(['access_token' => 't', 'expires_at' => now()->addDays(50)]);

        $manual = $this->unggahanManual(['is_visible' => false]);

        $this->palsukanApi();
        app(InstagramSync::class)->jalankan();

        $this->assertFalse((bool) $manual->fresh()->is_visible);
    }

    /* ================================================================
       Sifat 2 — mode manual menghentikan penjadwal
       ================================================================ */

    public function test_mode_manual_menghentikan_sinkronisasi_tanpa_satu_pun_permintaan(): void
    {
        $this->setelMode('manual');
        InstagramCredential::create(['access_token' => 't', 'expires_at' => now()->addDays(50)]);

        Http::fake();

        $this->artisan('aiais:sync-instagram')->assertSuccessful();
        $this->artisan('aiais:refresh-instagram-token')->assertSuccessful();

        // Bukan sekadar "hasilnya kosong" — Instagram tidak dihubungi sama sekali.
        Http::assertNothingSent();
    }

    /* ================================================================
       Sifat 3 — unggahan API menolak disunting
       ================================================================ */

    public function test_unggahan_dari_sinkronisasi_menolak_disunting(): void
    {
        $token = $this->admin();

        $api = InstagramPost::create([
            'source' => 'api',
            'ig_id' => 'IG-999',
            'permalink' => 'https://www.instagram.com/p/XYZ/',
            'media_type' => 'IMAGE',
            'local_image_path' => InstagramPost::FOLDER.'/api.jpg',
            'caption' => 'Takarir asli dari Instagram.',
        ]);

        $res = $this->withToken($token)
            ->putJson("{$this->prefix}/admin/instagram/posts/{$api->id}", [
                'caption' => 'Takarir hasil suntingan petugas.',
            ]);

        $res->assertStatus(422);
        $this->assertSame('Takarir asli dari Instagram.', $api->fresh()->caption);
    }

    public function test_petugas_dapat_menambah_dan_menyunting_unggahan_manual(): void
    {
        $token = $this->admin();

        $buat = $this->withToken($token)->post("{$this->prefix}/admin/instagram/posts", [
            'media' => $this->gambar(),
            'caption' => 'Layanan konter dibuka pukul 05.00 WITA.',
            'permalink' => 'https://www.instagram.com/p/MANUAL1/',
        ]);

        $buat->assertStatus(201);
        $id = $buat->json('data.id');

        $this->assertDatabaseHas('instagram_posts', ['id' => $id, 'source' => 'manual']);
        Storage::disk('public')->assertExists($buat->json('data.local_image_path'));

        $ubah = $this->withToken($token)
            ->putJson("{$this->prefix}/admin/instagram/posts/{$id}", ['caption' => 'Takarir diperbaiki.']);

        $ubah->assertStatus(200);
        $this->assertSame('Takarir diperbaiki.', InstagramPost::find($id)->caption);
    }

    public function test_unggahan_manual_wajib_bermedia(): void
    {
        $token = $this->admin();

        $this->withToken($token)
            ->postJson("{$this->prefix}/admin/instagram/posts", ['caption' => 'Tanpa media.'])
            ->assertStatus(422);
    }

    /* ================================================================
       Media video

       Petugas boleh mengunggah video, bukan hanya gambar. `media_type`
       DITURUNKAN dari berkasnya — bukan dari medan pilihan — supaya tidak ada
       peluang jenis yang tidak cocok dengan isinya. Tanpa penanda yang benar,
       beranda merender video di dalam <img> dan menghasilkan kotak rusak
       tanpa satu pun pesan galat.
       ================================================================ */

    public function test_video_diterima_dan_ditandai_sebagai_video(): void
    {
        $token = $this->admin();

        $res = $this->withToken($token)->post("{$this->prefix}/admin/instagram/posts", [
            'media' => UploadedFile::fake()->create('sambutan.mp4', 900, 'video/mp4'),
            'caption' => 'Sambutan Kepala Bandara.',
        ]);

        $res->assertStatus(201);
        $res->assertJsonPath('data.media_type', 'VIDEO');
        $res->assertJsonPath('data.is_video', true);

        Storage::disk('public')->assertExists($res->json('data.local_image_path'));
        $this->assertStringEndsWith('.mp4', $res->json('data.local_image_path'));
    }

    public function test_gambar_tetap_ditandai_sebagai_gambar(): void
    {
        $token = $this->admin();

        $res = $this->withToken($token)->post("{$this->prefix}/admin/instagram/posts", [
            'media' => $this->gambar(),
        ]);

        $res->assertStatus(201);
        $res->assertJsonPath('data.media_type', 'IMAGE');
        $res->assertJsonPath('data.is_video', false);
    }

    public function test_mengganti_gambar_dengan_video_ikut_mengubah_jenisnya(): void
    {
        $token = $this->admin();

        $id = $this->withToken($token)->post("{$this->prefix}/admin/instagram/posts", [
            'media' => $this->gambar(),
        ])->json('data.id');

        $res = $this->withToken($token)->post("{$this->prefix}/admin/instagram/posts/{$id}", [
            'media' => UploadedFile::fake()->create('ganti.webm', 500, 'video/webm'),
        ]);

        $res->assertStatus(200);
        $this->assertSame('VIDEO', InstagramPost::find($id)->media_type);
    }

    public function test_jenis_berkas_di_luar_daftar_ditolak(): void
    {
        $token = $this->admin();

        $this->withToken($token)->post("{$this->prefix}/admin/instagram/posts", [
            'media' => UploadedFile::fake()->create('dokumen.pdf', 40, 'application/pdf'),
        ])->assertStatus(422);
    }

    public function test_tautan_selain_instagram_ditolak(): void
    {
        $token = $this->admin();

        $this->withToken($token)->post("{$this->prefix}/admin/instagram/posts", [
            'media' => $this->gambar(),
            'permalink' => 'https://contoh-lain.id/promo',
        ])->assertStatus(422);
    }

    /* ================================================================
       Sifat 4 & 5
       ================================================================ */

    public function test_menghapus_unggahan_manual_ikut_menghapus_gambarnya(): void
    {
        $token = $this->admin();
        $manual = $this->unggahanManual();
        $lintasan = $manual->local_image_path;

        Storage::disk('public')->assertExists($lintasan);

        $this->withToken($token)
            ->deleteJson("{$this->prefix}/admin/instagram/posts/{$manual->id}")
            ->assertStatus(200);

        Storage::disk('public')->assertMissing($lintasan);
        $this->assertDatabaseMissing('instagram_posts', ['id' => $manual->id]);
    }

    public function test_berpindah_mode_tidak_menghapus_apa_pun(): void
    {
        $token = $this->admin();
        $this->setelMode('manual');

        $this->unggahanManual();
        InstagramPost::create([
            'source' => 'api', 'ig_id' => 'IG-1', 'media_type' => 'IMAGE',
            'permalink' => 'https://www.instagram.com/p/A/',
            'local_image_path' => InstagramPost::FOLDER.'/a.jpg',
        ]);

        foreach (['auto', 'manual', 'auto'] as $mode) {
            $this->withToken($token)
                ->putJson("{$this->prefix}/admin/instagram/mode", ['mode' => $mode])
                ->assertStatus(200);
        }

        $this->assertSame(1, InstagramPost::where('source', 'manual')->count());
        $this->assertSame(1, InstagramPost::where('source', 'api')->count());
    }

    public function test_mode_tak_dikenali_ditolak(): void
    {
        $this->withToken($this->admin())
            ->putJson("{$this->prefix}/admin/instagram/mode", ['mode' => 'entah'])
            ->assertStatus(422);
    }

    /** Endpoint publik melayani kedua sumber tanpa membedakannya. */
    public function test_endpoint_publik_menyajikan_unggahan_manual(): void
    {
        $this->unggahanManual(['caption' => 'Kabar dari petugas.']);

        $res = $this->getJson("{$this->prefix}/instagram-posts")->assertStatus(200);

        $this->assertCount(1, $res->json('data'));
        $this->assertStringContainsString('Kabar dari petugas', $res->getContent());
    }
}

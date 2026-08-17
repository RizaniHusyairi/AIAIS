<?php

namespace Tests\Feature\Instagram;

use App\Models\InstagramCredential;
use App\Models\InstagramPost;
use App\Services\Instagram\InstagramSync;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Sinkronisasi unggahan Instagram.
 *
 * Yang dijaga di sini bukan "datanya masuk", melainkan empat sifat yang
 * membuat integrasi ini tidak rusak diam-diam:
 *
 *  1. Gambarnya DISALIN, bukan ditautkan — URL CDN Meta mati dalam hitungan
 *     jam, dan portal yang menautkannya akan penuh gambar rusak menjelang sore.
 *  2. Unggahan yang disembunyikan petugas TIDAK menyala kembali.
 *  3. Kegagalan tidak menghapus apa pun — unggahan lama tetap tampil.
 *  4. Token tidak pernah ikut respons mana pun.
 */
class InstagramSyncTest extends TestCase
{
    /** URL CDN Meta yang berumur pendek — persis bentuk yang mati sendiri. */
    private const CDN = 'https://scontent.cdninstagram.com/v/t51.29350-15/contoh.jpg?_nc_ht=x&oe=DEADBEEF';

    protected function setUp(): void
    {
        parent::setUp();
        $this->buatSkema();
        Storage::fake('public');
    }

    private function buatSkema(): void
    {
        Schema::dropIfExists('instagram_posts');
        Schema::dropIfExists('instagram_credentials');

        Schema::create('instagram_posts', function (Blueprint $table) {
            $table->id();
            // Bentuknya mengikuti migrasi 2026_08_17_000100: `source` ada, dan
            // `ig_id`/`permalink` nullable supaya unggahan manual muat.
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

        // Perintah terjadwal membaca `instagram_mode` dari sini sebelum
        // menyentuh Instagram sama sekali. Berkas ini menguji jalur OTOMATIS,
        // jadi modenya disetel demikian; jalur manual diuji di
        // InstagramManualTest.
        Schema::dropIfExists('settings');
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 125);
            $table->text('value')->nullable();
            $table->timestamps();
        });

        \App\Models\Setting::create(['key' => 'instagram_mode', 'value' => 'auto']);
    }

    private function kredensial(): InstagramCredential
    {
        return InstagramCredential::create([
            'access_token' => 'token-rahasia-sekali',
            'expires_at' => now()->addDays(50),
            'account_username' => 'aptpranotoairport',
        ]);
    }

    /** Satu PNG 1x1 yang sah, sebagai isi unduhan gambar. */
    private function gambarSah(): string
    {
        return hex2bin(
            '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489'
            .'0000000d4944415478da63f8ffff3f0005fe02fea735c0000000000049454e44ae426082'
        );
    }

    /** @param array<int, array<string, mixed>> $media */
    private function palsukan(array $media, ?string $gambar = null): void
    {
        Http::fake([
            '*/me/media*' => Http::response(['data' => $media], 200),
            'scontent.cdninstagram.com/*' => Http::response($gambar ?? $this->gambarSah(), 200),
        ]);
    }

    /** @return array<string, mixed> */
    private function unggahan(string $id = 'IG1'): array
    {
        return [
            'id' => $id,
            'caption' => 'Selamat datang di Bandara APT Pranoto #bandara #samarinda',
            'media_type' => 'IMAGE',
            'media_url' => self::CDN,
            'permalink' => 'https://www.instagram.com/p/'.$id.'/',
            'timestamp' => '2026-08-14T09:00:00+0000',
        ];
    }

    public function test_unggahan_baru_tersimpan(): void
    {
        $this->kredensial();
        $this->palsukan([$this->unggahan()]);

        $hasil = app(InstagramSync::class)->jalankan();

        $this->assertSame(1, $hasil['baru']);
        $this->assertSame(1, InstagramPost::count());

        $post = InstagramPost::first();
        $this->assertSame('IG1', $post->ig_id);
        $this->assertSame('2026-08-14', $post->posted_at->toDateString());
    }

    /**
     * SIFAT TERPENTING: gambarnya disalin, dan yang ditampilkan portal adalah
     * salinan itu — bukan URL CDN Meta yang mati dalam hitungan jam.
     */
    public function test_gambar_disalin_dan_bukan_url_instagram(): void
    {
        $this->kredensial();
        $this->palsukan([$this->unggahan()]);

        app(InstagramSync::class)->jalankan();

        $post = InstagramPost::first();

        $this->assertNotNull($post->getAttributes()['local_image_path']);
        Storage::disk('public')->assertExists($post->getAttributes()['local_image_path']);

        // URL yang dipakai portal tidak boleh menyentuh domain Meta.
        $this->assertStringNotContainsString('cdninstagram.com', (string) $post->image_url);
    }

    /** Sinkronisasi berulang tidak menggandakan, dan tidak mengunduh ulang. */
    public function test_sinkronisasi_ulang_tidak_menggandakan(): void
    {
        $this->kredensial();
        $this->palsukan([$this->unggahan()]);

        app(InstagramSync::class)->jalankan();
        $lintasanPertama = InstagramPost::first()->getAttributes()['local_image_path'];

        $hasil = app(InstagramSync::class)->jalankan();

        $this->assertSame(1, InstagramPost::count());
        $this->assertSame(0, $hasil['baru']);
        $this->assertSame(1, $hasil['diperbarui']);
        // Gambarnya TIDAK diunduh ulang — salinannya sudah ada.
        $this->assertSame(0, $hasil['gambar_diunduh']);
        $this->assertSame($lintasanPertama, InstagramPost::first()->getAttributes()['local_image_path']);
    }

    /**
     * Unggahan yang disembunyikan petugas tidak boleh menyala kembali.
     *
     * Portal pemerintah bukan cermin buta Instagram; keputusan redaksi petugas
     * harus bertahan melewati sinkronisasi berikutnya.
     */
    public function test_unggahan_yang_disembunyikan_tetap_tersembunyi(): void
    {
        $this->kredensial();
        $this->palsukan([$this->unggahan()]);

        app(InstagramSync::class)->jalankan();

        $post = InstagramPost::first();
        $post->is_visible = false;
        $post->save();

        app(InstagramSync::class)->jalankan();

        $this->assertFalse($post->fresh()->is_visible);
    }

    /** Instagram bermasalah tidak boleh menghapus unggahan yang sudah ada. */
    public function test_kegagalan_tidak_menghapus_unggahan_lama(): void
    {
        $this->kredensial();
        $this->palsukan([$this->unggahan()]);
        app(InstagramSync::class)->jalankan();

        Http::fake(['*/me/media*' => Http::response(['error' => ['message' => 'Token kedaluwarsa']], 401)]);

        $this->artisan('aiais:sync-instagram')->assertSuccessful();

        // Unggahan lama tetap ada dan tetap dapat ditampilkan.
        $this->assertSame(1, InstagramPost::count());
        $this->assertSame(1, InstagramPost::tampil()->count());
    }

    /** Gambar yang isinya bukan gambar ditolak. */
    public function test_unduhan_yang_bukan_gambar_ditolak(): void
    {
        $this->kredensial();
        $this->palsukan([$this->unggahan()], 'ini jelas bukan gambar');

        $hasil = app(InstagramSync::class)->jalankan();

        $this->assertSame(1, $hasil['gambar_gagal']);
        $this->assertNull(InstagramPost::first()->getAttributes()['local_image_path']);
        // Tanpa salinan gambar, ia tidak ditampilkan portal.
        $this->assertSame(0, InstagramPost::tampil()->count());
    }

    public function test_tanpa_kredensial_ditolak_dengan_pesan_terbaca(): void
    {
        $this->expectExceptionMessage('Kredensial Instagram belum dipasang');

        app(InstagramSync::class)->jalankan();
    }

    public function test_token_kedaluwarsa_ditolak(): void
    {
        InstagramCredential::create([
            'access_token' => 'token-mati',
            'expires_at' => now()->subDay(),
        ]);

        $this->expectExceptionMessage('sudah kedaluwarsa');

        app(InstagramSync::class)->jalankan();
    }

    /** Token tidak pernah ikut terserialisasi. */
    public function test_token_tidak_ikut_terserialisasi(): void
    {
        $kredensial = $this->kredensial();

        $this->assertStringNotContainsString('token-rahasia-sekali', $kredensial->toJson());
        $this->assertArrayNotHasKey('access_token', $kredensial->toArray());
    }

    /* ---------------- endpoint ---------------- */

    private function prefix(): string
    {
        return '/api/'.config('api.version');
    }

    /**
     * Endpoint publik tidak boleh membawa URL CDN Meta.
     *
     * Kalau bocor, portal akan menampilkan gambar yang mati dalam hitungan jam
     * — persis kegagalan yang seluruh rancangan ini hindari.
     */
    public function test_endpoint_publik_hanya_menyajikan_gambar_lokal(): void
    {
        $this->kredensial();
        $this->palsukan([$this->unggahan()]);
        app(InstagramSync::class)->jalankan();

        $res = $this->getJson($this->prefix().'/instagram-posts');

        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertStringNotContainsString('cdninstagram.com', $res->getContent());

        // Diperiksa pada nilai terurai, bukan teks mentah: JSON meng-escape
        // garis miring menjadi `\/`, sehingga pencocokan teks mentah lolos
        // palsu ke arah sebaliknya.
        $this->assertStringContainsString(
            '/storage/'.InstagramPost::FOLDER,
            (string) $res->json('data.0.image_url'),
        );
    }

    /** Unggahan yang disembunyikan petugas tidak muncul di endpoint publik. */
    public function test_unggahan_tersembunyi_tidak_muncul_di_endpoint_publik(): void
    {
        $this->kredensial();
        $this->palsukan([$this->unggahan('IG1'), $this->unggahan('IG2')]);
        app(InstagramSync::class)->jalankan();

        InstagramPost::where('ig_id', 'IG1')->update(['is_visible' => false]);

        $res = $this->getJson($this->prefix().'/instagram-posts');

        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertStringNotContainsString('IG1', $res->getContent());
    }

    /** Unggahan tanpa salinan gambar tidak ditampilkan. */
    public function test_unggahan_tanpa_gambar_tidak_muncul(): void
    {
        $this->kredensial();
        $this->palsukan([$this->unggahan()], 'bukan gambar');
        app(InstagramSync::class)->jalankan();

        $this->getJson($this->prefix().'/instagram-posts')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    /** Takarir dipangkas dan tagar di ekornya dibuang untuk kartu beranda. */
    public function test_takarir_dipangkas_tanpa_tagar(): void
    {
        $this->kredensial();
        $this->palsukan([$this->unggahan()]);

        app(InstagramSync::class)->jalankan();

        $kutipan = InstagramPost::first()->caption_excerpt;

        $this->assertSame('Selamat datang di Bandara APT Pranoto', $kutipan);
        $this->assertStringNotContainsString('#', (string) $kutipan);
    }
}

<?php

namespace Tests\Feature\News;

use App\Models\News;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Gambar sampul berita.
 *
 * Yang dijaga di sini bukan "unggahannya berfungsi", melainkan empat sifat
 * yang menentukan apakah berita lama tetap utuh setelah panel v2 dipakai:
 *
 *  1. Sampul unggahan tersimpan sebagai LINTASAN pada cakram v2, dan berkasnya
 *     benar-benar ada. Kalau kolomnya terisi sementara berkasnya tidak, berita
 *     terbit tanpa gambar dan tidak ada yang tahu sampai pengunjung membukanya.
 *  2. Mengganti sampul membuang berkas lama — tetapi HANYA berkas milik cakram
 *     ini. Sebagian berita masih menunjuk URL penuh di server portal v1;
 *     menghapusnya bukan kewenangan modul ini, dan lintasannya pun berada di
 *     mesin lain.
 *  3. Menyimpan berita v1 tanpa mengganti sampul tidak menyentuh gambarnya
 *     sama sekali. Ini jalur yang paling sering ditempuh petugas saat sekadar
 *     memperbaiki salah ketik pada berita lama.
 *  4. Status `draft` yang dikirim panel benar-benar dihormati. Sebelum ini
 *     `store` memaksa setiap berita terbit, sehingga draft mustahil dibuat —
 *     dan tulisan setengah jadi langsung terbaca pengunjung.
 */
class NewsCoverTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->createNewsSchema();
        Storage::fake('public');
        $this->prefix = '/api/'.config('api.version');
    }

    /** Bentuk `news` seperti di `db_apt`: kolom v1 ditambah kolom v2. */
    private function createNewsSchema(): void
    {
        Schema::dropIfExists('news');

        Schema::create('news', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->string('slug')->unique();
            $table->string('category')->default('Berita');
            $table->text('content');
            $table->text('excerpt')->nullable();
            $table->string('author')->default('Humas Bandara');
            $table->unsignedInteger('views_count')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->string('status', 20)->default('published');
            $table->timestamp('published_at')->nullable();
            $table->string('image', 500)->nullable();
            $table->boolean('is_published')->default(true);
            $table->boolean('is_headline')->default(false);
            $table->timestamps();
        });
    }

    /** Petugas panel beserta tokennya. */
    private function admin(): string
    {
        $user = \App\Models\User::create([
            'name' => 'Petugas Humas',
            'email' => 'humas@contoh.id',
            'password' => bcrypt('rahasia123'),
        ]);

        $user->forceFill(['is_admin' => true, 'is_accepted' => true])->save();

        return $user->createToken('admin-panel', ['admin-panel'])->plainTextToken;
    }

    private function beritaBaku(array $ganti = []): array
    {
        return array_merge([
            'title' => 'Terminal Menambah Ruang Tunggu',
            'category' => 'Fasilitas',
            'excerpt' => 'Kapasitas ruang tunggu bertambah menjelang musim liburan.',
            'content' => '<p>Paragraf pertama.</p>',
            'author' => 'Humas UPBU APT Pranoto',
        ], $ganti);
    }

    /* ------------------------------------------------------------------ */

    public function test_sampul_unggahan_tersimpan_sebagai_lintasan_cakram_v2(): void
    {
        $token = $this->admin();

        $res = $this->withToken($token)->post($this->prefix.'/admin/news', $this->beritaBaku([
            'cover' => UploadedFile::fake()->image('kegiatan.jpg'),
            'is_featured' => '1',
        ]));

        $res->assertCreated();

        $berita = News::first();

        $this->assertStringStartsWith('news/covers/', $berita->thumbnail);
        Storage::disk('public')->assertExists($berita->thumbnail);
        $this->assertTrue($berita->is_featured);
        $this->assertSame('Humas UPBU APT Pranoto', $berita->author);
    }

    public function test_status_draft_dihormati_dan_tidak_tampil_di_daftar_publik(): void
    {
        $token = $this->admin();

        $this->withToken($token)
            ->post($this->prefix.'/admin/news', $this->beritaBaku(['status' => 'draft']))
            ->assertCreated();

        $this->assertSame('draft', News::first()->status);

        $this->getJson($this->prefix.'/news')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_mengganti_sampul_membuang_berkas_lama(): void
    {
        $token = $this->admin();

        $this->withToken($token)->post($this->prefix.'/admin/news', $this->beritaBaku([
            'cover' => UploadedFile::fake()->image('lama.jpg'),
        ]));

        $berita = News::first();
        $lama = $berita->thumbnail;

        $this->withToken($token)->post($this->prefix.'/admin/news/'.$berita->id, [
            'cover' => UploadedFile::fake()->image('baru.jpg'),
        ])->assertOk();

        $baru = $berita->fresh()->thumbnail;

        $this->assertNotSame($lama, $baru);
        Storage::disk('public')->assertMissing($lama);
        Storage::disk('public')->assertExists($baru);
    }

    public function test_berita_peninggalan_v1_tidak_kehilangan_gambarnya(): void
    {
        $token = $this->admin();

        $berita = News::create($this->beritaBaku([
            'slug' => 'berita-lama',
            'thumbnail' => 'https://aptpairport.id/uploads/berita/lama.jpg',
            'status' => 'published',
            'published_at' => now(),
        ]));

        $this->withToken($token)
            ->post($this->prefix.'/admin/news/'.$berita->id, ['title' => 'Judul Diperbaiki'])
            ->assertOk();

        $this->assertSame(
            'https://aptpairport.id/uploads/berita/lama.jpg',
            $berita->fresh()->thumbnail,
        );
    }

    public function test_menghapus_berita_membuang_sampul_v2_saja(): void
    {
        $token = $this->admin();

        $this->withToken($token)->post($this->prefix.'/admin/news', $this->beritaBaku([
            'cover' => UploadedFile::fake()->image('hapus.jpg'),
        ]));

        $berita = News::first();
        $lintasan = $berita->thumbnail;

        $this->withToken($token)
            ->deleteJson($this->prefix.'/admin/news/'.$berita->id)
            ->assertOk();

        Storage::disk('public')->assertMissing($lintasan);
        $this->assertNull(News::find($berita->id));
    }

    /**
     * Panel admin memuat form ubah dari respons ini. Kalau `thumbnail` tidak
     * ikut terkirim, form mengira beritanya belum bergambar dan menyimpan
     * kembali dalam keadaan kosong — sampulnya hilang tanpa ada yang menyentuh
     * medan gambarnya.
     */
    public function test_respons_memuat_lintasan_mentah_dan_url_siap_pakai(): void
    {
        $token = $this->admin();

        $this->withToken($token)->post($this->prefix.'/admin/news', $this->beritaBaku([
            'cover' => UploadedFile::fake()->image('sampul.jpg'),
        ]));

        $lintasan = News::first()->thumbnail;

        $this->withToken($token)
            ->getJson($this->prefix.'/admin/news')
            ->assertOk()
            ->assertJsonPath('data.0.thumbnail', $lintasan)
            ->assertJsonPath('data.0.thumbnail_url', Storage::disk('public')->url($lintasan));
    }

    public function test_isian_wajib_ditolak_dengan_pesan_bahasa_indonesia(): void
    {
        $token = $this->admin();

        $this->withToken($token)
            ->postJson($this->prefix.'/admin/news', ['category' => 'Fasilitas'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['title', 'excerpt', 'content']);
    }
}

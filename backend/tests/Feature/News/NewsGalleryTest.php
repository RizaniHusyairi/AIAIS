<?php

namespace Tests\Feature\News;

use App\Models\News;
use App\Models\NewsImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\Support\CreatesNewsSchema;
use Tests\TestCase;

/**
 * Galeri foto berita.
 *
 * Galeri dikirim bersama form berita sebagai satu susunan berurutan, jadi
 * yang dijaga di sini adalah bahwa susunan itu diterapkan apa adanya —
 * urutan, keterangan, foto yang dibuang — dan bahwa berkas di cakram selalu
 * mengikuti baris di basis data: tidak ada berkas yatim, tidak ada baris yang
 * menunjuk berkas yang sudah dibuang.
 */
class NewsGalleryTest extends TestCase
{
    use CreatesLegacyUserSchema, CreatesNewsSchema;

    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->createNewsSchema();
        Storage::fake('public');
        $this->prefix = '/api/'.config('api.version');
    }

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
            'title' => 'Simulasi Evakuasi Terminal',
            'category' => 'Kegiatan',
            'excerpt' => 'Ringkasan.',
            'content' => '<p>Isi.</p>',
        ], $ganti);
    }

    /** Buat berita bergaleri dua foto lewat panel; kembalikan beritanya. */
    private function beritaBergaleri(string $token): News
    {
        $this->withToken($token)->post($this->prefix.'/admin/news', $this->beritaBaku([
            'gallery' => json_encode([
                ['upload' => 0, 'caption' => 'Petugas memandu penumpang'],
                ['upload' => 1, 'caption' => 'Titik kumpul'],
            ]),
            'gallery_files' => [
                UploadedFile::fake()->image('a.jpg'),
                UploadedFile::fake()->image('b.png'),
            ],
        ]))->assertCreated();

        return News::first();
    }

    public function test_galeri_tersimpan_berurutan_bersama_beritanya(): void
    {
        $news = $this->beritaBergaleri($this->admin());

        $foto = $news->images;
        $this->assertCount(2, $foto);
        $this->assertSame(['Petugas memandu penumpang', 'Titik kumpul'], $foto->pluck('caption')->all());
        $this->assertSame([0, 1], $foto->pluck('sort_order')->all());

        foreach ($foto as $f) {
            $this->assertStringStartsWith('news/gallery/', $f->path);
            Storage::disk('public')->assertExists($f->path);
        }
    }

    public function test_foto_galeri_dikecilkan_sebelum_disimpan(): void
    {
        $this->withToken($this->admin())->post($this->prefix.'/admin/news', $this->beritaBaku([
            'gallery' => json_encode([['upload' => 0]]),
            'gallery_files' => [UploadedFile::fake()->image('kamera.jpg', 4000, 3000)],
        ]))->assertCreated();

        $foto = NewsImage::first();
        $ukuran = getimagesizefromstring(Storage::disk('public')->get($foto->path));

        $this->assertSame([1600, 1200], [$ukuran[0], $ukuran[1]]);
    }

    public function test_menyusun_ulang_membuang_dan_menambah_foto(): void
    {
        $token = $this->admin();
        $news = $this->beritaBergaleri($token);
        [$pertama, $kedua] = $news->images->all();

        $this->withToken($token)->post($this->prefix.'/admin/news/'.$news->id, [
            'gallery' => json_encode([
                ['upload' => 0, 'caption' => 'Foto baru di depan'],
                ['id' => $kedua->id, 'caption' => 'Titik kumpul utara'],
            ]),
            'gallery_files' => [UploadedFile::fake()->image('c.webp')],
        ])->assertOk()
            ->assertJsonPath('data.images.0.caption', 'Foto baru di depan')
            ->assertJsonPath('data.images.1.id', $kedua->id);

        $sisa = $news->fresh()->images;
        $this->assertCount(2, $sisa);
        $this->assertSame('Titik kumpul utara', $sisa[1]->caption);
        $this->assertSame(1, $sisa[1]->sort_order);

        // Foto yang tidak disebut ikut terbuang, baris maupun berkasnya.
        $this->assertNull(NewsImage::find($pertama->id));
        Storage::disk('public')->assertMissing($pertama->path);
        Storage::disk('public')->assertExists($kedua->path);
    }

    public function test_menyimpan_tanpa_susunan_galeri_tidak_menyentuhnya(): void
    {
        $token = $this->admin();
        $news = $this->beritaBergaleri($token);

        $this->withToken($token)
            ->post($this->prefix.'/admin/news/'.$news->id, ['title' => 'Judul Baru'])
            ->assertOk();

        $this->assertCount(2, $news->fresh()->images);
    }

    public function test_foto_milik_berita_lain_ditolak(): void
    {
        $token = $this->admin();
        $lain = $this->beritaBergaleri($token);
        $fotoLain = $lain->images->first();

        $this->withToken($token)->post($this->prefix.'/admin/news', $this->beritaBaku(['title' => 'Berita Kedua']))->assertCreated();
        $kedua = News::where('id', '!=', $lain->id)->first();

        $this->withToken($token)->postJson($this->prefix.'/admin/news/'.$kedua->id, [
            'gallery' => json_encode([['id' => $fotoLain->id]]),
        ])->assertStatus(422);

        $this->assertSame($lain->id, $fotoLain->fresh()->news_id);
        $this->assertCount(0, $kedua->fresh()->images);
    }

    public function test_galeri_dibatasi_dua_belas_foto(): void
    {
        $token = $this->admin();
        $susunan = array_map(fn ($i) => ['upload' => $i], range(0, 12));
        $berkas = array_map(fn ($i) => UploadedFile::fake()->image("f$i.jpg"), range(0, 12));

        $this->withToken($token)->post($this->prefix.'/admin/news', $this->beritaBaku([
            'gallery' => json_encode($susunan),
            'gallery_files' => $berkas,
        ]), ['Accept' => 'application/json'])->assertStatus(422);

        $this->assertSame(0, News::count());
        $this->assertSame([], Storage::disk('public')->allFiles('news/gallery'));
    }

    public function test_publik_menyaring_foto_yang_berkasnya_hilang_admin_tidak(): void
    {
        $token = $this->admin();
        $news = $this->beritaBergaleri($token);
        $hilang = $news->images->first();
        Storage::disk('public')->delete($hilang->path);

        $this->getJson($this->prefix.'/news/'.$news->slug)
            ->assertOk()
            ->assertJsonCount(1, 'data.images')
            ->assertJsonPath('data.images.0.caption', 'Titik kumpul');

        $this->withToken($token)->getJson($this->prefix.'/admin/news')
            ->assertOk()
            ->assertJsonCount(2, 'data.0.images')
            ->assertJsonPath('data.0.images.0.url', null);
    }

    public function test_menghapus_berita_membuang_berkas_galerinya(): void
    {
        $token = $this->admin();
        $news = $this->beritaBergaleri($token);
        $lintasan = $news->images->pluck('path')->all();

        $this->withToken($token)->deleteJson($this->prefix.'/admin/news/'.$news->id)->assertOk();

        $this->assertSame(0, NewsImage::count());
        foreach ($lintasan as $l) {
            Storage::disk('public')->assertMissing($l);
        }
    }
}

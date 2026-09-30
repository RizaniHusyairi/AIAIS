<?php

namespace Tests\Feature\News;

use App\Models\News;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * Penghitung pembaca berita.
 *
 * `views_count` menentukan blok "Terpopuler", jadi yang dijaga di sini adalah
 * bahwa angkanya mencerminkan orang, bukan permintaan: render server untuk
 * metadata, muat ulang halaman, dan perayap tidak boleh ikut terhitung.
 */
class NewsViewCountTest extends TestCase
{
    private string $prefix;

    private const PERAMBAN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0';

    protected function setUp(): void
    {
        parent::setUp();

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

        $this->prefix = '/api/'.config('api.version');
    }

    private function berita(): News
    {
        return News::create([
            'title' => 'Terminal Menambah Ruang Tunggu',
            'slug' => 'terminal-menambah-ruang-tunggu',
            'category' => 'Fasilitas',
            'excerpt' => 'Ringkasan.',
            'content' => '<p>Isi.</p>',
            'status' => 'published',
            'published_at' => now(),
        ]);
    }

    public function test_pengunjung_yang_sama_hanya_terhitung_sekali(): void
    {
        $berita = $this->berita();

        $this->withHeader('User-Agent', self::PERAMBAN);
        $this->getJson($this->prefix.'/news/'.$berita->slug)->assertOk();
        $this->getJson($this->prefix.'/news/'.$berita->slug)->assertOk();

        $this->assertSame(1, $berita->fresh()->views_count);
    }

    public function test_pengunjung_berbeda_terhitung_masing_masing(): void
    {
        $berita = $this->berita();

        $this->withHeader('User-Agent', self::PERAMBAN)
            ->getJson($this->prefix.'/news/'.$berita->slug)->assertOk();
        $this->withHeader('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604.1')
            ->getJson($this->prefix.'/news/'.$berita->slug)->assertOk();

        $this->assertSame(2, $berita->fresh()->views_count);
    }

    public function test_render_metadata_server_tidak_dihitung(): void
    {
        $berita = $this->berita();

        $this->withHeader('User-Agent', self::PERAMBAN)
            ->getJson($this->prefix.'/news/'.$berita->slug.'?track=0')
            ->assertOk()
            ->assertJsonPath('data.slug', $berita->slug);

        $this->assertSame(0, $berita->fresh()->views_count);
    }

    public function test_perayap_tidak_dihitung(): void
    {
        $berita = $this->berita();

        $this->withHeader('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
            ->getJson($this->prefix.'/news/'.$berita->slug)->assertOk();
        $this->withHeader('User-Agent', 'WhatsApp/2.23.20.0')
            ->getJson($this->prefix.'/news/'.$berita->slug)->assertOk();

        $this->assertSame(0, $berita->fresh()->views_count);
    }
}

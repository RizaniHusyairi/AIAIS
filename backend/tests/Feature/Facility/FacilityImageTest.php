<?php

namespace Tests\Feature\Facility;

use App\Models\Facility;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Foto fasilitas.
 *
 * Seluruh 28 fasilitas di produksi sudah punya foto warisan v1 sebelum panel
 * ini bisa mengunggah apa pun. Karena itu yang dijaga di sini bukan "unggahan
 * berfungsi", melainkan empat sifat yang menentukan apakah data lama selamat:
 *
 *  1. Sakelar status pada tabel admin — satu-satunya permintaan parsial yang
 *     tersisa — tidak boleh mengosongkan `image_path`. Ia mengirim PUT berisi
 *     `is_operational` saja, dan tanpa awalan `sometimes` pada setiap aturan
 *     validasi, kolom lain akan ikut tertimpa null.
 *  2. Mengganti foto membuang berkas lama, tetapi HANYA berkas milik cakram
 *     v2 (`facilities/`).
 *  3. Lintasan warisan (`fasilitas/…`) TIDAK pernah dihapus. Berkasnya tinggal
 *     di cakram `legacy`, milik portal v1, dan kemiripan namanya dengan
 *     direktori v2 itulah jebakan yang diuji di sini.
 *  4. `image_path` kosong berarti "hapus fotonya" — bukan tersimpan sebagai
 *     string kosong yang nanti dibaca sebagai lintasan tak berujung.
 */
class FacilityImageTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->createFacilitiesSchema();
        Storage::fake('public');
        $this->prefix = '/api/'.config('api.version');
    }

    /** Bentuk `facilities` seperti di `db_apt`: kolom v1 ditambah kolom v2. */
    private function createFacilitiesSchema(): void
    {
        Schema::dropIfExists('facilities');

        Schema::create('facilities', function (Blueprint $table) {
            $table->id();
            $table->string('name', 125);
            $table->string('category', 60);
            $table->string('location_description')->nullable();
            $table->string('icon')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_operational')->default(true);
            $table->longText('details');
            $table->string('image_path', 500)->nullable();
            $table->timestamps();
        });
    }

    /** Petugas panel beserta tokennya. */
    private function admin(): string
    {
        $user = \App\Models\User::create([
            'name' => 'Petugas Fasilitas',
            'email' => 'fasilitas@contoh.id',
            'password' => bcrypt('rahasia123'),
        ]);

        $user->forceFill(['is_admin' => true, 'is_accepted' => true])->save();

        return $user->createToken('admin-panel', ['admin-panel'])->plainTextToken;
    }

    private function fasilitasBaku(array $ganti = []): array
    {
        return array_merge([
            'name' => 'Mushola Lantai 2',
            'category' => 'Umum',
            'location_description' => 'Lantai 2, dekat ruang tunggu keberangkatan',
        ], $ganti);
    }

    /** Fasilitas warisan v1 — lintasannya tidak pernah melewati panel ini. */
    private function fasilitasWarisan(): Facility
    {
        return Facility::create($this->fasilitasBaku([
            'name' => 'Check-in Counter',
            'category' => 'Umum',
            'image_path' => 'fasilitas/1vqnSgDWAaul2e9ygX9CUAT3CdXQnGScKZeTRXgE.png',
            'details' => ['Tersedia: 16 Counter'],
        ]));
    }

    /* ------------------------------------------------------------------ */

    public function test_foto_unggahan_tersimpan_sebagai_lintasan_cakram_v2(): void
    {
        $token = $this->admin();

        $this->withToken($token)
            ->post($this->prefix.'/admin/facilities', $this->fasilitasBaku([
                'image' => UploadedFile::fake()->image('mushola.jpg'),
                'is_operational' => '1',
            ]))
            ->assertCreated();

        $fasilitas = Facility::first();

        $this->assertStringStartsWith('facilities/', $fasilitas->image_path);
        Storage::disk('public')->assertExists($fasilitas->image_path);
        $this->assertTrue($fasilitas->is_operational);
    }

    public function test_sakelar_status_tidak_mengosongkan_foto(): void
    {
        $token = $this->admin();
        $fasilitas = $this->fasilitasWarisan();

        // Persis yang dikirim tombol status di tabel admin: satu kolom saja.
        $this->withToken($token)
            ->putJson($this->prefix.'/admin/facilities/'.$fasilitas->id, ['is_operational' => false])
            ->assertOk();

        $fasilitas->refresh();

        $this->assertFalse($fasilitas->is_operational);
        $this->assertSame('fasilitas/1vqnSgDWAaul2e9ygX9CUAT3CdXQnGScKZeTRXgE.png', $fasilitas->image_path);
        $this->assertSame('Check-in Counter', $fasilitas->name);
        $this->assertSame(['Tersedia: 16 Counter'], $fasilitas->details);
    }

    public function test_mengganti_foto_membuang_berkas_lama_milik_cakram_v2(): void
    {
        $token = $this->admin();

        $this->withToken($token)->post($this->prefix.'/admin/facilities', $this->fasilitasBaku([
            'image' => UploadedFile::fake()->image('lama.jpg'),
        ]));

        $fasilitas = Facility::first();
        $lama = $fasilitas->image_path;

        $this->withToken($token)
            ->post($this->prefix.'/admin/facilities/'.$fasilitas->id, $this->fasilitasBaku([
                'image' => UploadedFile::fake()->image('baru.jpg'),
                'image_path' => $lama,
            ]))
            ->assertOk();

        $baru = $fasilitas->fresh()->image_path;

        $this->assertNotSame($lama, $baru);
        Storage::disk('public')->assertMissing($lama);
        Storage::disk('public')->assertExists($baru);
    }

    public function test_lintasan_warisan_tidak_ikut_dihapus_saat_diganti(): void
    {
        $token = $this->admin();
        $fasilitas = $this->fasilitasWarisan();

        // Berkas senama di cakram v2 sengaja disiapkan: kalau penjaga prefiks
        // longgar, inilah yang akan lenyap padahal aslinya milik portal v1.
        Storage::disk('public')->put($fasilitas->image_path, 'berkas-warisan');

        $this->withToken($token)
            ->post($this->prefix.'/admin/facilities/'.$fasilitas->id, $this->fasilitasBaku([
                'name' => 'Check-in Counter',
                'image' => UploadedFile::fake()->image('pengganti.jpg'),
                'image_path' => $fasilitas->image_path,
            ]))
            ->assertOk();

        $this->assertStringStartsWith('facilities/', $fasilitas->fresh()->image_path);
        Storage::disk('public')->assertExists('fasilitas/1vqnSgDWAaul2e9ygX9CUAT3CdXQnGScKZeTRXgE.png');
    }

    public function test_menyunting_tanpa_menyentuh_foto_mempertahankan_lintasan_warisan(): void
    {
        $token = $this->admin();
        $fasilitas = $this->fasilitasWarisan();

        // Jalur tersering: petugas hanya membetulkan keterangan, dan form
        // mengirim balik `image_path` yang tadi dibacanya.
        $this->withToken($token)
            ->post($this->prefix.'/admin/facilities/'.$fasilitas->id, $this->fasilitasBaku([
                'name' => 'Check-in Counter',
                'description' => 'Proses check-in yang cepat dan efisien.',
                'image_path' => $fasilitas->image_path,
            ]))
            ->assertOk();

        $this->assertSame(
            'fasilitas/1vqnSgDWAaul2e9ygX9CUAT3CdXQnGScKZeTRXgE.png',
            $fasilitas->fresh()->image_path,
        );
    }

    public function test_image_path_kosong_mengosongkan_kolom_dan_membuang_berkas(): void
    {
        $token = $this->admin();

        $this->withToken($token)->post($this->prefix.'/admin/facilities', $this->fasilitasBaku([
            'image' => UploadedFile::fake()->image('dihapus.jpg'),
        ]));

        $fasilitas = Facility::first();
        $lama = $fasilitas->image_path;

        $this->withToken($token)
            ->post($this->prefix.'/admin/facilities/'.$fasilitas->id, $this->fasilitasBaku(['image_path' => '']))
            ->assertOk();

        $this->assertNull($fasilitas->fresh()->image_path);
        Storage::disk('public')->assertMissing($lama);
    }

    public function test_berkas_bukan_gambar_ditolak_dengan_pesan_indonesia(): void
    {
        $token = $this->admin();

        $this->withToken($token)
            ->postJson($this->prefix.'/admin/facilities', $this->fasilitasBaku([
                'image' => UploadedFile::fake()->create('dokumen.pdf', 40, 'application/pdf'),
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('image');

        $this->assertSame(0, Facility::count());
    }

    public function test_daftar_publik_menyertakan_url_foto_dan_menyaring_yang_tidak_beroperasi(): void
    {
        $fasilitas = $this->fasilitasWarisan();
        Storage::disk('public')->put($fasilitas->image_path, 'berkas');

        Facility::create($this->fasilitasBaku([
            'name' => 'Ruang Merokok',
            'is_operational' => false,
            'details' => [],
        ]));

        $res = $this->getJson($this->prefix.'/facilities')->assertOk();

        $res->assertJsonCount(1, 'data');
        $this->assertNotNull($res->json('data.0.image_url'));
    }
}

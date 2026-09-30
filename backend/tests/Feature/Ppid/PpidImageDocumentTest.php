<?php

namespace Tests\Feature\Ppid;

use App\Models\PpidImageDocument;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Dokumen bergambar Profil PPID dan sampul video profil PPID.
 *
 * Yang dijaga:
 *  1. Aset statis frontend hasil seeder ("/ppid/...") tetap tayang — tanpa
 *     itu, memindahkan konstanta ke basis data menghilangkan tiga gambar.
 *  2. Daftar publik menyaring gambar yang hilang; daftar admin tidak.
 *  3. Mengganti gambar membuang berkas lama milik disk, tetapi tidak pernah
 *     menyentuh aset statis frontend.
 *  4. Tautan berbagi Google Drive ditolak — ia halaman, bukan gambar.
 *  5. Sampul video dapat diunggah, dan unggahan lama dibuang saat diganti.
 */
class PpidImageDocumentTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();

        Schema::dropIfExists('ppid_image_documents');
        Schema::create('ppid_image_documents', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->string('description', 1000)->nullable();
            $table->string('image_path', 500)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::dropIfExists('settings');
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Storage::fake('public');
        $this->prefix = '/api/'.config('api.version');
    }

    private function admin(): string
    {
        $user = User::create([
            'name' => 'Petugas PPID',
            'email' => 'ppid@contoh.id',
            'password' => bcrypt('rahasia123'),
        ]);
        $user->forceFill(['is_admin' => true, 'is_accepted' => true])->save();

        return $user->createToken('admin-panel', ['admin-panel'])->plainTextToken;
    }

    /* ------------------------------------------------------------------ */

    public function test_aset_statis_frontend_tetap_tayang(): void
    {
        PpidImageDocument::create(['title' => 'Struktur Organisasi PPID', 'image_path' => '/ppid/struktur-ppid.jpg']);

        $this->getJson($this->prefix.'/ppid-image-documents')
            ->assertOk()
            ->assertJsonPath('data.0.image_url', '/ppid/struktur-ppid.jpg')
            ->assertJsonPath('data.0.has_image', true);
    }

    public function test_publik_menyaring_gambar_hilang_admin_tidak(): void
    {
        PpidImageDocument::create(['title' => 'Ada', 'image_path' => '/ppid/maklumat-pelayanan.png']);
        PpidImageDocument::create(['title' => 'Hilang', 'image_path' => 'ppid-gambar/tidak-ada.png']);
        PpidImageDocument::create(['title' => 'Nonaktif', 'image_path' => '/ppid/x.png', 'is_active' => false]);

        $this->getJson($this->prefix.'/ppid-image-documents')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Ada');

        $this->withToken($this->admin())
            ->getJson($this->prefix.'/admin/ppid-image-documents')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_mengganti_gambar_membuang_unggahan_lama_tapi_bukan_aset_statis(): void
    {
        $token = $this->admin();

        $statis = PpidImageDocument::create(['title' => 'Maklumat', 'image_path' => '/ppid/maklumat-pelayanan.png']);

        $this->withToken($token)->post($this->prefix."/admin/ppid-image-documents/{$statis->id}", [
            'file' => UploadedFile::fake()->image('maklumat baru.png'),
        ])->assertOk();

        $pertama = $statis->fresh()->image_path;
        $this->assertStringStartsWith('ppid-gambar/', $pertama);
        Storage::disk('public')->assertExists($pertama);

        $this->withToken($token)->post($this->prefix."/admin/ppid-image-documents/{$statis->id}", [
            'file' => UploadedFile::fake()->image('maklumat-2.jpg'),
        ])->assertOk();

        Storage::disk('public')->assertMissing($pertama);
        Storage::disk('public')->assertExists($statis->fresh()->image_path);
    }

    public function test_tambah_tanpa_gambar_dan_tautan_drive_ditolak(): void
    {
        $token = $this->admin();

        $this->withToken($token)->postJson($this->prefix.'/admin/ppid-image-documents', [
            'title' => 'Bagan',
        ])->assertStatus(422);

        $this->withToken($token)->postJson($this->prefix.'/admin/ppid-image-documents', [
            'title' => 'Bagan',
            'image_link' => 'https://drive.google.com/file/d/abc/view?usp=drive_link',
        ])->assertStatus(422);

        $this->assertSame(0, PpidImageDocument::count());
    }

    public function test_dokumen_baru_diletakkan_paling_belakang(): void
    {
        PpidImageDocument::create(['title' => 'Lama', 'image_path' => '/ppid/a.png', 'sort_order' => 5]);

        $this->withToken($this->admin())->post($this->prefix.'/admin/ppid-image-documents', [
            'title' => 'Baru',
            'file' => UploadedFile::fake()->image('baru.jpg'),
        ])->assertCreated();

        $this->assertSame(6, PpidImageDocument::where('title', 'Baru')->value('sort_order'));
    }

    public function test_sampul_video_dapat_diunggah_dan_yang_lama_dibuang(): void
    {
        $token = $this->admin();

        $this->withToken($token)->post($this->prefix.'/admin/settings', [
            'ppid_video_gambar' => UploadedFile::fake()->image('sampul.jpg'),
        ])->assertOk();

        $pertama = Setting::where('key', 'ppid_video_gambar')->value('value');
        $this->assertStringContainsString('/pengaturan/', $pertama);
        $this->assertCount(1, Storage::disk('public')->files('pengaturan'));

        $this->withToken($token)->post($this->prefix.'/admin/settings', [
            'ppid_video_gambar' => UploadedFile::fake()->image('sampul-2.png'),
        ])->assertOk();

        $this->assertNotSame($pertama, Setting::where('key', 'ppid_video_gambar')->value('value'));
        $this->assertCount(1, Storage::disk('public')->files('pengaturan'));
    }

    public function test_sampul_video_selain_gambar_ditolak(): void
    {
        $this->withToken($this->admin())->post($this->prefix.'/admin/settings', [
            'ppid_video_gambar' => UploadedFile::fake()->create('sampul.pdf', 10, 'application/pdf'),
        ])->assertStatus(422);

        $this->assertNull(Setting::where('key', 'ppid_video_gambar')->value('value'));
    }
}

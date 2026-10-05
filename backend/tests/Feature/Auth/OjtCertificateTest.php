<?php

namespace Tests\Feature\Auth;

use App\Models\OjtStudent;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Sertifikat OJT dan penguncian nilai.
 *
 * Sifat yang dijaga di sini: **angka pada sertifikat yang sudah terbit tidak
 * boleh berubah.** Sertifikatnya sudah beredar di tangan peserta, dan nilai
 * yang bergeser sesudahnya membuat sertifikat itu berbohong tanpa ada yang
 * tahu mana yang benar.
 *
 * Membatalkan finalisasi tetap mungkin — kekeliruan nilai memang bisa baru
 * ketahuan belakangan — tetapi sertifikat lamanya ikut dihapus, supaya tidak
 * ada dua sertifikat dengan nilai berbeda.
 */
class OjtCertificateTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->createOjtSchema();
        Storage::fake('local');
        $this->prefix = '/api/'.config('api.version');
    }

    private function createOjtSchema(): void
    {
        Schema::dropIfExists('ojt_students');

        Schema::create('ojt_students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable();
            $table->string('name', 125);
            $table->string('id_number', 125);
            $table->string('birth_place', 125);
            $table->date('birth_date');
            $table->text('address');
            $table->string('institution', 125);
            $table->string('major', 125);
            $table->string('duration', 125);
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 125)->default('Mendaftar');
            $table->json('supervisors');
            $table->json('work_units');
            $table->string('phone_number', 125);
            $table->string('identity_card_path', 125)->nullable();
            $table->string('photo_path', 125)->nullable();
            $table->string('final_certificate_path', 125)->nullable();
            $table->json('grades')->nullable();
            $table->decimal('average_score', 5, 2)->nullable();
            $table->string('predicate', 125)->nullable();
            $table->string('letter_grade', 125)->nullable();
            $table->text('staff_notes')->nullable();
            $table->timestamps();
        });
    }

    private function buatPeserta(): OjtStudent
    {
        $peserta = new OjtStudent([
            'name' => 'Siti Rahma',
            'id_number' => '2021001',
            'birth_place' => 'Samarinda',
            'birth_date' => '2003-04-11',
            'address' => 'Jl. Contoh',
            'institution' => 'Politeknik Negeri Samarinda',
            'major' => 'Teknik Informatika',
            'duration' => '3 bulan',
            'start_date' => '2026-09-01',
            'end_date' => '2026-11-30',
            'phone_number' => '081200000078',
            'supervisors' => [],
            'work_units' => ['Operasi'],
        ]);
        $peserta->status = 'Berjalan';
        $peserta->save();

        return $peserta;
    }

    private function tokenAdmin(): string
    {
        return $this->buatPengguna('admin')->createToken('uji', ['admin-panel'])->plainTextToken;
    }

    /** @return array<int, array{component: string, score: int}> */
    private function nilai(int $skor = 90): array
    {
        return [
            ['component' => 'Kedisiplinan', 'score' => $skor],
            ['component' => 'Hasil Kerja', 'score' => $skor],
        ];
    }

    public function test_sertifikat_tidak_dapat_dicetak_sebelum_nilai_diisi(): void
    {
        $peserta = $this->buatPeserta();

        $this->withToken($this->tokenAdmin())
            ->getJson($this->prefix.'/admin/ojt/'.$peserta->id.'/certificate')
            ->assertStatus(422);
    }

    public function test_finalisasi_mengunci_nilai(): void
    {
        $peserta = $this->buatPeserta();
        $token = $this->tokenAdmin();

        $this->withToken($token)
            ->putJson($this->prefix.'/admin/ojt/'.$peserta->id.'/grades', ['grades' => $this->nilai(90)])
            ->assertOk()
            ->assertJsonPath('data.average_score', 90);

        $this->withToken($token)
            ->postJson($this->prefix.'/admin/ojt/'.$peserta->id.'/finalize', [
                'signed_certificate' => UploadedFile::fake()->create('sertifikat.pdf', 100, 'application/pdf'),
            ])
            ->assertOk()
            ->assertJsonPath('data.is_finalized', true)
            ->assertJsonPath('data.status', 'Selesai');

        // Inilah sifat yang dijaga: nilai tidak boleh berubah lagi.
        $this->withToken($token)
            ->putJson($this->prefix.'/admin/ojt/'.$peserta->id.'/grades', ['grades' => $this->nilai(100)])
            ->assertStatus(422);

        // Dibandingkan sebagai angka, bukan teks: SQLite yang dipakai tes
        // menyimpan decimal(5,2) sebagai '90', sedangkan MySQL '90.00'.
        $this->assertSame(90.0, (float) $peserta->fresh()->average_score);
    }

    public function test_finalisasi_ditolak_bila_nilai_belum_ada(): void
    {
        $peserta = $this->buatPeserta();

        $this->withToken($this->tokenAdmin())
            ->postJson($this->prefix.'/admin/ojt/'.$peserta->id.'/finalize', [
                'signed_certificate' => UploadedFile::fake()->create('sertifikat.pdf', 100, 'application/pdf'),
            ])
            ->assertStatus(422);
    }

    /** Sertifikat harus PDF — berkas lain ditolak. */
    public function test_sertifikat_selain_pdf_ditolak(): void
    {
        $peserta = $this->buatPeserta();
        $token = $this->tokenAdmin();

        $this->withToken($token)
            ->putJson($this->prefix.'/admin/ojt/'.$peserta->id.'/grades', ['grades' => $this->nilai()]);

        $this->withToken($token)
            ->postJson($this->prefix.'/admin/ojt/'.$peserta->id.'/finalize', [
                'signed_certificate' => UploadedFile::fake()->image('bukan-sertifikat.jpg'),
            ])
            ->assertStatus(422);
    }

    /** Membatalkan finalisasi menghapus sertifikat lamanya. */
    public function test_membatalkan_finalisasi_menghapus_sertifikat_lama(): void
    {
        $peserta = $this->buatPeserta();
        $token = $this->tokenAdmin();

        $this->withToken($token)
            ->putJson($this->prefix.'/admin/ojt/'.$peserta->id.'/grades', ['grades' => $this->nilai()]);

        $this->withToken($token)
            ->postJson($this->prefix.'/admin/ojt/'.$peserta->id.'/finalize', [
                'signed_certificate' => UploadedFile::fake()->create('sertifikat.pdf', 100, 'application/pdf'),
            ])->assertOk();

        $lintasan = $peserta->fresh()->getAttributes()['final_certificate_path'];
        Storage::disk('local')->assertExists($lintasan);

        $this->withToken($token)
            ->deleteJson($this->prefix.'/admin/ojt/'.$peserta->id.'/finalize')
            ->assertOk()
            ->assertJsonPath('data.is_finalized', false);

        Storage::disk('local')->assertMissing($lintasan);

        // Nilai dapat disunting kembali sesudah finalisasinya dibatalkan.
        $this->withToken($token)
            ->putJson($this->prefix.'/admin/ojt/'.$peserta->id.'/grades', ['grades' => $this->nilai(70)])
            ->assertOk()
            ->assertJsonPath('data.average_score', 70);
    }

    /**
     * Sertifikat benar-benar terbit sebagai PDF, termasuk pas foto peserta
     * v1 yang tersimpan di direktori unggahan v1 (disk `legacy`).
     */
    public function test_sertifikat_tercetak_dengan_foto_peserta_v1(): void
    {
        Storage::fake('legacy');
        Storage::disk('legacy')->put(
            'ojt_docs/photos/lama.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
        );

        $peserta = $this->buatPeserta();
        $peserta->photo_path = 'ojt_docs/photos/lama.png';
        $peserta->save();
        $token = $this->tokenAdmin();

        $this->withToken($token)
            ->putJson($this->prefix.'/admin/ojt/'.$peserta->id.'/grades', ['grades' => $this->nilai()]);

        $res = $this->withToken($token)
            ->get($this->prefix.'/admin/ojt/'.$peserta->id.'/certificate')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');

        $this->assertStringStartsWith('%PDF', $res->getContent());
    }

    /** KTP dan foto peserta v1 terbaca dari disk `legacy`, bukan "tidak ditemukan". */
    public function test_berkas_peserta_v1_dapat_dibuka(): void
    {
        Storage::fake('legacy');
        Storage::disk('legacy')->put('ojt_docs/identity/ktp.jpg', 'isi-ktp');

        $peserta = $this->buatPeserta();
        $peserta->identity_card_path = 'ojt_docs/identity/ktp.jpg';
        $peserta->save();

        $res = $this->withToken($this->tokenAdmin())
            ->get($this->prefix.'/admin/ojt/'.$peserta->id.'/files/identity_card')
            ->assertOk();

        $this->assertSame('isi-ktp', $res->streamedContent());
    }

    /** Kategori nilai v1 (Hard/Soft Skill) tidak hilang saat disimpan ulang. */
    public function test_kategori_nilai_ikut_tersimpan(): void
    {
        $peserta = $this->buatPeserta();

        $this->withToken($this->tokenAdmin())
            ->putJson($this->prefix.'/admin/ojt/'.$peserta->id.'/grades', ['grades' => [
                ['type' => 'Soft Skill', 'component' => 'Integritas', 'score' => 95],
            ]])
            ->assertOk()
            ->assertJsonPath('data.grades.0.type', 'Soft Skill');
    }

    /** Skala predikat sama dengan v1: empat jenjang, di bawah 70 "Kurang"/D. */
    public function test_skala_predikat_mengikuti_v1(): void
    {
        $this->assertSame('Sangat Memuaskan', OjtStudent::hitungNilai([['score' => 90]])['predicate']);
        $this->assertSame('D', OjtStudent::hitungNilai([['score' => 40]])['letter_grade']);
        $this->assertSame('Kurang', OjtStudent::hitungNilai([['score' => 40]])['predicate']);
    }

    /** Lintasan berkas sertifikat tidak pernah ikut respons. */
    public function test_lintasan_sertifikat_tidak_bocor(): void
    {
        $peserta = $this->buatPeserta();
        $token = $this->tokenAdmin();

        $this->withToken($token)
            ->putJson($this->prefix.'/admin/ojt/'.$peserta->id.'/grades', ['grades' => $this->nilai()]);

        $res = $this->withToken($token)
            ->postJson($this->prefix.'/admin/ojt/'.$peserta->id.'/finalize', [
                'signed_certificate' => UploadedFile::fake()->create('sertifikat.pdf', 100, 'application/pdf'),
            ]);

        $res->assertOk()->assertJsonMissingPath('data.final_certificate_path');
        $this->assertStringNotContainsString('ojt/certificates', $res->getContent());
    }
}

<?php

namespace Tests\Feature\Auth;

use App\Models\FieldTrip;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Area akun warga — pemisahan bidang dan pemisahan antarpemohon.
 *
 * Dua sifat yang dijaga di sini, dan keduanya baru ada sejak modul pengajuan:
 *
 *  1. **Bidangnya terpisah dua arah.** Token panel tidak boleh mengaku sebagai
 *     pemohon, dan token pemohon tidak boleh memukul panel. Arah kedua sudah
 *     dijaga `AdminAccessTest`; arah pertama diuji di sini. Tanpa itu, seorang
 *     petugas dapat membuat pengajuan atas nama dirinya lalu menyetujuinya
 *     sendiri lewat panel.
 *
 *  2. **Satu pemohon tidak dapat menyentuh pengajuan pemohon lain.** Inilah
 *     yang menjaga surat pengantar berkop instansi — lengkap dengan nama dan
 *     tanda tangan pejabat — tetap tertutup. Jawabannya 404, bukan 403,
 *     supaya nomor yang ditebak tidak membocorkan bahwa pengajuannya ada.
 */
class CitizenAreaTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $prefix;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->createFieldtripSchema();
        $this->prefix = '/api/'.config('api.version');
    }

    /** Bentuk kolomnya mengikuti `fieldtrips` warisan v1. */
    private function createFieldtripSchema(): void
    {
        Schema::dropIfExists('fieldtrips');

        Schema::create('fieldtrips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable();
            $table->string('fieldtrip_name', 125);
            $table->text('description');
            $table->string('fieldtrip_type', 125);
            $table->json('documents');
            $table->string('submission_status')->default('Diajukan');
            $table->text('staff_notes')->nullable();
            $table->string('reply_document_path', 500)->nullable();
            $table->timestamps();
        });
    }

    private function pengajuanMilik(User $user): FieldTrip
    {
        return FieldTrip::create([
            'user_id' => $user->id,
            'fieldtrip_name' => 'Kunjungan SMA 1',
            'description' => 'Pengenalan operasional bandara.',
            'fieldtrip_type' => 'Sekolah',
            'documents' => ['fieldtrips/contoh.pdf'],
        ]);
    }

    private function tokenWarga(User $user): string
    {
        return $user->createToken('akun-warga', ['citizen'])->plainTextToken;
    }

    public function test_pendaftaran_menghasilkan_akun_warga_yang_langsung_aktif(): void
    {
        $res = $this->postJson($this->prefix.'/auth/register', [
            'name' => 'Warga Uji',
            'email' => 'warga.uji@contoh.id',
            'phone' => '081234567890',
            'address' => 'Samarinda',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
        ]);

        $res->assertCreated()->assertJsonPath('data.user.role', 'user');

        $user = User::where('email', 'warga.uji@contoh.id')->first();
        $this->assertTrue((bool) $user->is_accepted, 'Akun warga harus langsung aktif.');
        $this->assertSame(['citizen'], $user->tokens()->first()->abilities);
    }

    /**
     * Pendaftar tidak dapat menaikkan perannya sendiri.
     *
     * `is_admin` dan kawan-kawannya bukan disaring, melainkan memang tidak ada
     * di `$fillable` — jadi kolom itu tak punya jalan masuk sama sekali.
     */
    public function test_pendaftar_tidak_dapat_mengangkat_dirinya_jadi_admin(): void
    {
        $this->postJson($this->prefix.'/auth/register', [
            'name' => 'Penyusup',
            'email' => 'penyusup@contoh.id',
            'phone' => '081234567891',
            'address' => 'Samarinda',
            'password' => 'rahasia123',
            'password_confirmation' => 'rahasia123',
            'is_admin' => true,
            'is_staff' => 1,
            'role' => 'admin',
        ])->assertCreated()->assertJsonPath('data.user.role', 'user');

        $this->assertSame('user', User::where('email', 'penyusup@contoh.id')->first()->role);
    }

    public function test_token_panel_tidak_dapat_masuk_area_warga(): void
    {
        $admin = $this->buatPengguna('admin');
        $token = $admin->createToken('admin-panel', ['admin-panel'])->plainTextToken;

        $this->withToken($token)
            ->getJson($this->prefix.'/akun/fieldtrips')
            ->assertForbidden();
    }

    public function test_pemohon_hanya_melihat_pengajuannya_sendiri(): void
    {
        $a = $this->buatPengguna('user');
        $b = $this->buatPengguna('user');

        $this->pengajuanMilik($a);
        $this->pengajuanMilik($b);

        $res = $this->withToken($this->tokenWarga($a))
            ->getJson($this->prefix.'/akun/fieldtrips');

        $res->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($a->id, $res->json('data.0.user_id'));
    }

    public function test_pengajuan_milik_orang_lain_dijawab_404_bukan_403(): void
    {
        $a = $this->buatPengguna('user');
        $b = $this->buatPengguna('user');
        $punyaB = $this->pengajuanMilik($b);

        $this->withToken($this->tokenWarga($a))
            ->getJson($this->prefix.'/akun/fieldtrips/'.$punyaB->id)
            ->assertNotFound();
    }

    /** Berkas syarat pemohon lain tidak boleh terunduh. */
    public function test_berkas_pemohon_lain_tidak_dapat_diunduh(): void
    {
        $a = $this->buatPengguna('user');
        $b = $this->buatPengguna('user');
        $punyaB = $this->pengajuanMilik($b);

        $this->withToken($this->tokenWarga($a))
            ->getJson($this->prefix.'/akun/fieldtrips/'.$punyaB->id.'/documents/0')
            ->assertNotFound();
    }

    /** Lintasan berkas tidak pernah ikut respons — hanya jumlahnya. */
    public function test_lintasan_berkas_tidak_bocor_ke_respons(): void
    {
        $a = $this->buatPengguna('user');
        $punya = $this->pengajuanMilik($a);

        $res = $this->withToken($this->tokenWarga($a))
            ->getJson($this->prefix.'/akun/fieldtrips/'.$punya->id);

        // Menegaskan KETIADAAN lintasannya, bukan sekadar keberadaan
        // jumlahnya — versi pertama uji ini hanya memeriksa `document_count`
        // dan lulus meski seluruh larik lintasan masih ikut terkirim.
        $res->assertOk()
            ->assertJsonPath('data.document_count', 1)
            ->assertJsonMissingPath('data.documents');

        $this->assertStringNotContainsString('fieldtrips/contoh.pdf', $res->getContent());
    }

    /** Petugas pun tidak menerima lintasan berkasnya, cuma jumlahnya. */
    public function test_lintasan_berkas_juga_tidak_bocor_ke_petugas(): void
    {
        $a = $this->buatPengguna('user');
        $admin = $this->buatPengguna('admin');
        $punya = $this->pengajuanMilik($a);

        $res = $this->withToken($admin->createToken('admin-panel', ['admin-panel'])->plainTextToken)
            ->getJson($this->prefix.'/admin/fieldtrips/'.$punya->id);

        $res->assertOk()->assertJsonMissingPath('data.documents');
        $this->assertStringNotContainsString('fieldtrips/contoh.pdf', $res->getContent());
    }
}

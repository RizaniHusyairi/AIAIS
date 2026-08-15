<?php

namespace Tests\Feature\Auth;

use App\Models\Meeting;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Absensi rapat — endpoint tulis publik.
 *
 * Yang dijaga di sini bukan "formulirnya berfungsi", melainkan empat sifat
 * yang membuat daftar hadirnya masih berarti sebagai bukti kehadiran:
 *
 *  1. Tautannya tidak dapat ditebak, dan token karangan dijawab 404.
 *  2. Absensi yang sudah ditutup menolak tanda tangan baru — daftar yang masih
 *     bisa bertambah berjam-jam sesudah rapat bubar tidak membuktikan apa pun.
 *  3. Isi tanda tangan diperiksa benar-benar PNG. Data URI datang dari
 *     peramban mana pun tanpa autentikasi.
 *  4. Token maupun lintasan berkas tanda tangan tidak pernah ikut respons.
 */
class MeetingAttendanceTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $prefix;

    /** PNG 1x1 yang sah, dipakai sebagai tanda tangan uji. */
    private const PNG_SAH = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489'
        .'0000000d4944415478da63f8ffff3f0005fe02fea735c0000000000049454e44ae426082';

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();
        $this->createMeetingSchema();
        Storage::fake('local');
        $this->prefix = '/api/'.config('api.version');
    }

    private function createMeetingSchema(): void
    {
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('meetings');

        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->string('title', 125);
            $table->string('slug', 125);
            $table->string('public_token', 64)->nullable()->unique();
            $table->date('date');
            $table->time('start_time');
            $table->string('location', 125);
            $table->string('organizer', 125);
            $table->string('organizer_nip', 125)->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('user_id');
            $table->timestamps();
        });

        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id');
            $table->string('name', 125);
            $table->string('department', 125);
            $table->string('phone', 125)->nullable();
            $table->text('signature')->nullable();
            $table->timestamps();
        });
    }

    private function buatRapat(bool $aktif = true): Meeting
    {
        $rapat = new Meeting([
            'title' => 'Rapat Uji',
            'slug' => 'rapat-uji',
            'date' => '2026-08-20',
            'start_time' => '09:00',
            'location' => 'Ruang Rapat',
            'organizer' => 'Kepala Bandara',
            'user_id' => $this->buatPengguna('admin')->id,
        ]);
        $rapat->public_token = Meeting::tokenBaru();
        $rapat->is_active = $aktif;
        $rapat->save();

        return $rapat;
    }

    private function tandaTangan(): string
    {
        return 'data:image/png;base64,'.base64_encode(hex2bin(self::PNG_SAH));
    }

    /** @return array<string, string> */
    private function isian(): array
    {
        return [
            'name' => 'Siti Aminah',
            'department' => 'Unit Operasi',
            'signature' => $this->tandaTangan(),
        ];
    }

    public function test_token_karangan_dijawab_404(): void
    {
        $this->getJson($this->prefix.'/absensi/tokenkarangan')->assertNotFound();

        $this->postJson($this->prefix.'/absensi/tokenkarangan', $this->isian())
            ->assertNotFound();
    }

    public function test_peserta_dapat_menandatangani_daftar_hadir(): void
    {
        $rapat = $this->buatRapat();

        $this->postJson($this->prefix.'/absensi/'.$rapat->public_token, $this->isian())
            ->assertCreated()
            ->assertJsonPath('data.name', 'Siti Aminah');

        $this->assertSame(1, $rapat->attendances()->count());
    }

    /** Absensi yang ditutup tidak boleh bertambah. */
    public function test_absensi_yang_ditutup_menolak_tanda_tangan(): void
    {
        $rapat = $this->buatRapat(aktif: false);

        $this->postJson($this->prefix.'/absensi/'.$rapat->public_token, $this->isian())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Absensi rapat ini sudah ditutup.');

        $this->assertSame(0, $rapat->attendances()->count());
    }

    /**
     * Data URI yang mengaku PNG tetapi isinya bukan gambar harus ditolak.
     *
     * Tanpa pemeriksaan ini, endpoint publik tanpa autentikasi menerima berkas
     * apa pun yang diberi awalan `data:image/png;base64,`.
     */
    public function test_tanda_tangan_yang_bukan_png_ditolak(): void
    {
        $rapat = $this->buatRapat();

        foreach ([
            'data:image/png;base64,'.base64_encode('halo dunia'),
            'data:image/jpeg;base64,'.base64_encode(hex2bin(self::PNG_SAH)),
            'bukan-data-uri-sama-sekali',
        ] as $palsu) {
            $this->postJson($this->prefix.'/absensi/'.$rapat->public_token, [
                ...$this->isian(),
                'signature' => $palsu,
            ])->assertStatus(422);
        }

        $this->assertSame(0, $rapat->attendances()->count());
    }

    public function test_tanda_tangan_wajib_diisi(): void
    {
        $rapat = $this->buatRapat();

        $this->postJson($this->prefix.'/absensi/'.$rapat->public_token, [
            'name' => 'Tanpa Tanda Tangan',
            'department' => 'Unit X',
        ])->assertStatus(422);
    }

    /** Token tidak boleh ikut respons publik maupun daftar admin. */
    public function test_token_tidak_pernah_ikut_respons(): void
    {
        $rapat = $this->buatRapat();

        $publik = $this->getJson($this->prefix.'/absensi/'.$rapat->public_token);
        $publik->assertOk();
        $this->assertStringNotContainsString($rapat->public_token, $publik->getContent());

        $admin = $this->withToken($this->buatPengguna('admin')->createToken('uji', ['admin-panel'])->plainTextToken)
            ->getJson($this->prefix.'/admin/meetings');

        $admin->assertOk();
        $this->assertStringNotContainsString($rapat->public_token, $admin->getContent());
    }

    /** Lintasan berkas tanda tangan tidak boleh bocor ke petugas. */
    public function test_lintasan_tanda_tangan_tidak_bocor(): void
    {
        $rapat = $this->buatRapat();
        $this->postJson($this->prefix.'/absensi/'.$rapat->public_token, $this->isian())->assertCreated();

        $res = $this->withToken($this->buatPengguna('admin')->createToken('uji', ['admin-panel'])->plainTextToken)
            ->getJson($this->prefix.'/admin/meetings/'.$rapat->id);

        $res->assertOk()
            ->assertJsonPath('data.attendances.0.has_signature', true)
            ->assertJsonMissingPath('data.attendances.0.signature');

        $this->assertStringNotContainsString('meetings/signatures', $res->getContent());
    }

    /** Memutar token mematikan tautan lama seketika. */
    public function test_memutar_token_mematikan_tautan_lama(): void
    {
        $rapat = $this->buatRapat();
        $lama = $rapat->public_token;

        $this->withToken($this->buatPengguna('admin')->createToken('uji', ['admin-panel'])->plainTextToken)
            ->postJson($this->prefix.'/admin/meetings/'.$rapat->id.'/rotate-token')
            ->assertOk();

        $this->getJson($this->prefix.'/absensi/'.$lama)->assertNotFound();
    }
}

<?php

namespace Tests\Feature\Auth;

use App\Models\Attendance;
use App\Models\Meeting;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
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

    /** Migrasi absensi rapat, berurutan seperti yang dialami `db_apt`. */
    private const MIGRASI = [
        '2026_08_13_005900_create_meetings_and_attendances_tables.php',
        '2026_08_13_006000_add_public_token_to_meetings.php',
        '2026_10_09_000100_add_phone_normalized_to_attendances.php',
        '2026_10_09_000200_add_gender_and_represents_to_attendances.php',
    ];

    /**
     * Skema dibangun dari MIGRASI YANG SAMA dengan produksi, bukan salinan
     * tangan — salinan tangan inilah yang dulu membuat tidak ada yang sadar
     * kedua tabelnya tidak punya migrasi `create`.
     *
     * @param  int|null  $sampai  jalankan hanya sejumlah migrasi pertama
     */
    private function createMeetingSchema(?int $sampai = null): void
    {
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('meetings');

        foreach (array_slice(self::MIGRASI, 0, $sampai) as $berkas) {
            (require database_path('migrations/'.$berkas))->up();
        }
    }

    private function buatRapat(bool $aktif = true): Meeting
    {
        $rapat = new Meeting([
            'title' => 'Rapat Uji',
            'slug' => Meeting::slugBaru('Rapat Uji'),
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
    private function isian(array $ganti = []): array
    {
        return array_merge([
            'name' => 'Siti Aminah',
            'gender' => 'P',
            'department' => 'Unit Operasi',
            'phone' => '081234567890',
            'signature' => $this->tandaTangan(),
        ], $ganti);
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

    /* ================================================================
       Pencegahan absensi ganda

       Aturan ini ADA DI v1 dan sempat hilang saat modulnya dipindahkan ke v2.
       Tanpa ia, satu orang yang menekan kirim dua kali — hal yang lumrah pada
       jaringan lambat — tercatat dua kali, dan daftar hadir yang dicetak
       menjadi bukti kehadiran yang salah hitung.
       ================================================================ */

    public function test_nomor_hp_wajib_diisi(): void
    {
        $rapat = $this->buatRapat();

        $this->postJson(
            $this->prefix.'/absensi/'.$rapat->public_token,
            $this->isian(['phone' => '']),
        )->assertStatus(422);

        $this->assertSame(0, $rapat->attendances()->count());
    }

    public function test_nomor_hp_yang_sama_ditolak_pada_rapat_yang_sama(): void
    {
        $rapat = $this->buatRapat();

        $this->postJson($this->prefix.'/absensi/'.$rapat->public_token, $this->isian())
            ->assertCreated();

        $this->postJson(
            $this->prefix.'/absensi/'.$rapat->public_token,
            $this->isian(['name' => 'Orang Lain', 'department' => 'Unit Lain']),
        )->assertStatus(422);

        $this->assertSame(1, $rapat->attendances()->count());
    }

    /** "0812-3456-7890" dan "081234567890" ditulis orang yang sama. */
    public function test_nomor_hp_dibandingkan_setelah_dinormalkan(): void
    {
        $rapat = $this->buatRapat();

        $this->postJson($this->prefix.'/absensi/'.$rapat->public_token, $this->isian())
            ->assertCreated();

        $this->postJson(
            $this->prefix.'/absensi/'.$rapat->public_token,
            $this->isian(['phone' => '0812-3456-7890']),
        )->assertStatus(422);

        $this->assertSame(1, $rapat->attendances()->count());
    }

    /** Rapat yang berbeda punya daftar hadirnya sendiri. */
    public function test_nomor_yang_sama_boleh_hadir_di_rapat_berbeda(): void
    {
        $satu = $this->buatRapat();
        $dua = $this->buatRapat();

        $this->postJson($this->prefix.'/absensi/'.$satu->public_token, $this->isian())
            ->assertCreated();

        $this->postJson($this->prefix.'/absensi/'.$dua->public_token, $this->isian())
            ->assertCreated();

        $this->assertSame(1, $satu->attendances()->count());
        $this->assertSame(1, $dua->attendances()->count());
    }

    /* ================================================================
       Jenis kelamin & pihak yang diwakili
       ================================================================ */

    public function test_jenis_kelamin_wajib_dan_hanya_l_atau_p(): void
    {
        $rapat = $this->buatRapat();

        foreach ([null, '', 'X', 'laki-laki'] as $salah) {
            $this->postJson(
                $this->prefix.'/absensi/'.$rapat->public_token,
                $this->isian(['gender' => $salah]),
            )->assertStatus(422)->assertJsonValidationErrors('gender');
        }

        $this->assertSame(0, $rapat->attendances()->count());
    }

    public function test_pihak_yang_diwakili_tersimpan_dan_boleh_kosong(): void
    {
        $rapat = $this->buatRapat();

        $this->postJson($this->prefix.'/absensi/'.$rapat->public_token, $this->isian([
            'represents' => '  Kepala Dinas Perhubungan  ',
        ]))->assertCreated();

        // Isian berisi spasi saja disimpan NULL, bukan string kosong.
        $this->postJson($this->prefix.'/absensi/'.$rapat->public_token, $this->isian([
            'name' => 'Budi', 'gender' => 'L', 'phone' => '081111111111', 'represents' => '   ',
        ]))->assertCreated();

        $this->assertSame(
            [['P', 'Kepala Dinas Perhubungan'], ['L', null]],
            $rapat->attendances()->reorder('id')->get()->map(fn ($p) => [$p->gender, $p->represents])->all(),
        );
    }

    /** "+62 812..." dan "0812..." adalah nomor yang sama. */
    public function test_awalan_62_disamakan_dengan_0(): void
    {
        $rapat = $this->buatRapat();

        $this->postJson($this->prefix.'/absensi/'.$rapat->public_token, $this->isian())
            ->assertCreated();

        $this->postJson(
            $this->prefix.'/absensi/'.$rapat->public_token,
            $this->isian(['phone' => '+62 812-3456-7890']),
        )->assertStatus(422);

        $this->assertSame(1, $rapat->attendances()->count());
    }

    /**
     * Isian tanpa angka dulu lolos `required`, lalu dinormalkan menjadi ""
     * yang bertabrakan dengan setiap isian tanpa angka berikutnya.
     */
    public function test_nomor_tanpa_angka_cukup_ditolak(): void
    {
        $rapat = $this->buatRapat();

        foreach (['-', 'tidak ada', '0812'] as $salah) {
            $this->postJson(
                $this->prefix.'/absensi/'.$rapat->public_token,
                $this->isian(['phone' => $salah]),
            )->assertStatus(422)->assertJsonValidationErrors('phone');
        }

        $this->assertSame(0, $rapat->attendances()->count());
    }

    /**
     * Penjaga terakhir terhadap kiriman kembar yang tiba bersamaan: keduanya
     * lolos pemeriksaan di controller, jadi basis datalah yang harus menolak.
     */
    public function test_basis_data_menolak_nomor_ganda_pada_rapat_yang_sama(): void
    {
        $rapat = $this->buatRapat();
        $buat = fn (string $nomor) => Attendance::create([
            'meeting_id' => $rapat->id, 'name' => 'Uji', 'department' => 'Unit', 'phone' => $nomor,
        ]);

        $buat('081234567890');

        $this->expectException(UniqueConstraintViolationException::class);
        $buat('+62 812 3456 7890');
    }

    /**
     * Baris lama diisi nomor pembandingnya, kecuali yang tanpa angka dan
     * kemunculan kedua dari nomor yang sama — keduanya dibiarkan NULL, tidak
     * dihapus, supaya indeks unik dapat dipasang tanpa membuang daftar hadir.
     */
    public function test_migrasi_mengisi_baris_lama_tanpa_menghapus_yang_ganda(): void
    {
        $this->createMeetingSchema(sampai: 2);
        $rapat = $this->buatRapat();

        foreach (['0812-3456-7890', '+6281234567890', '-', '0811 111 111'] as $nomor) {
            DB::table('attendances')->insert([
                'meeting_id' => $rapat->id, 'name' => 'Lama', 'department' => 'Unit', 'phone' => $nomor,
            ]);
        }

        (require database_path('migrations/'.self::MIGRASI[2]))->up();
        (require database_path('migrations/'.self::MIGRASI[3]))->up();

        $this->assertSame(
            ['081234567890', null, null, '0811111111'],
            DB::table('attendances')->orderBy('id')->pluck('phone_normalized')->all(),
        );

        // Baris lama yang NULL tetap ikut dibandingkan.
        $this->postJson(
            $this->prefix.'/absensi/'.$rapat->public_token,
            $this->isian(['phone' => '081234567890']),
        )->assertStatus(422);
    }

    /**
     * Unduhan Word tidak boleh meninggalkan apa pun di direktori temp.
     *
     * Dulu `tempnam()` membuat satu berkas kosong lalu `.docx` ditempelkan
     * pada namanya; hanya berkas `.docx` yang dihapus sesudah terkirim. Yang
     * tertinggal kosong, tetapi berkas `.docx`-nya sendiri berisi nama dan
     * nomor HP peserta — keduanya harus benar-benar hilang.
     */
    public function test_unduhan_word_tidak_meninggalkan_berkas_sementara(): void
    {
        $rapat = $this->buatRapat();
        $this->postJson($this->prefix.'/absensi/'.$rapat->public_token, $this->isian())->assertCreated();

        // `abs*`, bukan `absensi_*`: di Windows `tempnam()` hanya memakai tiga
        // aksara pertama awalannya (`absXXXX.tmp`), dan pola yang lebih
        // panjang membuat tes ini lulus padahal berkas yatimnya ada.
        $sebelum = glob(sys_get_temp_dir().DIRECTORY_SEPARATOR.'abs*') ?: [];

        $res = $this->withToken($this->buatPengguna('admin')->createToken('uji', ['admin-panel'])->plainTextToken)
            ->get($this->prefix.'/admin/meetings/'.$rapat->id.'/docx');

        $res->assertOk();
        $this->assertStringStartsWith('PK', file_get_contents($res->baseResponse->getFile()->getPathname()));

        // Kirim isinya, seperti yang dilakukan server sungguhan.
        ob_start();
        $res->baseResponse->sendContent();
        ob_end_clean();

        $sesudah = glob(sys_get_temp_dir().DIRECTORY_SEPARATOR.'abs*') ?: [];
        $this->assertSame([], array_values(array_diff($sesudah, $sebelum)));
    }

    /* ================================================================
       Batas laju

       Halaman absensi membaca keterangan rapat dari server Next, sehingga
       bagi Laravel semua peserta datang dari SATU IP. Batas per IP yang lama
       (30/menit) membuat peserta ke-31 melihat "tautan tidak dikenali".
       ================================================================ */

    public function test_banyak_peserta_dari_satu_ip_tetap_dapat_membuka_tautan(): void
    {
        $rapat = $this->buatRapat();

        for ($i = 0; $i < 60; $i++) {
            $this->getJson($this->prefix.'/absensi/'.$rapat->public_token)->assertOk();
        }
    }

    public function test_batas_laju_dijawab_dalam_bahasa_indonesia(): void
    {
        $rapat = $this->buatRapat();

        for ($i = 0; $i < 60; $i++) {
            $this->postJson($this->prefix.'/absensi/'.$rapat->public_token, ['name' => 'x']);
        }

        $this->postJson($this->prefix.'/absensi/'.$rapat->public_token, $this->isian())
            ->assertStatus(429)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Daftar hadir sedang ramai diisi. Tunggu sebentar, lalu coba lagi.');
    }
}

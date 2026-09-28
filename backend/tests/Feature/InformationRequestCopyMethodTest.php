<?php

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Schema\Blueprint;
use Tests\TestCase;

/**
 * Cara mendapat salinan harus cocok dengan cara memperoleh: hard copy lewat
 * jalur fisik, soft copy lewat jalur digital, melihat/membaca tanpa salinan.
 */
class InformationRequestCopyMethodTest extends TestCase
{
    private const LIHAT = 'Melihat/Membaca/Mendengarkan/Mencatat';
    private const HARD = 'Mendapatkan Copy Salinan (Hard Copy)';
    private const SOFT = 'Mendapatkan Copy Salinan (Soft Copy)';

    protected function setUp(): void
    {
        parent::setUp();

        // Skema v1: obtain_method 125 karakter dan copy_method wajib —
        // migrasi 000300 harus melebarkan yang pertama dan melonggarkan yang kedua.
        Schema::create('public_informations', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number');
            $table->string('ktp_path');
            $table->string('statement_path')->nullable();
            $table->string('request_from');
            $table->string('name');
            $table->text('address');
            $table->string('occupation');
            $table->string('npwp', 125)->nullable();
            $table->string('phone');
            $table->string('email');
            $table->text('information_details');
            $table->text('information_purpose');
            $table->string('obtain_method', 125);
            $table->string('copy_method', 125);
            $table->string('status');
            $table->date('due_date');
            $table->timestamps();
        });

        (require database_path('migrations/2026_09_28_000300_align_information_request_obtain_methods.php'))->up();
        Storage::fake('local');
    }

    private function kirim(array $cara, array $salinan)
    {
        $data = [
            'ktp' => UploadedFile::fake()->create('ktp.pdf', 100, 'application/pdf'),
            'request_from' => 'Individu',
            'name' => 'Pemohon Uji',
            'address' => 'Alamat uji',
            'occupation' => 'Wiraswasta',
            'phone' => '081234567890',
            'email' => 'pemohon@example.test',
            'information_details' => 'Informasi uji',
            'information_purpose' => 'Keperluan uji',
            'obtain_method' => $cara,
        ];
        if ($salinan !== []) {
            $data['copy_method'] = $salinan;
        }

        return $this->post('/api/'.config('api.version').'/information-requests', $data, ['Accept' => 'application/json']);
    }

    public function test_melihat_saja_tidak_memerlukan_salinan(): void
    {
        $this->kirim([self::LIHAT], [])->assertCreated();
        $this->assertNull(DB::table('public_informations')->value('copy_method'));
    }

    public function test_melihat_saja_menolak_salinan(): void
    {
        $this->kirim([self::LIHAT], ['Email'])->assertStatus(422)->assertJsonValidationErrors('copy_method.0');
    }

    public function test_soft_copy_hanya_lewat_jalur_digital(): void
    {
        $this->kirim([self::SOFT], ['Email', 'Whatsapp'])->assertCreated();
        $this->kirim([self::SOFT], ['Pos'])->assertStatus(422)->assertJsonValidationErrors('copy_method.0');
    }

    public function test_hard_copy_hanya_lewat_jalur_fisik(): void
    {
        $this->kirim([self::HARD], ['Kurir', 'Fax'])->assertCreated();
        $this->kirim([self::HARD], ['Email'])->assertStatus(422)->assertJsonValidationErrors('copy_method.0');
    }

    public function test_hard_copy_wajib_memilih_salinan(): void
    {
        $this->kirim([self::HARD], [])->assertStatus(422)->assertJsonValidationErrors('copy_method');
    }

    public function test_ketiga_cara_sekaligus_muat_dan_boleh_semua_salinan(): void
    {
        $this->kirim([self::LIHAT, self::HARD, self::SOFT], ['Langsung', 'Email'])->assertCreated();
        $this->assertSame(
            self::LIHAT.', '.self::HARD.', '.self::SOFT,
            DB::table('public_informations')->value('obtain_method'),
        );
    }
}

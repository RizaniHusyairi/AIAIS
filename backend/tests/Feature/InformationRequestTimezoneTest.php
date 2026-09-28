<?php

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Schema\Blueprint;
use Tests\TestCase;

/**
 * Tanggal diterima, awalan tiket, dan tenggat dihitung dalam WITA.
 *
 * `APP_TIMEZONE` adalah UTC. Permohonan pukul 06:30 WITA hari Senin masih
 * Minggu malam dalam UTC; dulu tiketnya berawalan tanggal Minggu dan tenggatnya
 * satu hari kerja lebih awal daripada yang dijanjikan formulir.
 */
class InformationRequestTimezoneTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('public_informations', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number');
            $table->string('ktp_path');
            $table->string('statement_path')->nullable();
            $table->string('request_from');
            $table->string('name');
            $table->text('address');
            $table->string('occupation');
            $table->string('npwp')->nullable();
            $table->string('phone');
            $table->string('email');
            $table->text('information_details');
            $table->text('information_purpose');
            $table->string('obtain_method');
            $table->string('copy_method')->nullable();
            $table->string('status');
            $table->date('due_date');
            $table->timestamps();
        });

        Storage::fake('local');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function kirim()
    {
        return $this->post('/api/'.config('api.version').'/information-requests', [
            'ktp' => UploadedFile::fake()->create('ktp.pdf', 100, 'application/pdf'),
            'request_from' => 'Individu',
            'name' => 'Pemohon Uji',
            'address' => 'Alamat uji',
            'occupation' => 'Wiraswasta',
            'phone' => '081234567890',
            'email' => 'pemohon@example.test',
            'information_details' => 'Informasi uji',
            'information_purpose' => 'Keperluan uji',
            'obtain_method' => ['Melihat/Membaca/Mendengarkan/Mencatat'],
        ], ['Accept' => 'application/json']);
    }

    public function test_permohonan_dini_hari_wita_dihitung_dari_tanggal_samarinda(): void
    {
        // Minggu 4 Oktober 2026 22:30 UTC = Senin 5 Oktober 2026 06:30 WITA.
        Carbon::setTestNow(Carbon::parse('2026-10-04 22:30:00', 'UTC'));

        $res = $this->kirim()->assertCreated();

        $this->assertStringStartsWith('PIP-20261005-', $res->json('data.ticket_number'));
        // 10 hari kerja sejak Senin 5 Oktober: Senin 19 Oktober — bukan Jumat 16.
        // SQLite menyimpan kolom DATE lengkap dengan jam 00:00:00; MySQL tidak.
        $this->assertStringStartsWith('2026-10-19', DB::table('public_informations')->value('due_date'));
        $this->assertStringStartsWith('2026-10-19', $res->json('data.due_date'));
    }

    public function test_permohonan_siang_hari_tidak_bergeser(): void
    {
        // Senin 5 Oktober 2026 03:00 UTC = 11:00 WITA; UTC dan WITA sepakat.
        Carbon::setTestNow(Carbon::parse('2026-10-05 03:00:00', 'UTC'));

        $res = $this->kirim()->assertCreated();

        $this->assertStringStartsWith('PIP-20261005-', $res->json('data.ticket_number'));
        // SQLite menyimpan kolom DATE lengkap dengan jam 00:00:00; MySQL tidak.
        $this->assertStringStartsWith('2026-10-19', DB::table('public_informations')->value('due_date'));
    }
}

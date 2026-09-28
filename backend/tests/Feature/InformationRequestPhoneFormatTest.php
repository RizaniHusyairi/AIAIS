<?php

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Schema\Blueprint;
use Tests\TestCase;

class InformationRequestPhoneFormatTest extends TestCase
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
            $table->string('npwp', 125)->nullable();
            $table->string('phone');
            $table->string('email');
            $table->text('information_details');
            $table->text('information_purpose');
            $table->string('obtain_method');
            $table->string('copy_method');
            $table->string('status');
            $table->date('due_date');
            $table->timestamps();
        });

        Storage::fake('local');
    }

    private function kirim(string $phone)
    {
        return $this->post('/api/'.config('api.version').'/information-requests', [
            'ktp' => UploadedFile::fake()->create('ktp.pdf', 100, 'application/pdf'),
            'request_from' => 'Individu',
            'name' => 'Pemohon Uji',
            'address' => 'Alamat uji',
            'occupation' => 'Wiraswasta',
            'phone' => $phone,
            'email' => 'pemohon@example.test',
            'information_details' => 'Informasi uji',
            'information_purpose' => 'Keperluan uji',
            'obtain_method' => ['Melihat/Membaca/Mendengarkan/Mencatat'],
            'copy_method' => ['Email'],
        ], ['Accept' => 'application/json']);
    }

    public function test_nomor_berpemisah_diterima_dan_disimpan_polos(): void
    {
        $this->kirim('+62 812-3456.7890')->assertCreated();
        $this->assertSame('+6281234567890', DB::table('public_informations')->value('phone'));
    }

    public function test_nomor_berhuruf_tetap_ditolak(): void
    {
        $this->kirim('0812-ABCD-7890')->assertStatus(422)->assertJsonValidationErrors('phone');
    }
}

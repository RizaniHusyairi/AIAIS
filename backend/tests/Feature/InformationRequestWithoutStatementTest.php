<?php

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Database\Schema\Blueprint;
use Tests\TestCase;

class InformationRequestWithoutStatementTest extends TestCase
{
    public function test_permohonan_dapat_dikirim_tanpa_surat_pernyataan(): void
    {
        // Skema awal mewakili kolom wajib v1; migrasi harus melonggarkannya.
        Schema::create('public_informations', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number');
            $table->string('ktp_path');
            $table->string('statement_path');
            $table->string('request_from');
            $table->string('name');
            $table->text('address');
            $table->string('occupation');
            $table->string('npwp');
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

        $migration = require database_path('migrations/2026_09_28_000100_make_information_request_statement_optional.php');
        $migration->up();
        Storage::fake('local');

        $response = $this->post('/api/'.config('api.version').'/information-requests', [
            'ktp' => UploadedFile::fake()->create('ktp.pdf', 100, 'application/pdf'),
            'request_from' => 'Individu',
            'name' => 'Pemohon Uji',
            'address' => 'Alamat uji',
            'occupation' => 'Wiraswasta',
            'npwp' => '00.000.000.0-000.000',
            'phone' => '081234567890',
            'email' => 'pemohon@example.test',
            'information_details' => 'Informasi uji',
            'information_purpose' => 'Keperluan uji',
            'obtain_method' => ['Melihat/Membaca/Mendengarkan/Mencatat'],
            'copy_method' => ['Email'],
        ], ['Accept' => 'application/json']);

        $response->assertCreated()->assertJsonPath('success', true);
        $this->assertNull(DB::table('public_informations')->value('statement_path'));
    }
}

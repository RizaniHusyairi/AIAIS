<?php

namespace Tests\Feature;

use App\Jobs\KirimWhatsApp;
use App\Models\InformationRequest;
use App\Notifications\BuktiPermohonanInformasi;
use App\Services\Notifikasi\WhatsAppGateway;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Pemohon menerima salinan bukti (nomor tiket) lewat surel dan WhatsApp.
 */
class InformationRequestKabarPemohonTest extends TestCase
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
        Notification::fake();
        Queue::fake();
        // Seolah server punya SMTP sungguhan; phpunit.xml memakai `array`, yang
        // oleh KonfigurasiSurel::siap() dianggap tidak mengirim apa pun.
        config(['mail.default' => 'smtp']);
    }

    public function test_surel_tidak_dijanjikan_tanpa_server_smtp(): void
    {
        config(['mail.default' => 'log']);

        $this->kirim()->assertCreated()->assertJsonPath('data.kabar.email', false);

        Notification::assertNothingSent();
    }

    private function kirim(array $tambahan = [], string $email = 'pemohon@example.test')
    {
        return $this->post('/api/'.config('api.version').'/information-requests', [
            'ktp' => UploadedFile::fake()->create('ktp.pdf', 100, 'application/pdf'),
            'request_from' => 'Individu',
            'name' => 'Pemohon Uji',
            'address' => 'Alamat uji',
            'occupation' => 'Wiraswasta',
            'phone' => '0812-3456-7890',
            'email' => $email,
            'information_details' => 'Informasi uji',
            'information_purpose' => 'Keperluan uji',
            'obtain_method' => ['Melihat/Membaca/Mendengarkan/Mencatat'],
        ] + $tambahan, ['Accept' => 'application/json']);
    }

    private function aktifkanWhatsApp(): void
    {
        config(['whatsapp.enabled' => true, 'whatsapp.token' => 'token-uji']);
    }

    public function test_surel_bukti_dikirim_ke_pemohon(): void
    {
        $this->kirim()->assertCreated()->assertJsonPath('data.kabar.email', true);

        Notification::assertSentOnDemand(
            BuktiPermohonanInformasi::class,
            fn ($n, array $kanal, AnonymousNotifiable $tujuan) => $tujuan->routes['mail'] === 'pemohon@example.test',
        );
    }

    public function test_surel_tidak_dikirim_bila_pemohon_menolak(): void
    {
        $this->kirim(['kabar_email' => '0'])->assertCreated()->assertJsonPath('data.kabar.email', false);

        Notification::assertNothingSent();
    }

    public function test_whatsapp_diantrekan_ke_nomor_pemohon_dalam_format_62(): void
    {
        $this->aktifkanWhatsApp();

        $this->kirim()->assertCreated()->assertJsonPath('data.kabar.whatsapp', true);

        Queue::assertPushed(KirimWhatsApp::class, function (KirimWhatsApp $job) {
            return $job->nomor === '6281234567890'
                && str_contains($job->teks, InformationRequest::first()->ticket_number);
        });
    }

    public function test_whatsapp_tidak_dijanjikan_bila_gateway_mati(): void
    {
        config(['whatsapp.enabled' => false]);

        $this->kirim()->assertCreated()->assertJsonPath('data.kabar.whatsapp', false);

        Queue::assertNotPushed(KirimWhatsApp::class, fn (KirimWhatsApp $job) => $job->nomor !== null);
    }

    public function test_whatsapp_tidak_dikirim_bila_pemohon_menolak(): void
    {
        $this->aktifkanWhatsApp();

        $this->kirim(['kabar_whatsapp' => '0'])->assertCreated()->assertJsonPath('data.kabar.whatsapp', false);

        Queue::assertNotPushed(KirimWhatsApp::class, fn (KirimWhatsApp $job) => $job->nomor !== null);
    }

    public function test_satu_alamat_dibatasi_tiga_bukti_per_hari(): void
    {
        foreach ([true, true, true, false] as $harap) {
            $this->kirim()->assertCreated()->assertJsonPath('data.kabar.email', $harap);
        }

        Notification::assertSentOnDemandTimes(BuktiPermohonanInformasi::class, 3);
    }

    public function test_isi_bukti_minim_dan_berwaktu_wita(): void
    {
        $this->kirim()->assertCreated();
        $permohonan = InformationRequest::first();
        $bukti = new BuktiPermohonanInformasi($permohonan);

        $html = (string) $bukti->toMail(new AnonymousNotifiable())->render();
        $wa = $bukti->teksWhatsApp();

        foreach ([$html, $wa] as $isi) {
            $this->assertStringContainsString($permohonan->ticket_number, $isi);
            $this->assertStringContainsString('/ppid/pengajuan-informasi?tiket=', $isi);
            // Tidak membawa data pribadi maupun isi permohonan.
            $this->assertStringNotContainsString('Pemohon Uji', $isi);
            $this->assertStringNotContainsString('Alamat uji', $isi);
            $this->assertStringNotContainsString('Informasi uji', $isi);
        }
    }

    public function test_normalisasi_nomor_indonesia(): void
    {
        $this->assertSame('6281234567890', WhatsAppGateway::nomorInternasional('081234567890'));
        $this->assertSame('6281234567890', WhatsAppGateway::nomorInternasional('+62 812-3456-7890'));
        $this->assertSame('6281234567890', WhatsAppGateway::nomorInternasional('81234567890'));
        $this->assertNull(WhatsAppGateway::nomorInternasional('12345'));
    }
}

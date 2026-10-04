<?php

namespace Tests\Feature\Complaint;

use App\Models\Complaint;
use App\Models\ComplaintAiInsight;
use App\Support\AsistenPengaduan;
use App\Support\PenyamarPengaduan;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Tests\Support\CreatesLegacyUserSchema;
use Tests\TestCase;

/**
 * Analisis AI pengaduan.
 *
 * Yang dijaga: identitas pelapor tidak pernah ikut terkirim; hasil hanya
 * disimpan sebagai saran tanpa menyentuh status pengaduan; setiap analisis
 * tercatat beserta peminta; dan kegagalan layanan AI tidak meninggalkan
 * baris setengah jadi.
 */
class ComplaintAiInsightTest extends TestCase
{
    use CreatesLegacyUserSchema;

    private string $prefix;

    /** Asisten palsu: merekam muatan, menjawab dengan respons yang disiapkan. */
    private object $asisten;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createLegacyUserSchema();

        Schema::dropIfExists('complaint_ai_insights');
        Schema::dropIfExists('complaints');
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 40)->nullable();
            $table->string('reporter_name');
            $table->string('reporter_email');
            $table->string('reporter_phone');
            $table->string('category')->default('Lainnya');
            $table->string('subject');
            $table->text('description');
            $table->string('attachment', 500)->nullable();
            $table->string('status', 20)->default('submitted');
            $table->text('admin_response')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
        });
        (include database_path('migrations/2026_10_04_000200_create_complaint_ai_insights_table.php'))->up();

        config([
            'services.anthropic.enabled' => true,
            'services.anthropic.key' => 'kunci-uji',
            'services.anthropic.model' => 'claude-sonnet-5-5',
        ]);

        $this->asisten = new class(new PenyamarPengaduan) extends AsistenPengaduan
        {
            public array $dikirim = [];

            public array $jawaban = [];

            protected function kirim(array $params): array
            {
                $this->dikirim[] = $params;

                return $this->jawaban;
            }
        };
        $this->asisten->jawaban = $this->jawabanSukses();
        $this->app->instance(AsistenPengaduan::class, $this->asisten);

        $this->prefix = '/api/'.config('api.version');
    }

    private function admin(): string
    {
        $user = \App\Models\User::create([
            'name' => 'Petugas Helpdesk',
            'email' => 'helpdesk@contoh.id',
            'password' => bcrypt('rahasia123'),
        ]);
        $user->forceFill(['is_admin' => true, 'is_accepted' => true])->save();

        return $user->createToken('admin-panel', ['admin-panel'])->plainTextToken;
    }

    private function pengaduan(array $ubah = []): Complaint
    {
        return Complaint::create(array_merge([
            'ticket_number' => 'TKT-20261004-ABCD',
            'reporter_name' => 'Siti Rahmawati',
            'reporter_email' => 'siti.r@contoh.id',
            'reporter_phone' => '081234567890',
            'category' => 'Fasilitas & Kebersihan',
            'subject' => 'Toilet ruang tunggu kotor',
            'description' => 'Saya Siti, toilet gate 2 kotor sekali. Hubungi saya di 0812-3456-7890 '
                .'atau siti.r@contoh.id. NIK saya 6472012345678901.',
            'status' => 'submitted',
        ], $ubah));
    }

    private function jawabanSukses(array $ubahHasil = [], ?string $stop = 'end_turn'): array
    {
        return [
            'stop_reason' => $stop,
            'text' => json_encode(array_merge([
                'ringkasan' => 'Pelapor mengeluhkan toilet ruang tunggu gate 2 yang kotor.',
                'kategori_saran' => 'Fasilitas & Kebersihan',
                'urgensi' => 'sedang',
                'perlu_eskalasi' => false,
                'alasan_eskalasi' => '',
                'tindak_lanjut' => ['Periksa jadwal kebersihan toilet gate 2.'],
                'draf_balasan' => 'Terima kasih Bapak/Ibu atas laporannya.',
            ], $ubahHasil)),
            'model' => 'claude-sonnet-5-5',
            'input_tokens' => 900,
            'output_tokens' => 300,
        ];
    }

    public function test_analisis_tidak_mengirim_identitas_pelapor(): void
    {
        $c = $this->pengaduan();

        $this->withToken($this->admin())
            ->postJson("{$this->prefix}/admin/complaints/{$c->id}/ai-insight")
            ->assertCreated();

        $terkirim = json_encode($this->asisten->dikirim[0]);

        foreach (['Siti', 'Rahmawati', 'siti.r@contoh.id', '081234567890', '0812-3456-7890', '6472012345678901'] as $rahasia) {
            $this->assertStringNotContainsString($rahasia, $terkirim, "«{$rahasia}» ikut terkirim");
        }
        $this->assertStringContainsString('toilet gate 2 kotor', $terkirim);
    }

    public function test_analisis_disimpan_tanpa_mengubah_pengaduan(): void
    {
        $c = $this->pengaduan();

        $res = $this->withToken($this->admin())
            ->postJson("{$this->prefix}/admin/complaints/{$c->id}/ai-insight");

        $res->assertCreated()
            ->assertJsonPath('data.result.urgensi', 'sedang')
            ->assertJsonPath('data.model', 'claude-sonnet-5-5');

        $insight = ComplaintAiInsight::sole();
        $this->assertNotNull($insight->requested_by);
        $this->assertSame(900, $insight->input_tokens);

        $c->refresh();
        $this->assertSame('submitted', $c->status);
        $this->assertNull($c->admin_response);

        $params = $this->asisten->dikirim[0];
        $this->assertSame('claude-sonnet-5-5', $params['model']);
        $this->assertSame('default', $params['fallbacks']);
    }

    public function test_insight_mengembalikan_analisis_terbaru(): void
    {
        $c = $this->pengaduan();
        $token = $this->admin();

        $this->withToken($token)->getJson("{$this->prefix}/admin/complaints/{$c->id}/ai-insight")
            ->assertOk()->assertJsonPath('data.insight', null);

        $this->withToken($token)->postJson("{$this->prefix}/admin/complaints/{$c->id}/ai-insight");
        $this->asisten->jawaban = $this->jawabanSukses(['urgensi' => 'tinggi']);
        $this->withToken($token)->postJson("{$this->prefix}/admin/complaints/{$c->id}/ai-insight");

        $this->withToken($token)->getJson("{$this->prefix}/admin/complaints/{$c->id}/ai-insight")
            ->assertOk()->assertJsonPath('data.insight.result.urgensi', 'tinggi');
    }

    public function test_fitur_mati_menolak_tanpa_memanggil_layanan(): void
    {
        config(['services.anthropic.enabled' => false]);
        $c = $this->pengaduan();

        $this->withToken($this->admin())
            ->postJson("{$this->prefix}/admin/complaints/{$c->id}/ai-insight")
            ->assertStatus(503)
            ->assertJsonPath('message', 'Fitur analisis AI belum diaktifkan.');

        $this->assertSame([], $this->asisten->dikirim);
    }

    public function test_penolakan_model_tidak_menyimpan_apa_pun(): void
    {
        $this->asisten->jawaban = $this->jawabanSukses([], 'refusal');
        $c = $this->pengaduan();

        $this->withToken($this->admin())
            ->postJson("{$this->prefix}/admin/complaints/{$c->id}/ai-insight")
            ->assertStatus(502)
            ->assertJsonPath('success', false);

        $this->assertSame(0, ComplaintAiInsight::count());
    }

    public function test_kategori_di_luar_daftar_dibuang(): void
    {
        $this->asisten->jawaban = $this->jawabanSukses(['kategori_saran' => 'Kategori Karangan']);
        $c = $this->pengaduan();

        $this->withToken($this->admin())
            ->postJson("{$this->prefix}/admin/complaints/{$c->id}/ai-insight")
            ->assertCreated()
            ->assertJsonPath('data.result.kategori_saran', null);
    }

    public function test_menghapus_pengaduan_ikut_menghapus_analisis(): void
    {
        $c = $this->pengaduan();
        $token = $this->admin();
        $this->withToken($token)->postJson("{$this->prefix}/admin/complaints/{$c->id}/ai-insight");

        $this->withToken($token)->deleteJson("{$this->prefix}/admin/complaints/{$c->id}")->assertOk();

        $this->assertSame(0, ComplaintAiInsight::count());
    }

    public function test_tamu_tidak_dapat_meminta_analisis(): void
    {
        $c = $this->pengaduan();

        $this->postJson("{$this->prefix}/admin/complaints/{$c->id}/ai-insight")->assertUnauthorized();
        $this->assertSame([], $this->asisten->dikirim);
    }
}

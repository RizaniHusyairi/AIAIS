<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Selaraskan tabel `complaints` warisan v1 dengan yang dibutuhkan portal v2.
 *
 * Kolom yang isinya sama tetapi namanya berbeda DIGANTI NAMA, bukan
 * ditambahkan berdampingan. Menambah `reporter_name` kosong di samping `name`
 * yang berisi data berarti nama pelapor pengaduan lama menghilang dari portal
 * baru; mengganti namanya membawa datanya serta tanpa backfill apa pun.
 *
 * Ini dijalankan pada saat cutover, sesudah aplikasi v1 dihentikan (lihat
 * docs/CUTOVER.md), sehingga tidak ada yang masih membaca nama kolom lama.
 *
 * `status` diubah dari enum menjadi string karena v2 mengenal satu keadaan
 * yang tidak dipunyai v1 — `rejected`, pengaduan yang ditolak — dan karena
 * konvensi proyek memang menghindari enum agar nilai baru tidak menuntut
 * migrasi ALTER.
 */
return new class extends Migration
{
    /** Padanan status v1 → v2. */
    private const STATUS_MAP = [
        'Menunggu' => 'submitted',
        'Diproses' => 'in_progress',
        'Selesai' => 'resolved',
    ];

    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->renameColumn('name', 'reporter_name');
            $table->renameColumn('email', 'reporter_email');
            $table->renameColumn('phone_number', 'reporter_phone');
            $table->renameColumn('message', 'description');
        });

        Schema::table('complaints', function (Blueprint $table) {
            // Nomor tiket adalah cara v2 melacak pengaduan tanpa akun. v1 tidak
            // punya padanannya — pelapor di sana menunggu balasan surel.
            $table->string('ticket_number', 40)->nullable()->unique()->after('id');

            // v1 hanya punya satu jenis pengaduan.
            $table->string('category')->default('Lainnya')->after('reporter_phone');

            $table->string('attachment', 500)->nullable()->after('description');
            $table->text('admin_response')->nullable()->after('status');
            $table->timestamp('responded_at')->nullable()->after('admin_response');

            $table->string('subject', 255)->change();
            $table->string('status', 20)->default('submitted')->change();
        });

        foreach (self::STATUS_MAP as $lama => $baru) {
            DB::table('complaints')->where('status', $lama)->update(['status' => $baru]);
        }

        // Nomor tiket untuk pengaduan warisan, dibangkitkan deterministik dari
        // tanggal dan id supaya menjalankan ulang menghasilkan nomor yang sama.
        DB::table('complaints')->whereNull('ticket_number')->update([
            'ticket_number' => DB::raw("concat('TKT-', date_format(created_at, '%Y%m%d'), '-', lpad(id, 4, '0'))"),
        ]);
    }

    public function down(): void
    {
        foreach (self::STATUS_MAP as $lama => $baru) {
            DB::table('complaints')->where('status', $baru)->update(['status' => $lama]);
        }

        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn(['ticket_number', 'category', 'attachment', 'admin_response', 'responded_at']);
            $table->renameColumn('reporter_name', 'name');
            $table->renameColumn('reporter_email', 'email');
            $table->renameColumn('reporter_phone', 'phone_number');
            $table->renameColumn('description', 'message');
        });
    }
};

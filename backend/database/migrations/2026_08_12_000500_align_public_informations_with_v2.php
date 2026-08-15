<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Jadikan tabel `public_informations` warisan v1 sebagai tabel permohonan
 * informasi publik portal v2.
 *
 * Tabelnya sengaja TIDAK diganti nama menjadi `information_requests`. Nama
 * lamalah yang dikenal petugas PPID, dan mengganti nama tabel berarti memutus
 * relasi `user_id` yang sudah ada tanpa memberi manfaat apa pun. Model
 * InformationRequest cukup menunjuk ke sini lewat $table.
 *
 * Satu perbedaan perilaku yang perlu dicatat: di v1 permohonan hanya bisa
 * diajukan pengguna yang sudah masuk, sehingga nama, alamat, telepon, dan
 * surel diambil dari akunnya. v2 menerima permohonan tanpa akun dan menanyakan
 * semuanya di formulir. Karena itu `user_id` dilonggarkan menjadi nullable,
 * dan keempat medan itu ditambahkan sebagai kolom sendiri — untuk permohonan
 * lama nilainya disalin dari akun pemohonnya supaya tidak ada yang kosong.
 */
return new class extends Migration
{
    /** Padanan status v1 → v2. */
    private const STATUS_MAP = [
        'Belum dibalas' => 'submitted',
        'Sudah dibalas' => 'fulfilled',
    ];

    public function up(): void
    {
        Schema::table('public_informations', function (Blueprint $table) {
            $table->renameColumn('ktp', 'ktp_path');
            $table->renameColumn('surat_pertanggungjawaban', 'statement_path');
            $table->renameColumn('surat_permintaan', 'request_from');
            $table->renameColumn('pekerjaan', 'occupation');
            $table->renameColumn('rincian_informasi', 'information_details');
            $table->renameColumn('tujuan_informasi', 'information_purpose');
            $table->renameColumn('cara_memperoleh', 'obtain_method');
            $table->renameColumn('cara_salinan', 'copy_method');
            $table->renameColumn('link_balasan', 'response_link');
            $table->renameColumn('replied_at', 'responded_at');
        });

        Schema::table('public_informations', function (Blueprint $table) {
            $table->string('ticket_number', 40)->nullable()->unique()->after('id');

            // v1 mengambil identitas pemohon dari akunnya; v2 menanyakannya
            // langsung karena permohonan boleh diajukan tanpa akun.
            $table->string('name')->nullable()->after('ticket_number');
            $table->text('address')->nullable()->after('name');
            $table->string('phone')->nullable()->after('address');
            $table->string('email')->nullable()->after('phone');

            $table->text('admin_response')->nullable()->after('status');
            $table->date('due_date')->nullable()->after('responded_at');
            $table->boolean('is_extended')->default(false)->after('due_date');

            $table->string('status', 20)->default('submitted')->change();
            $table->string('ktp_path', 500)->change();
            $table->string('statement_path', 500)->change();
            $table->string('response_link', 500)->nullable()->change();
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });

        foreach (self::STATUS_MAP as $lama => $baru) {
            DB::table('public_informations')->where('status', $lama)->update(['status' => $baru]);
        }

        // Lengkapi identitas permohonan lama dari akun pemohonnya.
        DB::statement('
            update public_informations p
            join users u on u.id = p.user_id
            set p.name = coalesce(p.name, u.name),
                p.email = coalesce(p.email, u.email),
                p.phone = coalesce(p.phone, u.phone),
                p.address = coalesce(p.address, u.address)
        ');

        DB::table('public_informations')->whereNull('ticket_number')->update([
            'ticket_number' => DB::raw("concat('PIP-', date_format(created_at, '%Y%m%d'), '-', lpad(id, 4, '0'))"),
        ]);
    }

    public function down(): void
    {
        foreach (self::STATUS_MAP as $lama => $baru) {
            DB::table('public_informations')->where('status', $baru)->update(['status' => $lama]);
        }

        Schema::table('public_informations', function (Blueprint $table) {
            $table->dropColumn([
                'ticket_number', 'name', 'address', 'phone', 'email',
                'admin_response', 'due_date', 'is_extended',
            ]);
            $table->renameColumn('ktp_path', 'ktp');
            $table->renameColumn('statement_path', 'surat_pertanggungjawaban');
            $table->renameColumn('request_from', 'surat_permintaan');
            $table->renameColumn('occupation', 'pekerjaan');
            $table->renameColumn('information_details', 'rincian_informasi');
            $table->renameColumn('information_purpose', 'tujuan_informasi');
            $table->renameColumn('obtain_method', 'cara_memperoleh');
            $table->renameColumn('copy_method', 'cara_salinan');
            $table->renameColumn('response_link', 'link_balasan');
            $table->renameColumn('responded_at', 'replied_at');
        });
    }
};

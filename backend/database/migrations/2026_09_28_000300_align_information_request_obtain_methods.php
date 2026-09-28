<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('public_informations', function (Blueprint $table) {
            // Tiga cara memperoleh yang dipilih bersamaan sudah 113 karakter;
            // batas 125 warisan v1 terlalu sempit untuk pilihan berikutnya.
            $table->string('obtain_method', 255)->change();

            // Pemohon yang hanya ingin melihat/membaca tidak memerlukan salinan,
            // jadi kolom ini kosong untuk permohonan semacam itu.
            $table->string('copy_method', 125)->nullable()->change();
        });
    }

    public function down(): void
    {
        // Permohonan tanpa salinan tidak dapat dipaksa kembali memiliki cara salinan.
    }
};

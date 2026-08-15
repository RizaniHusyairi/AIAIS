<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Lengkapi tabel `news` warisan v1 dengan kolom yang dibutuhkan portal v2.
 *
 * v1 hanya menyimpan `is_published` dan `is_headline`. v2 menyaring, mengurutkan,
 * dan mencacah lewat `status`, `published_at`, `is_featured`, `category`, dan
 * `views_count` — semuanya di tingkat SQL, sehingga tidak bisa diselesaikan
 * dengan accessor di model. Karena itu kolomnya harus benar-benar ada.
 *
 * `thumbnail` sengaja TIDAK ditambahkan: berkas gambarnya sudah punya rumah di
 * kolom `image`, dan menyimpan lintasan berkas yang sama di dua kolom adalah
 * cara paling pasti untuk membuat keduanya berbeda isi suatu hari nanti. Model
 * News memetakan `thumbnail` ke `image` lewat pasangan accessor/mutator.
 *
 * Semuanya nullable dengan nilai bawaan, jadi aplikasi v1 tetap berjalan — ia
 * tidak pernah membaca maupun menulis kolom-kolom baru ini. Kolom lama
 * `is_published` dan `is_headline` dibiarkan sebagai sumber kebenaran sampai
 * cutover, lalu dibersihkan bersama perapian skema pasca-cutover.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news', function (Blueprint $table) {
            $table->string('category')->default('Berita')->after('slug');
            $table->text('excerpt')->nullable()->after('content');
            $table->string('author')->default('Humas Bandara')->after('excerpt');
            $table->unsignedInteger('views_count')->default(0)->after('author');
            $table->boolean('is_featured')->default(false)->after('views_count');
            $table->string('status', 20)->default('published')->after('is_featured');
            $table->timestamp('published_at')->nullable()->after('status');

            $table->index(['status', 'published_at']);
        });

        // Judul dan lintasan gambar v1 dibatasi 125 aksara. Judul berita nyata
        // kerap melewatinya, dan `image` kini juga harus muat menampung URL
        // penuh — bentuk nilai yang memang didukung ResolvesFileUrl.
        Schema::table('news', function (Blueprint $table) {
            $table->string('title', 255)->change();
            $table->string('image', 500)->nullable()->change();
        });

        // Turunkan keadaan v2 dari kolom v1 yang sudah ada, supaya berita lama
        // langsung tampil benar tanpa disunting satu per satu.
        DB::table('news')->update([
            'status' => DB::raw("case when is_published = 1 then 'published' else 'draft' end"),
            'published_at' => DB::raw('case when is_published = 1 then created_at else null end'),
            'is_featured' => DB::raw('is_headline'),
        ]);
    }

    public function down(): void
    {
        Schema::table('news', function (Blueprint $table) {
            $table->dropIndex(['status', 'published_at']);
            $table->dropColumn([
                'category', 'excerpt', 'author', 'views_count',
                'is_featured', 'status', 'published_at',
            ]);
        });
    }
};

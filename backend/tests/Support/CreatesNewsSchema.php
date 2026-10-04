<?php

namespace Tests\Support;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel `news` seperti di `db_apt` — kolom v1 ditambah kolom v2 — beserta
 * `news_images`.
 *
 * `news` milik portal v1 dan tidak dibuat oleh migrasi mana pun di repo ini,
 * jadi tes yang menyentuh berita harus membangunnya sendiri.
 */
trait CreatesNewsSchema
{
    protected function createNewsSchema(): void
    {
        Schema::dropIfExists('news_images');
        Schema::dropIfExists('news');

        Schema::create('news', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->string('slug')->unique();
            $table->string('category')->default('Berita');
            $table->text('content');
            $table->text('excerpt')->nullable();
            $table->string('author')->default('Humas Bandara');
            $table->unsignedInteger('views_count')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->string('status', 20)->default('published');
            $table->timestamp('published_at')->nullable();
            $table->string('image', 500)->nullable();
            $table->boolean('is_published')->default(true);
            $table->boolean('is_headline')->default(false);
            $table->timestamps();
        });

        Schema::create('news_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('news_id')->constrained('news')->cascadeOnDelete();
            $table->string('path', 500);
            $table->string('caption', 255)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }
}

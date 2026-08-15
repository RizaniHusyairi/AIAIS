<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Informasi Serta-Merta — pengumuman yang wajib disiarkan tanpa diminta.
 *
 * Isinya berbeda dari halaman PPID lain: bukan dokumen resmi, melainkan
 * peringatan keselamatan yang ditautkan ke pos media sosial bandara
 * (mis. bahaya bercanda soal bom, bahaya layang-layang di sekitar bandara).
 *
 * Nama tabelnya tunggal (`immediate_information`), menyimpang dari kelaziman
 * Laravel, jadi `$table` disebut eksplisit.
 *
 * Kolomnya berbahasa Indonesia mengikuti sumbernya di v1 dan dipertahankan:
 * `uraian` judul peringatan, `keterangan` ringkasannya, `link_text` label
 * tombolnya. `keterangan` warisan v1 sudah dipotong 150 karakter oleh
 * `Str::limit` di sana, jadi sebagian berakhir dengan elipsis — teks utuhnya
 * ada di tautannya, dan memanjangkannya di sini berarti mengarang kalimat.
 */
class ImmediateInformation extends Model
{
    protected $table = 'immediate_information';

    protected $fillable = ['uraian', 'keterangan', 'link_url', 'link_text'];
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Permintaan suku cadang oleh pegawai.
 *
 * CATATAN PENTING soal bentuk tabel v1: tidak ada kolom JUMLAH dan tidak ada
 * kolom STATUS. Artinya permintaan di sini murni pencatatan — ia tidak
 * mengurangi stok dan tidak punya keadaan "sudah dipenuhi".
 *
 * Bentuk itu dipertahankan apa adanya sampai cutover, tetapi konsekuensinya
 * harus disadari: `spare_parts.stock` adalah angka yang disunting petugas
 * secara manual, bukan hasil perhitungan dari permintaan yang masuk. Halaman
 * adminnya menyatakan hal ini supaya tak seorang pun mengira stoknya berkurang
 * sendiri. Menambahkan jumlah dan status adalah perubahan skema yang layak
 * dipertimbangkan pasca-cutover.
 */
class SparePartRequest extends Model
{
    protected $fillable = ['user_id', 'spare_part_id', 'subject', 'follow_up_notes', 'memo_link'];

    public function sparePart(): BelongsTo
    {
        return $this->belongsTo(SparePart::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

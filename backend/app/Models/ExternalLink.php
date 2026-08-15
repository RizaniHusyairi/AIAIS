<?php

namespace App\Models;

use App\Models\Concerns\ResolvesFileUrl;
use Illuminate\Database\Eloquent\Model;

/**
 * Tautan ke portal resmi pemerintah di luar aptpairport.id.
 *
 * Tabelnya milik portal v1 dan dipakai apa adanya. Dua hal yang perlu
 * diketahui:
 *
 *   - Kolom `group` adalah kata kunci SQL. Eloquent mengutipnya dengan benar,
 *     tetapi kueri mentah apa pun ke kolom ini harus memakai backtick.
 *   - `icon` berisi kelas Bootstrap Icons warisan v1 ("bi-megaphone-fill"),
 *     sedangkan v2 memakai lucide. Nilainya tetap dikirim apa adanya: halaman
 *     publik v2 memilih ikonnya sendiri per kelompok, dan membuang kolom ini
 *     berarti kehilangan pilihan petugas tanpa penggantinya.
 */
class ExternalLink extends Model
{
    use ResolvesFileUrl;

    protected $fillable = [
        'name', 'url', 'description', 'icon', 'logo_path', 'group', 'sort_order', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected $appends = ['logo_url'];

    public function getLogoUrlAttribute(): ?string
    {
        return $this->fileUrl($this->logo_path);
    }
}

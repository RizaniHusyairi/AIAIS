<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Permohonan Informasi Publik.
 *
 * Tabelnya `public_informations` warisan portal v1, diselaraskan lewat
 * penggantian nama kolom saat cutover. Namanya sengaja tidak ikut diganti:
 * itulah nama yang dikenal petugas PPID, dan menggantinya hanya akan memutus
 * relasi `user_id` yang sudah ada tanpa memberi manfaat.
 *
 * `ktp_path` dan `statement_path` sengaja disembunyikan dari serialisasi:
 * keduanya menunjuk berkas pada cakram privat berisi scan KTP pemohon, dan
 * respons API publik (pelacakan tiket) tidak boleh membocorkan lokasinya.
 * Petugas mengambilnya lewat endpoint admin bertoken.
 */
class InformationRequest extends Model
{
    use HasFactory;

    /** Status yang dikenali; dipakai pula sebagai aturan validasi. */
    public const STATUSES = ['submitted', 'in_progress', 'fulfilled', 'rejected'];

    protected $table = 'public_informations';

    protected $fillable = [
        'ticket_number',
        'ktp_path',
        'statement_path',
        'request_from',
        'name',
        'address',
        'occupation',
        'npwp',
        'phone',
        'email',
        'information_details',
        'information_purpose',
        'obtain_method',
        'copy_method',
        'status',
        'admin_response',
        'response_link',
        'responded_at',
        'due_date',
        'is_extended',
    ];

    protected $hidden = [
        'ktp_path',
        'statement_path',
    ];

    protected $casts = [
        'responded_at' => 'datetime',
        'due_date' => 'date',
        'is_extended' => 'boolean',
    ];

    /**
     * Bentuk ringkas untuk pelacakan publik.
     *
     * Sengaja TIDAK memuat data pribadi pemohon selain nama depan-belakang
     * yang sudah mereka ketahui sendiri: siapa pun yang menebak nomor tiket
     * tidak boleh memperoleh alamat, NPWP, telepon, atau surel orang lain.
     */
    public function publicView(): array
    {
        return [
            'ticket_number' => $this->ticket_number,
            'status' => $this->status,
            'submitted_at' => $this->created_at,
            'due_date' => $this->due_date,
            'is_extended' => $this->is_extended,
            'responded_at' => $this->responded_at,
            'admin_response' => $this->admin_response,
            'response_link' => $this->response_link,
        ];
    }
}

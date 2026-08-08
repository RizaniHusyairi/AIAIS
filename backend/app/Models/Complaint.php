<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * Pengaduan publik — jalur formal berlampiran bukti.
 *
 * Berbeda dari `ChatThread` yang bersifat percakapan, satu pengaduan adalah
 * satu berkas kasus: dikirim sekali, boleh menyertakan foto, lalu dijawab
 * petugas dan ditutup dengan status akhir.
 */
class Complaint extends Model
{
    use HasFactory;

    /**
     * Kategori yang dikenali; dipakai pula sebagai aturan validasi.
     *
     * "Apresiasi" dibawa kembali dari portal v1 — di sana pengunjung dapat
     * memilih Informasi/Keluhan/Saran/Apresiasi, dan v2 sempat menghilangkan
     * yang terakhir sehingga pujian terhadap petugas tidak punya tempat.
     */
    public const CATEGORIES = [
        'Informasi Penerbangan',
        'Fasilitas & Kebersihan',
        'Kritik & Saran',
        'Parkir & Transportasi',
        'Kargo & EMPU',
        'Keamanan & Keselamatan',
        'Apresiasi',
        'Lainnya',
    ];

    /** Status yang dikenali; `submitted` adalah keadaan awal. */
    public const STATUSES = ['submitted', 'in_progress', 'resolved', 'rejected'];

    /** Status yang dianggap selesai — hanya ini yang boleh dinilai pengunjung. */
    public const CLOSED_STATUSES = ['resolved', 'rejected'];

    protected $fillable = [
        'ticket_number',
        'reporter_name',
        'reporter_email',
        'reporter_phone',
        'category',
        'subject',
        'description',
        'attachment',
        'status',
        'admin_response',
        'responded_at',
    ];

    protected $casts = [
        'responded_at' => 'datetime',
    ];

    protected $appends = ['attachment_url'];

    /**
     * URL publik lampiran, atau null bila berkasnya tidak ada.
     *
     * Kolomnya bisa menunjuk berkas yang sudah terhapus dari cakram; tanpa
     * pemeriksaan ini tautan pada panel petugas berujung 404.
     */
    public function getAttachmentUrlAttribute(): ?string
    {
        if (empty($this->attachment) || ! Storage::disk('public')->exists($this->attachment)) {
            return null;
        }

        return Storage::disk('public')->url($this->attachment);
    }

    /**
     * Bentuk ringkas untuk pelacakan publik.
     *
     * Nomor tiket adalah satu-satunya rahasia yang menjaga endpoint ini, dan
     * nomor tiket dapat ditebak. Karena itu nama, surel, dan telepon pelapor
     * TIDAK ikut dikirim — siapa pun yang menebak tiket orang lain hanya
     * memperoleh status penanganannya, bukan identitas pelapornya.
     * Pola yang sama dipakai `InformationRequest::publicView()`.
     */
    public function publicView(): array
    {
        return [
            'ticket_number' => $this->ticket_number,
            'category' => $this->category,
            'subject' => $this->subject,
            'status' => $this->status,
            'submitted_at' => $this->created_at,
            'admin_response' => $this->admin_response,
            'responded_at' => $this->responded_at,
            'attachment_url' => $this->attachment_url,
        ];
    }
}

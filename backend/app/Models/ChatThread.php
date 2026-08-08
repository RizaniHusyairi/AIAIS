<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Satu sesi percakapan antara pengunjung dan petugas.
 *
 * Nomor tiket adalah satu-satunya kunci yang menjaga percakapan ini — tidak
 * ada akun pengunjung. Karena nomor tiket dapat ditebak, respons publik
 * WAJIB memakai `publicView()`; lihat catatannya di bawah.
 */
class ChatThread extends Model
{
    use HasFactory;

    public const STATUSES = ['open', 'active', 'resolved', 'closed'];

    /** Status yang dianggap selesai — hanya ini yang boleh dinilai pengunjung. */
    public const CLOSED_STATUSES = ['resolved', 'closed'];

    protected $fillable = [
        'ticket_number',
        'visitor_name',
        'visitor_email',
        'visitor_phone',
        'category',
        'subject',
        'status',
        'last_activity_at',
    ];

    protected $casts = [
        'last_activity_at' => 'datetime',
    ];

    public function messages()
    {
        return $this->hasMany(ChatMessage::class, 'chat_thread_id')->orderBy('created_at', 'asc');
    }

    /**
     * Bentuk percakapan untuk pengunjung.
     *
     * `visitor_email` dan `visitor_phone` TIDAK ikut dikirim. Sebelumnya
     * seluruh baris dikembalikan apa adanya, sehingga siapa pun yang menebak
     * nomor tiket orang lain memperoleh surel dan nomor teleponnya. Nama
     * tetap dikirim karena ia sudah tampil pada gelembung pesan pengunjung
     * itu sendiri.
     *
     * @param  \Illuminate\Support\Collection|null  $messages
     *         Pesan yang hendak disertakan. Diisi terpisah agar pemanggil
     *         dapat mengirim hanya pesan baru (polling delta).
     */
    public function publicView($messages = null): array
    {
        return [
            'id' => $this->id,
            'ticket_number' => $this->ticket_number,
            'visitor_name' => $this->visitor_name,
            'category' => $this->category,
            'subject' => $this->subject,
            'status' => $this->status,
            'last_activity_at' => $this->last_activity_at,
            'created_at' => $this->created_at,
            'messages' => ($messages ?? $this->messages)->values(),
        ];
    }
}

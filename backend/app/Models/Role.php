<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Jabatan dalam struktur bandara — Kepala Bandara, Kasubbag, Kasi, Staff.
 *
 * Ini sumbu kewenangan FUNGSIONAL, terpisah dari `is_admin`/`is_staff` yang
 * menjaga akses panel. Peran menentukan apa yang boleh dikerjakan seseorang di
 * dalam panel staff (memverifikasi surat, menyetujui pekerjaan), bukan apakah
 * ia boleh masuk. Keduanya sengaja tidak disatukan.
 *
 * `parent_role_id` menyimpan hierarki jabatan dan SENGAJA TIDAK DIBACA kode
 * mana pun. Di v1 kolom ini di-seed lengkap tetapi tak satu pun baris kode
 * membacanya: rantai persetujuan persuratan justru berupa daftar verifikator
 * terurut yang dipilih pembuat surat, ditambah satu penyetuju akhir.
 * Menambahkan pewarisan hierarki di sini akan menciptakan jalur kewenangan
 * kedua yang dapat memberi persetujuan kepada orang di luar daftar itu.
 */
class Role extends Model
{
    protected $fillable = ['name', 'parent_role_id'];

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'role_user')->withTimestamps();
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'permission_role')->withTimestamps();
    }
}

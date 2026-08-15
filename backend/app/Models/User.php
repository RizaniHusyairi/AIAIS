<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Akun pengguna — tabelnya milik portal v1.
 *
 * v1 menyatakan kewenangan lewat dua bendera terpisah, `is_admin` dan
 * `is_staff`, sementara seluruh kode v2 menanyakan satu kolom `role`. Alih-alih
 * menambah kolom ketiga yang harus terus diselaraskan dengan dua yang sudah
 * ada, `role` di sini adalah pasangan accessor/mutator di atas keduanya —
 * sehingga hanya ada satu sumber kebenaran, dan aplikasi v1 tetap membacanya
 * dengan benar selama masa transisi.
 *
 * `deleted_at` juga sudah ada di v1: pengguna yang dinonaktifkan tidak boleh
 * hilang, karena baris persuratan dan pengajuan masih menunjuk mereka.
 */
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /** Peran yang dikenali; dipakai pula sebagai aturan validasi. */
    public const ROLES = ['admin', 'staff', 'user'];

    /** Cache kewenangan per instance; lihat `hasPermission()`. */
    protected ?array $permissionsCache = null;

    /**
     * `role`, `is_admin`, `is_staff`, dan `is_accepted` SENGAJA tidak ada di
     * sini. Keempatnya menentukan kewenangan, dan membiarkannya terisi lewat
     * mass assignment berarti satu `User::create($request->all())` yang lengah
     * cukup untuk mengangkat diri sendiri jadi admin. v1 memakai
     * `$guarded = []` dan terbuka lebar terhadap itu.
     *
     * Perubahannya lewat `setRole()` dan `setPersetujuan()` di bawah, yang
     * hanya dipanggil dari endpoint ber-middleware `role:admin`.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'address',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'fcm_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_admin' => 'boolean',
            'is_staff' => 'boolean',
            'is_accepted' => 'boolean',
        ];
    }

    /** Nama v2 untuk pasangan bendera `is_admin` / `is_staff` warisan v1. */
    protected function role(): Attribute
    {
        return Attribute::make(
            get: fn (): string => match (true) {
                (bool) ($this->attributes['is_admin'] ?? false) => 'admin',
                (bool) ($this->attributes['is_staff'] ?? false) => 'staff',
                default => 'user',
            },
            set: fn (string $value): array => [
                'is_admin' => $value === 'admin',
                'is_staff' => $value === 'staff',
            ],
        );
    }

    /**
     * Ubah peran akses panel.
     *
     * Hanya menyentuh kedua bendera. Keanggotaan `role_user` — jabatan
     * fungsional — TIDAK ikut disentuh. v1 melakukan sebaliknya: mencabut
     * status staff di sana memanggil `roles()->detach()` yang menghapus
     * SELURUH jabatan seseorang, hilang tanpa jejak.
     */
    public function setRole(string $role): void
    {
        $this->role = $role;
        $this->save();
    }

    /** Setujui atau cabut persetujuan akun. */
    public function setPersetujuan(bool $disetujui): void
    {
        $this->is_accepted = $disetujui;
        $this->save();

        // Persetujuan yang dicabut harus langsung berlaku. Middleware
        // `approved` sudah menolak permintaan berikutnya, tetapi mencabut
        // tokennya membuat sesi itu benar-benar berakhir, bukan sekadar
        // ditolak berulang kali.
        if (! $disetujui) {
            $this->tokens()->delete();
        }
    }

    /* ---------------- jabatan fungsional ---------------- */

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_user')->withTimestamps();
    }

    public function hasRole(string $nama): bool
    {
        return $this->roles->contains('name', $nama);
    }

    /**
     * Apakah salah satu jabatan pengguna ini membawa kewenangan tertentu.
     *
     * Hasilnya di-cache pada properti TERDEKLARASI. v1 menyimpannya di
     * properti dinamis `permissions_cache` yang tidak pernah dideklarasikan —
     * cara yang sudah usang sejak PHP 8.2 dan memicu peringatan.
     */
    public function hasPermission(string $nama): bool
    {
        $this->permissionsCache ??= $this->roles()
            ->with('permissions')
            ->get()
            ->flatMap(fn (Role $role) => $role->permissions->pluck('permission_name'))
            ->unique()
            ->all();

        return in_array($nama, $this->permissionsCache, true);
    }
}

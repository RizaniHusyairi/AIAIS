<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;

/**
 * Manajemen akun pengguna. Hanya untuk admin.
 *
 * Portal v1 mengelola akun lewat `Admin\CustomerController`, dan modul ini
 * memperbaiki tiga hal yang bermasalah di sana:
 *
 *   - Reset kata sandi v1 menetapkan sandi tetap `Apt123` untuk siapa pun dan
 *     menampilkannya di layar. Di sini yang dikirim adalah TAUTAN reset; tidak
 *     ada endpoint yang pernah mengembalikan kata sandi.
 *   - Mencabut status staff di v1 memanggil `roles()->detach()` yang menghapus
 *     seluruh jabatan fungsional seseorang. Di sini mengubah peran hanya
 *     menyentuh bendera akses panel.
 *   - `User::$guarded = []` di v1 membuat `is_admin` dapat diisi lewat mass
 *     assignment. Di sini kewenangan hanya berubah lewat endpoint khusus.
 *
 * Tiga penjaga mencegah admin mengunci dirinya sendiri: ia tidak dapat
 * menurunkan perannya sendiri, mencabut persetujuannya sendiri, atau menghapus
 * akunnya sendiri. Tanpa itu, satu klik keliru pada panel dengan admin tunggal
 * membuat portal tidak dapat dikelola siapa pun.
 */
class UserController extends Controller
{
    /** Daftar akun. `?role=`, `?status=`, `?q=` menyaring. */
    public function adminIndex(Request $request)
    {
        $users = User::query()
            ->when($request->query('q'), fn ($w, $q) => $w->where(
                fn ($s) => $s->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%"),
            ))
            ->when($request->query('status') === 'menunggu', fn ($w) => $w->where('is_accepted', false))
            ->when($request->query('status') === 'disetujui', fn ($w) => $w->where('is_accepted', true))
            ->orderByDesc('is_admin')
            ->orderByDesc('is_staff')
            ->orderBy('name')
            ->get()
            ->when(
                in_array($request->query('role'), User::ROLES, true),
                fn ($c) => $c->where('role', $request->query('role'))->values(),
            );

        return ApiResponse::success($users->map($this->bentukPublik(...))->values(), 'Daftar pengguna');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:125',
            'email' => 'required|email|max:125|unique:users,email',
            'password' => 'required|string|min:8',
            'phone' => ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')],
            'address' => 'nullable|string|max:125',
            'role' => 'required|in:'.implode(',', User::ROLES),
        ], $this->pesanValidasi());

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
        ]);

        // Akun yang dibuatkan admin langsung berlaku — persetujuan itu ada
        // untuk menyaring pendaftaran mandiri, bukan pekerjaan admin sendiri.
        $user->role = $validated['role'];
        $user->is_accepted = true;
        $user->save();

        return ApiResponse::success($this->bentukPublik($user), 'Pengguna berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:125',
            'email' => ['sometimes', 'required', 'email', 'max:125', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20', Rule::unique('users', 'phone')->ignore($user->id)],
            'address' => 'nullable|string|max:125',
        ], $this->pesanValidasi());

        $user->update($validated);

        return ApiResponse::success($this->bentukPublik($user->fresh()), 'Pengguna berhasil diperbarui');
    }

    /** Nonaktifkan akun (hapus lunak) dan cabut seluruh sesinya. */
    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($this->diriSendiri($request, $user)) {
            return ApiResponse::error('Anda tidak dapat menghapus akun Anda sendiri.', null, 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return ApiResponse::success(null, 'Pengguna berhasil dinonaktifkan');
    }

    public function approve($id)
    {
        $user = User::findOrFail($id);
        $user->setPersetujuan(true);

        return ApiResponse::success($this->bentukPublik($user), 'Akun disetujui');
    }

    public function reject(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($this->diriSendiri($request, $user)) {
            return ApiResponse::error('Anda tidak dapat mencabut persetujuan akun Anda sendiri.', null, 422);
        }

        $user->setPersetujuan(false);

        return ApiResponse::success($this->bentukPublik($user), 'Persetujuan akun dicabut');
    }

    public function setRole(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'role' => 'required|in:'.implode(',', User::ROLES),
        ], ['role.in' => 'Peran tidak dikenali.']);

        if ($this->diriSendiri($request, $user) && $validated['role'] !== 'admin') {
            return ApiResponse::error('Anda tidak dapat menurunkan peran Anda sendiri.', null, 422);
        }

        $user->setRole($validated['role']);

        // Peran turun berarti kewenangan token lama sudah tidak sesuai lagi.
        if ($validated['role'] === 'user') {
            $user->tokens()->delete();
        }

        return ApiResponse::success($this->bentukPublik($user), 'Peran pengguna diperbarui');
    }

    /**
     * Kirim tautan penggantian kata sandi kepada pengguna.
     *
     * Sengaja TIDAK menetapkan kata sandi baru. v1 memakai `Apt123` untuk
     * semua orang dan menampilkannya di layar — sandi yang dapat ditebak, sama
     * bagi setiap akun, dan terlihat siapa pun yang lewat di depan monitor.
     */
    public function sendResetLink($id)
    {
        $user = User::findOrFail($id);

        Password::sendResetLink(['email' => $user->email]);

        return ApiResponse::success(null, 'Tautan penggantian kata sandi telah dikirim ke surel pengguna.');
    }

    /* -------------------------------------------------------------- */

    private function diriSendiri(Request $request, User $user): bool
    {
        return $request->user()->id === $user->id;
    }

    /** Bentuk pengguna untuk panel — tanpa bendera mentah warisan v1. */
    private function bentukPublik(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'address' => $user->address,
            'role' => $user->role,
            'is_accepted' => (bool) $user->is_accepted,
            'created_at' => $user->created_at,
        ];
    }

    private function pesanValidasi(): array
    {
        return [
            'name.required' => 'Nama wajib diisi.',
            'email.required' => 'Alamat surel wajib diisi.',
            'email.email' => 'Alamat surel tidak sah.',
            'email.unique' => 'Alamat surel ini sudah terdaftar.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min' => 'Kata sandi minimal 8 karakter.',
            'phone.unique' => 'Nomor telepon ini sudah terdaftar.',
            'role.required' => 'Peran wajib dipilih.',
            'role.in' => 'Peran tidak dikenali.',
        ];
    }
}

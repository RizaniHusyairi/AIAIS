<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

/**
 * Masuk dan keluar panel pengelolaan.
 *
 * Tiga pemeriksaan dilakukan berurutan, dan urutannya disengaja: kredensial
 * dulu, baru status akun, baru kewenangan. Menukar urutannya membuat pesan
 * galat membocorkan alamat surel mana yang terdaftar.
 *
 * Portal v1 memeriksa `is_accepted` di tempat yang sama (LoginController),
 * dan pesannya dipertahankan apa adanya karena petugas sudah mengenalinya.
 * Yang berbeda: pemeriksaan itu diulang pada setiap permintaan lewat
 * middleware `approved`, sehingga mencabut persetujuan langsung berlaku.
 */
class AuthController extends Controller
{
    /** Peran yang boleh masuk ke panel pengelolaan. */
    private const PANEL_ROLES = ['admin', 'staff'];

    /**
     * Kemampuan token panel pengelolaan.
     *
     * Ini pemisah BIDANG, bukan pengganti peran: akun warga menerima token
     * berkemampuan `citizen`, dan tanpa penanda ini token aplikasi warga tetap
     * dapat memukul panel seandainya akunnya suatu saat dinaikkan perannya.
     * Kewenangan sebenarnya tetap dijaga middleware `role`.
     */
    private const PANEL_ABILITY = 'admin-panel';

    /** Kemampuan token akun warga — hanya membuka area pengajuan miliknya. */
    private const CITIZEN_ABILITY = 'citizen';

    /**
     * Pendaftaran akun warga.
     *
     * Akun yang lahir dari sini SELALU berperan `user`. `role`, `is_admin`,
     * `is_staff`, dan `is_accepted` tidak ada di `$fillable`, jadi bahkan bila
     * pendaftar mengirimkan kolom itu di badan permintaan, nilainya diabaikan
     * — bukan disaring, melainkan memang tak punya jalan masuk.
     *
     * Akunnya langsung aktif. v1 pun begitu, dan di sini alasannya tetap sah:
     * gerbang `is_accepted` melindungi PANEL, sedangkan warga sudah tertahan
     * `role:admin,staff` di sana dan tokennya hanya berkemampuan `citizen`.
     * Mewajibkan persetujuan petugas hanya akan menambah antrean manual bagi
     * tiap orang yang hendak mengajukan sesuatu, tanpa menutup risiko apa pun
     * yang belum tertutup.
     */
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            // Aturan nomor telepon ditiru apa adanya dari v1 supaya bentuk
            // nomornya seragam dengan 13 baris yang sudah ada.
            'phone' => 'required|numeric|digits_between:10,13|unique:users,phone',
            'address' => 'required|string|max:500',
            'password' => 'required|string|min:8|confirmed',
        ], [
            'name.required' => 'Nama lengkap wajib diisi.',
            'email.required' => 'Alamat surel wajib diisi.',
            'email.email' => 'Alamat surel tidak sah.',
            'email.unique' => 'Alamat surel ini sudah terdaftar.',
            'phone.required' => 'Nomor telepon wajib diisi.',
            'phone.numeric' => 'Nomor telepon hanya boleh berisi angka.',
            'phone.digits_between' => 'Nomor telepon harus 10 sampai 13 angka.',
            'phone.unique' => 'Nomor telepon ini sudah terdaftar.',
            'address.required' => 'Alamat wajib diisi.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min' => 'Kata sandi minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok.',
        ]);

        // `password` di-hash oleh cast `hashed` pada model. JANGAN memanggil
        // Hash::make() di sini — v1 melakukannya di call site, dan kode v1 yang
        // diporting tanpa dibersihkan akan meng-hash dua kali lalu mengunci
        // pemilik akunnya sendiri.
        $user = new User($data);
        $user->setPersetujuan(true);
        $user->save();

        $token = $user->createToken('akun-warga', [self::CITIZEN_ABILITY])->plainTextToken;

        return ApiResponse::success([
            'user' => $this->publicUser($user),
            'token' => $token,
        ], 'Pendaftaran berhasil', null, 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ], [
            'email.required' => 'Alamat surel wajib diisi.',
            'email.email' => 'Alamat surel tidak sah.',
            'password.required' => 'Kata sandi wajib diisi.',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return ApiResponse::error('Kredensial tidak valid', null, 401);
        }

        if (! $user->is_accepted) {
            return ApiResponse::error('Akun Anda belum disetujui. Silakan hubungi admin.', null, 403);
        }

        // Kemampuan token ditentukan PERAN, bukan pilihan pemanggil.
        //
        // Basis data warisan v1 memuat akun pemohon perizinan yang sama sekali
        // bukan pengelola portal. Mereka tetap boleh masuk — area pengajuan
        // memang milik mereka — tetapi tokennya hanya berkemampuan `citizen`,
        // sehingga seluruh rute `/admin` menolaknya lewat `ability:admin-panel`
        // sebelum middleware peran sempat dievaluasi. Inilah yang menjaga
        // berkas scan KTP pemohon lain tetap tertutup.
        $panel = in_array($user->role, self::PANEL_ROLES, true);

        $token = $user
            ->createToken(
                $panel ? 'admin-panel' : 'akun-warga',
                [$panel ? self::PANEL_ABILITY : self::CITIZEN_ABILITY]
            )
            ->plainTextToken;

        return ApiResponse::success([
            'user' => $this->publicUser($user),
            'token' => $token,
        ], 'Login berhasil');
    }

    public function me(Request $request)
    {
        return ApiResponse::success([
            'user' => $this->publicUser($request->user()),
        ], 'Data profil pengguna');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return ApiResponse::success(null, 'Logout berhasil');
    }

    /**
     * Ganti kata sandi sendiri.
     *
     * Sandi lama wajib disertakan: tanpa itu, perangkat yang ditinggalkan
     * terbuka dapat dipakai mengunci pemilik akunnya sendiri. Setelah berhasil,
     * SELURUH token lain dicabut — bila sandi diganti karena curiga bocor,
     * membiarkan sesi lain hidup membuat penggantiannya sia-sia.
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ], [
            'current_password.required' => 'Kata sandi saat ini wajib diisi.',
            'password.required' => 'Kata sandi baru wajib diisi.',
            'password.min' => 'Kata sandi baru minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok.',
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return ApiResponse::error('Kata sandi saat ini tidak cocok.', null, 422);
        }

        $user->password = $request->password;
        $user->save();

        $user->tokens()->delete();

        return ApiResponse::success(
            null,
            'Kata sandi berhasil diganti. Silakan masuk kembali.',
        );
    }

    /**
     * Kirim tautan reset kata sandi.
     *
     * Jawabannya SELALU sama, berhasil atau tidak. Membedakannya akan mengubah
     * endpoint ini menjadi alat memeriksa alamat surel mana yang terdaftar
     * sebagai pengelola bandara.
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ], [
            'email.required' => 'Alamat surel wajib diisi.',
            'email.email' => 'Alamat surel tidak sah.',
        ]);

        Password::sendResetLink($request->only('email'));

        return ApiResponse::success(
            null,
            'Bila alamat surel itu terdaftar, tautan penggantian kata sandi sudah dikirimkan.',
        );
    }

    /** Simpan kata sandi baru memakai token dari tautan surel. */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ], [
            'token.required' => 'Tautan penggantian kata sandi tidak lengkap.',
            'email.required' => 'Alamat surel wajib diisi.',
            'password.required' => 'Kata sandi baru wajib diisi.',
            'password.min' => 'Kata sandi baru minimal 8 karakter.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok.',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->password = $password;
                $user->setRememberToken(Str::random(60));
                $user->save();

                // Sandi berganti berarti sesi lama tidak boleh berlaku lagi.
                $user->tokens()->delete();

                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PasswordReset) {
            return ApiResponse::error(
                'Tautan penggantian kata sandi sudah tidak berlaku. Silakan minta yang baru.',
                null,
                422,
            );
        }

        return ApiResponse::success(null, 'Kata sandi berhasil diganti. Silakan masuk.');
    }

    /* -------------------------------------------------------------- */

    /**
     * Bentuk pengguna yang boleh keluar dari API.
     *
     * Sebelumnya `me()` mengembalikan model mentah, sehingga membocorkan
     * `is_admin`, `is_staff`, `phone`, dan `address` — sekaligus TIDAK memuat
     * `role`, karena aksesor tidak ikut terserialisasi. Akibatnya `login` dan
     * `me` mengirim bentuk yang berbeda untuk hal yang sama. Satu helper ini
     * menutup keduanya. Polanya mengikuti `publicView()` di ComplaintController.
     */
    private function publicUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ];
    }
}

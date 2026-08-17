<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\SiteEvent;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Perayaan bertanggal yang memicu animasi sambutan di beranda.
 *
 * Publik hanya mengenal SATU endpoint: perayaan yang sedang berlangsung.
 * Beranda tidak perlu daftar lengkapnya, dan mengirimkan seluruh jadwal
 * perayaan ke tiap pengunjung hanya menambah muatan tanpa guna.
 */
class SiteEventController extends Controller
{
    /**
     * Perayaan yang sedang berlangsung hari ini, atau `null`.
     *
     * `null` adalah jawaban yang sah dan yang paling sering terjadi — beranda
     * memperlakukannya sebagai "tidak ada animasi", bukan sebagai galat.
     */
    public function active()
    {
        $event = SiteEvent::berlangsung()->first();

        return ApiResponse::success($event, $event ? 'Perayaan yang sedang berlangsung' : 'Tidak ada perayaan hari ini');
    }

    /* ------------------------------ admin ------------------------------ */

    public function adminIndex()
    {
        $events = SiteEvent::orderByDesc('starts_on')->get();

        return ApiResponse::success($events, 'Daftar perayaan');
    }

    public function store(Request $request)
    {
        $data = $this->validasi($request);

        $event = SiteEvent::create($data);

        return ApiResponse::success($event, 'Perayaan ditambahkan', null, 201);
    }

    public function update(Request $request, int $id)
    {
        $event = SiteEvent::find($id);

        if (! $event) {
            return ApiResponse::error('Perayaan tidak ditemukan.', null, 404);
        }

        $event->update($this->validasi($request));

        return ApiResponse::success($event, 'Perayaan diperbarui');
    }

    public function destroy(int $id)
    {
        $event = SiteEvent::find($id);

        if (! $event) {
            return ApiResponse::error('Perayaan tidak ditemukan.', null, 404);
        }

        $event->delete();

        return ApiResponse::success(null, 'Perayaan dihapus');
    }

    /** @return array<string, mixed> */
    private function validasi(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:120',
            'theme' => ['required', 'string', Rule::in(SiteEvent::THEMES)],
            'starts_on' => 'required|date',
            // `after_or_equal` supaya perayaan sehari cukup mengisi tanggal
            // yang sama pada kedua medan.
            'ends_on' => 'required|date|after_or_equal:starts_on',
            'greeting' => 'nullable|string|max:120',
            'subgreeting' => 'nullable|string|max:180',
            'is_active' => 'boolean',
            'priority' => 'nullable|integer|min:1|max:999',
        ], [
            'name.required' => 'Nama perayaan wajib diisi.',
            'theme.in' => 'Tema animasi tidak dikenali.',
            'starts_on.required' => 'Tanggal mulai wajib diisi.',
            'ends_on.after_or_equal' => 'Tanggal selesai tidak boleh mendahului tanggal mulai.',
        ]);
    }
}

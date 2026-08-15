<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\NataruEvent;
use App\Models\NataruFlight;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Posko Nataru — pemantauan arus Natal dan Tahun Baru.
 *
 * ENDPOINT PETUGAS TANPA AKUN. `POST /nataru/{token}/flights` menulis data
 * tanpa autentikasi, dan itu disengaja: petugas lapangan berganti tiap giliran
 * jaga, dan mensyaratkan akun untuk tiap orang membuat datanya tidak terkirim
 * sama sekali. Portal v1 memakai cara yang sama.
 *
 * Karena itu tiga penjaga dipasang:
 *   - tokennya acak-aman 48 aksara dan tidak pernah ikut respons publik;
 *   - hanya periode yang masih `is_active` yang menerima kiriman;
 *   - lajunya dibatasi di berkas rute.
 *
 * Ringkasan publik sengaja TIDAK memuat harga tiket maupun nama petugas:
 * yang pertama informasi komersial maskapai, yang kedua data pribadi
 * pegawai — keduanya tidak perlu diketahui siapa pun yang memegang tautan.
 */
class NataruController extends Controller
{
    /* ---------------- jalur petugas lapangan ---------------- */

    /** Keterangan periode dari tokennya; dipakai formulir petugas. */
    public function showByToken(string $token)
    {
        $event = NataruEvent::where('public_token', $token)->first();

        if (! $event) {
            return ApiResponse::error('Tautan posko tidak dikenali.', null, 404);
        }

        return ApiResponse::success([
            'name' => $event->name,
            'start_date' => $event->start_date?->toDateString(),
            'end_date' => $event->end_date?->toDateString(),
            'is_active' => $event->is_active,
            'description' => $event->description,
        ], $event->is_active ? 'Posko terbuka' : 'Posko sudah ditutup');
    }

    /** Terima satu catatan penerbangan dari petugas lapangan. */
    public function storeByToken(Request $request, string $token)
    {
        $event = NataruEvent::where('public_token', $token)->first();

        if (! $event) {
            return ApiResponse::error('Tautan posko tidak dikenali.', null, 404);
        }

        if (! $event->is_active) {
            return ApiResponse::error('Posko untuk periode ini sudah ditutup.', null, 403);
        }

        $data = $this->validated($request);

        // Tanggal di luar rentang posko hampir selalu salah ketik tahun.
        if ($this->diLuarRentang($event, $data['flight_date'])) {
            return ApiResponse::error(
                'Tanggal penerbangan di luar periode posko ('
                .$event->start_date->format('d/m/Y').' – '.$event->end_date->format('d/m/Y').').',
                null,
                422,
            );
        }

        $flight = NataruFlight::create(NataruFlight::hitungTurunan($data) + [
            'nataru_event_id' => $event->id,
            // Petugas lapangan tidak masuk lewat akun; identitasnya tercatat
            // sebagai nama pada `officer_name`.
            'user_id' => null,
        ]);

        return ApiResponse::success(
            ['flight_number' => $flight->flight_number, 'pax_total' => $flight->pax_total],
            'Data penerbangan '.$flight->flight_number.' berhasil disimpan.',
            null,
            201,
        );
    }

    /* ---------------- ringkasan ---------------- */

    /** Ringkasan periode aktif; terbuka untuk umum. */
    public function summary()
    {
        $event = NataruEvent::where('is_active', true)->latest('start_date')->first();

        if (! $event) {
            return ApiResponse::success(null, 'Belum ada periode posko yang aktif');
        }

        return ApiResponse::success($this->ringkasEvent($event), 'Ringkasan Posko Nataru');
    }

    /**
     * Layar TV posko — hanya baca, memakai token TERPISAH.
     *
     * v1 memakai token yang sama untuk layar TV dan formulir petugas. Layar TV
     * terpampang di ruang publik dan URL-nya kerap terlihat; dengan token
     * tunggal, siapa pun yang membacanya memperoleh kemampuan MENULIS catatan
     * penerbangan. Lihat migrasi 2026_08_13_007000.
     */
    public function tvByToken(string $token)
    {
        $event = NataruEvent::where('display_token', $token)->first();

        if (! $event) {
            return ApiResponse::error('Tautan layar tidak dikenali.', null, 404);
        }

        return ApiResponse::success($this->ringkasEvent($event), 'Papan monitor Posko Nataru');
    }

    /**
     * Perbandingan dua periode, diselaraskan pada HARI PUNCAK.
     *
     * Inilah satu-satunya cara membandingkan dua musim Nataru yang bermakna:
     * keduanya jatuh pada tanggal kalender yang berbeda, sehingga menyandingkan
     * 24 Desember 2024 dengan 24 Desember 2025 membandingkan H-1 dengan H-3.
     * Sumbu yang dipakai adalah jarak hari terhadap puncaknya — H-3, H-2, H,
     * H+1 — persis seperti v1.
     *
     * Periode yang belum punya `peak_date` jatuh ke tanggal MULAI sebagai
     * acuan. Itu bukan pilihan yang bagus, tetapi lebih baik daripada menolak
     * menggambar apa pun; responsnya menyebutkan acuan yang dipakai supaya
     * pembacanya tahu.
     */
    public function comparison(Request $request)
    {
        $data = $request->validate([
            'event_id' => 'required|exists:nataru_events,id',
            'compare_id' => 'required|exists:nataru_events,id|different:event_id',
        ], [
            'event_id.required' => 'Periode utama wajib dipilih.',
            'event_id.exists' => 'Periode utama tidak ditemukan.',
            'compare_id.required' => 'Periode pembanding wajib dipilih.',
            'compare_id.exists' => 'Periode pembanding tidak ditemukan.',
            'compare_id.different' => 'Periode pembanding harus berbeda dari periode utama.',
        ]);

        $utama = NataruEvent::findOrFail($data['event_id']);
        $banding = NataruEvent::findOrFail($data['compare_id']);

        $seriUtama = $this->seriTerhadapPuncak($utama);
        $seriBanding = $this->seriTerhadapPuncak($banding);

        // Sumbu bersama: gabungan indeks H dari kedua periode, terurut, supaya
        // periode yang rentangnya lebih panjang tidak terpotong.
        $indeks = collect($seriUtama)->keys()
            ->merge(collect($seriBanding)->keys())
            ->unique()
            ->sort()
            ->values();

        return ApiResponse::success([
            'main' => $this->keteranganPeriode($utama),
            'compare' => $this->keteranganPeriode($banding),
            'series' => $indeks->map(fn ($i) => [
                'index' => (int) $i,
                'label' => $this->labelH((int) $i),
                'main_flights' => $seriUtama[$i]['flights'] ?? null,
                'main_passengers' => $seriUtama[$i]['passengers'] ?? null,
                'compare_flights' => $seriBanding[$i]['flights'] ?? null,
                'compare_passengers' => $seriBanding[$i]['passengers'] ?? null,
            ])->all(),
        ], 'Perbandingan periode Posko Nataru');
    }

    /* ---------------- panel pengelolaan ---------------- */

    public function adminEvents()
    {
        $events = NataruEvent::withCount('flights')->orderByDesc('start_date')->get();

        return ApiResponse::success($events, 'Daftar periode Posko Nataru');
    }

    /**
     * Kedua tautan, hanya lewat endpoint ini.
     *
     * Dipisahkan dengan sengaja: yang dibagikan ke petugas lapangan berbeda
     * dari yang dipasang di layar TV ruang publik. Token layar tidak dapat
     * menulis apa pun.
     */
    public function eventToken($id)
    {
        $event = NataruEvent::findOrFail($id);

        // Periode yang dibuat sebelum kolom `display_token` ada belum punya
        // tokennya; diterbitkan saat pertama kali diminta, bukan lewat migrasi
        // ulang.
        if (blank($event->display_token)) {
            $event->update(['display_token' => NataruEvent::tokenBaru()]);
        }

        return ApiResponse::success([
            'public_token' => $event->public_token,
            'display_token' => $event->display_token,
            'input_path' => '/posko/'.$event->public_token,
            'display_path' => '/posko/tv/'.$event->display_token,
        ], 'Tautan posko');
    }

    /** Terbitkan ulang token layar TV saja, tanpa mengganggu tautan petugas. */
    public function rotateDisplayToken($id)
    {
        $event = NataruEvent::findOrFail($id);
        $event->update(['display_token' => NataruEvent::tokenBaru()]);

        return ApiResponse::success([
            'display_token' => $event->display_token,
            'display_path' => '/posko/tv/'.$event->display_token,
        ], 'Tautan layar diperbarui. Layar yang sedang menyala perlu dimuat ulang.');
    }

    public function storeEvent(Request $request)
    {
        $data = $request->validate($this->aturanEvent(), $this->pesanEvent());
        // Dua token berbeda sejak awal: satu untuk petugas, satu untuk layar.
        $data['public_token'] = NataruEvent::tokenBaru();
        $data['display_token'] = NataruEvent::tokenBaru();

        $event = NataruEvent::create($data);

        return ApiResponse::success($event, 'Periode posko berhasil dibuat', null, 201);
    }

    public function updateEvent(Request $request, $id)
    {
        $event = NataruEvent::findOrFail($id);
        $event->update($request->validate($this->aturanEvent(true), $this->pesanEvent()));

        return ApiResponse::success($event->fresh(), 'Periode posko berhasil diperbarui');
    }

    /**
     * Terbitkan token baru.
     *
     * Dipakai bila tautan lamanya tersebar ke luar petugas. Tautan lama
     * langsung tidak berlaku — itu memang maksudnya.
     */
    public function rotateToken($id)
    {
        $event = NataruEvent::findOrFail($id);
        $event->update(['public_token' => NataruEvent::tokenBaru()]);

        return ApiResponse::success(
            ['public_token' => $event->public_token],
            'Token baru diterbitkan. Tautan lama sudah tidak berlaku.',
        );
    }

    public function destroyEvent($id)
    {
        $event = NataruEvent::findOrFail($id);

        if ($event->flights()->exists()) {
            return ApiResponse::error(
                'Periode ini masih memuat catatan penerbangan. Hapus catatannya lebih dulu bila memang hendak dibuang.',
                null,
                422,
            );
        }

        $event->delete();

        return ApiResponse::success(null, 'Periode posko berhasil dihapus');
    }

    /** Daftar penerbangan satu periode, untuk panel. */
    public function adminFlights(Request $request, $id)
    {
        $event = NataruEvent::findOrFail($id);

        $flights = $event->flights()
            ->when($request->query('direction'), fn ($q, $d) => $q->where('direction', $d))
            ->orderByDesc('flight_date')
            ->orderByDesc('flight_time')
            ->get();

        return ApiResponse::success([
            'event' => $event,
            'summary' => $this->ringkasEvent($event),
            'flights' => $flights,
        ], 'Catatan penerbangan posko');
    }

    public function updateFlight(Request $request, $id)
    {
        $flight = NataruFlight::findOrFail($id);

        // Nilai lama ikut diperhitungkan supaya load factor warisan v1 — yang
        // tersimpan tanpa kapasitas kursinya — tidak terhapus hanya karena
        // barisnya disunting untuk hal lain. Lihat NataruFlight::hitungTurunan.
        $flight->update(NataruFlight::hitungTurunan(
            array_merge($flight->only(array_keys($flight->getAttributes())), $this->validated($request, true)),
            $flight->load_factor,
        ));

        return ApiResponse::success($flight->fresh(), 'Catatan penerbangan berhasil diperbarui');
    }

    public function destroyFlight($id)
    {
        NataruFlight::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Catatan penerbangan berhasil dihapus');
    }

    /* -------------------------------------------------------------- */

    private function diLuarRentang(NataruEvent $event, string $tanggal): bool
    {
        return $tanggal < $event->start_date->toDateString()
            || $tanggal > $event->end_date->toDateString();
    }

    /**
     * Ringkasan satu periode.
     *
     * Rata-rata load factor menghitung HANYA penerbangan yang kapasitas
     * kursinya diketahui. Memasukkan yang null sebagai nol akan menyeret
     * turun angkanya tanpa alasan.
     */
    /**
     * Seri harian satu periode, berkunci JARAK HARI terhadap puncaknya.
     *
     * Kunci 0 berarti hari puncak, -1 sehari sebelumnya, +1 sehari sesudahnya.
     * Dengan begitu dua musim Nataru yang jatuh pada tanggal berbeda tetap
     * dapat disandingkan.
     *
     * @return array<int, array{flights: int, passengers: int}>
     */
    private function seriTerhadapPuncak(NataruEvent $event): array
    {
        $acuan = $event->peak_date ?? $event->start_date;

        if ($acuan === null) {
            return [];
        }

        $acuan = Carbon::parse($acuan)->startOfDay();

        return $event->flights()
            ->selectRaw('DATE(flight_date) as hari, COUNT(*) as penerbangan, SUM(pax_total) as penumpang')
            ->groupBy('hari')
            ->get()
            ->mapWithKeys(fn ($baris) => [
                (int) $acuan->diffInDays(Carbon::parse($baris->hari)->startOfDay(), false) => [
                    'flights' => (int) $baris->penerbangan,
                    'passengers' => (int) $baris->penumpang,
                ],
            ])
            ->all();
    }

    /** "H-3", "H", "H+2" — label sumbu perbandingan. */
    private function labelH(int $indeks): string
    {
        return match (true) {
            $indeks === 0 => 'H',
            $indeks < 0 => 'H'.$indeks,
            default => 'H+'.$indeks,
        };
    }

    /** @return array<string, mixed> */
    private function keteranganPeriode(NataruEvent $event): array
    {
        return [
            'id' => $event->id,
            'name' => $event->name,
            'start_date' => $event->start_date?->toDateString(),
            'end_date' => $event->end_date?->toDateString(),
            'peak_date' => $event->peak_date?->toDateString(),
            // Dinyatakan terang bila puncaknya belum diisi — pembaca grafik
            // harus tahu sumbunya diselaraskan pada tanggal mulai, bukan puncak.
            'reference' => $event->peak_date ? 'peak_date' : 'start_date',
        ];
    }

    private function ringkasEvent(NataruEvent $event): array
    {
        $flights = $event->flights()->get();

        return [
            'event' => [
                'id' => $event->id,
                'name' => $event->name,
                'start_date' => $event->start_date?->toDateString(),
                'end_date' => $event->end_date?->toDateString(),
                'peak_date' => $event->peak_date?->toDateString(),
                'is_active' => $event->is_active,
            ],
            'totals' => [
                'flights' => $flights->count(),
                'passengers' => (int) $flights->sum('pax_total'),
                'cargo' => (int) $flights->sum('cargo'),
                'baggage' => (int) $flights->sum('baggage'),
                'airlines' => $flights->pluck('airline')->unique()->count(),
                'average_load_factor' => $this->rataLoadFactor($flights),
            ],
            'by_direction' => collect(NataruFlight::DIRECTIONS)
                ->mapWithKeys(fn ($arah) => [$arah => $this->ringkasArah($flights->where('direction', $arah))])
                ->all(),
            'daily' => $flights
                ->groupBy(fn ($f) => $f->flight_date->toDateString())
                ->map(fn (Collection $hari, $tanggal) => [
                    'date' => $tanggal,
                    'flights' => $hari->count(),
                    'passengers' => (int) $hari->sum('pax_total'),
                ])
                ->sortBy('date')
                ->values()
                ->all(),
        ];
    }

    private function ringkasArah(Collection $flights): array
    {
        return [
            'flights' => $flights->count(),
            'passengers' => (int) $flights->sum('pax_total'),
            'average_load_factor' => $this->rataLoadFactor($flights),
        ];
    }

    private function rataLoadFactor(Collection $flights): ?float
    {
        $diketahui = $flights->whereNotNull('load_factor');

        return $diketahui->isEmpty() ? null : round((float) $diketahui->avg('load_factor'), 1);
    }

    private function aturanEvent(bool $partial = false): array
    {
        $p = $partial ? 'sometimes|' : '';

        return [
            'name' => $p.'required|string|max:255',
            'start_date' => $p.'required|date',
            'end_date' => $p.'required|date|after_or_equal:start_date',
            'peak_date' => 'nullable|date',
            'is_active' => 'boolean',
            'compare_event_id' => 'nullable|exists:nataru_events,id',
            'description' => 'nullable|string|max:5000',
        ];
    }

    private function pesanEvent(): array
    {
        return [
            'name.required' => 'Nama periode posko wajib diisi.',
            'start_date.required' => 'Tanggal mulai wajib diisi.',
            'end_date.required' => 'Tanggal selesai wajib diisi.',
            'end_date.after_or_equal' => 'Tanggal selesai tidak boleh mendahului tanggal mulai.',
            'compare_event_id.exists' => 'Periode pembanding tidak ditemukan.',
        ];
    }

    /**
     * Aturan satu catatan penerbangan.
     *
     * `pax_total` dan `load_factor` sengaja TIDAK ada di sini: keduanya
     * dihitung server dari angka penyusunnya, bukan diterima dari pengirim.
     */
    private function validated(Request $request, bool $partial = false): array
    {
        $p = $partial ? 'sometimes|' : '';

        return $request->validate([
            'flight_date' => $p.'required|date',
            'flight_time' => $p.'required|date_format:H:i,H:i:s',
            'airline' => $p.'required|string|max:100',
            'flight_number' => $p.'required|string|max:20',
            'status_flight' => $p.'required|in:'.implode(',', NataruFlight::STATUSES),
            'route' => $p.'required|string|max:100',
            'direction' => $p.'required|in:'.implode(',', NataruFlight::DIRECTIONS),
            'aircraft_type' => 'nullable|string|max:50',
            'aircraft_registration' => 'nullable|string|max:20',
            'seat_capacity' => 'nullable|integer|min:1|max:1000',
            'pax_adult' => $p.'required|integer|min:0',
            'pax_child' => $p.'required|integer|min:0',
            'pax_infant' => $p.'required|integer|min:0',
            'cargo' => $p.'required|integer|min:0',
            'baggage' => $p.'required|integer|min:0',
            'ticket_price_high' => 'nullable|numeric|min:0',
            'ticket_price_low' => 'nullable|numeric|min:0',
            'officer_name' => $p.'required|string|max:255',
            'remarks' => 'nullable|string|max:2000',
        ], [
            'flight_date.required' => 'Tanggal penerbangan wajib diisi.',
            'flight_time.required' => 'Jam penerbangan wajib diisi.',
            'flight_time.date_format' => 'Jam penerbangan harus berformat HH:MM.',
            'airline.required' => 'Maskapai wajib diisi.',
            'flight_number.required' => 'Nomor penerbangan wajib diisi.',
            'status_flight.in' => 'Jenis penerbangan tidak dikenali.',
            'route.required' => 'Rute wajib diisi.',
            'direction.in' => 'Arah penerbangan hanya boleh kedatangan atau keberangkatan.',
            'officer_name.required' => 'Nama petugas wajib diisi.',
            '*.min' => 'Angka tidak boleh negatif.',
        ]);
    }
}

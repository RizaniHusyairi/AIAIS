<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\KaraokeContestant;
use App\Models\KaraokeEvent;
use App\Models\KaraokeJudge;
use App\Models\KaraokeScore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Penilaian lomba karaoke internal.
 *
 * Tiga permukaan, satu controller:
 *
 *  - `live()`            papan skor terbuka, tanpa token, baca saja;
 *  - `showByToken()` /   papan seorang juri, dijaga token acak 48 aksara;
 *    `storeByToken()`
 *  - sisanya             panel admin di balik `auth:sanctum`.
 *
 * Bobot kriteria TIDAK PERNAH ditulis ulang di sini maupun di frontend: ia
 * hidup di `KaraokeScore::CRITERIA` dan ikut setiap respons sebagai `criteria`,
 * supaya layar juri menghitung dengan bobot yang sama persis dengan yang
 * dipakai basis data.
 */
class KaraokeController extends Controller
{
    /* ------------------------------------------------------------------ */
    /*  Publik                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Papan skor acara terbaru.
     *
     * Tidak memuat token apa pun — `KaraokeJudge::$hidden` yang menjaminnya,
     * dan itulah sebabnya endpoint ini boleh terbuka.
     */
    public function live()
    {
        $event = KaraokeEvent::query()
            ->orderByDesc('held_on')
            ->orderByDesc('id')
            ->first();

        if (! $event) {
            return ApiResponse::success(null, 'Belum ada acara lomba yang dibuat.');
        }

        return ApiResponse::success($this->rekap($event), 'Papan skor lomba karaoke');
    }

    /** Papan seorang juri, dibuka lewat tautan bertoken. */
    public function showByToken(string $token)
    {
        $judge = $this->juriDariToken($token);

        if (! $judge) {
            return ApiResponse::error('Tautan penilaian tidak dikenali atau sudah diganti.', null, 404);
        }

        $event = $judge->event;

        $milikSaya = KaraokeScore::where('karaoke_judge_id', $judge->id)
            ->get()
            ->keyBy('karaoke_contestant_id');

        return ApiResponse::success(
            array_merge($this->rekap($event), [
                'judge' => $judge->only(['id', 'name', 'position']),
                'my_scores' => $milikSaya,
            ]),
            'Papan nilai '.$judge->name,
        );
    }

    /**
     * Simpan nilai seorang juri atas seorang peserta.
     *
     * Dipanggil berulang oleh papan juri yang menyimpan otomatis, karena itu
     * `updateOrCreate` atas pasangan (juri, peserta) — bukan `create`.
     */
    public function storeByToken(Request $request, string $token)
    {
        $judge = $this->juriDariToken($token);

        if (! $judge) {
            return ApiResponse::error('Tautan penilaian tidak dikenali atau sudah diganti.', null, 404);
        }

        $event = $judge->event;

        if (! $event->terbuka()) {
            return ApiResponse::error('Penilaian sudah ditutup panitia. Nilai tidak dapat diubah lagi.', null, 409);
        }

        $data = $request->validate(
            [
                'contestant_id' => [
                    'required',
                    'integer',
                    // Peserta WAJIB milik acara juri ini. Tanpa aturan ini,
                    // token satu lomba dapat dipakai menilai peserta lomba lain.
                    Rule::exists('karaoke_contestants', 'id')->where('karaoke_event_id', $event->id),
                ],
            ] + $this->aturanKriteria(),
            [
                'contestant_id.required' => 'Peserta yang dinilai wajib disebutkan.',
                'contestant_id.exists' => 'Peserta tidak terdaftar pada lomba ini.',
            ] + $this->pesanKriteria(),
        );

        $score = KaraokeScore::updateOrCreate(
            [
                'karaoke_judge_id' => $judge->id,
                'karaoke_contestant_id' => $data['contestant_id'],
            ],
            array_intersect_key($data, array_flip(KaraokeScore::KRITERIA_KOLOM)),
        );

        /*
         * Rekap ikut dikembalikan supaya tab Hasil Akhir di layar juri bergerak
         * bersama nilai yang baru saja disimpan, tanpa permintaan kedua — papan
         * ini menyimpan tiap kali slidernya berhenti digeser, dan satu
         * permintaan tambahan per geseran akan menggandakan lalu lintasnya.
         */
        return ApiResponse::success(
            ['score' => $score->fresh(), 'totals' => $this->totals($event)],
            'Nilai tersimpan',
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Admin — acara                                                      */
    /* ------------------------------------------------------------------ */

    public function adminIndex()
    {
        $events = KaraokeEvent::query()
            ->withCount(['judges', 'contestants'])
            ->orderByDesc('held_on')
            ->orderByDesc('id')
            ->get();

        return ApiResponse::success($events, 'Daftar acara lomba karaoke');
    }

    /** Satu acara lengkap: juri, peserta, rekap, dan matriks nilai mentah. */
    public function adminShow($id)
    {
        $event = KaraokeEvent::findOrFail($id);

        $matriks = KaraokeScore::query()
            ->whereIn('karaoke_judge_id', $event->judges()->pluck('id'))
            ->get();

        return ApiResponse::success(
            array_merge($this->rekap($event), ['scores' => $matriks]),
            'Detail acara lomba karaoke',
        );
    }

    /**
     * Buat acara sekaligus juri bawaannya.
     *
     * Tiga juri berikut tokennya dibuat dalam satu transaksi supaya petugas
     * tidak perlu langkah kedua: acara tanpa juri adalah acara tanpa satu pun
     * tautan yang bisa dibagikan, dan itu bukan keadaan yang berguna.
     */
    public function store(Request $request)
    {
        $data = $this->validated($request);

        $event = DB::transaction(function () use ($data) {
            $event = KaraokeEvent::create($data);

            for ($i = 1; $i <= KaraokeEvent::JURI_BAWAAN; $i++) {
                KaraokeJudge::create([
                    'karaoke_event_id' => $event->id,
                    'name' => 'Juri '.$i,
                    'position' => $i,
                    'public_token' => KaraokeEvent::tokenBaru(),
                ]);
            }

            return $event;
        });

        return ApiResponse::success(
            $event->load('judges')->loadCount(['judges', 'contestants']),
            'Acara lomba berhasil dibuat beserta '.KaraokeEvent::JURI_BAWAAN.' juri',
            null,
            201,
        );
    }

    public function update(Request $request, $id)
    {
        $event = KaraokeEvent::findOrFail($id);
        $event->update($this->validated($request, true));

        return ApiResponse::success($event->fresh(), 'Acara lomba berhasil diperbarui');
    }

    public function destroy($id)
    {
        // Juri, peserta, dan nilainya ikut terhapus lewat `cascadeOnDelete`
        // pada migrasinya.
        KaraokeEvent::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Acara lomba berhasil dihapus');
    }

    /** Buka atau kunci penilaian. */
    public function toggle($id)
    {
        $event = KaraokeEvent::findOrFail($id);
        $event->status = $event->terbuka() ? 'locked' : 'open';
        $event->save();

        return ApiResponse::success(
            $event,
            $event->terbuka() ? 'Penilaian dibuka kembali' : 'Penilaian dikunci',
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Admin — juri dan tokennya                                          */
    /* ------------------------------------------------------------------ */

    /**
     * SATU-SATUNYA jalan keluar `public_token`.
     *
     * Endpoint terpisah, bukan kolom pada respons acara, dengan alasan yang
     * sama seperti token rapat: daftar acara kerap terbuka di layar yang
     * dilihat banyak orang, dan token yang ikut di sana sudah bocor sebelum
     * sempat dibagikan.
     */
    public function tokens($id)
    {
        $event = KaraokeEvent::findOrFail($id);

        $daftar = $event->judges->map(fn (KaraokeJudge $j) => [
            'id' => $j->id,
            'name' => $j->name,
            'position' => $j->position,
            'token' => $j->public_token,
        ]);

        return ApiResponse::success($daftar, 'Tautan penilaian juri');
    }

    /** Putar ulang token seorang juri; tautan lamanya langsung mati. */
    public function rotateToken($judgeId)
    {
        $judge = KaraokeJudge::findOrFail($judgeId);
        $judge->public_token = KaraokeEvent::tokenBaru();
        $judge->save();

        return ApiResponse::success(
            ['id' => $judge->id, 'name' => $judge->name, 'token' => $judge->public_token],
            'Tautan '.$judge->name.' berhasil diganti. Tautan lama tidak berlaku lagi.',
        );
    }

    public function storeJudge(Request $request, $eventId)
    {
        $event = KaraokeEvent::findOrFail($eventId);

        $data = $request->validate(
            ['name' => 'required|string|max:100'],
            ['name.required' => 'Nama juri wajib diisi.'],
        );

        $judge = KaraokeJudge::create([
            'karaoke_event_id' => $event->id,
            'name' => $data['name'],
            'position' => ((int) $event->judges()->max('position')) + 1,
            'public_token' => KaraokeEvent::tokenBaru(),
        ]);

        return ApiResponse::success($judge, 'Juri berhasil ditambahkan', null, 201);
    }

    public function updateJudge(Request $request, $id)
    {
        $judge = KaraokeJudge::findOrFail($id);

        $judge->update($request->validate(
            ['name' => 'required|string|max:100'],
            ['name.required' => 'Nama juri wajib diisi.'],
        ));

        return ApiResponse::success($judge->fresh(), 'Juri berhasil diperbarui');
    }

    public function destroyJudge($id)
    {
        // Nilai yang sudah diberikannya ikut terhapus — itu memang yang
        // dimaksud: juri yang dibatalkan tidak boleh menyisakan nilai yang
        // masih ikut dirata-ratakan.
        KaraokeJudge::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Juri berhasil dihapus beserta nilainya');
    }

    /* ------------------------------------------------------------------ */
    /*  Admin — peserta                                                    */
    /* ------------------------------------------------------------------ */

    public function storeContestant(Request $request, $eventId)
    {
        $event = KaraokeEvent::findOrFail($eventId);

        $data = $this->validatedPeserta($request);
        $data['karaoke_event_id'] = $event->id;
        $data['sort_order'] ??= ((int) $event->contestants()->max('sort_order')) + 1;

        $contestant = KaraokeContestant::create($data);

        return ApiResponse::success($contestant, 'Peserta berhasil ditambahkan', null, 201);
    }

    public function updateContestant(Request $request, $id)
    {
        $contestant = KaraokeContestant::findOrFail($id);
        $contestant->update($this->validatedPeserta($request, true));

        return ApiResponse::success($contestant->fresh(), 'Peserta berhasil diperbarui');
    }

    public function destroyContestant($id)
    {
        KaraokeContestant::findOrFail($id)->delete();

        return ApiResponse::success(null, 'Peserta berhasil dihapus');
    }

    /* ------------------------------------------------------------------ */
    /*  Penolong                                                           */
    /* ------------------------------------------------------------------ */

    private function juriDariToken(string $token): ?KaraokeJudge
    {
        return KaraokeJudge::with('event')->where('public_token', $token)->first();
    }

    /** Bagian respons yang sama untuk papan skor, papan juri, dan panel admin. */
    private function rekap(KaraokeEvent $event): array
    {
        return [
            'event' => $event->only(['id', 'title', 'held_on', 'location', 'status']),
            'judges' => $event->judges->map->only(['id', 'name', 'position'])->values(),
            'contestants' => $event->contestants->map->only(['id', 'name', 'number', 'song_title'])->values(),
            'criteria' => $this->criteria(),
            'totals' => $this->totals($event),
        ];
    }

    /** Kriteria berikut bobotnya, dalam urutan tampil. */
    private function criteria(): array
    {
        $out = [];

        foreach (KaraokeScore::CRITERIA as $key => $weight) {
            $out[] = ['key' => $key, 'weight' => $weight];
        }

        return $out;
    }

    /**
     * Subtotal tiap juri dan nilai akhir tiap peserta.
     *
     * Dihitung di sini, bukan sebagai aksesor pada `KaraokeContestant`: aksesor
     * akan menjalankan satu kueri untuk setiap baris peserta — N+1 yang sama
     * yang sudah dihindari `Meeting`. Di sini seluruh nilai satu acara diambil
     * dengan satu kueri, lalu dikelompokkan di memori.
     */
    private function totals(KaraokeEvent $event): array
    {
        $judges = $event->judges;
        $jumlahJuri = max($judges->count(), 1);

        $nilai = KaraokeScore::whereIn('karaoke_judge_id', $judges->pluck('id'))
            ->get()
            ->groupBy('karaoke_contestant_id');

        return $event->contestants->map(function (KaraokeContestant $peserta) use ($judges, $jumlahJuri, $nilai) {
            $baris = $nilai->get($peserta->id, collect())->keyBy('karaoke_judge_id');

            $perJuri = $judges->map(function (KaraokeJudge $juri) use ($baris) {
                $skor = $baris->get($juri->id);

                return [
                    'judge_id' => $juri->id,
                    'total' => $skor ? $skor->weighted_total : 0.0,
                    'is_complete' => $skor ? $skor->is_complete : false,
                ];
            })->values();

            return [
                'contestant_id' => $peserta->id,
                // Rata-rata atas SELURUH juri, termasuk yang belum menilai —
                // juri yang belum masuk dihitung nol. Peringkat sementara
                // karenanya tidak pernah melebih-lebihkan peserta yang baru
                // dinilai satu juri. `is_complete` yang menandainya.
                'final_score' => round($perJuri->sum('total') / $jumlahJuri, 2),
                'is_complete' => $perJuri->every(fn ($j) => $j['is_complete']),
                'by_judge' => $perJuri,
            ];
        })->values()->all();
    }

    /** Aturan validasi kelima kriteria. Dipakai apa adanya oleh `storeByToken`. */
    private function aturanKriteria(): array
    {
        $rentang = 'nullable|integer|min:'.KaraokeScore::NILAI_MIN.'|max:'.KaraokeScore::NILAI_MAKS;

        return array_fill_keys(KaraokeScore::KRITERIA_KOLOM, $rentang);
    }

    private function pesanKriteria(): array
    {
        $pesan = [];

        foreach (KaraokeScore::KRITERIA_KOLOM as $kolom) {
            $pesan[$kolom.'.integer'] = 'Nilai harus berupa angka bulat.';
            $pesan[$kolom.'.min'] = 'Nilai terendah adalah '.KaraokeScore::NILAI_MIN.'.';
            $pesan[$kolom.'.max'] = 'Nilai tertinggi adalah '.KaraokeScore::NILAI_MAKS.'.';
        }

        return $pesan;
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $p = $partial ? 'sometimes|' : '';

        return $request->validate([
            'title' => $p.'required|string|max:255',
            'held_on' => $p.'required|date',
            'location' => 'nullable|string|max:255',
            'status' => ['nullable', Rule::in(KaraokeEvent::STATUSES)],
        ], [
            'title.required' => 'Nama acara wajib diisi.',
            'held_on.required' => 'Tanggal pelaksanaan wajib diisi.',
            'held_on.date' => 'Tanggal pelaksanaan tidak sah.',
            'status.in' => 'Status acara tidak dikenali.',
        ]);
    }

    private function validatedPeserta(Request $request, bool $partial = false): array
    {
        $p = $partial ? 'sometimes|' : '';

        return $request->validate([
            'name' => $p.'required|string|max:150',
            'number' => 'nullable|integer|min:1|max:9999',
            'song_title' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
        ], [
            'name.required' => 'Nama peserta wajib diisi.',
            'number.integer' => 'Nomor undian harus berupa angka.',
        ]);
    }
}

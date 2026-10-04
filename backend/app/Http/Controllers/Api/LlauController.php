<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\AirTrafficLog;
use App\Models\LlauReport;
use App\Support\ParserLlau;
use App\Support\PenyusunLaporanLlau;
use App\Support\RingkasanLlau;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Rekapitulasi LLAU bulanan — sumber statistik lalu lintas udara portal.
 *
 * Petugas mengunggah berkas Excel LLAU apa adanya; tidak ada angka yang
 * diketik ulang. Alurnya dua langkah: `preview` mem-parse tanpa menyimpan
 * apa pun, lalu `store` mem-parse ulang berkas yang sama dan menerapkannya.
 * Tidak ada "draf" yang tertinggal di server bila petugas batal di tengah.
 *
 * Saat diterapkan, catatan harian `air_traffic_logs` bulan itu DITULIS ULANG
 * dari baris LLAU. Tabel itu tetap dipakai beranda PWA dan cetak PDF bulanan,
 * dan dengan begini isinya tidak pernah lagi diketik tangan.
 */
class LlauController extends Controller
{
    private const BULAN = [
        1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    /**
     * Dasbor publik satu bulan, beserta tren seluruh bulan.
     *
     * `?period=YYYY-MM`; tanpa itu, bulan terakhir yang diunggah.
     */
    public function index(Request $request)
    {
        $laporan = LlauReport::query()->orderByDesc('period')->get(['id', 'period', 'updated_at']);

        if ($laporan->isEmpty()) {
            return ApiResponse::success([
                'periods' => [], 'period' => null, 'previous' => null, 'trend' => [],
            ], 'Belum ada rekapitulasi LLAU');
        }

        $diminta = $request->query('period');
        $pilih = $diminta === null
            ? $laporan->first()
            : $laporan->first(fn ($l) => $l->period->format('Y-m') === $diminta);

        if ($pilih === null) {
            return ApiResponse::error('Periode tidak tersedia dalam rekapitulasi.', null, 422);
        }

        // Kunci cache berganti setiap kali ada laporan diunggah atau dihapus,
        // jadi agregat tidak pernah basi tanpa perlu dibersihkan manual.
        $versi = md5($laporan->map(fn ($l) => $l->id.'@'.$l->updated_at?->timestamp)->implode(','));

        $data = Cache::remember("llau:index:{$pilih->id}:{$versi}", now()->addDay(), function () use ($laporan, $pilih) {
            $sebelum = $laporan->first(fn ($l) => $l->period->equalTo($pilih->period->copy()->subMonthNoOverflow()));

            return [
                'periods' => $laporan->map(fn ($l) => $this->labelPeriode($l->period))->values()->all(),
                'period' => $this->labelPeriode($pilih->period) + ['updated_at' => $pilih->updated_at?->toIso8601String()]
                    + RingkasanLlau::rinci($this->baris($pilih->id)),
                'previous' => $sebelum
                    ? $this->labelPeriode($sebelum->period) + ['summary' => RingkasanLlau::ringkas($this->baris($sebelum->id))]
                    : null,
                'trend' => array_map(
                    fn ($t) => $t + ['label' => $this->labelPeriode(Carbon::parse($t['period'].'-01'))['short']],
                    array_slice(RingkasanLlau::tren(), -24),
                ),
            ];
        });

        return ApiResponse::success($data, 'Rekapitulasi LLAU');
    }

    /** Daftar laporan untuk panel admin, lengkap dengan peringatan masing-masing. */
    public function adminIndex()
    {
        $tren = collect(RingkasanLlau::tren())->keyBy('report_id');

        $laporan = LlauReport::query()
            ->with('uploader:id,name')
            ->orderByDesc('period')
            ->get()
            ->map(fn (LlauReport $l) => [
                'id' => $l->id,
                ...$this->labelPeriode($l->period),
                'original_name' => $l->original_name,
                'flight_count' => $l->flight_count,
                'passengers' => $tren[$l->id]['passengers'] ?? 0,
                'cargo' => $tren[$l->id]['cargo'] ?? 0,
                'otp_rate' => $tren[$l->id]['otp_rate'] ?? null,
                'warnings' => $l->warnings ?? [],
                'mismatch_ignored' => $l->mismatch_ignored,
                'uploaded_by' => $l->uploader?->name,
                'updated_at' => $l->updated_at?->toIso8601String(),
            ]);

        return ApiResponse::success($laporan, 'Daftar rekapitulasi LLAU');
    }

    /**
     * Rincian satu laporan untuk panel admin.
     *
     * Berbeda dari dasbor publik, di sini baris penerbangan IKUT dikirim —
     * petugas perlu menelusuri baris mana yang membuat angka janggal, dan
     * `row_number` menunjuk langsung ke baris di lembar Excel aslinya. Kolom
     * yang tidak dibutuhkan tabel (stempel waktu, id laporan) dibuang supaya
     * respons tujuh ratus baris tetap ringan.
     */
    public function show($id)
    {
        $laporan = LlauReport::query()->with('uploader:id,name')->findOrFail($id);
        $rows = $this->baris($laporan->id);

        $hitung = [];
        foreach (ParserLlau::KOLOM_ANGKA as $kolom => [$medan, $label]) {
            $hitung[] = [
                'column' => $kolom,
                'label' => $label,
                'excel' => $laporan->excel_totals[$kolom] ?? null,
                'computed' => array_sum(array_column($rows, $medan)),
            ];
        }

        $sebelum = LlauReport::query()
            ->whereDate('period', $laporan->period->copy()->subMonthNoOverflow())
            ->first();
        $tetangga = fn (string $op, string $arah) => LlauReport::query()
            ->whereDate('period', $op, $laporan->period->toDateString())
            ->orderBy('period', $arah)
            ->first(['id', 'period']);
        $lebihLama = $tetangga('<', 'desc');
        $lebihBaru = $tetangga('>', 'asc');

        $kolomTabel = [
            'id', 'row_number', 'flight_date', 'scheduled_at', 'actual_at', 'delay_minutes',
            'delay_category', 'origin', 'destination', 'operator_name', 'operator_icao',
            'operator_brand', 'flight_category', 'route_type', 'remarks', 'flight_number',
            'registration', 'aircraft_type', 'seat_capacity', 'direction', 'pax_adult',
            'pax_child', 'pax_infant', 'transit_adult', 'transit_child', 'transit_infant',
            'baggage_kg', 'cargo_kg', 'mail_kg',
        ];

        return ApiResponse::success([
            'report' => [
                'id' => $laporan->id,
                ...$this->labelPeriode($laporan->period),
                'original_name' => $laporan->original_name,
                'flight_count' => $laporan->flight_count,
                'warnings' => $laporan->warnings ?? [],
                'mismatch_ignored' => $laporan->mismatch_ignored,
                'uploaded_by' => $laporan->uploader?->name,
                'created_at' => $laporan->created_at?->toIso8601String(),
                'updated_at' => $laporan->updated_at?->toIso8601String(),
                'has_file' => Storage::disk(LlauReport::DISK)->exists($laporan->file_path),
            ],
            'totals' => $hitung,
            'detail' => RingkasanLlau::rinci($rows),
            'previous' => $sebelum
                ? $this->labelPeriode($sebelum->period) + ['id' => $sebelum->id, 'summary' => RingkasanLlau::ringkas($this->baris($sebelum->id))]
                : null,
            'neighbors' => [
                'older' => $lebihLama ? ['id' => $lebihLama->id] + $this->labelPeriode($lebihLama->period) : null,
                'newer' => $lebihBaru ? ['id' => $lebihBaru->id] + $this->labelPeriode($lebihBaru->period) : null,
            ],
            'flights' => array_map(fn ($r) => array_intersect_key($r, array_flip($kolomTabel)), $rows),
            // Isian bawaan dialog laporan bulanan. Sumbernya sama dengan
            // cetakan resmi lain (config/pejabat.php); ikut dikirim di sini
            // karena endpoint ini khusus admin — NIP tidak boleh lewat
            // endpoint publik, apalagi tertanam di bundel JavaScript.
            'signer' => [
                'nama' => mb_strtoupper((string) config('pejabat.penanda_tangan.nama')),
                'nip' => (string) config('pejabat.penanda_tangan.nip'),
            ],
        ], "Rincian rekapitulasi LLAU {$this->labelPeriode($laporan->period)['label']}");
    }

    /**
     * Susun "LAPORAN LLAU BULAN …" — lampiran surat laporan BLU — dalam
     * bentuk yang sama dengan laporan yang selama ini disusun tangan.
     *
     * POST, bukan GET: nama dan NIP penanda tangan ikut dikirim, dan NIP
     * adalah data pribadi yang tidak boleh tercatat di URL. Keduanya tidak
     * disimpan — hanya ditulis ke berkas yang diunduh.
     */
    public function laporan(Request $request, $id)
    {
        $data = $request->validate([
            'varian' => 'required|in:biasa,transit',
            'ttd_nama' => 'nullable|string|max:120',
            'ttd_nip' => ['nullable', 'string', 'max:30', 'regex:/^[0-9 ]*$/'],
        ], [
            'varian.in' => 'Varian laporan harus biasa atau transit.',
            'ttd_nip.regex' => 'NIP hanya berisi angka dan spasi.',
        ]);

        $laporan = LlauReport::findOrFail($id);
        $penyusun = new PenyusunLaporanLlau($data['varian'] === 'transit');
        $isi = $penyusun->susun($this->baris($laporan->id), $laporan->period, [
            'nama' => $data['ttd_nama'] ?? '',
            'nip' => $data['ttd_nip'] ?? '',
        ]);

        return response($isi, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$penyusun->namaBerkas($laporan->period).'"',
            'Cache-Control' => 'no-store',
        ]);
    }

    /**
     * Unduh berkas Excel asli.
     *
     * Hanya lewat endpoint admin bertoken: kaki berkasnya memuat nama dan NIP
     * penanda tangan, jadi berkas ini tidak pernah punya URL publik.
     */
    public function file($id)
    {
        $laporan = LlauReport::findOrFail($id);

        if (! Storage::disk(LlauReport::DISK)->exists($laporan->file_path)) {
            return ApiResponse::error('Berkas asli tidak ditemukan di arsip.', null, 404);
        }

        return Storage::disk(LlauReport::DISK)->download($laporan->file_path, $laporan->original_name);
    }

    /**
     * Baca berkas tanpa menyimpan apa pun — untuk ditinjau petugas.
     *
     * Berkas yang barisnya bermasalah tetap dijawab 200: pratinjau justru
     * bertugas MENUNJUKKAN masalahnya. Hanya berkas yang sama sekali bukan
     * LLAU yang dijawab 422.
     */
    public function preview(Request $request)
    {
        $berkas = $this->berkasSah($request);

        try {
            $hasil = ParserLlau::baca($berkas->getRealPath());
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), null, 422);
        }

        return ApiResponse::success($this->bentukPratinjau($hasil), 'Berkas berhasil dibaca');
    }

    /** Terapkan berkas: ganti data bulan itu seluruhnya. */
    public function store(Request $request)
    {
        $berkas = $this->berkasSah($request);
        $abaikanSelisih = $request->boolean('ignore_mismatch');

        try {
            $hasil = ParserLlau::baca($berkas->getRealPath());
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), null, 422);
        }

        if ($hasil['errors'] !== [] || $hasil['period'] === null) {
            return ApiResponse::error(
                'Berkas belum dapat diterapkan. Buka pratinjaunya untuk melihat baris yang bermasalah, perbaiki, lalu unggah ulang.',
                null,
                422,
            );
        }

        if ($hasil['mismatches'] !== [] && ! $abaikanSelisih) {
            return ApiResponse::error(
                'Hasil hitung tidak sama dengan baris JUMLAH di Excel. Periksa berkasnya, atau terapkan dengan menyatakan selisihnya diketahui.',
                null,
                422,
            );
        }

        $periode = Carbon::createFromFormat('Y-m-d', $hasil['period'].'-01')->startOfDay();

        // Berkas baru disimpan LEBIH DULU; berkas lama baru dihapus setelah
        // transaksi berhasil. Urutan sebaliknya bisa meninggalkan laporan
        // tanpa arsip bila penyimpanan gagal di tengah jalan.
        $lintasan = $berkas->storeAs(LlauReport::DIR, Str::uuid().'.xlsx', LlauReport::DISK);
        $berkasLama = LlauReport::query()->whereDate('period', $periode)->value('file_path');

        try {
            $laporan = DB::transaction(function () use ($hasil, $periode, $lintasan, $berkas, $request, $abaikanSelisih) {
                LlauReport::query()->whereDate('period', $periode)->delete();

                $laporan = LlauReport::create([
                    'period' => $periode->toDateString(),
                    'file_path' => $lintasan,
                    'original_name' => mb_substr($berkas->getClientOriginalName(), 0, 255),
                    'flight_count' => count($hasil['rows']),
                    'excel_totals' => $hasil['excel_totals'],
                    'warnings' => $hasil['warnings'],
                    'mismatch_ignored' => $hasil['mismatches'] !== [] && $abaikanSelisih,
                    'uploaded_by' => $request->user()?->id,
                ]);

                $kini = now();
                foreach (array_chunk($hasil['rows'], 300) as $potong) {
                    DB::table('llau_flights')->insert(array_map(
                        fn ($r) => $r + ['llau_report_id' => $laporan->id, 'created_at' => $kini, 'updated_at' => $kini],
                        $potong,
                    ));
                }

                $this->tulisUlangHarian($periode, $hasil['rows']);

                return $laporan;
            });
        } catch (Throwable $e) {
            Storage::disk(LlauReport::DISK)->delete($lintasan);
            throw $e;
        }

        if ($berkasLama && $berkasLama !== $lintasan) {
            Storage::disk(LlauReport::DISK)->delete($berkasLama);
        }

        return ApiResponse::success(
            $this->labelPeriode($laporan->period) + ['id' => $laporan->id, 'flight_count' => $laporan->flight_count],
            "Rekapitulasi LLAU {$this->labelPeriode($periode)['label']} berhasil diterapkan",
            null,
            201,
        );
    }

    /**
     * Hapus laporan satu bulan.
     *
     * Catatan harian bulan itu ikut terhapus: keduanya berasal dari berkas
     * yang sama, dan membiarkan catatan harian tanpa laporannya berarti
     * menayangkan angka yang sumbernya sudah ditarik.
     */
    public function destroy($id)
    {
        $laporan = LlauReport::findOrFail($id);
        $periode = $laporan->period->copy();

        DB::transaction(function () use ($laporan, $periode) {
            AirTrafficLog::query()
                ->whereBetween('date', [$periode->copy()->startOfMonth()->toDateString(), $periode->copy()->endOfMonth()->toDateString()])
                ->delete();
            $laporan->delete();
        });

        Storage::disk(LlauReport::DISK)->delete($laporan->file_path);

        return ApiResponse::success(null, "Rekapitulasi LLAU {$this->labelPeriode($periode)['label']} berhasil dihapus");
    }

    /* -------------------------------------------------------------- */

    private function berkasSah(Request $request): UploadedFile
    {
        $request->validate([
            'file' => 'required|file|extensions:xlsx|max:10240',
        ], [
            'file.required' => 'Pilih berkas Excel LLAU yang akan diunggah.',
            'file.extensions' => 'Berkas harus berformat .xlsx (Excel 2007 ke atas).',
            'file.max' => 'Ukuran berkas maksimal 10 MB.',
        ]);

        return $request->file('file');
    }

    /** Ringkasan hasil parse untuk ditinjau; baris mentah tidak dikirim. */
    private function bentukPratinjau(array $hasil): array
    {
        $ada = $hasil['period']
            ? LlauReport::query()->whereDate('period', $hasil['period'].'-01')->first()
            : null;

        return [
            'period' => $hasil['period'] ? $this->labelPeriode(Carbon::parse($hasil['period'].'-01')) : null,
            'flight_count' => count($hasil['rows']),
            'errors' => $hasil['errors'],
            'warnings' => $hasil['warnings'],
            'mismatches' => $hasil['mismatches'],
            'excel_totals' => $hasil['excel_totals'],
            'computed_totals' => $hasil['computed_totals'],
            'summary' => $hasil['rows'] !== [] ? RingkasanLlau::ringkas($hasil['rows']) : null,
            'replaces' => $ada ? ['id' => $ada->id, 'updated_at' => $ada->updated_at?->toIso8601String()] : null,
        ];
    }

    /**
     * Tulis ulang catatan harian satu bulan dari baris LLAU.
     *
     * Bulan itu dihapus dulu seluruhnya — termasuk catatan yang dulu diketik
     * tangan — supaya tidak ada hari yang tersisa dari sumber lain.
     */
    private function tulisUlangHarian(Carbon $periode, array $rows): void
    {
        AirTrafficLog::query()
            ->whereBetween('date', [$periode->copy()->startOfMonth()->toDateString(), $periode->copy()->endOfMonth()->toDateString()])
            ->delete();

        $hari = [];
        foreach ($rows as $r) {
            $t = $r['flight_date'];
            $k = $r['direction'] === 'A' ? 'arrival' : 'departure';
            $hari[$t] ??= array_fill_keys(array_merge(...array_map(
                fn ($c) => ["{$c}_arrival", "{$c}_departure"],
                AirTrafficLog::CATEGORIES,
            )), 0);

            $hari[$t]["aircraft_{$k}"]++;
            $hari[$t]["passenger_{$k}"] += RingkasanLlau::penumpang($r);
            $hari[$t]["baggage_{$k}"] += $r['baggage_kg'];
            $hari[$t]["cargo_{$k}"] += $r['cargo_kg'];
        }

        $kini = now();
        $isi = [];
        foreach ($hari as $tanggal => $angka) {
            $isi[] = ['date' => $tanggal, 'created_at' => $kini, 'updated_at' => $kini] + $angka;
        }

        if ($isi !== []) {
            AirTrafficLog::insert($isi);
        }
    }

    /** @return array<int, array<string, mixed>> */
    private function baris(int $laporanId): array
    {
        return DB::table('llau_flights')
            ->where('llau_report_id', $laporanId)
            ->orderBy('row_number')
            ->get()
            ->map(fn ($r) => (array) $r)
            ->all();
    }

    /** @return array{period: string, label: string, short: string, year: int, month: int} */
    private function labelPeriode(Carbon $tanggal): array
    {
        $bulan = self::BULAN[(int) $tanggal->month];

        return [
            'period' => $tanggal->format('Y-m'),
            'label' => "{$bulan} {$tanggal->year}",
            'short' => mb_substr($bulan, 0, 3).' '.substr((string) $tanggal->year, 2),
            'year' => (int) $tanggal->year,
            'month' => (int) $tanggal->month,
        ];
    }
}

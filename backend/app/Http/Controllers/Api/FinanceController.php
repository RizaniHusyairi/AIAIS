<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\BudgetExpense;
use App\Models\Finance;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

/**
 * Kinerja keuangan — pemasukan, anggaran, dan rinciannya.
 *
 * Seperti statistik lalu lintas udara, endpoint publiknya mengembalikan
 * AGREGAT: yang dicari pengunjung adalah tren tahunan, bukan 23 baris jurnal.
 *
 * Dua penyimpangan v1 yang TIDAK ditiru:
 *
 * 1. v1 melabeli jumlah `budget_expenses` sebagai "Pengeluaran"/"Realisasi"
 *    pada grafik publik. Itu keliru dan merugikan bandara sendiri: rincian
 *    baru dicatat untuk sebagian anggaran, sehingga anggaran 2025 sebesar
 *    Rp 1,2 miliar yang rinciannya baru terisi Rp 550 juta tampil seolah
 *    serapannya 46%. Yang diukur angka itu sebenarnya adalah SEBERAPA JAUH
 *    ANGGARANNYA SUDAH DIRINCI, bukan seberapa banyak uangnya terpakai.
 *    Karena itu namanya `detailed` di seluruh respons — tidak ada satu pun
 *    kunci bernama "realisasi" yang bisa disalahbaca konsumen berikutnya.
 * 2. v1 mengisi keduabelas bulan dengan nol, sehingga bulan yang datanya
 *    belum masuk tak terbedakan dari bulan tanpa transaksi. Di sini periode
 *    tanpa catatan tidak muncul.
 *
 * Angkanya dikirim dalam rupiah penuh. v1 membaginya dengan satu miliar di
 * sisi server, yang membuang ketelitian sebelum siapa pun sempat memutuskan
 * satuan tampilannya.
 */
class FinanceController extends Controller
{
    private const BULAN = [
        1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    /**
     * Ringkasan publik.
     *
     * `?year=` menyaring satu tahun dan memecah serinya per bulan; tanpa itu,
     * serinya per tahun.
     */
    public function index(Request $request)
    {
        $tahunTersedia = Finance::query()
            ->selectRaw('DISTINCT YEAR(date) as tahun')
            ->orderByDesc('tahun')
            ->pluck('tahun')
            ->map(fn ($t) => (int) $t)
            ->all();

        $tahun = $request->query('year');

        if ($tahun !== null && ! in_array((int) $tahun, $tahunTersedia, true)) {
            return ApiResponse::error('Tahun tidak tersedia dalam catatan.', null, 422);
        }

        $catatan = Finance::with('budgetExpenses')
            ->when($tahun, fn ($q) => $q->whereYear('date', $tahun))
            ->orderBy('date')
            ->get();

        return ApiResponse::success([
            'years' => $tahunTersedia,
            'year' => $tahun !== null ? (int) $tahun : null,
            'entries' => $catatan->count(),
            'summary' => $this->ringkas($catatan),
            'series' => $tahun !== null
                ? $this->seriBulanan($catatan)
                : $this->seriTahunan($catatan),
            'sources' => $this->sumberDana($catatan),
        ], 'Kinerja keuangan');
    }

    /** Daftar admin — seluruh catatan berikut rinciannya, terbaru lebih dulu. */
    public function adminIndex(Request $request)
    {
        $catatan = Finance::with('budgetExpenses')
            ->when($request->query('year'), fn ($q, $y) => $q->whereYear('date', $y))
            ->when($request->query('flow_type'), fn ($q, $f) => $q->where('flow_type', $f))
            ->orderByDesc('date')
            ->orderByDesc('id')
            ->get();

        return ApiResponse::success($catatan, 'Catatan keuangan');
    }

    public function store(Request $request)
    {
        $catatan = Finance::create($this->validated($request));

        return ApiResponse::success(
            $catatan->load('budgetExpenses'),
            'Catatan keuangan berhasil ditambahkan',
            null,
            201
        );
    }

    public function update(Request $request, $id)
    {
        $catatan = Finance::findOrFail($id);
        $data = $this->validated($request, partial: true);

        // Mengubah anggaran menjadi pemasukan akan meninggalkan rincian yang
        // menggantung pada baris yang tak lagi bisa memilikinya. Ditolak, bukan
        // dihapus diam-diam — rinciannya data yang diketik orang.
        $jadiPemasukan = ($data['flow_type'] ?? $catatan->flow_type) === 'in';

        if ($jadiPemasukan && $catatan->budgetExpenses()->exists()) {
            return ApiResponse::error(
                'Catatan ini masih memiliki rincian anggaran. Hapus rinciannya dahulu sebelum mengubahnya menjadi pemasukan.',
                null,
                422
            );
        }

        $catatan->update($data);

        return ApiResponse::success(
            $catatan->fresh()->load('budgetExpenses'),
            'Catatan keuangan berhasil diperbarui'
        );
    }

    public function destroy($id)
    {
        $catatan = Finance::findOrFail($id);
        $jumlahRincian = $catatan->budgetExpenses()->count();

        // FK-nya ON DELETE CASCADE, jadi rinciannya ikut terhapus. Jumlahnya
        // disebutkan dalam pesan supaya petugas tahu persis apa yang hilang.
        $catatan->delete();

        return ApiResponse::success(null, $jumlahRincian > 0
            ? "Catatan keuangan berhasil dihapus beserta {$jumlahRincian} rincian anggarannya"
            : 'Catatan keuangan berhasil dihapus');
    }

    /* ------------------------- rincian anggaran ------------------------- */

    public function storeExpense(Request $request, $id)
    {
        $anggaran = Finance::findOrFail($id);

        if ($anggaran->flow_type !== 'budget') {
            return ApiResponse::error('Rincian hanya dapat ditambahkan pada catatan anggaran.', null, 422);
        }

        $data = $this->validatedExpense($request);
        $rincian = $anggaran->budgetExpenses()->create($data);

        return ApiResponse::success(
            $rincian,
            $this->pesanRincian($anggaran->fresh(), 'ditambahkan'),
            null,
            201
        );
    }

    public function updateExpense(Request $request, $id)
    {
        $rincian = BudgetExpense::findOrFail($id);
        $rincian->update($this->validatedExpense($request, partial: true));

        return ApiResponse::success(
            $rincian->fresh(),
            $this->pesanRincian($rincian->finance()->first(), 'diperbarui')
        );
    }

    public function destroyExpense($id)
    {
        $rincian = BudgetExpense::findOrFail($id);
        $anggaran = $rincian->finance()->first();
        $rincian->delete();

        return ApiResponse::success(null, $this->pesanRincian($anggaran, 'dihapus'));
    }

    /* -------------------------------------------------------------- */

    /**
     * Pesan yang sekalian melaporkan sisa anggarannya.
     *
     * Rincian selalu disunting satu per satu, dan yang ingin diketahui petugas
     * sesudahnya justru angka agregatnya — menyebutkannya di sini menghemat
     * satu perjalanan bolak-balik ke daftar.
     */
    private function pesanRincian(?Finance $anggaran, string $tindakan): string
    {
        $dasar = "Rincian anggaran berhasil {$tindakan}";

        if ($anggaran === null) {
            return $dasar;
        }

        $sisa = $anggaran->fresh()->load('budgetExpenses')->remaining;

        if ($sisa === null || $sisa === 0) {
            return $dasar;
        }

        return $sisa > 0
            ? $dasar.'. Sisa anggaran yang belum terinci: Rp '.number_format($sisa, 0, ',', '.')
            : $dasar.'. Peringatan: rinciannya melampaui pagu anggaran sebesar Rp '.number_format(abs($sisa), 0, ',', '.');
    }

    /** Jumlahkan pemasukan, anggaran, dan rincian pada sekumpulan catatan. */
    private function ringkas(Collection $catatan): array
    {
        $anggaran = $catatan->where('flow_type', 'budget');
        $totalAnggaran = (int) $anggaran->sum('amount');
        $terinci = (int) $anggaran->sum(fn (Finance $f) => $f->budgetExpenses->sum('amount'));

        return [
            'income' => (int) $catatan->where('flow_type', 'in')->sum('amount'),
            'budget' => $totalAnggaran,
            'detailed' => $terinci,
            'undetailed' => $totalAnggaran - $terinci,
        ];
    }

    private function seriTahunan(Collection $catatan): array
    {
        return $catatan
            ->groupBy(fn (Finance $f) => $f->date->year)
            ->map(fn (Collection $baris, $tahun) => [
                'period' => (string) $tahun,
                'label' => (string) $tahun,
                'entries' => $baris->count(),
            ] + $this->ringkas($baris))
            ->values()
            ->all();
    }

    private function seriBulanan(Collection $catatan): array
    {
        return $catatan
            ->groupBy(fn (Finance $f) => $f->date->month)
            ->map(fn (Collection $baris, $bulan) => [
                'period' => sprintf('%04d-%02d', $baris->first()->date->year, $bulan),
                'label' => self::BULAN[$bulan],
                'entries' => $baris->count(),
            ] + $this->ringkas($baris))
            ->values()
            ->all();
    }

    /**
     * Rekap per sumber dana.
     *
     * Baris tanpa sumber dilewati, tidak dikelompokkan sebagai "Lainnya":
     * sebagian besar catatan v1 memang belum mengisi kolom ini, dan sebuah
     * potongan "Lainnya" raksasa hanya akan menenggelamkan sumber yang sudah
     * benar-benar terdata.
     */
    private function sumberDana(Collection $catatan): array
    {
        return $catatan
            ->filter(fn (Finance $f) => filled($f->source))
            ->groupBy('source')
            ->map(fn (Collection $baris, $sumber) => [
                'source' => $sumber,
                'amount' => (int) $baris->sum('amount'),
                'entries' => $baris->count(),
            ])
            ->sortByDesc('amount')
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, bool $partial = false): array
    {
        $ada = $partial ? 'sometimes|' : '';

        return $request->validate([
            'date' => $ada.'required|date',
            'flow_type' => [...($partial ? ['sometimes'] : []), 'required', Rule::in(Finance::FLOW_TYPES)],
            'amount' => $ada.'required|integer|min:0',
            'source' => 'nullable|string|max:125',
            'note' => 'nullable|string',
        ], [
            'date.required' => 'Tanggal wajib diisi.',
            'flow_type.required' => 'Jenis catatan wajib dipilih.',
            'flow_type.in' => 'Jenis catatan harus pemasukan atau anggaran.',
            'amount.required' => 'Nominal wajib diisi.',
            'amount.integer' => 'Nominal harus berupa angka tanpa titik atau koma.',
            'amount.min' => 'Nominal tidak boleh negatif.',
            'source.max' => 'Sumber dana maksimal 125 karakter.',
        ]);
    }

    /** @return array<string, mixed> */
    private function validatedExpense(Request $request, bool $partial = false): array
    {
        $ada = $partial ? 'sometimes|' : '';

        return $request->validate([
            'description' => $ada.'required|string|max:125',
            'amount' => $ada.'required|integer|min:0',
        ], [
            'description.required' => 'Uraian rincian wajib diisi.',
            'description.max' => 'Uraian maksimal 125 karakter.',
            'amount.required' => 'Nominal wajib diisi.',
            'amount.integer' => 'Nominal harus berupa angka tanpa titik atau koma.',
            'amount.min' => 'Nominal tidak boleh negatif.',
        ]);
    }
}

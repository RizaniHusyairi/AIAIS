<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\AirTrafficLog;
use App\Support\CetakanPdf;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Statistik lalu lintas udara.
 *
 * Endpoint publiknya mengembalikan AGREGAT, bukan 91 baris harian mentah:
 * yang dicari pengunjung adalah tren, dan mengirim seluruh baris memaksa
 * setiap tampilan menjumlahkannya sendiri — pekerjaan yang sama, diulang di
 * tiap klien, dengan peluang berbeda hasil.
 *
 * Bentuk keluarannya sengaja BERBEDA dari v1. Di sana responsnya berupa larik
 * paralel sepanjang 12 yang diisi nol untuk bulan tanpa data, sehingga
 * "belum ada data" dan "benar-benar nol" tidak dapat dibedakan. Di sini tiap
 * periode adalah satu objek bernama, dan periode tanpa data tidak muncul.
 *
 * Catatan hariannya tidak lagi diketik tangan: `LlauController` menulis ulang
 * satu bulan penuh setiap kali rekapitulasi LLAU diterapkan.
 */
class AirTrafficController extends Controller
{
    /** Nama bulan Indonesia untuk label periode. */
    private const BULAN = [
        1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];

    /**
     * Statistik publik.
     *
     * `?year=` menyaring satu tahun dan memecah seri per bulan; tanpa itu,
     * serinya per tahun.
     */
    public function index(Request $request)
    {
        $tahunTersedia = AirTrafficLog::query()
            ->selectRaw('DISTINCT YEAR(date) as tahun')
            ->orderByDesc('tahun')
            ->pluck('tahun')
            ->map(fn ($t) => (int) $t)
            ->all();

        $tahun = $request->query('year');

        if ($tahun !== null && ! in_array((int) $tahun, $tahunTersedia, true)) {
            return ApiResponse::error('Tahun tidak tersedia dalam catatan.', null, 422);
        }

        $logs = AirTrafficLog::query()
            ->when($tahun, fn ($q) => $q->whereYear('date', $tahun))
            ->orderBy('date')
            ->get();

        $seri = $tahun !== null
            ? $this->seriBulanan($logs)
            : $this->seriTahunan($logs);

        return ApiResponse::success([
            'years' => $tahunTersedia,
            'year' => $tahun !== null ? (int) $tahun : null,
            'range' => [
                'from' => optional($logs->first())->date?->toDateString(),
                'to' => optional($logs->last())->date?->toDateString(),
            ],
            'days' => $logs->count(),
            'summary' => $this->ringkas($logs),
            'series' => $seri,
        ], 'Statistik lalu lintas udara');
    }

    /**
     * Cetak rekapitulasi satu bulan sebagai PDF.
     *
     * Periode WAJIB disebut (`?month=YYYY-MM`) dan bukan boleh dikosongkan:
     * laporan lalu lintas tanpa keterangan periode tidak dapat dibandingkan
     * dengan laporan bulan lain, dan itulah gunanya dicetak.
     *
     * Bulan yang kosong tetap menghasilkan berkas — halamannya menyatakan
     * datanya belum masuk. Menolak mencetak akan membuat petugas mengira
     * fiturnya rusak, padahal justru catatannya yang belum diisi.
     */
    public function exportPdf(Request $request)
    {
        $data = $request->validate([
            'month' => 'required|date_format:Y-m',
        ], [
            'month.required' => 'Periode bulan wajib dipilih.',
            'month.date_format' => 'Periode harus dalam bentuk tahun-bulan, misalnya 2026-08.',
        ]);

        $periode = Carbon::createFromFormat('Y-m', $data['month'])->startOfMonth();

        $logs = AirTrafficLog::query()
            ->whereYear('date', $periode->year)
            ->whereMonth('date', $periode->month)
            ->orderBy('date')
            ->get();

        $pdf = Pdf::loadView('pdf.air-traffic', [
            'judul' => 'Rekapitulasi Lalu Lintas Angkutan Udara',
            'periode' => 'Periode '.$periode->translatedFormat('F Y'),
            'dicetakPada' => CetakanPdf::dicetakPada(),
            'dicetakOleh' => $request->user()?->name,
            'logs' => $logs,
            'kategori' => $this->kategoriCetak(),
        ])->setPaper('a4', 'landscape');

        return CetakanPdf::bubuhkanNomorHalaman($pdf)->download('lalu-lintas-udara-'.$periode->format('Y-m').'.pdf');
    }

    /**
     * Keterangan kolom untuk cetakan.
     *
     * Satuannya ikut dibawa — angka 14.520 tanpa satuan tidak berarti apa pun,
     * dan pada kertas tidak ada tooltip yang bisa menjelaskannya.
     *
     * @return array<int, array{key: string, label: string, unit: string}>
     */
    private function kategoriCetak(): array
    {
        return [
            ['key' => 'aircraft', 'label' => 'Pesawat', 'unit' => ''],
            ['key' => 'passenger', 'label' => 'Penumpang', 'unit' => 'orang'],
            ['key' => 'baggage', 'label' => 'Bagasi', 'unit' => 'kg'],
            ['key' => 'cargo', 'label' => 'Kargo', 'unit' => 'kg'],
        ];
    }

    /* -------------------------------------------------------------- */

    /** Jumlahkan seluruh kategori pada sekumpulan catatan. */
    private function ringkas(Collection $logs): array
    {
        $hasil = [];

        foreach (AirTrafficLog::CATEGORIES as $kategori) {
            $datang = (int) $logs->sum("{$kategori}_arrival");
            $pergi = (int) $logs->sum("{$kategori}_departure");

            $hasil[$kategori] = [
                'arrival' => $datang,
                'departure' => $pergi,
                'total' => $datang + $pergi,
            ];
        }

        return $hasil;
    }

    /** Seri per tahun, dipakai saat tidak ada tahun yang dipilih. */
    private function seriTahunan(Collection $logs): array
    {
        return $logs
            ->groupBy(fn ($log) => $log->date->year)
            ->map(fn (Collection $baris, $tahun) => [
                'period' => (string) $tahun,
                'label' => (string) $tahun,
                'days' => $baris->count(),
            ] + $this->ringkas($baris))
            ->values()
            ->all();
    }

    /**
     * Seri per bulan untuk satu tahun.
     *
     * Bulan tanpa catatan TIDAK dimunculkan sebagai nol. v1 mengisi keduabelas
     * bulan dengan nol, sehingga bulan yang datanya belum masuk tampak seperti
     * bulan tanpa penerbangan sama sekali.
     */
    private function seriBulanan(Collection $logs): array
    {
        return $logs
            ->groupBy(fn ($log) => $log->date->month)
            ->map(fn (Collection $baris, $bulan) => [
                'period' => sprintf('%04d-%02d', $baris->first()->date->year, $bulan),
                'label' => self::BULAN[$bulan],
                'days' => $baris->count(),
            ] + $this->ringkas($baris))
            ->values()
            ->all();
    }
}

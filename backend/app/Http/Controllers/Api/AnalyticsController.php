<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\Announcement;
use App\Models\ChatThread;
use App\Models\Complaint;
use App\Models\Document;
use App\Models\Facility;
use App\Models\Flight;
use App\Models\InformationRequest;
use App\Models\LostReport;
use App\Models\News;
use App\Models\Tenant;
use App\Models\VisitorLog;
use App\Support\CetakanPdf;
use App\Support\RingkasanLlau;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class AnalyticsController extends Controller
{
    /** Rentang tren yang boleh diminta; selain ini jatuh ke 7 hari. */
    private const RENTANG = [7, 30, 90];

    /** Selisih WITA terhadap UTC. Kolom waktu disimpan UTC (`APP_TIMEZONE`). */
    private const OFFSET_JAM = 8;

    public function dashboard(Request $request)
    {
        $days = in_array((int) $request->query('days'), self::RENTANG, true) ? (int) $request->query('days') : 7;

        // Batas periode dihitung pada hari WITA: "hari ini" bagi petugas di
        // Samarinda dimulai pukul 00.00 WITA, yaitu 16.00 UTC hari sebelumnya.
        $hariIni = Carbon::now(CetakanPdf::ZONA)->startOfDay();
        $mulai = $hariIni->copy()->subDays($days - 1);
        $mulaiSebelumnya = $mulai->copy()->subDays($days);

        // Angka ini juga tayang di footer portal untuk dilihat publik, jadi
        // seluruhnya dihitung apa adanya dari `visitor_logs`. Sebelumnya
        // ditambah konstanta (+1420 dan +185) dan `top_pages`/`device_stats`
        // adalah larik tetap — dasbor menampilkan lalu lintas yang tidak
        // pernah terjadi, dan kini akan bertentangan dengan angka di footer.
        $totalVisitors = VisitorLog::count();
        $todayVisitors = VisitorLog::where('created_at', '>=', $hariIni->copy()->utc())->count();

        $periode = fn () => VisitorLog::where('created_at', '>=', $mulai->copy()->utc());

        $topPages = $periode()->select('page_url', DB::raw('COUNT(*) as views'))
            ->groupBy('page_url')
            ->orderByDesc('views')
            ->limit(8)
            ->get()
            ->map(fn ($row) => ['page' => $row->page_url, 'views' => (int) $row->views])
            ->all();

        $deviceRows = $periode()->select('device', DB::raw('COUNT(*) as total'))
            ->groupBy('device')
            ->orderByDesc('total')
            ->get();

        // Persentase dibulatkan terhadap total baris; saat belum ada kunjungan
        // sama sekali, daftarnya kosong — bukan 0% untuk tiap perangkat.
        $deviceTotal = (int) $deviceRows->sum('total');
        $deviceStats = $deviceRows
            ->map(fn ($row) => [
                'device' => $row->device,
                'count' => (int) $row->total,
                'percentage' => $deviceTotal > 0 ? (int) round($row->total / $deviceTotal * 100) : 0,
            ])
            ->all();

        $flightStats = [
            'total' => Flight::count(),
            'boarding' => Flight::where('status', 'boarding')->count(),
            'landed' => Flight::where('status', 'landed')->count(),
            'delayed' => Flight::where('status', 'delayed')->count(),
        ];

        $complaintStats = [
            'total' => Complaint::count(),
            'resolved' => Complaint::where('status', 'resolved')->count(),
            'in_progress' => Complaint::where('status', 'in_progress')->count(),
            'pending' => Complaint::where('status', 'submitted')->count(),
        ];

        $isAdmin = $request->user()?->role === 'admin';

        return ApiResponse::success([
            'overview' => [
                'total_visitors' => $totalVisitors,
                'today_visitors' => $todayVisitors,
                // Keduanya null, bukan angka. `visitor_logs` mencatat satu
                // baris per halaman tanpa penanda sesi, sehingga rasio pentalan
                // dan durasi sesi tidak dapat dihitung darinya. Nilai tetap
                // '24.5%' dan '3m 45s' yang dulu ada di sini adalah karangan.
                'bounce_rate' => null,
                'avg_session_duration' => null,
            ],
            'range_days' => $days,
            'visitor_trend' => $this->trenHarian($mulai, $days),
            // Periode sebelumnya yang sama panjang, untuk garis pembanding.
            'visitor_trend_previous' => $this->trenHarian($mulaiSebelumnya, $days),
            // Total unik dihitung atas seluruh periode, bukan menjumlah unik
            // harian — pengunjung yang datang tiga hari bukan tiga orang.
            'visitor_period' => $this->totalPeriode($mulai, null),
            'visitor_previous' => $this->totalPeriode($mulaiSebelumnya, $mulai),
            'visitor_hourly' => $this->perJam($mulai),
            'top_pages' => $topPages,
            'device_stats' => $deviceStats,
            'flight_stats' => $flightStats,
            'complaint_stats' => $complaintStats,
            'action_queue' => $this->antreanTindakan($isAdmin, $hariIni),
            'llau_trend' => $this->trenLlau(),
            'recent_activity' => $this->aktivitasTerbaru($isAdmin),
            'content_counts' => [
                'news' => News::count(),
                'announcements' => Announcement::count(),
                'facilities' => Facility::count(),
                'tenants' => Tenant::count(),
                'documents' => Document::count(),
            ],
        ], 'Data Analitik Dashboard Bandara APT Pranoto');
    }

    /** Ekspresi SQL yang menggeser `created_at` ke WITA, per pengandar basis data. */
    private function kolomWita(string $bentuk): string
    {
        $jam = self::OFFSET_JAM;

        if (DB::connection()->getDriverName() === 'sqlite') {
            return $bentuk === 'date'
                ? "date(created_at, '+{$jam} hours')"
                : "CAST(strftime('%H', created_at, '+{$jam} hours') AS INTEGER)";
        }

        return $bentuk === 'date'
            ? "DATE(DATE_ADD(created_at, INTERVAL {$jam} HOUR))"
            : "HOUR(DATE_ADD(created_at, INTERVAL {$jam} HOUR))";
    }

    /**
     * Tayangan dan pengunjung unik per hari WITA, hari tanpa kunjungan diisi nol.
     *
     * "Pengunjung unik" = `visitor_hash` berbeda (HMAC dari IP + User-Agent,
     * lihat VisitorController::visitorHash — IP-nya sendiri tidak disimpan).
     * Itu perkiraan: satu ponsel yang berpindah jaringan terhitung dua.
     *
     * @return array<int, array{date: string, views: int, unique: int}>
     */
    private function trenHarian(Carbon $mulai, int $days): array
    {
        $tanggal = $this->kolomWita('date');

        $baris = VisitorLog::where('created_at', '>=', $mulai->copy()->utc())
            ->selectRaw("{$tanggal} as d, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as uniq")
            ->groupBy(DB::raw($tanggal))
            ->get()
            ->keyBy(fn ($r) => (string) $r->d);

        $hasil = [];
        for ($i = 0; $i < $days; $i++) {
            $d = $mulai->copy()->addDays($i)->toDateString();
            $hasil[] = [
                'date' => $d,
                'views' => (int) ($baris[$d]->views ?? 0),
                'unique' => (int) ($baris[$d]->uniq ?? 0),
            ];
        }

        return $hasil;
    }

    /** @return array{views: int, unique: int} */
    private function totalPeriode(Carbon $mulai, ?Carbon $sampai): array
    {
        $kueri = fn () => VisitorLog::where('created_at', '>=', $mulai->copy()->utc())
            ->when($sampai, fn ($q) => $q->where('created_at', '<', $sampai->copy()->utc()));

        return [
            'views' => $kueri()->count(),
            'unique' => $kueri()->distinct()->count('visitor_hash'),
        ];
    }

    /** @return array<int, array{hour: int, views: int}> 24 butir, jam WITA */
    private function perJam(Carbon $mulai): array
    {
        $jam = $this->kolomWita('hour');

        $baris = VisitorLog::where('created_at', '>=', $mulai->copy()->utc())
            ->selectRaw("{$jam} as h, COUNT(*) as views")
            ->groupBy(DB::raw($jam))
            ->pluck('views', 'h');

        return array_map(fn ($h) => ['hour' => $h, 'views' => (int) ($baris[$h] ?? 0)], range(0, 23));
    }

    /**
     * Pekerjaan yang menunggu petugas, dengan umur antrean terlama.
     *
     * Permohonan informasi hanya untuk admin, sama seperti menunya dan
     * rutenya — staff tidak boleh tahu pun jumlahnya lewat pintu samping.
     *
     * @return array<int, array<string, mixed>>
     */
    private function antreanTindakan(bool $isAdmin, Carbon $hariIni): array
    {
        $butir = [
            $this->antrean('complaints', 'Pengaduan baru', '/admin/complaints', Complaint::where('status', 'submitted')),
            $this->antrean('chat', 'Chat menunggu balasan', '/admin/complaints', ChatThread::where('status', 'open')),
            $this->antrean('lost_reports', 'Laporan kehilangan baru', '/admin/lapor-hilang', LostReport::where('status', 'submitted')),
        ];

        if ($isAdmin) {
            $terbuka = fn () => InformationRequest::whereIn('status', ['submitted', 'in_progress']);
            $item = $this->antrean('information_requests', 'Permohonan informasi terbuka', '/admin/information-requests', $terbuka());
            // Tenggat UU 14/2008 dicatat per permohonan di `due_date`.
            $item['overdue'] = $terbuka()->whereDate('due_date', '<', $hariIni->toDateString())->count();
            $butir[] = $item;
        }

        return $butir;
    }

    private function antrean(string $key, string $label, string $href, $kueri): array
    {
        $tertua = (clone $kueri)->min('created_at');

        return [
            'key' => $key,
            'label' => $label,
            'href' => $href,
            'count' => (clone $kueri)->count(),
            'oldest_at' => $tertua ? Carbon::parse($tertua, 'UTC')->toIso8601String() : null,
            'overdue' => 0,
        ];
    }

    /**
     * Enam bulan terakhir rekap LLAU. Kosong bila belum ada unggahan atau
     * tabelnya belum dimigrasi — dasbor tidak boleh ikut gagal karenanya.
     */
    private function trenLlau(): array
    {
        if (! Schema::hasTable('llau_reports')) {
            return [];
        }

        try {
            return array_slice(RingkasanLlau::tren(), -6);
        } catch (Throwable $e) {
            report($e);

            return [];
        }
    }

    /**
     * Delapan kejadian terakhir lintas modul.
     *
     * Hanya nomor tiket dan subjek/kategori yang ikut — nama dan kontak warga
     * tidak perlu muncul di dasbor yang terbuka di layar bersama.
     *
     * @return array<int, array<string, mixed>>
     */
    private function aktivitasTerbaru(bool $isAdmin): array
    {
        $kejadian = collect()
            ->merge(Complaint::latest()->limit(5)->get(['id', 'ticket_number', 'subject', 'status', 'created_at'])
                ->map(fn ($c) => ['type' => 'complaint', 'title' => $c->subject, 'ref' => $c->ticket_number, 'status' => $c->status, 'at' => $c->created_at, 'href' => '/admin/complaints']))
            ->merge(ChatThread::latest()->limit(5)->get(['id', 'ticket_number', 'subject', 'category', 'status', 'created_at'])
                ->map(fn ($t) => ['type' => 'chat', 'title' => $t->subject ?: $t->category, 'ref' => $t->ticket_number, 'status' => $t->status, 'at' => $t->created_at, 'href' => '/admin/complaints']))
            ->merge(LostReport::latest()->limit(5)->get(['id', 'ticket_number', 'category', 'lost_area', 'status', 'created_at'])
                ->map(fn ($l) => ['type' => 'lost_report', 'title' => trim("{$l->category} · {$l->lost_area}", ' ·'), 'ref' => $l->ticket_number, 'status' => $l->status, 'at' => $l->created_at, 'href' => '/admin/lapor-hilang']))
            ->merge(News::whereNotNull('published_at')->where('published_at', '<=', now())->orderByDesc('published_at')->limit(5)->get(['id', 'title', 'status', 'published_at'])
                ->map(fn ($n) => ['type' => 'news', 'title' => $n->title, 'ref' => null, 'status' => $n->status, 'at' => $n->published_at, 'href' => '/admin/news']));

        if ($isAdmin) {
            $kejadian = $kejadian->merge(InformationRequest::latest()->limit(5)->get(['id', 'ticket_number', 'status', 'created_at'])
                ->map(fn ($r) => ['type' => 'information_request', 'title' => 'Permohonan informasi publik', 'ref' => $r->ticket_number, 'status' => $r->status, 'at' => $r->created_at, 'href' => '/admin/information-requests']));
        }

        return $kejadian
            ->filter(fn ($k) => $k['at'] !== null)
            ->sortByDesc(fn ($k) => Carbon::parse($k['at'])->getTimestamp())
            ->take(8)
            ->map(fn ($k) => [...$k, 'at' => Carbon::parse($k['at'])->toIso8601String()])
            ->values()
            ->all();
    }
}

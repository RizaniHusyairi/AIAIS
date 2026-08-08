<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\VisitorLog;
use App\Models\Flight;
use App\Models\News;
use App\Models\Complaint;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function dashboard()
    {
        // Angka ini juga tayang di footer portal untuk dilihat publik, jadi
        // seluruhnya dihitung apa adanya dari `visitor_logs`. Sebelumnya
        // ditambah konstanta (+1420 dan +185) dan `top_pages`/`device_stats`
        // adalah larik tetap — dasbor menampilkan lalu lintas yang tidak
        // pernah terjadi, dan kini akan bertentangan dengan angka di footer.
        $totalVisitors = VisitorLog::count();
        $todayVisitors = VisitorLog::whereDate('created_at', now())->count();

        $topPages = VisitorLog::select('page_url', DB::raw('COUNT(*) as views'))
            ->groupBy('page_url')
            ->orderByDesc('views')
            ->limit(5)
            ->get()
            ->map(fn ($row) => ['page' => $row->page_url, 'views' => (int) $row->views])
            ->all();

        $deviceRows = VisitorLog::select('device', DB::raw('COUNT(*) as total'))
            ->groupBy('device')
            ->orderByDesc('total')
            ->get();

        // Persentase dibulatkan terhadap total baris; saat belum ada kunjungan
        // sama sekali, daftarnya kosong — bukan 0% untuk tiap perangkat.
        $deviceTotal = (int) $deviceRows->sum('total');
        $deviceStats = $deviceRows
            ->map(fn ($row) => [
                'device' => $row->device,
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

        return ApiResponse::success([
            'overview' => [
                'total_visitors' => $totalVisitors,
                'today_visitors' => $todayVisitors,
                // Keduanya null, bukan angka. `visitor_logs` mencatat satu
                // baris per halaman tanpa penanda sesi, sehingga rasio pentalan
                // dan durasi sesi tidak dapat dihitung darinya. Nilai tetap
                // '24.5%' dan '3m 45s' yang dulu ada di sini adalah karangan;
                // dasbor sudah menampilkan '-' bila nilainya kosong.
                'bounce_rate' => null,
                'avg_session_duration' => null,
            ],
            'top_pages' => $topPages,
            'device_stats' => $deviceStats,
            'flight_stats' => $flightStats,
            'complaint_stats' => $complaintStats,
        ], 'Data Analitik Dashboard Bandara APT Pranoto');
    }
}

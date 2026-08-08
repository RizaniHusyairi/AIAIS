<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FlightController;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\FacilityController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\InformationRequestController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\LetterController;
use App\Http\Controllers\Api\VisitorController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\VersionController;

// Public Endpoints
//
// Prefiks versi diambil dari config/api.php (bukan literal), supaya perpindahan
// versi kontrak berikutnya cukup satu baris. Ini versi KONTRAK API — versi
// produk ada di config('app.version').
Route::prefix(config('api.version'))->group(function () {
    // Auth
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Informasi versi portal (dipakai panel admin untuk mendeteksi selisih versi)
    Route::get('/version', VersionController::class);

    // Settings — baca publik; perubahan hanya lewat /admin/settings (butuh token)
    Route::get('/settings', [SettingController::class, 'index']);

    // FIDS Flights
    Route::get('/flights', [FlightController::class, 'index']);

    // Proksi logo maskapai.
    //
    // Server FIDS hanya melayani HTTP, jadi logonya diblokir sebagai mixed
    // content begitu portal berjalan di HTTPS. Berkas diambil di sisi server
    // lalu disajikan ulang dari sini — cara yang sama dipakai aptpairport.id.
    // Nama berkas disaring ketat di controller (lihat FlightController::logo).
    Route::get('/airlines/logo/{filename}', [FlightController::class, 'logo'])
        ->name('api.airlines.logo');

    // News & Announcements
    Route::get('/news', [NewsController::class, 'index']);
    Route::get('/news/{slug}', [NewsController::class, 'show']);
    Route::get('/announcements', [AnnouncementController::class, 'index']);

    // Facilities & Tenants
    Route::get('/facilities', [FacilityController::class, 'index']);
    Route::get('/tenants', [TenantController::class, 'index']);

    // Pusat Bantuan — pengaduan formal, chat, dan penilaian kepuasan.
    //
    // Ketiganya sengaja terbuka tanpa autentikasi: mengadu dan bertanya
    // kepada penyelenggara layanan publik tidak boleh mensyaratkan akun.
    // Karena itu semuanya dibatasi laju, dan respons publiknya melewati
    // `publicView()` supaya nomor tiket yang tertebak tidak membocorkan
    // identitas pelapor lain.
    Route::post('/complaints', [ComplaintController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/complaints/track/{ticket}', [ComplaintController::class, 'track']);

    Route::post('/chat/start', [ChatController::class, 'start'])->middleware('throttle:20,1');
    Route::get('/chat/{ticket_number}', [ChatController::class, 'show']);
    Route::post('/chat/{ticket_number}/message', [ChatController::class, 'sendVisitorMessage'])
        ->middleware('throttle:20,1');

    // Penilaian kepuasan; hanya tiket yang penanganannya selesai yang dilayani.
    Route::post('/ratings', [RatingController::class, 'store'])->middleware('throttle:10,1');

    // Permohonan Informasi Publik (UU 14/2008).
    // Sengaja terbuka tanpa autentikasi: mengajukan permohonan informasi
    // publik adalah hak setiap orang dan tidak boleh mensyaratkan akun.
    // Berkas syaratnya tersimpan di cakram privat — lihat controllernya.
    Route::post('/information-requests', [InformationRequestController::class, 'store']);
    Route::get('/information-requests/track/{ticket}', [InformationRequestController::class, 'track']);

    // Downloads
    Route::get('/documents', [DocumentController::class, 'index']);

    // Regulasi — Surat Keputusan & Surat Edaran (`?type=keputusan|edaran`).
    // Hanya surat yang berkasnya ada yang dikembalikan; lihat controllernya.
    Route::get('/letters', [LetterController::class, 'index']);

    // Kunjungan portal. `POST /visits` adalah satu-satunya endpoint publik
    // yang menulis tanpa autentikasi, jadi lajunya dibatasi. Statistiknya
    // terbuka karena memang ditayangkan pada footer portal.
    Route::post('/visits', [VisitorController::class, 'store'])->middleware('throttle:60,1');
    Route::get('/visitor-stats', [VisitorController::class, 'stats']);

    // Protected Admin Routes — wajib token Sanctum
    Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);

        // Analytics & Settings
        Route::get('/analytics', [AnalyticsController::class, 'dashboard']);
        Route::post('/settings', [SettingController::class, 'update']);

        // Flights Management
        Route::post('/flights', [FlightController::class, 'store']);
        Route::put('/flights/{id}', [FlightController::class, 'update']);
        Route::delete('/flights/{id}', [FlightController::class, 'destroy']);

        // News Management
        Route::get('/news', [NewsController::class, 'adminIndex']);
        Route::post('/news', [NewsController::class, 'store']);
        Route::put('/news/{id}', [NewsController::class, 'update']);
        Route::delete('/news/{id}', [NewsController::class, 'destroy']);

        // Announcements Management
        Route::get('/announcements', [AnnouncementController::class, 'adminIndex']);
        Route::post('/announcements', [AnnouncementController::class, 'store']);
        Route::put('/announcements/{id}', [AnnouncementController::class, 'update']);
        Route::delete('/announcements/{id}', [AnnouncementController::class, 'destroy']);

        // Facilities Management
        Route::get('/facilities', [FacilityController::class, 'adminIndex']);
        Route::post('/facilities', [FacilityController::class, 'store']);
        Route::put('/facilities/{id}', [FacilityController::class, 'update']);
        Route::delete('/facilities/{id}', [FacilityController::class, 'destroy']);

        // Tenants Management
        Route::get('/tenants', [TenantController::class, 'adminIndex']);
        Route::post('/tenants', [TenantController::class, 'store']);
        Route::put('/tenants/{id}', [TenantController::class, 'update']);
        Route::delete('/tenants/{id}', [TenantController::class, 'destroy']);

        // Documents Management
        Route::get('/documents', [DocumentController::class, 'index']);
        Route::post('/documents', [DocumentController::class, 'store']);
        Route::put('/documents/{id}', [DocumentController::class, 'update']);
        Route::delete('/documents/{id}', [DocumentController::class, 'destroy']);

        // Regulasi Management. `store`/`update` menerima multipart (berkas PDF)
        // maupun JSON dengan `file_url`, jadi POST dipakai pula untuk ubah —
        // lihat catatan pada halaman admin regulasi di frontend.
        Route::get('/letters', [LetterController::class, 'adminIndex']);
        Route::post('/letters', [LetterController::class, 'store']);
        Route::post('/letters/{id}', [LetterController::class, 'update']);
        Route::put('/letters/{id}', [LetterController::class, 'update']);
        Route::delete('/letters/{id}', [LetterController::class, 'destroy']);

        // Pengaduan Management
        Route::get('/complaints', [ComplaintController::class, 'index']);
        Route::put('/complaints/{id}/resolve', [ComplaintController::class, 'resolve']);
        Route::delete('/complaints/{id}', [ComplaintController::class, 'destroy']);

        // Chat Helpdesk Management. `adminIndex` sengaja tidak memuat seluruh
        // pesan — isinya diambil `adminShow` saat satu percakapan dibuka.
        Route::get('/chat', [ChatController::class, 'adminIndex']);
        Route::get('/chat/{id}', [ChatController::class, 'adminShow']);
        Route::post('/chat/{id}/reply', [ChatController::class, 'adminReply']);
        Route::put('/chat/{id}/status', [ChatController::class, 'adminUpdateStatus']);
        Route::delete('/chat/{id}', [ChatController::class, 'destroy']);

        // Ringkasan kepuasan layanan (SKM)
        Route::get('/ratings/summary', [RatingController::class, 'summary']);

        // Permohonan Informasi Publik. Unduhan berkas hanya lewat sini —
        // scan KTP pemohon tidak punya URL publik.
        Route::get('/information-requests', [InformationRequestController::class, 'index']);
        Route::put('/information-requests/{id}/respond', [InformationRequestController::class, 'respond']);
        Route::get('/information-requests/{id}/file/{jenis}', [InformationRequestController::class, 'file'])
            ->whereIn('jenis', ['ktp', 'surat-pernyataan']);
    });
});

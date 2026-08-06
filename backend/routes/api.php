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

    // Complaints & Feedback
    Route::post('/complaints', [ComplaintController::class, 'store']);
    Route::get('/complaints/track/{ticket}', [ComplaintController::class, 'track']);

    // Live Chat & Informasi / Kritik & Saran
    Route::post('/chat/start', [ChatController::class, 'start']);
    Route::get('/chat/{ticket_number}', [ChatController::class, 'show']);
    Route::post('/chat/{ticket_number}/message', [ChatController::class, 'sendVisitorMessage']);

    // Permohonan Informasi Publik (UU 14/2008).
    // Sengaja terbuka tanpa autentikasi: mengajukan permohonan informasi
    // publik adalah hak setiap orang dan tidak boleh mensyaratkan akun.
    // Berkas syaratnya tersimpan di cakram privat — lihat controllernya.
    Route::post('/information-requests', [InformationRequestController::class, 'store']);
    Route::get('/information-requests/track/{ticket}', [InformationRequestController::class, 'track']);

    // Downloads
    Route::get('/documents', [DocumentController::class, 'index']);

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

        // Complaints Management
        Route::get('/complaints', [ComplaintController::class, 'index']);
        Route::put('/complaints/{id}/resolve', [ComplaintController::class, 'resolve']);

        // Chat Helpdesk Management
        Route::get('/chat', [ChatController::class, 'adminIndex']);
        Route::post('/chat/{id}/reply', [ChatController::class, 'adminReply']);
        Route::put('/chat/{id}/status', [ChatController::class, 'adminUpdateStatus']);

        // Permohonan Informasi Publik. Unduhan berkas hanya lewat sini —
        // scan KTP pemohon tidak punya URL publik.
        Route::get('/information-requests', [InformationRequestController::class, 'index']);
        Route::put('/information-requests/{id}/respond', [InformationRequestController::class, 'respond']);
        Route::get('/information-requests/{id}/file/{jenis}', [InformationRequestController::class, 'file'])
            ->whereIn('jenis', ['ktp', 'surat-pernyataan']);
    });
});

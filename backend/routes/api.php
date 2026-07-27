<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FlightController;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\FacilityController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\SettingController;

// Public Endpoints
Route::prefix('v1')->group(function () {
    // Auth
    Route::post('/auth/login', [AuthController::class, 'login']);

    // Settings — baca publik; perubahan hanya lewat /admin/settings (butuh token)
    Route::get('/settings', [SettingController::class, 'index']);

    // FIDS Flights
    Route::get('/flights', [FlightController::class, 'index']);

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
    });
});

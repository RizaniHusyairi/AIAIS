<?php

use App\Http\Controllers\Api\AirTrafficController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EvergreenInformationController;
use App\Http\Controllers\Api\ExtendAdvanceController;
use App\Http\Controllers\Api\AirportStatController;
use App\Http\Controllers\Api\ExternalLinkController;
use App\Http\Controllers\Api\FacilityController;
use App\Http\Controllers\Api\FaqController;
use App\Http\Controllers\Api\FieldTripController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\FlightController;
use App\Http\Controllers\Api\FoundItemController;
use App\Http\Controllers\Api\ImmediateInformationController;
use App\Http\Controllers\Api\InformationRequestController;
use App\Http\Controllers\Api\InformationServiceReportController;
use App\Http\Controllers\Api\InstagramController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\LetterController;
use App\Http\Controllers\Api\LostReportController;
use App\Http\Controllers\Api\OfficialController;
use App\Http\Controllers\Api\MeetingController;
use App\Http\Controllers\Api\NataruController;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OjtController;
use App\Http\Controllers\Api\PeriodicDocumentController;
use App\Http\Controllers\Api\PersuratanController;
use App\Http\Controllers\Api\PpidRegulationController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\ServiceStandardController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\SiteEventController;
use App\Http\Controllers\Api\SlotController;
use App\Http\Controllers\Api\SparePartController;
use App\Http\Controllers\Api\SubmissionController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\TourismController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VersionController;
use App\Http\Controllers\Api\VisitorController;
use App\Support\SubmissionRegistry;
use Illuminate\Support\Facades\Route;

// Public Endpoints
//
// Prefiks versi diambil dari config/api.php (bukan literal), supaya perpindahan
// versi kontrak berikutnya cukup satu baris. Ini versi KONTRAK API — versi
// produk ada di config('app.version').
Route::prefix(config('api.version'))->group(function () {
    // Auth.
    //
    // Ketiganya dibatasi laju. Portal v1 sama sekali tidak membatasi login —
    // LoginController-nya menimpa `login()` bawaan dan sekalian membuang
    // penjaga percobaan berulangnya. Lupa-sandi dibatasi lebih ketat karena
    // tiap panggilan mengirim surel.
    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1');
    // Pendaftaran akun warga. Dibatasi laju lebih ketat daripada login: tiap
    // panggilan yang lolos menciptakan baris permanen di basis data produksi.
    Route::post('/auth/register', [AuthController::class, 'register'])
        ->middleware('throttle:5,10');
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:3,10');
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:5,10');

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
    // Throttle pada pelacakan bukan soal beban, melainkan penebakan: nomor
    // tiketnya hanya empat karakter acak, dan tanpa pembatas ini menyisirnya
    // secara beruntun tidak memakan biaya berarti.
    Route::get('/complaints/track/{ticket}', [ComplaintController::class, 'track'])
        ->middleware('throttle:20,1');

    Route::post('/chat/start', [ChatController::class, 'start'])->middleware('throttle:20,1');
    Route::get('/chat/{ticket_number}', [ChatController::class, 'show']);
    Route::post('/chat/{ticket_number}/message', [ChatController::class, 'sendVisitorMessage'])
        ->middleware('throttle:20,1');

    // Lapor kehilangan barang.
    //
    // Terbuka tanpa akun dengan alasan yang sama seperti pengaduan: orang yang
    // baru kehilangan tas tidak akan mendaftar lebih dulu, dan menuntutnya
    // menyaring habis wisatawan serta penumpang transit.
    //
    // Pelacakannya dibatasi lebih ketat daripada tetangganya. Yang dilindungi
    // bukan sekadar judul dan status, melainkan ciri barang berharga beserta
    // status penemuannya — cukup bagi seseorang untuk menyusun klaim palsu.
    // Nomor tiketnya juga dibuat delapan karakter, bukan empat.
    //
    // Katalog barang temuan TIDAK punya rute publik sama sekali; lihat
    // FoundItemController.
    Route::post('/lost-reports', [LostReportController::class, 'store'])->middleware('throttle:10,1');
    Route::get('/lost-reports/track/{ticket}', [LostReportController::class, 'track'])
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

    // Pejabat struktural. Berbeda dengan `letters`, yang disaring di sini
    // hanyalah `is_published` — pejabat yang fotonya belum diunggah TETAP
    // tampil, karena nama dan jabatannya wajib diumumkan (UU 14/2008).
    Route::get('/officials', [OfficialController::class, 'index']);

    // Regulasi PPID — dasar hukum keterbukaan informasi publik
    // (`?category=`). Dokumennya berupa tautan luar, jadi yang disaring di
    // sini adalah peraturan yang tautannya belum diisi.
    Route::get('/ppid-regulations', [PpidRegulationController::class, 'index']);

    // Isi PPID lainnya. Ketiganya menyaring baris yang tautannya kosong —
    // dokumennya berupa tautan luar, jadi tidak ada berkas yang diperiksa.
    Route::get('/periodic-documents', [PeriodicDocumentController::class, 'index']);
    Route::get('/evergreen-information', [EvergreenInformationController::class, 'index']);
    Route::get('/immediate-information', [ImmediateInformationController::class, 'index']);

    // Laporan tahunan PPID. Endpointnya sudah aktif, tetapi halaman publik
    // belum memakainya selama tabel warisannya masih kosong — lihat
    // InformationServiceReportController.
    Route::get('/information-service-reports', [InformationServiceReportController::class, 'index']);

    // Angka ringkas bandara pada beranda. Satu daftar untuk tiga blok
    // penampil sekaligus; penyaringannya di sisi klien — lihat controllernya.
    Route::get('/airport-stats', [AirportStatController::class, 'index']);

    // Tautan Terkait — portal pemerintah di luar aptpairport.id.
    Route::get('/external-links', [ExternalLinkController::class, 'index']);

    // Standar Pelayanan. Dokumen yang BELUM terbit tetap dikirim — lihat
    // controllernya; keberadaannya wajib diumumkan menurut UU 25/2009.
    Route::get('/service-standards', [ServiceStandardController::class, 'index']);

    // Layanan pengajuan bandara (tenant, sewa, perizinan, slot charter, ...).
    Route::get('/services', [ServiceController::class, 'index']);
    Route::get('/services/{slug}', [ServiceController::class, 'show']);

    // Pertanyaan yang sering diajukan (`?featured=1`, `?category=`).
    // `answer` berisi HTML; penyaringannya di sisi tampilan, lihat controller.
    Route::get('/faqs', [FaqController::class, 'index']);

    // Wisata di sekitar bandara (`?category=`). Destinasi yang fotonya belum
    // ada tetap ditayangkan — lihat controllernya.
    Route::get('/tourisms', [TourismController::class, 'index']);
    Route::get('/tourisms/{slug}', [TourismController::class, 'show']);

    // Keterangan jenis pengajuan layanan (medan, pilihan, label). Terbuka
    // tanpa autentikasi karena formulirnya perlu tahu bentuknya sebelum
    // pemohon masuk — isinya definisi antarmuka, bukan data siapa pun.
    Route::get('/submission-types', [SubmissionController::class, 'types']);

    // Unggahan Instagram untuk beranda.
    //
    // Membaca TABEL LOKAL, tidak pernah memanggil Instagram: token tidak boleh
    // sampai ke peramban pengunjung, dan gangguan di Instagram tidak boleh ikut
    // merusak beranda. Gambarnya pun salinan lokal — URL CDN Meta mati dalam
    // hitungan jam. Lihat InstagramSync.
    Route::get('/instagram-posts', [InstagramController::class, 'index']);

    // Perayaan yang sedang berlangsung — memicu animasi sambutan di beranda.
    // Membalas `data: null` bila tidak ada, dan itu keadaan yang paling sering
    // terjadi sepanjang tahun.
    Route::get('/site-events/active', [SiteEventController::class, 'active']);

    // Kinerja keuangan BLU. Agregat pemasukan dan anggaran; `?year=` memecah
    // serinya per bulan. `detailed` adalah anggaran yang sudah DIRINCI, bukan
    // yang sudah terpakai — lihat controllernya.
    Route::get('/finances', [FinanceController::class, 'index']);

    // Statistik lalu lintas udara. Mengembalikan agregat, bukan baris harian
    // mentah — `?year=` memecah serinya per bulan.
    Route::get('/air-traffic', [AirTrafficController::class, 'index']);

    // Posko Nataru.
    //
    // `POST /nataru/{token}/flights` adalah endpoint tulis KEDUA di portal ini
    // yang berjalan tanpa autentikasi, setelah pengaduan publik. Alasannya
    // operasional: petugas lapangan berganti tiap giliran jaga, dan
    // mensyaratkan akun untuk tiap orang membuat datanya tidak terkirim sama
    // sekali — persis cara portal v1 bekerja.
    //
    // Penjaganya: token acak-aman 48 aksara yang tidak pernah ikut respons
    // publik, penolakan bila poskonya sudah ditutup, dan pembatasan laju di
    // bawah ini. Lihat NataruController untuk selebihnya.
    Route::get('/nataru/summary', [NataruController::class, 'summary']);
    Route::get('/nataru/{token}', [NataruController::class, 'showByToken'])
        ->middleware('throttle:30,1');
    Route::post('/nataru/{token}/flights', [NataruController::class, 'storeByToken'])
        ->middleware('throttle:60,1');
    // Layar TV posko — token TERPISAH yang hanya membuka tampilan baca.
    // v1 memakai token yang sama dengan formulir petugas; lihat controllernya.
    Route::get('/nataru/tv/{token}', [NataruController::class, 'tvByToken'])
        ->middleware('throttle:120,1');

    // Absensi rapat.
    //
    // Endpoint tulis KETIGA yang berjalan tanpa autentikasi, setelah pengaduan
    // publik dan Posko Nataru — peserta rapat berganti tiap pertemuan, dan
    // mensyaratkan akun membuat daftar hadirnya tidak terisi sama sekali.
    //
    // Penjaganya: token acak-aman 48 aksara yang tidak pernah ikut respons,
    // penolakan bila absensinya sudah ditutup, dan pembatasan laju di bawah.
    Route::get('/absensi/{token}', [MeetingController::class, 'showByToken'])
        ->middleware('throttle:30,1');
    Route::post('/absensi/{token}', [MeetingController::class, 'storeByToken'])
        ->middleware('throttle:20,1');

    // Kunjungan portal. `POST /visits` adalah satu-satunya endpoint publik
    // yang menulis tanpa autentikasi, jadi lajunya dibatasi. Statistiknya
    // terbuka karena memang ditayangkan pada footer portal.
    Route::post('/visits', [VisitorController::class, 'store'])->middleware('throttle:60,1');
    Route::get('/visitor-stats', [VisitorController::class, 'stats']);

    // Sesi pengguna yang sedang masuk — TIDAK dijaga `role`.
    //
    // Sengaja di luar grup admin: akun berperan `user` (pemohon perizinan
    // warisan v1, dan kelak modul pengajuan) tetap harus bisa membaca
    // profilnya sendiri dan keluar, tanpa menerima 403 yang membingungkan.
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::put('/auth/password', [AuthController::class, 'changePassword'])
            ->middleware('throttle:5,1');
    });

    // Area akun warga.
    //
    // Tiga lapis, sejajar dengan panel admin: token sah, token memang
    // diterbitkan untuk akun warga, dan akunnya aktif. Kemampuan `citizen`
    // itulah yang memisahkan bidang — token panel tidak bisa mengaku sebagai
    // pemohon, dan token pemohon tidak bisa memukul `/admin`.
    //
    // Seluruh rute di dalamnya menyaring `user_id` milik penggugat sendiri;
    // penjagaan itu ada di controller, bukan di sini, karena tiap modul punya
    // bentuk kepemilikannya masing-masing.
    Route::prefix('akun')
        ->middleware(['auth:sanctum', 'ability:citizen', 'approved'])
        ->group(function () {
            Route::get('/fieldtrips', [FieldTripController::class, 'index']);
            Route::post('/fieldtrips', [FieldTripController::class, 'store']);
            Route::get('/fieldtrips/{id}', [FieldTripController::class, 'show']);
            Route::get('/fieldtrips/{id}/documents/{index}', [FieldTripController::class, 'downloadDocument'])
                ->whereNumber('index');

            // Enam jenis pengajuan berbagi satu controller; jenisnya datang
            // sebagai parameter rute dan dibatasi ke slug yang terdaftar,
            // sehingga URL karangan tidak pernah mencapai controller.
            Route::get('/pengajuan/{jenis}', [SubmissionController::class, 'index'])
                ->whereIn('jenis', SubmissionRegistry::slugs());
            Route::post('/pengajuan/{jenis}', [SubmissionController::class, 'store'])
                ->whereIn('jenis', SubmissionRegistry::slugs());
            Route::get('/pengajuan/{jenis}/{id}', [SubmissionController::class, 'show'])
                ->whereIn('jenis', SubmissionRegistry::slugs())->whereNumber('id');
            Route::get('/pengajuan/{jenis}/{id}/documents/{index}', [SubmissionController::class, 'downloadDocument'])
                ->whereIn('jenis', SubmissionRegistry::slugs())->whereNumber('id')->whereNumber('index');

            // Slot charter — rencana penerbangan, bukan berkas dan uraian.
            Route::get('/slots', [SlotController::class, 'index']);
            Route::post('/slots', [SlotController::class, 'store']);
            Route::get('/slots/{id}', [SlotController::class, 'show'])->whereNumber('id');
            Route::get('/slots/{id}/documents/{index}', [SlotController::class, 'downloadDocument'])
                ->whereNumber('id')->whereNumber('index');

            // Extend Advance. Alurnya bertahap: kirim rencana → unggah
            // pernyataan bertanda tangan PIC → baru masuk antrean petugas.
            Route::get('/extend-advance/statement', [ExtendAdvanceController::class, 'statement']);
            Route::get('/extend-advance', [ExtendAdvanceController::class, 'index']);
            Route::post('/extend-advance', [ExtendAdvanceController::class, 'store']);
            Route::get('/extend-advance/{id}', [ExtendAdvanceController::class, 'show'])->whereNumber('id');
            Route::post('/extend-advance/{id}/signed', [ExtendAdvanceController::class, 'uploadSigned'])
                ->whereNumber('id');
            Route::get('/extend-advance/{id}/signed', [ExtendAdvanceController::class, 'downloadSigned'])
                ->whereNumber('id');

            // OJT — rekam peserta praktik kerja lapangan.
            Route::get('/ojt', [OjtController::class, 'index']);
            Route::post('/ojt', [OjtController::class, 'store']);
            Route::post('/ojt/{id}', [OjtController::class, 'update'])->whereNumber('id');
            Route::get('/ojt/{id}/files/{jenis}', [OjtController::class, 'downloadFile'])
                ->whereNumber('id')->whereIn('jenis', ['identity_card', 'photo', 'final_certificate']);
        });

    // Protected Admin Routes.
    //
    // Empat lapis: token sah, token memang diterbitkan untuk panel, akun
    // disetujui, dan perannya admin atau staff. Semuanya menjaga SELURUH rute
    // di dalamnya sekaligus — sebelum ini `auth:sanctum` adalah satu-satunya
    // penjaga, sehingga akun warga mana pun dapat membuka semuanya, termasuk
    // berkas scan KTP pemohon.
    Route::prefix('admin')
        ->middleware(['auth:sanctum', 'ability:admin-panel', 'approved', 'role:admin,staff'])
        ->group(function () {
            // Alias mundur; panel admin frontend masih memanggil lintasan ini.
            // Dipensiunkan setelah frontend beralih ke /auth/me dan /auth/logout.
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
            //
            // `POST /news/{id}` mendampingi `PUT` karena form berita mengirim
            // gambar sampul lewat multipart, dan multipart tidak dapat dikirim
            // lewat PUT dari browser.
            Route::get('/news', [NewsController::class, 'adminIndex']);
            Route::post('/news', [NewsController::class, 'store']);
            Route::post('/news/{id}', [NewsController::class, 'update']);
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

            // Pejabat Bandara. `POST /{id}` didaftarkan di samping `PUT`
            // karena foto pejabat dikirim multipart, dan peramban tidak dapat
            // mengirim multipart lewat PUT — pola yang sama seperti `letters`.
            Route::get('/officials', [OfficialController::class, 'adminIndex']);
            Route::post('/officials', [OfficialController::class, 'store']);
            Route::post('/officials/{id}', [OfficialController::class, 'update'])->whereNumber('id');
            Route::put('/officials/{id}', [OfficialController::class, 'update'])->whereNumber('id');
            Route::delete('/officials/{id}', [OfficialController::class, 'destroy'])->whereNumber('id');

            // Regulasi PPID. Tanpa unggahan berkas — dokumennya selalu tautan
            // luar — sehingga cukup PUT untuk pengubahan.
            Route::get('/ppid-regulations', [PpidRegulationController::class, 'adminIndex']);
            Route::post('/ppid-regulations', [PpidRegulationController::class, 'store']);
            Route::put('/ppid-regulations/{id}', [PpidRegulationController::class, 'update']);
            Route::delete('/ppid-regulations/{id}', [PpidRegulationController::class, 'destroy']);

            // Isi PPID lainnya. Semuanya tanpa unggahan berkas — dokumennya selalu
            // tautan luar — sehingga cukup PUT untuk pengubahan.
            Route::get('/periodic-documents', [PeriodicDocumentController::class, 'adminIndex']);
            Route::post('/periodic-documents', [PeriodicDocumentController::class, 'store']);
            Route::put('/periodic-documents/{id}', [PeriodicDocumentController::class, 'update']);
            Route::delete('/periodic-documents/{id}', [PeriodicDocumentController::class, 'destroy']);

            Route::get('/evergreen-information', [EvergreenInformationController::class, 'adminIndex']);
            Route::post('/evergreen-information', [EvergreenInformationController::class, 'store']);
            Route::put('/evergreen-information/{id}', [EvergreenInformationController::class, 'update']);
            Route::delete('/evergreen-information/{id}', [EvergreenInformationController::class, 'destroy']);

            Route::get('/immediate-information', [ImmediateInformationController::class, 'adminIndex']);
            Route::post('/immediate-information', [ImmediateInformationController::class, 'store']);
            Route::put('/immediate-information/{id}', [ImmediateInformationController::class, 'update']);
            Route::delete('/immediate-information/{id}', [ImmediateInformationController::class, 'destroy']);

            Route::get('/information-service-reports', [InformationServiceReportController::class, 'adminIndex']);
            Route::post('/information-service-reports', [InformationServiceReportController::class, 'store']);
            Route::put('/information-service-reports/{id}', [InformationServiceReportController::class, 'update']);
            Route::delete('/information-service-reports/{id}', [InformationServiceReportController::class, 'destroy']);

            Route::get('/airport-stats', [AirportStatController::class, 'adminIndex']);
            Route::post('/airport-stats', [AirportStatController::class, 'store']);
            Route::put('/airport-stats/{id}', [AirportStatController::class, 'update']);
            Route::delete('/airport-stats/{id}', [AirportStatController::class, 'destroy']);

            Route::get('/external-links', [ExternalLinkController::class, 'adminIndex']);
            Route::post('/external-links', [ExternalLinkController::class, 'store']);
            Route::put('/external-links/{id}', [ExternalLinkController::class, 'update']);
            Route::delete('/external-links/{id}', [ExternalLinkController::class, 'destroy']);

            // Standar Pelayanan. Menerima berkas PDF, jadi POST didaftarkan pula
            // untuk pengubahan — multipart tidak dapat dikirim lewat PUT dari
            // browser, sama seperti rute regulasi surat.
            Route::get('/service-standards', [ServiceStandardController::class, 'adminIndex']);
            Route::post('/service-standards', [ServiceStandardController::class, 'store']);
            Route::post('/service-standards/{id}', [ServiceStandardController::class, 'update']);
            Route::put('/service-standards/{id}', [ServiceStandardController::class, 'update']);
            Route::delete('/service-standards/{id}', [ServiceStandardController::class, 'destroy']);

            // Layanan pengajuan. Tanpa unggahan berkas, cukup PUT.
            Route::get('/services', [ServiceController::class, 'adminIndex']);
            Route::post('/services', [ServiceController::class, 'store']);
            Route::put('/services/{id}', [ServiceController::class, 'update']);
            Route::delete('/services/{id}', [ServiceController::class, 'destroy']);

            Route::get('/faqs', [FaqController::class, 'adminIndex']);
            Route::post('/faqs', [FaqController::class, 'store']);
            Route::put('/faqs/{id}', [FaqController::class, 'update']);
            Route::delete('/faqs/{id}', [FaqController::class, 'destroy']);

            // Wisata. Menerima unggahan gambar, jadi POST didaftarkan pula
            // untuk pengubahan — multipart tidak dapat dikirim lewat PUT dari
            // browser.
            Route::get('/tourisms', [TourismController::class, 'adminIndex']);
            Route::post('/tourisms', [TourismController::class, 'store']);
            Route::post('/tourisms/{id}', [TourismController::class, 'update']);
            Route::put('/tourisms/{id}', [TourismController::class, 'update']);
            Route::delete('/tourisms/{id}/gallery', [TourismController::class, 'destroyGalleryItem']);
            Route::delete('/tourisms/{id}', [TourismController::class, 'destroy']);

            // Catatan lalu lintas udara harian.
            Route::get('/air-traffic', [AirTrafficController::class, 'adminIndex']);
            Route::post('/air-traffic', [AirTrafficController::class, 'store']);
            Route::put('/air-traffic/{id}', [AirTrafficController::class, 'update']);
            // Cetak rekapitulasi bulanan. Periode wajib disebut lewat ?month=YYYY-MM.
            Route::get('/air-traffic/export-pdf', [AirTrafficController::class, 'exportPdf']);
            Route::delete('/air-traffic/{id}', [AirTrafficController::class, 'destroy']);

            // Pengajuan field trip. Berkas syaratnya berupa surat pengantar
            // berkop instansi, tersimpan di cakram privat dan hanya dilayani
            // lewat endpoint bertoken di bawah ini.
            Route::get('/fieldtrips', [FieldTripController::class, 'adminIndex']);
            Route::get('/fieldtrips/{id}', [FieldTripController::class, 'adminShow']);
            Route::get('/fieldtrips/{id}/documents/{index}', [FieldTripController::class, 'adminDownloadDocument'])
                ->whereNumber('index');
            Route::put('/fieldtrips/{id}/status', [FieldTripController::class, 'updateStatus']);
            Route::delete('/fieldtrips/{id}', [FieldTripController::class, 'destroy']);

            // Enam jenis pengajuan lainnya, satu controller. Lihat catatan
            // pada grup `akun` di atas.
            Route::get('/pengajuan/{jenis}', [SubmissionController::class, 'adminIndex'])
                ->whereIn('jenis', SubmissionRegistry::slugs());
            Route::get('/pengajuan/{jenis}/{id}/documents/{index}', [SubmissionController::class, 'adminDownloadDocument'])
                ->whereIn('jenis', SubmissionRegistry::slugs())->whereNumber('id')->whereNumber('index');
            Route::put('/pengajuan/{jenis}/{id}/status', [SubmissionController::class, 'updateStatus'])
                ->whereIn('jenis', SubmissionRegistry::slugs())->whereNumber('id');
            Route::delete('/pengajuan/{jenis}/{id}', [SubmissionController::class, 'destroy'])
                ->whereIn('jenis', SubmissionRegistry::slugs())->whereNumber('id');

            // Slot charter.
            Route::get('/slots', [SlotController::class, 'adminIndex']);
            Route::get('/slots/{id}/documents/{index}', [SlotController::class, 'adminDownloadDocument'])
                ->whereNumber('id')->whereNumber('index');
            Route::put('/slots/{id}/status', [SlotController::class, 'updateStatus'])->whereNumber('id');
            Route::delete('/slots/{id}', [SlotController::class, 'destroy'])->whereNumber('id');

            // Extend Advance. Pengajuan tanpa pernyataan bertanda tangan tidak
            // dapat diputuskan — lihat controllernya.
            Route::get('/extend-advance', [ExtendAdvanceController::class, 'adminIndex']);
            Route::put('/extend-advance/statement', [ExtendAdvanceController::class, 'updateStatement']);
            Route::get('/extend-advance/{id}/signed', [ExtendAdvanceController::class, 'adminDownloadSigned'])
                ->whereNumber('id');
            Route::put('/extend-advance/{id}/status', [ExtendAdvanceController::class, 'updateStatus'])
                ->whereNumber('id');
            Route::delete('/extend-advance/{id}', [ExtendAdvanceController::class, 'destroy'])->whereNumber('id');

            // OJT. Nilai dihitung server, bukan diterima dari pengirim.
            Route::get('/ojt', [OjtController::class, 'adminIndex']);
            Route::get('/ojt/{id}/files/{jenis}', [OjtController::class, 'adminDownloadFile'])
                ->whereNumber('id')->whereIn('jenis', ['identity_card', 'photo', 'final_certificate']);
            Route::put('/ojt/{id}/status', [OjtController::class, 'updateStatus'])->whereNumber('id');
            Route::put('/ojt/{id}/grades', [OjtController::class, 'updateGrades'])->whereNumber('id');
            // Cetak sertifikat, lalu unggah kembali yang sudah ditandatangani.
            // Sesudah difinalisasi, nilainya terkunci — lihat controllernya.
            Route::get('/ojt/{id}/certificate', [OjtController::class, 'exportCertificate'])->whereNumber('id');
            Route::post('/ojt/{id}/finalize', [OjtController::class, 'finalize'])->whereNumber('id');
            Route::delete('/ojt/{id}/finalize', [OjtController::class, 'unfinalize'])->whereNumber('id');
            Route::delete('/ojt/{id}', [OjtController::class, 'destroy'])->whereNumber('id');

            // Kinerja keuangan berikut rincian anggarannya. Menghapus catatan
            // anggaran ikut menghapus seluruh rinciannya — FK berantai v1.
            Route::get('/finances', [FinanceController::class, 'adminIndex']);
            Route::post('/finances', [FinanceController::class, 'store']);
            Route::put('/finances/{id}', [FinanceController::class, 'update']);
            Route::delete('/finances/{id}', [FinanceController::class, 'destroy']);
            Route::post('/finances/{id}/expenses', [FinanceController::class, 'storeExpense']);
            Route::put('/finance-expenses/{id}', [FinanceController::class, 'updateExpense']);
            Route::delete('/finance-expenses/{id}', [FinanceController::class, 'destroyExpense']);

            // Posko Nataru. Token petugas hanya keluar lewat endpoint khusus,
            // tidak pernah ikut pada daftar periode.
            Route::get('/nataru/events', [NataruController::class, 'adminEvents']);
            Route::post('/nataru/events', [NataruController::class, 'storeEvent']);
            Route::get('/nataru/events/{id}/token', [NataruController::class, 'eventToken']);
            Route::get('/nataru/comparison', [NataruController::class, 'comparison']);
            Route::post('/nataru/events/{id}/rotate-display-token', [NataruController::class, 'rotateDisplayToken']);
            Route::post('/nataru/events/{id}/rotate-token', [NataruController::class, 'rotateToken']);
            Route::get('/nataru/events/{id}/flights', [NataruController::class, 'adminFlights']);
            Route::put('/nataru/events/{id}', [NataruController::class, 'updateEvent']);
            Route::delete('/nataru/events/{id}', [NataruController::class, 'destroyEvent']);
            Route::put('/nataru/flights/{id}', [NataruController::class, 'updateFlight']);
            Route::delete('/nataru/flights/{id}', [NataruController::class, 'destroyFlight']);

            // Inventaris aset — aplikasi internal pegawai.
            //
            // Status TIDAK dapat diubah lewat `update`; ia hanya berpindah
            // lewat endpoint `status` yang mewajibkan alasan dan menuliskan
            // riwayatnya. Lihat controllernya.
            Route::get('/inventories', [InventoryController::class, 'adminIndex']);
            Route::post('/inventories', [InventoryController::class, 'store']);
            Route::get('/inventories/{id}', [InventoryController::class, 'adminShow'])->whereNumber('id');
            Route::post('/inventories/{id}', [InventoryController::class, 'update'])->whereNumber('id');
            Route::put('/inventories/{id}/status', [InventoryController::class, 'changeStatus'])->whereNumber('id');
            Route::get('/inventories/{id}/logbook-pdf', [InventoryController::class, 'exportLogbookPdf'])->whereNumber('id');
            Route::post('/inventories/{id}/logbooks', [InventoryController::class, 'storeLogbook'])->whereNumber('id');
            Route::delete('/inventory-logbooks/{id}', [InventoryController::class, 'destroyLogbook'])->whereNumber('id');
            Route::delete('/inventories/{id}', [InventoryController::class, 'destroy'])->whereNumber('id');

            // Suku cadang. Penyesuaian stok menerima SELISIH, bukan angka
            // akhir — lihat controllernya.
            Route::get('/spare-parts', [SparePartController::class, 'adminIndex']);
            Route::post('/spare-parts', [SparePartController::class, 'store']);
            Route::get('/spare-part-requests', [SparePartController::class, 'requests']);
            Route::post('/spare-part-requests', [SparePartController::class, 'storeRequest']);
            Route::put('/spare-part-requests/{id}', [SparePartController::class, 'updateRequest'])->whereNumber('id');
            Route::delete('/spare-part-requests/{id}', [SparePartController::class, 'destroyRequest'])->whereNumber('id');
            Route::get('/spare-parts/{id}', [SparePartController::class, 'adminShow'])->whereNumber('id');
            Route::post('/spare-parts/{id}', [SparePartController::class, 'update'])->whereNumber('id');
            Route::put('/spare-parts/{id}/stock', [SparePartController::class, 'adjustStock'])->whereNumber('id');
            Route::delete('/spare-parts/{id}', [SparePartController::class, 'destroy'])->whereNumber('id');

            // Perayaan beranda. Tanggal hari besar keagamaan mengikuti SKB
            // Tiga Menteri dan bergeser tiap tahun, jadi petugas yang mengisi.
            Route::get('/site-events', [SiteEventController::class, 'adminIndex']);
            Route::post('/site-events', [SiteEventController::class, 'store']);
            Route::put('/site-events/{id}', [SiteEventController::class, 'update'])->whereNumber('id');
            Route::delete('/site-events/{id}', [SiteEventController::class, 'destroy'])->whereNumber('id');

            // Instagram. Token TIDAK pernah ikut respons — `status` hanya
            // melaporkan kapan ia habis, dan hitung mundur itulah yang mencegah
            // sambungan mati diam-diam.
            Route::get('/instagram/status', [InstagramController::class, 'status']);
            Route::get('/instagram/posts', [InstagramController::class, 'adminIndex']);
            Route::post('/instagram/sync', [InstagramController::class, 'sync']);
            Route::post('/instagram/credentials', [InstagramController::class, 'storeCredentials']);
            Route::put('/instagram/posts/{id}/visibility', [InstagramController::class, 'toggleVisibility'])->whereNumber('id');
            Route::delete('/instagram/posts/{id}', [InstagramController::class, 'destroy'])->whereNumber('id');

            // Sumber konten beranda: 'auto' (token) atau 'manual' (diisi petugas).
            // Mode manual menghentikan kedua pekerjaan terjadwal — lihat
            // SyncInstagramPosts dan RefreshInstagramToken.
            Route::put('/instagram/mode', [InstagramController::class, 'updateMode']);

            // Unggahan manual. `POST /{id}` didaftarkan di samping `PUT` karena
            // gambarnya dikirim multipart, dan peramban tidak dapat mengirim
            // multipart lewat PUT — pola yang sama seperti `letters`.
            Route::post('/instagram/posts', [InstagramController::class, 'storeManual']);
            Route::post('/instagram/posts/{id}', [InstagramController::class, 'updateManual'])->whereNumber('id');
            Route::put('/instagram/posts/{id}', [InstagramController::class, 'updateManual'])->whereNumber('id');

            // Absensi rapat. Tautan peserta hanya keluar lewat endpoint
            // khusus, tidak pernah ikut pada daftar rapat.
            Route::get('/meetings', [MeetingController::class, 'adminIndex']);
            Route::post('/meetings', [MeetingController::class, 'store']);
            Route::get('/meetings/{id}', [MeetingController::class, 'adminShow'])->whereNumber('id');
            Route::get('/meetings/{id}/token', [MeetingController::class, 'token'])->whereNumber('id');
            Route::post('/meetings/{id}/rotate-token', [MeetingController::class, 'rotateToken'])->whereNumber('id');
            Route::get('/meetings/{id}/pdf', [MeetingController::class, 'exportPdf'])->whereNumber('id');
            // Cetakan Word, untuk daftar hadir yang masih perlu disunting
            // petugas sebelum dilampirkan ke notulen.
            Route::get('/meetings/{id}/docx', [MeetingController::class, 'exportWord'])->whereNumber('id');
            Route::put('/meetings/{id}', [MeetingController::class, 'update'])->whereNumber('id');
            Route::put('/meetings/{id}/toggle', [MeetingController::class, 'toggle'])->whereNumber('id');
            Route::delete('/meetings/{id}', [MeetingController::class, 'destroy'])->whereNumber('id');
            Route::get('/attendances/{id}/signature', [MeetingController::class, 'downloadSignature'])->whereNumber('id');
            Route::delete('/attendances/{id}', [MeetingController::class, 'destroyAttendance'])->whereNumber('id');

            // Persuratan — surat dinas dan rantai verifikasinya.
            //
            // SETIAP perpindahan tahap memeriksa pelakunya terhadap
            // `assigned_to_user_id`. v1 tidak memeriksanya sama sekali; lihat
            // catatan otorisasi pada controllernya.
            Route::get('/persuratan', [PersuratanController::class, 'adminIndex']);
            Route::post('/persuratan', [PersuratanController::class, 'store']);
            Route::get('/persuratan/{id}', [PersuratanController::class, 'adminShow'])->whereNumber('id');
            Route::post('/persuratan/{id}/approve', [PersuratanController::class, 'approveVerification'])->whereNumber('id');
            Route::post('/persuratan/{id}/reject', [PersuratanController::class, 'rejectVerification'])->whereNumber('id');
            Route::post('/persuratan/{id}/request-revision', [PersuratanController::class, 'requestRevision'])->whereNumber('id');
            Route::post('/persuratan/{id}/submit-revision', [PersuratanController::class, 'submitRevision'])->whereNumber('id');
            Route::post('/persuratan/{id}/final-approve', [PersuratanController::class, 'finalApprove'])->whereNumber('id');
            Route::delete('/persuratan/{id}', [PersuratanController::class, 'destroy'])->whereNumber('id');

            // Pengaduan Management
            Route::get('/complaints', [ComplaintController::class, 'index']);
            Route::put('/complaints/{id}/resolve', [ComplaintController::class, 'resolve']);
            Route::delete('/complaints/{id}', [ComplaintController::class, 'destroy']);

            // Lapor Kehilangan Barang.
            //
            // `matched` sengaja tidak dapat disetel lewat `/status` — status itu
            // hanya lahir dari `/match`, yang benar-benar menautkan sebuah
            // barang temuan. Tanpa pemisahan ini, sebuah laporan bisa berstatus
            // "sudah dicocokkan" tanpa barang yang tertaut.
            Route::get('/lost-reports', [LostReportController::class, 'adminIndex']);
            Route::get('/lost-reports/{id}', [LostReportController::class, 'adminShow'])->whereNumber('id');
            Route::get('/lost-reports/{id}/candidates', [LostReportController::class, 'candidates'])->whereNumber('id');
            Route::put('/lost-reports/{id}/status', [LostReportController::class, 'updateStatus'])->whereNumber('id');
            Route::put('/lost-reports/{id}/match', [LostReportController::class, 'match'])->whereNumber('id');
            Route::delete('/lost-reports/{id}', [LostReportController::class, 'destroy'])->whereNumber('id');

            // Barang temuan — seluruhnya internal, tidak ada padanan publiknya.
            //
            // `POST /{id}` didaftarkan di samping `PUT` karena foto barang
            // dikirim sebagai multipart, dan peramban tidak dapat mengirim
            // multipart lewat PUT. Pola yang sama dipakai rute `letters`.
            Route::get('/found-items', [FoundItemController::class, 'adminIndex']);
            Route::post('/found-items', [FoundItemController::class, 'store']);
            Route::post('/found-items/{id}', [FoundItemController::class, 'update'])->whereNumber('id');
            Route::put('/found-items/{id}', [FoundItemController::class, 'update'])->whereNumber('id');
            Route::put('/found-items/{id}/handover', [FoundItemController::class, 'handover'])->whereNumber('id');
            Route::get('/found-items/{id}/handover-pdf', [FoundItemController::class, 'handoverPdf'])->whereNumber('id');
            Route::delete('/found-items/{id}', [FoundItemController::class, 'destroy'])->whereNumber('id');

            // Chat Helpdesk Management. `adminIndex` sengaja tidak memuat seluruh
            // pesan — isinya diambil `adminShow` saat satu percakapan dibuka.
            Route::get('/chat', [ChatController::class, 'adminIndex']);
            Route::get('/chat/{id}', [ChatController::class, 'adminShow']);
            Route::post('/chat/{id}/reply', [ChatController::class, 'adminReply']);
            Route::put('/chat/{id}/status', [ChatController::class, 'adminUpdateStatus']);
            Route::delete('/chat/{id}', [ChatController::class, 'destroy']);

            // Ringkasan kepuasan layanan (SKM)
            Route::get('/ratings/summary', [RatingController::class, 'summary']);

            /*
             * Lonceng panel, langganan push, dan keadaan kanal notifikasi.
             *
             * Seluruhnya milik pemakai yang sedang masuk — tidak ada endpoint
             * yang dapat membaca notifikasi akun lain.
             */
            Route::get('/notifications', [NotificationController::class, 'index']);
            Route::get('/notifications/status', [NotificationController::class, 'status']);
            Route::post('/notifications/test', [NotificationController::class, 'test']);
            Route::put('/notifications/read-all', [NotificationController::class, 'markAllRead']);
            Route::put('/notifications/{id}/read', [NotificationController::class, 'markRead']);
            Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

            Route::post('/push/subscribe', [NotificationController::class, 'subscribe']);
            Route::delete('/push/unsubscribe', [NotificationController::class, 'unsubscribe']);

            // Permohonan Informasi Publik. Unduhan berkas hanya lewat sini —
            // scan KTP pemohon tidak punya URL publik.
            //
            // Dibatasi `role:admin`, lebih ketat daripada grup induknya: berkas di
            // sini adalah kartu identitas warga yang menitipkannya untuk satu
            // keperluan tertentu. Staff operasional tidak punya alasan membukanya,
            // dan mempersempitnya sekarang jauh lebih murah daripada nanti.
            Route::middleware('role:admin')->group(function () {
                // Manajemen akun. Menentukan siapa yang boleh masuk panel
                // bukan urusan staff operasional.
                Route::get('/users', [UserController::class, 'adminIndex']);
                Route::post('/users', [UserController::class, 'store']);
                Route::put('/users/{id}', [UserController::class, 'update']);
                Route::delete('/users/{id}', [UserController::class, 'destroy']);
                Route::put('/users/{id}/approve', [UserController::class, 'approve']);
                Route::put('/users/{id}/reject', [UserController::class, 'reject']);
                Route::put('/users/{id}/role', [UserController::class, 'setRole']);
                Route::post('/users/{id}/reset-password', [UserController::class, 'sendResetLink']);

                Route::get('/information-requests', [InformationRequestController::class, 'index']);
                Route::put('/information-requests/{id}/respond', [InformationRequestController::class, 'respond']);
                Route::get('/information-requests/{id}/file/{jenis}', [InformationRequestController::class, 'file'])
                    ->whereIn('jenis', ['ktp', 'surat-pernyataan']);
            });
        });
});

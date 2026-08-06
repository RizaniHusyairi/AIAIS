<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\Flight;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FlightController extends Controller
{
    private const FIDS_BASE = 'http://103.210.122.2';

    /** Folder unggahan logo maskapai di server FIDS. */
    private const FIDS_LOGO_DIR = '/storage/airlines';

    private const FIDS_TIMEOUT = 8;

    /**
     * Batas penelusuran halaman FIDS.
     *
     * FIDS memberi 5 baris per halaman; pada 1 Agustus 2026 keberangkatan
     * berjumlah 21 baris (5 halaman). Batas ini hanya jaring pengaman bila
     * `next_page_url` suatu saat tidak pernah kosong.
     */
    private const FIDS_MAX_PAGES = 20;

    /**
     * Umur cache jadwal.
     *
     * aptpairport.id memakai 15 menit. Di sini sengaja jauh lebih pendek:
     * papan ini menampilkan status yang berubah cepat (Check-in Dibuka ->
     * Boarding -> Berangkat), dan cache 15 menit membuat penumpang membaca
     * status yang sudah seperempat jam basi. Portal menyegarkan diri tiap
     * menit, jadi 60 detik menyamai iramanya sambil tetap meredam ledakan
     * permintaan ke server FIDS.
     */
    private const FIDS_TTL = 60;

    /**
     * Umur salinan cadangan terakhir yang masih boleh disajikan saat FIDS
     * tidak dapat dihubungi. Dua jam: cukup panjang untuk menutup gangguan
     * jaringan, cukup pendek supaya jadwal basi tidak menetap di layar —
     * dan tidak akan pernah menyeberang ke hari berikutnya.
     */
    private const FIDS_STALE_TTL = 7200;

    /** Logo maskapai nyaris tidak pernah berubah — ikut v1: simpan sehari. */
    private const LOGO_TTL_DAYS = 1;

    /**
     * Terjemahkan teks remark FIDS menjadi status baku aplikasi.
     *
     * Catatan: "check in" sengaja dipisahkan dari "boarding". Keduanya tahap
     * berbeda — sebelumnya keduanya dipetakan ke 'boarding' sehingga penumpang
     * yang check-in-nya baru dibuka melihat label "Boarding".
     */
    private function mapStatus(?string $rawRemark, string $type): string
    {
        $r = strtolower($rawRemark ?? '');

        if (str_contains($r, 'cancel') || str_contains($r, 'batal')) {
            return 'cancelled';
        }
        if (str_contains($r, 'delay')) {
            return 'delayed';
        }
        if ($type === 'arrival' && (str_contains($r, 'arrived') || str_contains($r, 'landed'))) {
            return 'landed';
        }
        if ($type === 'departure' && (str_contains($r, 'departured') || str_contains($r, 'departed'))) {
            return 'departed';
        }
        if (str_contains($r, 'boarding') || str_contains($r, 'waiting room')) {
            return 'boarding';
        }
        if (str_contains($r, 'check in') || str_contains($r, 'check-in')) {
            return 'check_in';
        }

        return 'scheduled';
    }

    /* ------------------------------------------------------------------ */
    /*  Pengambilan data FIDS                                              */
    /* ------------------------------------------------------------------ */

    /**
     * Ambil SELURUH halaman satu endpoint FIDS.
     *
     * Ini cara aptpairport.id (v1) mengambil datanya: menelusuri
     * `next_page_url` sampai habis. Sebelumnya AIAIS hanya membaca halaman
     * pertama, dan FIDS mengirim 5 baris per halaman — pada 1 Agustus 2026
     * keberangkatan berjumlah 21 baris, jadi papan jadwal hanya menampilkan
     * seperempat penerbangan hari itu tanpa penanda apa pun bahwa ada sisanya.
     */
    private function fetchAllPages(string $endpoint): array
    {
        $rows = [];

        for ($page = 1; $page <= self::FIDS_MAX_PAGES; $page++) {
            $payload = $this->fetchPage($endpoint, $page);

            // v1 berhenti begitu satu halaman gagal; ikuti — lebih baik
            // menampilkan sebagian jadwal daripada tidak sama sekali.
            $result = $payload['data']['result'] ?? null;
            if (!$result) {
                break;
            }

            $rows = array_merge($rows, $result['data'] ?? []);

            if (empty($result['next_page_url'])) {
                break;
            }
        }

        return $rows;
    }

    /**
     * Satu halaman FIDS, lewat cache, dengan salinan cadangan terakhir.
     *
     * Server FIDS sesekali menolak permintaan yang datang beruntun — dan
     * karena satu papan jadwal kini butuh sampai sembilan permintaan
     * (5 halaman keberangkatan + 4 kedatangan), sekali gagal saja sudah
     * cukup untuk menghapus SATU ARAH PENUH dari layar. Pada pengukuran
     * 1 Agustus 2026, satu dari delapan pemuatan kehilangan seluruh
     * kedatangan karena hal ini.
     *
     * Karena itu setiap halaman yang berhasil juga disimpan sebagai
     * "salinan terakhir yang baik" berumur panjang. Saat penyegaran gagal,
     * yang disajikan adalah salinan itu — jadwal yang beberapa menit lalu
     * masih benar jauh lebih berguna bagi penumpang daripada layar kosong.
     * Umurnya dibatasi (lihat FIDS_STALE_TTL) supaya jadwal kemarin tidak
     * ikut tersaji bila FIDS mati berkepanjangan.
     *
     * Bila penyimpanan cache sendiri tidak dapat dihubungi (CACHE_STORE
     * bernilai `database`, jadi MySQL mati ikut mematikannya), permintaan
     * diteruskan langsung ke FIDS. Papan jadwal tidak boleh ikut mati hanya
     * karena lapisan cache mati.
     */
    private function fetchPage(string $endpoint, int $page): ?array
    {
        $fetch = function () use ($endpoint, $page): ?array {
            $url = self::FIDS_BASE . "/api/transaksi/{$endpoint}";

            try {
                $response = Http::timeout(self::FIDS_TIMEOUT)->get($url, ['page' => $page]);

                if ($response->successful()) {
                    return $response->json();
                }

                Log::warning('FIDS menolak permintaan', [
                    'url' => $url, 'page' => $page, 'status' => $response->status(),
                ]);
            } catch (\Throwable $e) {
                Log::warning('FIDS tidak dapat dihubungi', [
                    'url' => $url, 'page' => $page, 'error' => $e->getMessage(),
                ]);
            }

            return null;
        };

        $key = "fids:{$endpoint}:hal:{$page}";
        $keyTerakhir = "{$key}:terakhir";

        try {
            $data = Cache::get($key);

            if ($data === null) {
                $data = $fetch();

                if ($data !== null) {
                    Cache::put($key, $data, now()->addSeconds(self::FIDS_TTL));
                    Cache::put($keyTerakhir, $data, now()->addSeconds(self::FIDS_STALE_TTL));
                } else {
                    // Penyegaran gagal — sajikan salinan terakhir bila masih ada.
                    $data = Cache::get($keyTerakhir);

                    if ($data !== null) {
                        Log::info('FIDS gagal, memakai salinan terakhir', [
                            'endpoint' => $endpoint, 'page' => $page,
                        ]);
                    }
                }
            }

            return $data;
        } catch (\Throwable $e) {
            Log::warning('Penyimpanan cache tidak tersedia, ambil langsung dari FIDS', [
                'error' => $e->getMessage(),
            ]);

            return $fetch();
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Logo maskapai                                                      */
    /* ------------------------------------------------------------------ */

    /**
     * Ambil nama berkas logo dari nilai `maskapai.logo` milik FIDS.
     *
     * FIDS mengirim lintasan absolut ("/storage/airlines/xxxx.png"), tetapi
     * pernah pula hanya nama berkas atau URL utuh. `basename()` menyamakan
     * ketiganya sekaligus menutup upaya path traversal — persis cara v1.
     */
    private function airlineLogoFile(?string $logo): ?string
    {
        $file = basename(trim((string) $logo));

        return $file !== '' && $file !== '.' ? $file : null;
    }

    /**
     * URL logo yang dipakai portal.
     *
     * Menunjuk ke proksi milik portal ini, BUKAN langsung ke server FIDS.
     * Alasannya sama dengan yang didokumentasikan di v1: host FIDS hanya
     * melayani HTTP, sehingga gambarnya diblokir sebagai *mixed content*
     * begitu portal disajikan lewat HTTPS — dan AIAIS akan menggantikan
     * aptpairport.id yang berjalan di HTTPS.
     *
     * `url()` menghasilkan alamat absolut berdasarkan permintaan yang sedang
     * berjalan, jadi frontend Next.js yang berada di origin berbeda tetap
     * bisa memuatnya.
     */
    private function airlineLogoUrl(?string $logo): ?string
    {
        $file = $this->airlineLogoFile($logo);

        return $file ? url('/api/' . config('api.version') . '/airlines/logo/' . rawurlencode($file)) : null;
    }

    /**
     * Proksi berkas logo maskapai: ambil dari FIDS (HTTP), sajikan ulang dari
     * portal ini sehingga aman dimuat halaman HTTPS.
     *
     * Disalin dari `LandingPageController::imageProxy()` milik v1, termasuk
     * penjagaannya: hanya nama berkas gambar yang wajar yang diteruskan, dan
     * direktori tujuan dikunci — jadi endpoint ini tidak bisa dipakai untuk
     * mengambil URL sembarangan (SSRF).
     */
    public function logo(string $filename)
    {
        $file = basename($filename);

        if (!preg_match('/^[A-Za-z0-9._-]+\.(png|jpe?g|webp|svg)$/i', $file)) {
            abort(404);
        }

        $key = 'logo_maskapai:' . $file;

        $fetch = function () use ($file): ?array {
            $url = self::FIDS_BASE . self::FIDS_LOGO_DIR . '/' . $file;

            try {
                $response = Http::timeout(self::FIDS_TIMEOUT)->get($url);

                if ($response->failed()) {
                    Log::warning('Proksi logo maskapai gagal', ['url' => $url, 'status' => $response->status()]);
                    return null;
                }

                return [
                    // Badan gambar disandikan base64 sebelum masuk cache.
                    //
                    // CACHE_STORE=database, dan kolom `cache.value` bertipe
                    // `mediumtext utf8mb4` — byte PNG mentah ditolak MySQL
                    // dengan error 1366 "Incorrect string value". Akibatnya
                    // penyimpanan logo SELALU gagal dan setiap permintaan
                    // gambar diteruskan ke server FIDS, yang lalu membalas
                    // 429 Too Many Requests dan ikut menjatuhkan pengambilan
                    // jadwal. Base64 membuat isinya aman untuk kolom teks.
                    'body' => base64_encode($response->body()),
                    'type' => $response->header('Content-Type') ?: 'image/png',
                ];
            } catch (\Throwable $e) {
                Log::warning('Proksi logo maskapai error', ['url' => $url, 'error' => $e->getMessage()]);
                return null;
            }
        };

        try {
            $image = Cache::remember($key, now()->addDays(self::LOGO_TTL_DAYS), $fetch);

            // Jangan simpan kegagalan sehari penuh — beri kesempatan coba lagi.
            if (!$image) {
                Cache::forget($key);
            }
        } catch (\Throwable $e) {
            Log::warning('Penyimpanan cache tidak tersedia untuk logo', ['error' => $e->getMessage()]);
            $image = $fetch();
        }

        $body = $image ? base64_decode($image['body'], true) : false;

        if ($body === false || $body === '') {
            abort(404);
        }

        return response($body)
            ->header('Content-Type', $image['type'])
            ->header('Cache-Control', 'public, max-age=86400');
    }

    /** Gabungkan nama bandara dengan kode IATA-nya: "MELALAN (GHS)". */
    private function placeLabel(?array $airport): ?string
    {
        if (!$airport) {
            return null;
        }
        $name = $airport['nama'] ?? null;
        $iata = $airport['iata'] ?? '';

        if (!$name) {
            return null;
        }
        return $iata ? "{$name} ({$iata})" : $name;
    }

    /**
     * Nomor konter check-in yang benar-benar terpakai.
     *
     * FIDS mengirim konter, konter2, konter3; **0 berarti belum ditetapkan**,
     * bukan "konter nomor 0". Penyaringannya menyalin aturan v1:
     * `[konter, konter2, konter3].filter(v => Number(v) > 0)`.
     */
    private function checkinCounters(array $item): array
    {
        return collect([$item['konter'] ?? null, $item['konter2'] ?? null, $item['konter3'] ?? null])
            ->filter(fn ($c) => (int) $c > 0)
            ->map(fn ($c) => (int) $c)
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    /**
     * Warna merek maskapai dari FIDS (`maskapai.kode_warna`).
     *
     * Hanya diterima bila berupa heksadesimal yang sah — v1 memakai penjagaan
     * yang sama, karena nilai ini disuntikkan ke atribut `style` di sisi
     * tampilan. `null` berarti tampilan memakai warna bawaannya sendiri.
     */
    private function airlineColor(?string $value): ?string
    {
        $hex = trim((string) $value);

        return preg_match('/^#[0-9a-f]{3,8}$/i', $hex) ? $hex : null;
    }

    /** Ubah satu record FIDS menjadi bentuk baku yang dipakai portal. */
    private function mapFlight(array $item, string $type): array
    {
        $isArrival = $type === 'arrival';
        $status = $this->mapStatus($item['remark']['status'] ?? null, $type);

        // Gate hanya diisi bila FIDS benar-benar menetapkannya. "-" berarti
        // belum ditentukan — jangan dikarang menjadi "Gate 1".
        $gate = $item['gate']['nama'] ?? null;
        if ($gate === '-' || $gate === '' || $isArrival) {
            $gate = null;
        }

        // Alasan keterlambatan; "---" adalah nilai kosong milik FIDS.
        $reason = $item['reason']['deskripsi'] ?? null;
        if ($reason === '---' || $reason === '') {
            $reason = null;
        }

        $airportField = $isArrival ? 'bandara_asal' : 'bandara_tujuan';
        $airport = $item[$airportField] ?? null;
        $counterpartLabel = $this->placeLabel($airport) ?? ($isArrival ? 'ASAL' : 'TUJUAN');

        return [
            'id' => ($isArrival ? 'arr_' : 'dep_') . ($item['id'] ?? uniqid()),
            'flight_number' => $item['pesawat']['kode_penerbangan'] ?? ($isArrival ? 'AAP-ARR' : 'AAP-DEP'),
            'airline' => $item['maskapai']['nama'] ?? 'Maskapai',
            'airline_logo' => $this->airlineLogoUrl($item['maskapai']['logo'] ?? null),
            // Kode dan warna merek datang dari FIDS (mis. "SAQ", "#1fb253").
            // v1 memakainya apa adanya; portal tidak perlu menebak-nebak lagi.
            'airline_code' => $item['maskapai']['kode'] ?? null,
            'airline_color' => $this->airlineColor($item['maskapai']['kode_warna'] ?? null),

            'origin' => $isArrival ? $counterpartLabel : 'Samarinda (AAP)',
            'destination' => $isArrival ? 'Samarinda (AAP)' : $counterpartLabel,
            'origin_city' => $isArrival ? ($airport['kota_provinsi'] ?? null) : 'Samarinda, Kalimantan Timur',
            'destination_city' => $isArrival ? 'Samarinda, Kalimantan Timur' : ($airport['kota_provinsi'] ?? null),

            'flight_date' => $item['tanggal'] ?? null,
            'scheduled_time' => ($item['jam'] ?? '00:00') . ' WITA',
            // FIDS tidak mengirim waktu estimasi tersendiri. Sebelumnya kolom ini
            // disalin dari jadwal sehingga "estimasi" tidak pernah berarti apa pun.
            'estimated_time' => null,

            'terminal' => 'Terminal Utama',
            'gate' => $gate,
            'baggage_belt' => $isArrival && !empty($item['conveyor']) ? (int) $item['conveyor'] : null,
            'checkin_counters' => $isArrival ? [] : $this->checkinCounters($item),

            'flight_type' => $type,
            'status' => $status,
            'remarks' => $item['remark']['status'] ?? null,
            'delay_reason' => $reason,
            'note' => $item['keterangan'] ?? null,

            'aircraft_type' => $item['pesawat']['jenis'] ?? null,
            'airline_phone' => $item['maskapai']['no_telp1'] ?? null,
            'airline_email' => $item['maskapai']['email'] ?? null,
            'is_extra' => (bool) ($item['is_extra'] ?? false),
            'updated_at' => $item['updated_at'] ?? null,
        ];
    }

    /**
     * Lengkapi penerbangan dari basis data lokal dengan kunci-kunci baru,
     * supaya bentuk respons tetap sama baik sumbernya FIDS maupun DB.
     */
    private function normalizeDbFlight(Flight $flight): array
    {
        return array_merge([
            'airline_code' => null,
            'airline_color' => null,
            'origin_city' => null,
            'destination_city' => null,
            'flight_date' => null,
            'baggage_belt' => null,
            'checkin_counters' => [],
            'delay_reason' => null,
            'note' => null,
            'aircraft_type' => null,
            'airline_phone' => null,
            'airline_email' => null,
            'is_extra' => false,
        ], $flight->toArray());
    }

    public function index(Request $request)
    {
        $liveFlights = [];

        // Seluruh halaman ditelusuri, bukan halaman pertama saja — lihat
        // fetchAllPages(). Kegagalan jaringan sudah ditangani di dalamnya dan
        // menghasilkan larik kosong, jadi tidak perlu try/catch di sini.
        foreach ($this->fetchAllPages('kedatangan') as $item) {
            $liveFlights[] = $this->mapFlight($item, 'arrival');
        }

        foreach ($this->fetchAllPages('keberangkatan') as $item) {
            $liveFlights[] = $this->mapFlight($item, 'departure');
        }

        // Umpan langsung dipakai bila ada isinya; kalau tidak, jatuh ke basis
        // data lokal. Basis data sengaja dibungkus: jalur langsung sama sekali
        // tidak membutuhkannya, jadi MySQL yang mati tidak boleh ikut
        // mematikan papan jadwal.
        if (count($liveFlights) > 0) {
            $allFlights = collect($liveFlights);
        } else {
            try {
                $allFlights = Flight::all()->map(fn (Flight $f) => $this->normalizeDbFlight($f));
            } catch (\Throwable $e) {
                Log::warning('Basis data lokal tidak dapat dibaca', ['error' => $e->getMessage()]);
                $allFlights = collect();
            }
        }

        // Apply Filters
        if ($request->has('type') && in_array($request->type, ['departure', 'arrival'])) {
            $allFlights = $allFlights->where('flight_type', $request->type);
        }

        if ($request->has('airline') && !empty($request->airline)) {
            $air = strtolower($request->airline);
            $allFlights = $allFlights->filter(fn($f) => str_contains(strtolower($f['airline']), $air));
        }

        if ($request->has('search') && !empty($request->search)) {
            $s = strtolower($request->search);
            $allFlights = $allFlights->filter(function($f) use ($s) {
                return str_contains(strtolower($f['flight_number']), $s) ||
                       str_contains(strtolower($f['airline']), $s) ||
                       str_contains(strtolower($f['origin']), $s) ||
                       str_contains(strtolower($f['destination']), $s);
            });
        }

        $flightsList = $allFlights->values()->all();

        $stats = [
            'total' => count($flightsList),
            'departures' => collect($flightsList)->where('flight_type', 'departure')->count(),
            'arrivals' => collect($flightsList)->where('flight_type', 'arrival')->count(),
            'check_in' => collect($flightsList)->where('status', 'check_in')->count(),
            'boarding' => collect($flightsList)->where('status', 'boarding')->count(),
            'delayed' => collect($flightsList)->where('status', 'delayed')->count(),
            'cancelled' => collect($flightsList)->where('status', 'cancelled')->count(),
        ];

        return ApiResponse::success([
            'flights' => $flightsList,
            'stats' => $stats,
            'source' => count($liveFlights) > 0 ? 'Live API APT Pranoto' : 'Database Local',
        ], 'Daftar penerbangan FIDS Bandara APT Pranoto');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'flight_number' => 'required|string',
            'airline' => 'required|string',
            'origin' => 'required|string',
            'destination' => 'required|string',
            'scheduled_time' => 'required|string',
            'estimated_time' => 'nullable|string',
            'terminal' => 'required|string',
            'gate' => 'nullable|string',
            'flight_type' => 'required|in:departure,arrival',
            'status' => 'required|in:scheduled,check_in,boarding,departed,delayed,landed,cancelled',
            'remarks' => 'nullable|string',
        ]);

        $flight = Flight::create($validated);
        return ApiResponse::success($flight, 'Penerbangan berhasil ditambahkan', null, 201);
    }

    public function update(Request $request, $id)
    {
        $flight = Flight::find($id);
        if (!$flight) {
            return ApiResponse::success(['id' => $id, 'status' => $request->status], 'Status penerbangan berhasil diperbarui');
        }

        $validated = $request->validate([
            'flight_number' => 'sometimes|string',
            'airline' => 'sometimes|string',
            'origin' => 'sometimes|string',
            'destination' => 'sometimes|string',
            'scheduled_time' => 'sometimes|string',
            'estimated_time' => 'nullable|string',
            'terminal' => 'sometimes|string',
            'gate' => 'nullable|string',
            'flight_type' => 'sometimes|in:departure,arrival',
            'status' => 'sometimes|in:scheduled,check_in,boarding,departed,delayed,landed,cancelled',
            'remarks' => 'nullable|string',
        ]);

        $flight->update($validated);
        return ApiResponse::success($flight, 'Status penerbangan berhasil diperbarui');
    }

    public function destroy($id)
    {
        $flight = Flight::find($id);
        if ($flight) {
            $flight->delete();
        }
        return ApiResponse::success(null, 'Penerbangan berhasil dihapus');
    }
}

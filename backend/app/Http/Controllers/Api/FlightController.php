<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ApiResponse;
use App\Models\Flight;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FlightController extends Controller
{
    private const FIDS_BASE = 'http://103.210.122.2';

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
     * FIDS mengirim konter, konter2, konter3; nilai 0/null berarti tidak dipakai.
     */
    private function checkinCounters(array $item): array
    {
        return collect([$item['konter'] ?? null, $item['konter2'] ?? null, $item['konter3'] ?? null])
            ->filter(fn ($c) => !empty($c))
            ->map(fn ($c) => (int) $c)
            ->unique()
            ->sort()
            ->values()
            ->all();
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
            'airline_logo' => isset($item['maskapai']['logo'])
                ? self::FIDS_BASE . "/storage/logo/{$item['maskapai']['logo']}"
                : null,

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

        try {
            // Fetch live arrivals and departures from external APT Pranoto API
            $arrResponse = Http::timeout(4)->get(self::FIDS_BASE . '/api/transaksi/kedatangan');
            $depResponse = Http::timeout(4)->get(self::FIDS_BASE . '/api/transaksi/keberangkatan');

            if ($arrResponse->successful()) {
                foreach ($arrResponse->json()['data']['result']['data'] ?? [] as $item) {
                    $liveFlights[] = $this->mapFlight($item, 'arrival');
                }
            }

            if ($depResponse->successful()) {
                foreach ($depResponse->json()['data']['result']['data'] ?? [] as $item) {
                    $liveFlights[] = $this->mapFlight($item, 'departure');
                }
            }
        } catch (\Exception $e) {
            Log::error("Failed fetching live flight API: " . $e->getMessage());
        }

        // If live API returns results, use live flights; otherwise fallback to local DB flights
        if (count($liveFlights) > 0) {
            $allFlights = collect($liveFlights);
        } else {
            $allFlights = Flight::all()->map(fn (Flight $f) => $this->normalizeDbFlight($f));
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

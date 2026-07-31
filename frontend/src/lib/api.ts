import { NEWS_FALLBACK, ANNOUNCEMENTS_FALLBACK } from '@/lib/newsData';

/* ------------------------------------------------------------------ */
/*  Alamat API                                                         */
/*                                                                     */
/*  Disusun dari bagian-bagian, bukan satu literal, supaya perpindahan  */
/*  versi kontrak berikutnya tidak perlu diburu di banyak berkas.       */
/*  Ini SATU-SATUNYA tempat alamat API didefinisikan di frontend —      */
/*  berkas lain wajib mengimpor `API_BASE_URL`, jangan menyusun ulang.  */
/* ------------------------------------------------------------------ */

/** Versi KONTRAK API, bukan versi produk. Selaras dengan config/api.php. */
export const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v2';

/** Asal server backend, tanpa path. */
export const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN || 'http://127.0.0.1:8000';

/** `NEXT_PUBLIC_API_URL` tetap didukung sebagai override URL penuh. */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || `${API_ORIGIN}/api/${API_VERSION}`;

/** Lokasi berkas logo maskapai pada server FIDS APT Pranoto. */
const AIRLINE_LOGO_BASE = 'http://103.210.122.2/storage/logo';

/** Susun URL logo dari nama berkas yang dikirim API FIDS. */
function airlineLogoFrom(item: any): string | null {
  const file = item?.maskapai?.logo;
  return file ? `${AIRLINE_LOGO_BASE}/${file}` : null;
}

/* ------------------------------------------------------------------ */
/*  Pemetaan FIDS -> bentuk baku portal                                */
/*                                                                     */
/*  Harus selalu selaras dengan FlightController::mapFlight() di        */
/*  backend, karena jalur ini dipakai saat server Laravel tidak aktif   */
/*  dan browser menembak FIDS secara langsung.                          */
/* ------------------------------------------------------------------ */

/**
 * Bentuk satu record dari FIDS. Sengaja longgar — server bandara mengirim
 * banyak kolom internal yang tidak dipakai portal, dan bisa berubah tanpa
 * pemberitahuan, jadi setiap field diperlakukan sebagai opsional.
 */
interface FidsAirport {
  nama?: string;
  iata?: string;
  kota_provinsi?: string;
}

interface FidsRecord {
  id?: number | string;
  tanggal?: string;
  jam?: string;
  konter?: number | string | null;
  konter2?: number | string | null;
  konter3?: number | string | null;
  conveyor?: number | string | null;
  keterangan?: string | null;
  is_extra?: number | boolean;
  updated_at?: string;
  maskapai?: { nama?: string; logo?: string; no_telp1?: string; email?: string };
  pesawat?: { kode_penerbangan?: string; jenis?: string };
  gate?: { nama?: string };
  remark?: { status?: string };
  reason?: { deskripsi?: string };
  bandara_asal?: FidsAirport;
  bandara_tujuan?: FidsAirport;
}

/** Terjemahkan teks remark FIDS menjadi status baku aplikasi. */
function mapFidsStatus(rawRemark: string | undefined, type: 'arrival' | 'departure'): string {
  const r = (rawRemark || '').toLowerCase();

  if (r.includes('cancel') || r.includes('batal')) return 'cancelled';
  if (r.includes('delay')) return 'delayed';
  if (type === 'arrival' && (r.includes('arrived') || r.includes('landed'))) return 'landed';
  if (type === 'departure' && (r.includes('departured') || r.includes('departed'))) return 'departed';
  if (r.includes('boarding') || r.includes('waiting room')) return 'boarding';
  // "Check In Open" adalah tahap sebelum boarding — jangan disamakan.
  if (r.includes('check in') || r.includes('check-in')) return 'check_in';

  return 'scheduled';
}

/** Gabungkan nama bandara dengan kode IATA-nya: "MELALAN (GHS)". */
function placeLabel(airport: FidsAirport | undefined): string | null {
  const name = airport?.nama;
  if (!name) return null;
  return airport?.iata ? `${name} (${airport.iata})` : name;
}

/** Nomor konter check-in yang benar-benar terpakai (0/null = tidak dipakai). */
function checkinCounters(item: FidsRecord): number[] {
  return [...new Set([item?.konter, item?.konter2, item?.konter3]
    .filter((c) => !!c)
    .map((c) => Number(c)))]
    .sort((a, b) => a - b);
}

function mapFidsFlight(item: FidsRecord, type: 'arrival' | 'departure') {
  const isArrival = type === 'arrival';

  // Gate hanya diisi bila FIDS menetapkannya. "-" berarti belum ditentukan;
  // jangan dikarang menjadi "Gate 1" seperti implementasi sebelumnya.
  let gate: string | null = item?.gate?.nama ?? null;
  if (gate === '-' || gate === '' || isArrival) gate = null;

  // "---" adalah nilai kosong milik FIDS untuk alasan keterlambatan.
  let reason: string | null = item?.reason?.deskripsi ?? null;
  if (reason === '---' || reason === '') reason = null;

  const airport = isArrival ? item?.bandara_asal : item?.bandara_tujuan;
  const counterpart = placeLabel(airport) ?? (isArrival ? 'ASAL' : 'TUJUAN');

  return {
    id: `${isArrival ? 'arr_' : 'dep_'}${item?.id ?? Math.random().toString(36).slice(2)}`,
    flight_number: item?.pesawat?.kode_penerbangan || (isArrival ? 'AAP-ARR' : 'AAP-DEP'),
    airline: item?.maskapai?.nama || 'Maskapai',
    airline_logo: airlineLogoFrom(item),

    origin: isArrival ? counterpart : 'Samarinda (AAP)',
    destination: isArrival ? 'Samarinda (AAP)' : counterpart,
    origin_city: isArrival ? airport?.kota_provinsi ?? null : 'Samarinda, Kalimantan Timur',
    destination_city: isArrival ? 'Samarinda, Kalimantan Timur' : airport?.kota_provinsi ?? null,

    flight_date: item?.tanggal ?? null,
    scheduled_time: `${item?.jam || '00:00'} WITA`,
    // FIDS tidak mengirim waktu estimasi tersendiri.
    estimated_time: null,

    terminal: 'Terminal Utama',
    gate,
    baggage_belt: isArrival && item?.conveyor ? Number(item.conveyor) : null,
    checkin_counters: isArrival ? [] : checkinCounters(item),

    flight_type: type,
    status: mapFidsStatus(item?.remark?.status, type),
    remarks: item?.remark?.status ?? null,
    delay_reason: reason,
    note: item?.keterangan ?? null,

    aircraft_type: item?.pesawat?.jenis ?? null,
    airline_phone: item?.maskapai?.no_telp1 ?? null,
    airline_email: item?.maskapai?.email ?? null,
    is_extra: Boolean(item?.is_extra),
    updated_at: item?.updated_at ?? null,
  };
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data: T; message?: string; pagination?: any }> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
      cache: 'no-store',
    });

    if (res.ok) {
      const json = await res.json();
      return json;
    }
  } catch (error) {
    console.warn(`Laravel API unreachable [${endpoint}], activating live external fallback...`);
  }

  // FALLBACK DIRECT FETCH FOR LIVE FLIGHTS
  if (endpoint.startsWith('/flights')) {
    try {
      const [arrRes, depRes] = await Promise.all([
        fetch('http://103.210.122.2/api/transaksi/kedatangan').then(r => r.json()).catch(() => null),
        fetch('http://103.210.122.2/api/transaksi/keberangkatan').then(r => r.json()).catch(() => null),
      ]);

      const flights: any[] = [];

      if (arrRes?.data?.result?.data) {
        arrRes.data.result.data.forEach((item: any) => flights.push(mapFidsFlight(item, 'arrival')));
      }

      if (depRes?.data?.result?.data) {
        depRes.data.result.data.forEach((item: any) => flights.push(mapFidsFlight(item, 'departure')));
      }

      // If external API has data, return it
      if (flights.length > 0) {
        return {
          success: true,
          data: { flights, stats: { total: flights.length } } as unknown as T,
          message: 'Data penerbangan live dari server APT Pranoto',
        };
      }
    } catch (e) {
      console.error('Direct external fetch error:', e);
    }
  }

  // Tidak ada data contoh penerbangan.
  //
  // Jadwal penerbangan hanya boleh berasal dari FIDS bandara. Bila kedua
  // server tidak dapat dihubungi, kembalikan daftar kosong supaya tampilan
  // berkata apa adanya "belum ada jadwal" — bukan menampilkan penerbangan
  // karangan yang tampak seperti jadwal hari ini.

  const dummyNews = NEWS_FALLBACK;
  const dummyAnnouncements = ANNOUNCEMENTS_FALLBACK;

  if (endpoint.startsWith('/flights')) {
    return {
      success: false,
      data: { flights: [], stats: { total: 0 } } as unknown as T,
      message: 'Jadwal penerbangan tidak dapat dimuat',
    };
  }

  // Fallback berita & pengumuman agar portal tetap tampil saat server tidak aktif
  if (endpoint.startsWith('/news')) {
    const slugMatch = endpoint.replace(/^\/news\/?/, '').split('?')[0];
    if (slugMatch) {
      const found = dummyNews.find((n) => n.slug === slugMatch);
      return found
        ? { success: true, data: found as unknown as T, message: 'Data contoh (server tidak aktif)' }
        : { success: true, data: dummyNews[0] as unknown as T, message: 'Data contoh (server tidak aktif)' };
    }
    return { success: true, data: dummyNews as unknown as T, message: 'Data contoh (server tidak aktif)' };
  }

  if (endpoint.startsWith('/announcements')) {
    return { success: true, data: dummyAnnouncements as unknown as T, message: 'Data contoh (server tidak aktif)' };
  }

  return {
    success: false,
    data: [] as unknown as T,
    message: 'Gagal terhubung ke server',
  };
}

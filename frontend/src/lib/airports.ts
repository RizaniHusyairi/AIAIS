/**
 * Koordinat bandara untuk menggambar rute penerbangan.
 *
 * ────────────────────────────────────────────────────────────────────────
 * PROVENANS DATA
 *   Sumber : OurAirports — https://davidmegginson.github.io/ourairports-data/airports.csv
 *   Lisensi: domain publik (dedikasi publik oleh OurAirports)
 *   Diunduh: 27 Juli 2026
 *   Saring : iso_country = "ID"
 *
 *   Kolom `icao` disertakan sebagai pembanding silang manual terhadap
 *   AIP Indonesia (eAIP DJPU). Bila suatu entri diragukan, HAPUS entri itu —
 *   peta akan otomatis ditekan untuk rute tersebut. Jangan pernah menambahkan
 *   koordinat hasil perkiraan: menggambar pesawat di atas pulau yang salah
 *   lebih buruk daripada tidak menggambar peta sama sekali.
 * ────────────────────────────────────────────────────────────────────────
 */

import { splitPlace } from '@/lib/place';
import type { LatLon } from '@/lib/geo';

export type AirportGeo = {
  iata: string;
  /** Kode ICAO, untuk verifikasi silang terhadap AIP. */
  icao?: string;
  /** Nama ringkas untuk label peta. */
  name: string;
  /** Kota/kabupaten. */
  city: string;
  lat: number;
  lon: number;
};

/** Bandara pangkalan portal ini. */
export const HOME_IATA = 'AAP';

export const AIRPORTS: Record<string, AirportGeo> = {
  AAP: { iata: 'AAP', icao: 'WALS', name: 'APT Pranoto', city: 'Samarinda', lat: -0.3745, lon: 117.2501 },
  AMQ: { iata: 'AMQ', icao: 'WAPP', name: 'Pattimura', city: 'Ambon', lat: -3.7103, lon: 128.0890 },
  BDJ: { iata: 'BDJ', icao: 'WAOO', name: 'Syamsudin Noor', city: 'Banjarmasin', lat: -3.4401, lon: 114.7612 },
  BEJ: { iata: 'BEJ', icao: 'WAQT', name: 'Kalimarau', city: 'Tanjung Redeb, Berau', lat: 2.1478, lon: 117.4307 },
  BPN: { iata: 'BPN', icao: 'WALL', name: 'Sepinggan', city: 'Balikpapan', lat: -1.2683, lon: 116.8945 },
  BTH: { iata: 'BTH', icao: 'WIDD', name: 'Hang Nadim', city: 'Batam', lat: 1.1210, lon: 104.1190 },
  BXT: { iata: 'BXT', icao: 'WALC', name: 'LNG Badak', city: 'Bontang', lat: 0.1217, lon: 117.4766 },
  CGK: { iata: 'CGK', icao: 'WIII', name: 'Soekarno-Hatta', city: 'Tangerang, Banten', lat: -6.1256, lon: 106.6560 },
  DJJ: { iata: 'DJJ', icao: 'WAJJ', name: 'Dortheys Hiyo Eluay', city: 'Sentani, Papua', lat: -2.5796, lon: 140.5199 },
  DPS: { iata: 'DPS', icao: 'WADD', name: 'I Gusti Ngurah Rai', city: 'Denpasar, Bali', lat: -8.7484, lon: 115.1671 },
  DTD: { iata: 'DTD', icao: 'WALJ', name: 'Datah Dawai', city: 'Mahakam Ulu', lat: 0.8070, lon: 114.5291 },
  GHS: { iata: 'GHS', icao: 'WALE', name: 'Melalan', city: 'Melak, Kutai Barat', lat: -0.2036, lon: 115.7600 },
  HLP: { iata: 'HLP', icao: 'WIHH', name: 'Halim Perdanakusuma', city: 'Jakarta', lat: -6.2670, lon: 106.8903 },
  JOG: { iata: 'JOG', icao: 'WAHH', name: 'Adisutjipto', city: 'Yogyakarta', lat: -7.7882, lon: 110.4320 },
  KNO: { iata: 'KNO', icao: 'WIMM', name: 'Kualanamu', city: 'Deli Serdang', lat: 3.6378, lon: 98.8706 },
  KOE: { iata: 'KOE', icao: 'WATT', name: 'El Tari', city: 'Kupang', lat: -10.1716, lon: 123.6710 },
  LOP: { iata: 'LOP', icao: 'WADL', name: 'Lombok', city: 'Lombok Tengah', lat: -8.7600, lon: 116.2782 },
  MDC: { iata: 'MDC', icao: 'WAMM', name: 'Sam Ratulangi', city: 'Manado', lat: 1.5486, lon: 124.9262 },
  MOF: { iata: 'MOF', icao: 'WATC', name: 'Frans Xavier Seda', city: 'Maumere', lat: -8.6395, lon: 122.2381 },
  NNX: { iata: 'NNX', icao: 'WAQA', name: 'Nunukan', city: 'Nunukan', lat: 4.1340, lon: 117.6695 },
  PDG: { iata: 'PDG', icao: 'WIEE', name: 'Minangkabau', city: 'Padang', lat: -0.7860, lon: 100.2804 },
  PKN: { iata: 'PKN', icao: 'WAGI', name: 'Iskandar', city: 'Pangkalan Bun', lat: -2.7052, lon: 111.6730 },
  PKY: { iata: 'PKY', icao: 'WAGG', name: 'Tjilik Riwut', city: 'Palangka Raya', lat: -2.2271, lon: 113.9434 },
  PLM: { iata: 'PLM', icao: 'WIPP', name: 'Sultan Mahmud Badaruddin II', city: 'Palembang', lat: -2.8977, lon: 104.6981 },
  SUB: { iata: 'SUB', icao: 'WARR', name: 'Juanda', city: 'Surabaya', lat: -7.3798, lon: 112.7870 },
  TRK: { iata: 'TRK', icao: 'WAQQ', name: 'Juwata', city: 'Tarakan', lat: 3.3251, lon: 117.5642 },
  UPG: { iata: 'UPG', icao: 'WAAA', name: 'Sultan Hasanuddin', city: 'Makassar', lat: -5.0755, lon: 119.5537 },
  YIA: { iata: 'YIA', icao: 'WAHI', name: 'Yogyakarta Internasional', city: 'Kulon Progo', lat: -7.9053, lon: 110.0573 },
};

/**
 * Nama bandara (huruf besar, tanpa tanda baca) -> IATA.
 *
 * Diperlukan karena FIDS kadang mengirim nama tanpa kode IATA. Lihat
 * `airportFromPlace` di bawah untuk alasan mengapa kode hasil tebakan
 * `splitPlace` tidak boleh dipercaya dalam kasus itu.
 */
const NAME_ALIASES: Record<string, string> = {
  'APT PRANOTO': 'AAP',
  'AJI PANGERAN TUMENGGUNG PRANOTO': 'AAP',
  SAMARINDA: 'AAP',
  'SOEKARNO HATTA': 'CGK',
  'SOEKARNO-HATTA': 'CGK',
  JUANDA: 'SUB',
  SEPINGGAN: 'BPN',
  'SULTAN AJI MUHAMMAD SULAIMAN': 'BPN',
  'SULTAN HASANUDDIN': 'UPG',
  'NGURAH RAI': 'DPS',
  'I GUSTI NGURAH RAI': 'DPS',
  MELALAN: 'GHS',
  MELAK: 'GHS',
  KALIMARAU: 'BEJ',
  'TANJUNG REDEP': 'BEJ',
  'TANJUNG REDEB': 'BEJ',
  JUWATA: 'TRK',
  'SYAMSUDIN NOOR': 'BDJ',
  'TJILIK RIWUT': 'PKY',
  'DATAH DAWAI': 'DTD',
  DATADAWAI: 'DTD',
  'HALIM PERDANAKUSUMA': 'HLP',
  ADISUTJIPTO: 'JOG',
  KUALANAMU: 'KNO',
  'SAM RATULANGI': 'MDC',
  PATTIMURA: 'AMQ',
  'EL TARI': 'KOE',
  'HANG NADIM': 'BTH',
  MINANGKABAU: 'PDG',
  'LNG BADAK': 'BXT',
  ISKANDAR: 'PKN',
};

const normalize = (s: string) =>
  s
    .toUpperCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Cari bandara dari kode IATA. */
export function lookupAirport(code?: string | null): AirportGeo | null {
  if (!code) return null;
  return AIRPORTS[code.trim().toUpperCase()] ?? null;
}

let warnedMismatch = false;

/**
 * Resolusi bandara dari string rute FIDS, mis. `"MELALAN (GHS)"`.
 *
 * PENTING — jebakan `splitPlace`: bila string TIDAK berkurung, `splitPlace`
 * memotong tiga huruf pertama sebagai "kode". `"MELALAN"` menjadi `"MEL"`,
 * yang merupakan kode IATA sah milik Melbourne, Australia. Mempercayainya
 * akan menggambar penerbangan Kutai Barat di atas Australia. Karena itu kode
 * hanya dipercaya bila memang berasal dari dalam kurung.
 *
 * Mengembalikan `null` bila tidak dikenali — pemanggil WAJIB menekan peta,
 * bukan menebak posisi.
 */
export function airportFromPlace(place?: string | null): AirportGeo | null {
  if (!place) return null;

  const hasParens = /\([^)]+\)/.test(place);
  const { code, city } = splitPlace(place);

  const byName = NAME_ALIASES[normalize(city || place)] ?? null;

  if (!hasParens) {
    // Kode dari `splitPlace` tidak dapat dipercaya di cabang ini.
    return lookupAirport(byName);
  }

  const byCode = lookupAirport(code);

  if (byName && byCode && byName !== byCode.iata) {
    if (!warnedMismatch) {
      warnedMismatch = true;
      console.warn(
        `[airports] Kode dan nama bandara tidak cocok pada "${place}": ` +
          `kode=${byCode.iata}, nama=${byName}. Memakai hasil dari nama.`,
      );
    }
    return lookupAirport(byName);
  }

  return byCode ?? lookupAirport(byName);
}

/** Bentuk koordinat murni untuk modul geometri. */
export const toLatLon = (a: AirportGeo): LatLon => ({ lat: a.lat, lon: a.lon });

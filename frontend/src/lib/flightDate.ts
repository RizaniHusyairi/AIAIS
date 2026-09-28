/** Tanggal kalender bandara harus dihitung di WITA, bukan zona waktu perangkat. */
export function todayWita(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export type FlightDateStatus = 'today' | 'yesterday' | 'older' | 'future' | 'unknown';

export function flightDateStatus(date: string | null | undefined, now: Date): FlightDateStatus {
  return dateStatusFor(date, todayWita(now));
}

/**
 * Sama dengan flightDateStatus(), tetapi menerima tanggal WITA hari ini
 * sebagai teks. Dipakai di dalam useMemo: teks ini hanya berganti tengah
 * malam, sedangkan objek Date jam berganti tiap detik.
 */
export function dateStatusFor(date: string | null | undefined, today: string): FlightDateStatus {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'unknown';
  if (date === today) return 'today';
  if (date > today) return 'future';

  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return date === yesterday.toISOString().slice(0, 10) ? 'yesterday' : 'older';
}

/* ------------------------------------------------------------------ */
/*  Filter Hari ini / Kemarin                                          */
/* ------------------------------------------------------------------ */

export type PilihanHari = 'today' | 'yesterday';

export interface FilterHari<T> {
  /** Filter hanya ditampilkan bila ada jadwal bertanggal hari ini atau kemarin. */
  aktif: boolean;
  hari: PilihanHari;
  jumlah: Record<PilihanHari, number>;
  /** Daftar yang sudah disaring; seluruh daftar bila filter tidak aktif. */
  daftar: T[];
}

/**
 * Saring penerbangan menurut hari (WITA).
 *
 * `pilihan` bernilai null selama pengunjung belum memilih sendiri. Saat itu
 * yang dipilih adalah "Hari ini", kecuali FIDS belum mengirim satu pun
 * jadwal hari ini tetapi masih memuat jadwal kemarin (lazim sesaat setelah
 * tengah malam). Tanpa pengecualian itu, layar pertama justru kosong.
 *
 * Bila tidak ada satu pun baris bertanggal hari ini/kemarin (mis. data dari
 * basis data lokal yang tanpa `flight_date`), filter dimatikan dan seluruh
 * daftar ditampilkan. Menyembunyikan baris itu berarti papan tampak kosong
 * padahal datanya ada.
 */
export function saringHari<T extends { flight_date?: string | null }>(
  flights: T[],
  today: string | null,
  pilihan: PilihanHari | null,
): FilterHari<T> {
  const jumlah: Record<PilihanHari, number> = { today: 0, yesterday: 0 };
  if (!today) return { aktif: false, hari: 'today', jumlah, daftar: flights };

  const status = flights.map((f) => dateStatusFor(f.flight_date, today));
  for (const s of status) if (s === 'today' || s === 'yesterday') jumlah[s]++;

  const aktif = jumlah.today + jumlah.yesterday > 0;
  const hari: PilihanHari = pilihan ?? (jumlah.today === 0 && jumlah.yesterday > 0 ? 'yesterday' : 'today');
  const daftar = aktif ? flights.filter((_, i) => status[i] === hari) : flights;

  return { aktif, hari, jumlah, daftar };
}

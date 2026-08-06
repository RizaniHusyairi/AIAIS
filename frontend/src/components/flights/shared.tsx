'use client';

import React, { useEffect, useState } from 'react';
import { Flight } from '@/types';

/* ------------------------------------------------------------------ */
/*  Identitas maskapai                                                 */
/* ------------------------------------------------------------------ */

/**
 * Kode pendek + warna khas maskapai untuk lencana cadangan.
 *
 * FIDS mengirim `maskapai.kode` ("SAQ") dan `maskapai.kode_warna` ("#1fb253"),
 * dan v1 memakainya apa adanya — itu identitas resmi yang dikelola petugas
 * bandara lewat panel FIDS, bukan tebakan. Daftar di bawah hanya dipakai bila
 * FIDS tidak mengirim keduanya (mis. saat portal jatuh ke basis data lokal).
 */
export function airlineStyle(
  name: string,
  code?: string | null,
  color?: string | null,
): { code: string; color: string } {
  const fromApi = {
    code: (code || '').trim(),
    color: (color || '').trim(),
  };
  if (fromApi.code && fromApi.color) return { code: fromApi.code, color: fromApi.color };

  const n = (name || '').toLowerCase();
  const guess =
    n.includes('garuda') ? { code: 'GA', color: '#0e7490' } :
    n.includes('lion') ? { code: 'JT', color: '#dc2626' } :
    n.includes('citilink') ? { code: 'QG', color: '#16a34a' } :
    n.includes('sriwijaya') ? { code: 'SJ', color: '#ea580c' } :
    n.includes('batik') ? { code: 'ID', color: '#2563eb' } :
    n.includes('wings') ? { code: 'IW', color: '#059669' } :
    n.includes('super air') || n.includes('superjet') ? { code: 'IU', color: '#7c3aed' } :
    n.includes('pelita') ? { code: '6D', color: '#0891b2' } :
    {
      code: (name || 'XX').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'XX',
      color: '#334155',
    };

  // Nilai dari API selalu menang atas tebakan, walau hanya salah satunya ada.
  return { code: fromApi.code || guess.code, color: fromApi.color || guess.color };
}

/**
 * Rapikan URL logo dari API.
 *
 * Nama berkas di server FIDS boleh mengandung spasi (mis. logo Garuda yang
 * berasal dari unggahan WhatsApp), jadi URL perlu di-encode. Encoding hanya
 * dilakukan bila memang ada spasi supaya URL yang sudah ter-encode tidak
 * diproses dua kali.
 */
export function airlineLogoUrl(logo?: string | null): string | null {
  const url = (logo || '').trim();
  if (!url) return null;
  return /\s/.test(url) ? encodeURI(url) : url;
}

/**
 * Lencana maskapai.
 *
 * Menampilkan logo asli bila tersedia; bila URL kosong atau gambarnya gagal
 * dimuat, tampilan mundur ke lencana kode maskapai berwarna merek.
 *
 * URL logo datang dari proksi backend, bukan langsung dari server FIDS —
 * host FIDS hanya melayani HTTP sehingga gambarnya diblokir sebagai mixed
 * content begitu portal berjalan di HTTPS. Ini cara yang dipakai v1.
 */
export function AirlineLogo({
  airline,
  logo,
  code: apiCode,
  color: apiColor,
  size = 40,
}: {
  airline: string;
  logo?: string | null;
  code?: string | null;
  color?: string | null;
  size?: number;
}) {
  const { code, color } = airlineStyle(airline, apiCode, apiColor);
  const src = airlineLogoUrl(logo);
  const [failed, setFailed] = useState(false);

  // Baris dapat dipakai ulang saat data disegarkan — coba lagi untuk URL baru.
  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <div
        className="rounded-xl bg-white ring-1 ring-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm p-1"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- host FIDS eksternal, dimuat apa adanya agar bisa jatuh ke lencana saat gagal */}
        <img
          src={src}
          alt={`Logo ${airline}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  // Kode dari FIDS bisa tiga huruf ("SAQ"), bukan dua seperti tebakan lama —
  // ukuran huruf menyusut mengikuti panjangnya supaya tidak meluber.
  const fontSize = size * (code.length >= 3 ? 0.26 : 0.3);

  return (
    <div
      className="rounded-xl flex items-center justify-center text-white font-black flex-shrink-0 shadow-sm leading-none"
      style={{ width: size, height: size, backgroundColor: color, fontSize }}
      title={airline}
    >
      {code}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rute                                                               */
/* ------------------------------------------------------------------ */

/**
 * `splitPlace` dan `shortTime` kini tinggal di `@/lib/place` supaya modul
 * non-React (peta & simulasi penerbangan) bisa memakainya tanpa menarik
 * React. Diekspor ulang di sini agar seluruh halaman yang sudah mengimpor
 * dari berkas ini tetap bekerja tanpa perubahan.
 */
export { splitPlace, shortTime } from '@/lib/place';

/** Tanggal penerbangan FIDS (YYYY-MM-DD) -> "Senin, 27 Juli 2026". */
export function fmtFlightDate(date?: string | null): string {
  if (!date) return '';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

/** Selisih waktu pembaruan status FIDS dalam bahasa manusia. */
export function relativeUpdated(iso?: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;

  return `${Math.round(hours / 24)} hari lalu`;
}

/**
 * Titik layan penumpang sesuai arah penerbangan:
 * keberangkatan menuju **Gate**, kedatangan mengambil bagasi di **Conveyor**.
 *
 * Istilahnya sengaja "Conveyor", bukan "Ban Bagasi" atau "Belt" — itu kata yang
 * dipakai papan FIDS bandara dan pengumuman suara, sekaligus nama field yang
 * dikirim API (`conveyor`). Menyebutnya lain di layar membuat penumpang
 * mencocokkan dua istilah berbeda untuk benda yang sama.
 *
 * - `label` : nama kolom ("Gate" / "Conveyor")
 * - `bare`  : nomornya saja, untuk baris yang sudah punya label sendiri
 * - `value` : label + nomor, untuk tampilan mandiri tanpa keterangan kolom
 */
export function gateLabel(flight: Flight): {
  label: string;
  bare: string;
  value: string;
  assigned: boolean;
} {
  if (flight.flight_type === 'arrival') {
    const assigned = flight.baggage_belt != null;
    const bare = assigned ? String(flight.baggage_belt) : 'Belum ditentukan';
    return {
      label: 'Conveyor',
      bare,
      value: assigned ? `Conveyor ${flight.baggage_belt}` : 'Belum ditentukan',
      assigned,
    };
  }

  const assigned = !!flight.gate;
  const bare = assigned ? String(flight.gate) : 'Belum ditentukan';
  return { label: 'Gate', bare, value: assigned ? `Gate ${flight.gate}` : 'Belum ditentukan', assigned };
}

/**
 * Konter check-in. Hanya berlaku untuk keberangkatan — penumpang datang tidak
 * melapor ke konter mana pun, jadi kedatangan selalu mengembalikan `assigned:
 * false` dengan daftar kosong, bukan "Belum ditentukan" yang menyesatkan.
 *
 * FIDS mengirim tiga kolom (konter, konter2, konter3) dan memakai 0 untuk
 * "tidak dipakai"; penyaringannya sudah dilakukan di lapisan pemetaan.
 */
export function counterLabel(flight: Flight): {
  list: number[];
  value: string;
  assigned: boolean;
} {
  const list = flight.flight_type === 'departure' ? flight.checkin_counters ?? [] : [];
  return {
    list,
    value: list.length ? `Konter ${list.join(', ')}` : 'Belum ditentukan',
    assigned: list.length > 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Status                                                             */
/* ------------------------------------------------------------------ */

export const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  scheduled: { label: 'Terjadwal', className: 'text-emerald-600' },
  check_in: { label: 'Check-in Dibuka', className: 'text-indigo-600' },
  boarding: { label: 'Boarding', className: 'text-blue-600' },
  departed: { label: 'Berangkat', className: 'text-slate-500' },
  landed: { label: 'Mendarat', className: 'text-slate-500' },
  delayed: { label: 'Delay', className: 'text-amber-600' },
  cancelled: { label: 'Dibatalkan', className: 'text-rose-600' },
};

export function statusInfo(status: string) {
  return STATUS_STYLES[status] || STATUS_STYLES.scheduled;
}

/**
 * Varian lengkap untuk lencana status bertema terang.
 * `pulse` menandai status yang perlu menarik perhatian (sedang boarding).
 */
export type StatusTheme = {
  label: string;
  /** Kelas untuk lencana utuh: latar + teks + garis tepi. */
  badge: string;
  /** Kelas warna latar titik indikator. */
  dot: string;
  /** Kelas warna teks saja, untuk baris ringkas. */
  text: string;
  pulse: boolean;
};

const STATUS_THEMES: Record<string, StatusTheme> = {
  scheduled: {
    label: 'Terjadwal',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600',
    pulse: false,
  },
  /**
   * Tahap sebelum boarding. Sengaja dibedakan: FIDS mengirim "Check In Open"
   * dan "Boarding" sebagai remark terpisah, tetapi sebelumnya keduanya
   * ditampilkan sebagai "Boarding" sehingga penumpang salah menduga sudah
   * saatnya naik pesawat.
   */
  check_in: {
    label: 'Check-in Dibuka',
    badge: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    dot: 'bg-indigo-500',
    text: 'text-indigo-600',
    pulse: true,
  },
  boarding: {
    label: 'Boarding',
    badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    dot: 'bg-blue-500',
    text: 'text-blue-600',
    pulse: true,
  },
  departed: {
    label: 'Berangkat',
    badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    dot: 'bg-slate-400',
    text: 'text-slate-500',
    pulse: false,
  },
  landed: {
    label: 'Mendarat',
    badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    dot: 'bg-sky-500',
    text: 'text-sky-600',
    pulse: false,
  },
  delayed: {
    label: 'Delay',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    dot: 'bg-amber-500',
    text: 'text-amber-600',
    pulse: true,
  },
  cancelled: {
    label: 'Dibatalkan',
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    dot: 'bg-rose-500',
    text: 'text-rose-600',
    pulse: false,
  },
};

export function statusTheme(status: string): StatusTheme {
  return STATUS_THEMES[status] || STATUS_THEMES.scheduled;
}

/* ------------------------------------------------------------------ */
/*  Tidak ada data contoh penerbangan di sini.                          */
/*                                                                      */
/*  Sebelumnya berkas ini mengekspor DEMO_DEPARTURES/DEMO_ARRIVALS yang */
/*  dipakai layar PWA ketika API mengembalikan daftar kosong. Akibatnya */
/*  saat umpan FIDS bandara kosong, penumpang melihat lima penerbangan  */
/*  karangan tanpa penanda apa pun bahwa itu bukan jadwal sungguhan.    */
/*                                                                      */
/*  Kalau tidak ada jadwal, katakan tidak ada jadwal.                   */
/* ------------------------------------------------------------------ */
